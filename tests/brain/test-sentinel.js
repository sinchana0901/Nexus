const { runSentinel } = require('../../brain/sentinel/sentinel');

const testInputs = [
  "I am late to meet Raghav at Koramangala",
  "Order the usual",
  "Transfer ₹3000 to account 12345",
  "What do you know about me?"
];

async function runTests() {
  console.log('🧪 Sentinel Layer 1 Test Suite\n');
  for (const input of testInputs) {
    console.log(`\nInput: "${input}"`);
    try {
      const result = await runSentinel(input);
      console.log(`Routing: ${result.routing.toUpperCase()}`);
      console.log(`Entities Found: ${JSON.stringify(result.entityMap)}`);
      console.log(`Anonymized Output: "${result.anonymizedInput}"`);
    } catch (err) {
      console.error(`Error: ${err.message}`);
    }
    console.log('─'.repeat(50));
  }
}

runTests();