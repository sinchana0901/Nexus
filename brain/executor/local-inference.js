const fs = require('fs');
const path = require('path');
require('dotenv').config();

const MASTER_PROMPT = fs.readFileSync(path.join(__dirname, '../prompts/master.prompt.txt'), 'utf8');
const INTROSPECTIVE_PROMPT = fs.readFileSync(path.join(__dirname, '../prompts/introspective.prompt.txt'), 'utf8');

function getSoulFilePath() {
  const envPath = process.env.SOUL_FILE_PATH?.trim();
  if (envPath) {
    return path.isAbsolute(envPath) ? envPath : path.resolve(process.cwd(), envPath);
  }
  return path.join(__dirname, '../memory/SOUL.md');
}

function buildPrompt(userInput, memoryContext) {
  const soulFile = getSoulFilePath();
  if (!fs.existsSync(soulFile)) {
    throw new Error(`Missing soul file at ${soulFile}. Set SOUL_FILE_PATH or create brain/memory/SOUL.md.`);
  }
  const soul = fs.readFileSync(soulFile, 'utf8');
  
  const istTime = new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata', dateStyle: 'full', timeStyle: 'long' });
  
  return MASTER_PROMPT
    .replace('{{MEMORY_INJECTION}}', memoryContext)
    .replace('{{SOUL_INJECTION}}', soul)
    .replace('{{DATETIME}}', istTime)
    .replace('{{USER_INPUT}}', userInput);
}

async function runLocalInference(userInput, memoryContext) {
  const prompt = buildPrompt(userInput, memoryContext);
  const start = Date.now();

  console.log('🦙 Running local Ollama inference...');

  const ollamaBaseUrl = process.env.OLLAMA_BASE_URL?.trim() || 'http://localhost:11434';
  const model = process.env.OLLAMA_EXECUTOR_MODEL?.trim() || 'phi3:mini';
  console.log(`🧠 Local inference using model: ${model}`);
  const response = await fetch(`${ollamaBaseUrl}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      prompt,
      stream: false,
      format: 'json',
      options: { temperature: 0.1, num_predict: 1500 }
    }),
    signal: AbortSignal.timeout(parseInt(process.env.OLLAMA_EXECUTOR_TIMEOUT_MS) || 120000)
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => 'unable to read error body');
    throw new Error(`Local inference request failed: ${response.status} ${response.statusText} - ${errorText}`);
  }

  const data = await response.json();
  if (!data || typeof data.response !== 'string') {
    throw new Error('Local inference returned an invalid response payload.');
  }
  const latency = Date.now() - start;
  console.log(`🦙 Ollama responded in ${latency}ms`);

  return { raw: data.response, latency, source: 'ollama' };
}

async function runLocalIntrospectiveInference(userInput, rawMemory) {
  const prompt = INTROSPECTIVE_PROMPT
    .replace('{{MEMORY_INJECTION}}', rawMemory)
    .replace('{{USER_INPUT}}', userInput);

  const start = Date.now();
  console.log('🦙 Running local Ollama inference (INTROSPECTIVE - RAW MEMORY)...');

  const ollamaBaseUrl = process.env.OLLAMA_BASE_URL?.trim() || 'http://localhost:11434';
  const model = process.env.OLLAMA_EXECUTOR_MODEL?.trim() || 'phi3:mini';
  
  const response = await fetch(`${ollamaBaseUrl}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      prompt,
      stream: false,
      format: 'json',
      options: { temperature: 0.1, num_predict: 500 }
    }),
    signal: AbortSignal.timeout(parseInt(process.env.OLLAMA_EXECUTOR_TIMEOUT_MS) || 120000)
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => 'unable to read error body');
    throw new Error(`Local inference request failed: ${response.status} ${response.statusText} - ${errorText}`);
  }

  const data = await response.json();
  if (!data || typeof data.response !== 'string') {
    throw new Error('Local inference returned an invalid response payload.');
  }
  const latency = Date.now() - start;
  console.log(`🦙 Ollama (Introspective) responded in ${latency}ms`);

  return { raw: data.response, latency, source: 'ollama' };
}

module.exports = { runLocalInference, runLocalIntrospectiveInference };