const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Ensure late-scenario.json exists or create a mock on the fly if it doesn't.
let mockContract;
try {
  mockContract = require('../../shared/mock-payloads/late-scenario.json');
} catch (e) {
  console.log('⚠️ mock-payloads/late-scenario.json not found. Using a fallback mock contract.');
  mockContract = {
    session_id: 'test-session-123',
    routing_metadata: {
      inference_used: 'groq',
      sentinel_latency_ms: 250,
      anonymization_applied: true
    },
    tasks: [
      { task_id: 't1', node: 'comms', action: 'send_slack', payload: { message: 'Running late' } },
      { task_id: 't2', node: 'calendar', action: 'reschedule_event', payload: { time: '+15m' } },
      { task_id: 't3', node: 'geo', action: 'get_eta', payload: { location: 'Koramangala' } }
    ],
    requires_approval: false
  };
}

async function test() {
  console.log('🧪 Firing mock contract at Hands server...\n');
  try {
    const res = await axios.post('http://localhost:3002/execute', { contract: mockContract });
    console.log('\n✅ Response from Hands API:');
    console.log(JSON.stringify(res.data, null, 2));
  } catch (err) {
    console.error('❌ Error hitting Hands API:');
    console.error(err.response ? JSON.stringify(err.response.data, null, 2) : err.message);
  }
}

test();