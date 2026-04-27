const fs = require('fs');
require('dotenv').config();

const MASTER_PROMPT = fs.readFileSync('./brain/prompts/master.prompt.txt', 'utf8');

function buildPrompt(userInput, memoryContext) {
  const soul = fs.readFileSync(process.env.SOUL_FILE_PATH, 'utf8');
  return MASTER_PROMPT
    .replace('{{MEMORY_INJECTION}}', memoryContext)
    .replace('{{SOUL_INJECTION}}', soul)
    .replace('{{DATETIME}}', new Date().toISOString())
    .replace('{{USER_INPUT}}', userInput);
}

async function runLocalInference(userInput, memoryContext) {
  const prompt = buildPrompt(userInput, memoryContext);
  const start = Date.now();

  console.log('🦙 Running local Ollama inference...');

  const response = await fetch(`${process.env.OLLAMA_BASE_URL}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: process.env.OLLAMA_EXECUTOR_MODEL || 'llama3.1:8b',
      prompt,
      stream: false,
      format: 'json',
      options: { temperature: 0.1, num_predict: 1500 }
    }),
    signal: AbortSignal.timeout(parseInt(process.env.OLLAMA_EXECUTOR_TIMEOUT_MS) || 60000)
  });

  const data = await response.json();
  const latency = Date.now() - start;
  console.log(`🦙 Ollama responded in ${latency}ms`);

  return { raw: data.response, latency, source: 'ollama' };
}

module.exports = { runLocalInference };