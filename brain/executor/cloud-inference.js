const fs = require('fs');
const path = require('path');
const Groq = require('groq-sdk');
require('dotenv').config();

const ANONYMIZED_PROMPT = fs.readFileSync(path.join(__dirname, '../prompts/master-anonymized.prompt.txt'), 'utf8');
const INTROSPECTIVE_PROMPT = fs.readFileSync(path.join(__dirname, '../prompts/introspective.prompt.txt'), 'utf8');

function getSoulFilePath() {
  const envPath = process.env.SOUL_FILE_PATH?.trim();
  if (envPath) {
    return path.isAbsolute(envPath) ? envPath : path.resolve(process.cwd(), envPath);
  }
  return path.join(__dirname, '../memory/SOUL.md');
}

function buildAnonymizedPrompt(anonymizedInput, anonymizedMemory) {
  const soulFile = getSoulFilePath();
  if (!fs.existsSync(soulFile)) {
    throw new Error(`Missing soul file at ${soulFile}. Set SOUL_FILE_PATH or create brain/memory/SOUL.md.`);
  }
  const soul = fs.readFileSync(soulFile, 'utf8');
  
  // Provide the LLM with the exact local time in India to prevent timezone-offset date math errors
  const istTime = new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata', dateStyle: 'full', timeStyle: 'long' });
  
  return ANONYMIZED_PROMPT
    .replace('{{MEMORY_INJECTION}}', anonymizedMemory)
    .replace('{{SOUL_INJECTION}}', soul)
    .replace('{{DATETIME}}', istTime)
    .replace('{{USER_INPUT}}', anonymizedInput);
}

async function runCloudInference(anonymizedInput, anonymizedMemory) {
  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
  const prompt = buildAnonymizedPrompt(anonymizedInput, anonymizedMemory);
  const start = Date.now();

  console.log('☁️  Running Groq inference (anonymized)...');

  const completion = await groq.chat.completions.create({
    model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.1,
    max_tokens: 1500,
    response_format: { type: 'json_object' }
  });

  const latency = Date.now() - start;
  console.log(`☁️  Groq responded in ${latency}ms`);

  const raw = completion?.choices?.[0]?.message?.content;
  if (typeof raw !== 'string') {
    throw new Error('Cloud inference returned an invalid response payload.');
  }

  return {
    raw,
    latency,
    source: 'groq'
  };
}

async function runIntrospectiveInference(userInput, rawMemory) {
  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
  const prompt = INTROSPECTIVE_PROMPT
    .replace('{{MEMORY_INJECTION}}', rawMemory)
    .replace('{{USER_INPUT}}', userInput);
    
  const start = Date.now();
  console.log('☁️  Running Groq inference (INTROSPECTIVE - RAW MEMORY)...');

  const completion = await groq.chat.completions.create({
    model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.1,
    max_tokens: 500,
    response_format: { type: 'json_object' }
  });

  const latency = Date.now() - start;
  console.log(`☁️  Groq (Introspective) responded in ${latency}ms`);

  const raw = completion?.choices?.[0]?.message?.content;
  if (typeof raw !== 'string') {
    throw new Error('Cloud inference returned an invalid response payload.');
  }

  return {
    raw,
    latency,
    source: 'groq'
  };
}

module.exports = { runCloudInference, runIntrospectiveInference };