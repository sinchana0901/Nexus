/**
 * MCP Finance Worker — Simulated (no real payments for demo safety)
 * Logs the financial action and returns a success simulation.
 */

async function executeMCPFinance(task) {
  const payload = task.payload || {};
  const amount = payload.amount || payload.estimated_cost || 0;
  const action = task.action || 'unknown';

  console.error(`[FINANCE] Processing: ${action} | Amount: ₹${amount}`);

  // Simulate a brief processing delay
  await new Promise(r => setTimeout(r, 300));

  return {
    mocked: true,
    simulated: true,
    node: 'finance',
    action: action,
    amount: amount,
    status: 'simulated_success',
    note: 'Real payment integration disabled for demo safety'
  };
}

module.exports = { executeMCPFinance };