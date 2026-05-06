/**
 * MCP Calendar Worker — Simulated scheduling
 * Logs calendar actions and returns success.
 */

async function executeMCPCalendar(task) {
  const payload = task.payload || {};
  const action = task.action || 'unknown';

  console.error(`[CALENDAR] Processing: ${action} | ${JSON.stringify(payload)}`);

  await new Promise(r => setTimeout(r, 300));

  return {
    mocked: true,
    simulated: true,
    node: 'calendar',
    action: action,
    status: 'simulated_success',
    details: payload,
    note: 'Calendar integration simulated for demo'
  };
}

module.exports = { executeMCPCalendar };