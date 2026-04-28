const axios = require('axios');

async function executeMCPComms(task) {
  if (process.env.DEMO_MODE === 'true' || !process.env.DEMO_MODE) {
    await new Promise(r => setTimeout(r, Math.floor(Math.random() * 700) + 150));
    return { mocked: true, node: 'comms', action: task.action, payload: task.payload };
  }

  // Real implementation
  if (task.action === 'send_slack') {
    const webhookUrl = process.env.SLACK_WEBHOOK_URL;
    if (!webhookUrl) throw new Error('SLACK_WEBHOOK_URL is not set in .env');
    
    try {
      const response = await axios.post(webhookUrl, {
        text: `*NEXUS Notification:* ${task.payload.message || 'No message provided'}`
      });
      return { mocked: false, status: 'success', node: 'comms', action: task.action, data: response.data };
    } catch (err) {
      throw new Error(`Slack API failed: ${err.message}`);
    }
  }

  throw new Error(`Action ${task.action} not supported by Comms Worker`);
}
module.exports = { executeMCPComms };