const express = require('express');
const { runSentinel } = require('./sentinel/sentinel');
const { runExecutor } = require('./executor/executor');
const { evaluateAgainstSoul } = require('./evaluator/soul-guard');
const { getCachedContract } = require('./executor/demo-cache');
require('dotenv').config();

const app = express();
app.use(express.json());

app.post('/think', async (req, res) => {
  const { input } = req.body;
  if (!input) return res.status(400).json({ error: 'No input provided' });

  try {
    // Check demo cache first
    const cached = getCachedContract(input);
    if (cached) {
      console.log(`⚡ Cache hit: "${input}"`);
      cached.routing_metadata.inference_used = 'cache';
      return res.json({ contract: cached });
    }

    // Layer 1: Sentinel
    const sentinelResult = await runSentinel(input);

    // Layer 2: Executor
    let contract;
    try {
      contract = await runExecutor(sentinelResult, input);
    } catch (execErr) {
      // Retry once with local fallback if cloud failed
      if (sentinelResult.routing === 'groq') {
        console.warn('☁️  Groq failed, falling back to local...');
        sentinelResult.routing = 'local';
        contract = await runExecutor(sentinelResult, input);
      } else {
        throw execErr;
      }
    }

    // Soul evaluation
    const soulCheck = evaluateAgainstSoul(contract);
    if (soulCheck.override) {
      contract.requires_approval = true;
      contract.approval_reason = soulCheck.reason;
    }

    res.json({ contract });

  } catch (err) {
    console.error('Brain error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/health', (req, res) => res.json({
  status: 'brain online',
  mode: process.env.LLM_MODE,
  sentinel_model: process.env.SENTINEL_MODEL,
  executor_model: process.env.OLLAMA_EXECUTOR_MODEL
}));

app.listen(process.env.BRAIN_PORT || 3001, () => {
  console.log(`🧠 NEXUS Brain → port ${process.env.BRAIN_PORT || 3001} | Mode: ${process.env.LLM_MODE}`);
});