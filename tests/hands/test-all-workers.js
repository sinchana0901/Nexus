const { executeMCPComms } = require('../../hands/workers/MCP-Comms-Worker');
const { executeMCPCalendar } = require('../../hands/workers/MCP-Calendar-Worker');
const { executeMCPGeo } = require('../../hands/workers/MCP-Geo-Worker');
const { executeMCPFinance } = require('../../hands/workers/MCP-Finance-Worker');

// Force demo mode for this test
process.env.DEMO_MODE = 'true';

async function testWorkers() {
  console.log('🧪 Testing Individual Workers (DEMO_MODE=true)...\n');

  console.log('1️⃣  Testing Comms Worker...');
  const commsResult = await executeMCPComms({ action: 'send_slack', payload: { message: 'Test ping' } });
  console.log('✅', commsResult);

  console.log('\n2️⃣  Testing Calendar Worker...');
  const calResult = await executeMCPCalendar({ action: 'reschedule_event', payload: { time: '+15m' } });
  console.log('✅', calResult);

  console.log('\n3️⃣  Testing Geo Worker...');
  const geoResult = await executeMCPGeo({ action: 'get_eta', payload: { location: 'Koramangala' } });
  console.log('✅', geoResult);

  console.log('\n4️⃣  Testing Finance Worker...');
  const finResult = await executeMCPFinance({ action: 'check_balance', payload: {} });
  console.log('✅', finResult);

  console.log('\n🎉 All workers executed successfully in isolation.');
}

testWorkers().catch(console.error);