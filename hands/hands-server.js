const express = require('express');
const { executeSwarm } = require('./orchestrator/swarm');
const { validateContract } = require('../shared/validators/contract-validator');
require('dotenv').config();

const app = express();
app.use(express.json());

app.post('/execute', async (req, res) => {
  const { contract } = req.body;
  if (!contract) return res.status(400).json({ error: 'No contract provided' });

  // Uncomment or implement validateContract if needed
  // const validation = validateContract(contract);
  // if (!validation.valid) {
  //   return res.status(422).json({ error: 'Invalid contract', details: validation.errors });
  // }

  if (contract.requires_approval) {
    return res.json({
      status: 'awaiting_approval',
      reason: contract.approval_reason,
      session_id: contract.session_id
    });
  }

  try {
    const results = await executeSwarm(contract);
    res.json({ status: 'executed', session_id: contract.session_id, results });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/health', (req, res) => res.json({ 
  status: 'hands online', 
  mode: process.env.DEMO_MODE === 'true' ? 'DEMO' : 'LIVE',
  uptime_seconds: process.uptime(),
  workers: ['comms', 'calendar', 'geo', 'finance', 'google']
}));

app.listen(process.env.HANDS_PORT || 3002, () => {
  console.log(`🖐️  NEXUS Hands → port ${process.env.HANDS_PORT || 3002}`);
});