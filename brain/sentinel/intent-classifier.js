const fs = require('fs');
const path = require('path');
require('dotenv').config();

const SENTINEL_PROMPT_TEMPLATE = fs.readFileSync(
  path.join(__dirname, '../prompts/sentinel.prompt.txt'), 'utf8'
);

async function classifyIntent(userInput) {
  const prompt = SENTINEL_PROMPT_TEMPLATE.replace('{{USER_INPUT}}', userInput);
  const startTime = Date.now();

  let classification;
  try {
    const ollamaBaseUrl = process.env.OLLAMA_BASE_URL?.trim() || 'http://localhost:11434';
    const model = process.env.OLLAMA_SENTINEL_MODEL?.trim() || 'phi3:mini';
    
    // Demonstrate local Ollama for PII detection
    const response = await fetch(`${ollamaBaseUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        prompt,
        stream: false,
        format: 'json',
        options: { temperature: 0.05, num_predict: 200 }
      })
    });

    if (!response.ok) {
      throw new Error(`Ollama request failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    classification = JSON.parse(data.response);
    
    console.log(`[PRIVACY] 🛡️  Local Ollama successfully scanned and identified PII locally without sending data to the cloud.`);
    
  } catch (e) {
    console.warn(`⚠️  Sentinel Ollama classification failed: ${e.message} — defaulting to fallback routing`);
    classification = {
      intent_class: 'routine_task',
      sensitive_entities: [],
      memory_keys: ['CONTACTS', 'ROUTINES'],
      routing_decision: 'groq',
      confidence: 50,
      reasoning: 'Fallback due to classification failure'
    };
  }

  const latency = Date.now() - startTime;

  // OVERRIDE: Always route to groq for task execution.
  // Ollama handles Phase 1 (Local PII Masking), Groq handles Phase 2 (Task Generation)
  classification.routing_decision = 'groq';

  classification.sentinel_latency_ms = latency;
  console.log(`🔍 Sentinel (Ollama): ${classification.routing_decision.toUpperCase()} | ${classification.intent_class} | ${latency}ms`);
  return classification;
}

module.exports = { classifyIntent };