const { runLocalInference } = require('./local-inference');
const { runCloudInference } = require('./cloud-inference');
const { deanonymize } = require('../sentinel/deanonymizer');
const { validateContract } = require('../../shared/validators/contract-validator');
const { v4: uuidv4 } = require('uuid');

function stripMarkdownFences(text) {
  if (typeof text !== 'string') {
    throw new Error('Inference did not return a valid raw response string.');
  }
  return text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
}

async function runExecutor(sentinelResult, userInput) {
  const { routing, anonymizedInput, anonymizedMemory, relevantMemory, reverseMap, classification } = sentinelResult;

  let inferenceResult;

  // ALWAYS use Groq (cloud) for contract generation.
  // Ollama is too slow and produces unreliable contracts.
  // The anonymizer has already stripped PII from the input.
  console.log('⚡ Forcing Groq (cloud) inference for contract generation...');
  inferenceResult = await runCloudInference(anonymizedInput, anonymizedMemory);

  
  let cleaned = stripMarkdownFences(inferenceResult.raw);
  
  // 🧹 THE JANITOR: If the model mashes nodes like "comms|finance", force it to just take the first one.
  cleaned = cleaned.replace(/"node"\s*:\s*"([a-z]+)\|[a-z|]+"/g, '"node": "$1"');
  
  let contract;
  try {
    const parsed = JSON.parse(cleaned);
    // Deanonymize: restore real names from placeholders
    const contractString = deanonymize(JSON.stringify(parsed), reverseMap);
    contract = JSON.parse(contractString);
  } catch (err) {
    throw new Error(`Contract parse failed: ${err.message} | Raw: ${cleaned.substring(0, 200)}`);
  }

  // Inject system fields
  contract.session_id = uuidv4();
  contract.timestamp = new Date().toISOString();
  contract.trigger = userInput;
  contract.routing_metadata = {
    sentinel_decision: 'groq',
    inference_used: inferenceResult.source,
    sensitive_entities_found: classification.sensitive_entities.length,
    anonymization_applied: classification.sensitive_entities.length > 0,
    sentinel_latency_ms: classification.sentinel_latency_ms,
    executor_latency_ms: inferenceResult.latency
  };

  // Ensure task IDs and inject trigger for deanonymization recovery
  if (contract.tasks) {
    contract.tasks = contract.tasks.map(t => ({
      ...t,
      task_id: t.task_id || uuidv4(),
      trigger: userInput  // original user input for anonymized placeholder recovery
    }));
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