const fs = require('fs');
const Groq = require('groq-sdk');
require('dotenv').config();

const ANONYMIZED_PROMPT = fs.readFileSync('./brain/prompts/master-anonymized.prompt.txt', 'utf8');

function buildAnonymizedPrompt(anonymizedInput, anonymizedMemory) {
  const soul = fs.readFileSync(process.env.SOUL_FILE_PATH, 'utf8');
  return ANONYMIZED_PROMPT
    .replace('{{MEMORY_INJECTION}}', anonymizedMemory)
    .replace('{{SOUL_INJECTION}}', soul)
    .replace('{{DATETIME}}', new Date().toISOString())
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

  return {
    raw: completion.choices[0].message.content,
    latency,
    source: 'groq'
  };
}

module.exports = { runCloudInference };