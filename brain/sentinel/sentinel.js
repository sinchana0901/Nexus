const { classifyIntent } = require('./intent-classifier');
const { extractEntities } = require('./entity-extractor');
const { anonymize } = require('./anonymizer');
const { extractRelevantMemory } = require('./memory-extractor');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Load the static memory PII map to ensure MEMORY.md data never leaks
let memoryEntityMap = {};
try {
  const mapPath = path.join(__dirname, '../memory/memory-entity-map.json');
  if (fs.existsSync(mapPath)) {
    memoryEntityMap = JSON.parse(fs.readFileSync(mapPath, 'utf8'));
  }
} catch (e) {
  console.warn('[SENTINEL] Could not load memory-entity-map.json');
}
async function runSentinel(userInput) {
  console.log(`\n🔍 SENTINEL processing: "${userInput}"`);

  const classification = await classifyIntent(userInput);
  const { entityMap, reverseMap } = extractEntities(classification);
  
  // Merge the static memory map with the dynamic input map
  const combinedEntityMap = { ...memoryEntityMap, ...entityMap };
  
  // Rebuild the reverse map to include memory placeholders
  const combinedReverseMap = { ...reverseMap };
  for (const [realValue, placeholder] of Object.entries(memoryEntityMap)) {
    combinedReverseMap[placeholder] = realValue;
  }

  const relevantMemory = extractRelevantMemory(
    userInput,
    classification.memory_keys,
    './brain/memory/MEMORY.md'
  );

  const anonymizedInput = classification.routing_decision === 'groq'
    ? anonymize(userInput, combinedEntityMap)
    : userInput;

  // Mask the entire memory block using the combined map
  const anonymizedMemory = classification.routing_decision === 'groq'
    ? anonymize(relevantMemory, combinedEntityMap)
    : relevantMemory;

  if (classification.routing_decision === 'groq') {
    console.log(`\n[PRIVACY] 🛡️  Masking Map Generated:`, combinedEntityMap);
    console.log(`[PRIVACY] 🛡️  Anonymized Input for Cloud: "${anonymizedInput}"`);
  }

  return {
    classification,
    entityMap: combinedEntityMap,
    reverseMap: combinedReverseMap,
    relevantMemory,
    anonymizedInput,
    anonymizedMemory,
    routing: classification.routing_decision
  };
}

module.exports = { runSentinel };