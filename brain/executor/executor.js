const { runLocalInference, runLocalIntrospectiveInference } = require('./local-inference');
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

  if (classification.intent_class === 'introspective') {
    console.log('⚡ Using direct Introspective routing (local memory, strictly local inference)...');
    inferenceResult = await runLocalIntrospectiveInference(userInput, relevantMemory);
  } else {
    console.log('⚡ Forcing Groq (cloud) inference for contract generation...');
    inferenceResult = await runCloudInference(anonymizedInput, anonymizedMemory);
  }

  
  let cleaned = stripMarkdownFences(inferenceResult.raw);
  
  // 🧹 THE JANITOR: If the model mashes nodes like "comms|finance", force it to just take the first one.
  cleaned = cleaned.replace(/"node"\s*:\s*"([a-z]+)\|[a-z|]+"/g, '"node": "$1"');
  
  let contract;
  try {
    const parsed = JSON.parse(cleaned);
    const originalNarrative = parsed.narrative_response; // Save the anonymized narrative for voice playback
    
    console.log(`\n[EXECUTOR] ☁️  Raw Cloud Response (Anonymized):`);
    console.log(JSON.stringify(parsed, null, 2));

    // Deanonymize: restore real names from placeholders for execution
    const contractString = deanonymize(JSON.stringify(parsed), reverseMap);
    contract = JSON.parse(contractString);
    
    console.log(`\n[EXECUTOR] 🔓 Deanonymized Payload (Local Execution):`);
    console.log(JSON.stringify(contract.tasks, null, 2));

    // Restore the anonymized narrative so the user hears "PERSON_A" to prove privacy
    if (originalNarrative) {
      contract.narrative_response = originalNarrative;
    }
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
  console.log('DEBUG routing_metadata:', contract.routing_metadata);
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