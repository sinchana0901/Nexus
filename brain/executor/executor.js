const { runLocalInference } = require('./local-inference');
const { runCloudInference } = require('./cloud-inference');
const { deanonymize } = require('../sentinel/deanonymizer');
const { validateContract } = require('../../shared/validators/contract-validator');
const { v4: uuidv4 } = require('uuid');

function stripMarkdownFences(text) {
  return text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
}

async function runExecutor(sentinelResult, userInput) {
  const { routing, anonymizedInput, anonymizedMemory, relevantMemory, reverseMap, classification } = sentinelResult;

  let inferenceResult;

  if (routing === 'local') {
    inferenceResult = await runLocalInference(userInput, relevantMemory);
  } else {
    inferenceResult = await runCloudInference(anonymizedInput, anonymizedMemory);
  }

  const cleaned = stripMarkdownFences(inferenceResult.raw);

  let contract;
  try {
    const parsed = JSON.parse(cleaned);
    // Deanonymize if Groq was used
    const contractString = routing === 'groq'
      ? deanonymize(JSON.stringify(parsed), reverseMap)
      : JSON.stringify(parsed);
    contract = JSON.parse(contractString);
  } catch (err) {
    throw new Error(`Contract parse failed: ${err.message} | Raw: ${cleaned.substring(0, 200)}`);
  }

  // Inject system fields
  contract.session_id = uuidv4();
  contract.timestamp = new Date().toISOString();
  contract.trigger = userInput;
  contract.routing_metadata = {
    sentinel_decision: routing,
    inference_used: inferenceResult.source,
    sensitive_entities_found: classification.sensitive_entities.length,
    anonymization_applied: routing === 'groq' && classification.sensitive_entities.length > 0,
    sentinel_latency_ms: classification.sentinel_latency_ms,
    executor_latency_ms: inferenceResult.latency
  };

  // Ensure task IDs
  if (contract.tasks) {
    contract.tasks = contract.tasks.map(t => ({ ...t, task_id: t.task_id || uuidv4() }));
  }

  // Validate
const validation = validateContract(contract);
  if (!validation.valid) {
    console.warn('\n⚠️  SCHEMA VIOLATION DETECTED');
    console.warn(`❌ Errors: ${validation.errors.join(', ')}`);
    console.warn(`📦 Raw LLM Output: ${cleaned}\n`);
    throw new Error(`Schema violation: ${validation.errors.join(', ')}`);
  }

  return contract;
}

module.exports = { runExecutor };