const { classifyIntent } = require('./intent-classifier');
const { extractEntities } = require('./entity-extractor');
const { anonymize } = require('./anonymizer');
const { extractRelevantMemory } = require('./memory-extractor');
require('dotenv').config();

async function runSentinel(userInput) {
  console.log(`\n🔍 SENTINEL processing: "${userInput}"`);

  const classification = await classifyIntent(userInput);
  const { entityMap, reverseMap } = extractEntities(classification);
  
  const relevantMemory = extractRelevantMemory(
    userInput,
    classification.memory_keys,
    process.env.MEMORY_FILE_PATH
  );

  const anonymizedInput = classification.routing_decision === 'groq'
    ? anonymize(userInput, entityMap)
    : userInput;

  const anonymizedMemory = classification.routing_decision === 'groq'
    ? anonymize(relevantMemory, entityMap)
    : relevantMemory;

  return {
    classification,
    entityMap,
    reverseMap,
    relevantMemory,
    anonymizedInput,
    anonymizedMemory,
    routing: classification.routing_decision
  };
}

module.exports = { runSentinel };