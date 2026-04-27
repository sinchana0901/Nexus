const fs = require('fs');
const path = require('path');
require('dotenv').config();

const HEARTBEAT_FILE = path.join(__dirname, '../memory/HEARTBEAT.md');
const INTERVAL = parseInt(process.env.HEARTBEAT_INTERVAL_MS) || 300000; 

function generateHeartbeatEntry() {
  const now = new Date();
  const hour = now.getHours();
  
  const observations = [];
  
  if (hour >= 18 && hour <= 20) {
    observations.push('⚠️ Peak traffic window — evening commute pattern detected');
  }
  if (hour >= 8 && hour <= 9) {
    observations.push('☕ Morning routine window — coffee order opportunity');
  }

  return `\n## Heartbeat — ${now.toISOString()}\n**Status:** Active\n**Observations:**\n${observations.length ? observations.map(o => `- ${o}`).join('\n') : '- Routine monitoring.'}\n---`;
}

function runHeartbeat() {
  const entry = generateHeartbeatEntry();
  fs.appendFileSync(HEARTBEAT_FILE, entry);
  console.log(`💓 Heartbeat recorded at ${new Date().toLocaleTimeString()}`);
}

// Ensure the file exists
if (!fs.existsSync(HEARTBEAT_FILE)) {
  fs.writeFileSync(HEARTBEAT_FILE, '# Proactive Context Log\n\n');
}

runHeartbeat();
setInterval(runHeartbeat, INTERVAL);

module.exports = { runHeartbeat };