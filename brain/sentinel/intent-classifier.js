const fs = require('fs');
const path = require('path');
require('dotenv').config();

const SENTINEL_PROMPT_TEMPLATE = fs.readFileSync(
  path.join(__dirname, '../prompts/sentinel.prompt.txt'), 'utf8'
);

async function classifyIntent(userInput) {
  const prompt = SENTINEL_PROMPT_TEMPLATE.replace('{{USER_INPUT}}', userInput);
  const startTime = Date.now();

  const response = await fetch(`${process.env.OLLAMA_BASE_URL || 'http://localhost:11434'}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'phi3:mini',
      prompt: prompt,
      stream: false,
      format: 'json',
      options: { temperature: 0.05, num_predict: 300 }
    }),
    signal: AbortSignal.timeout(parseInt(process.env.SENTINEL_TIMEOUT_MS) || 120000)
  });

  if (!response.ok) throw new Error(`Sentinel Ollama error: ${response.status}`);

  const data = await response.json();
  const latency = Date.now() - startTime;

  let classification;
  try {
    classification = JSON.parse(data.response);
  } catch {
    console.warn('⚠️  Sentinel parse failed — defaulting to local routing');
    classification = {
      intent_class: 'complex_personal',
      sensitive_entities: [],
      memory_keys: ['CONTACTS', 'ROUTINES', 'FINANCE_LIMITS'],
      routing_decision: 'local',
      confidence: 0,
      reasoning: 'Sentinel parse failure — safe default'
    };
  }

  classification.sentinel_latency_ms = latency;
  console.log(`🔍 Sentinel: ${classification.routing_decision.toUpperCase()} | ${classification.intent_class} | ${latency}ms`);
  return classification;
}

module.exports = { classifyIntent };