const { Client } = require("@modelcontextprotocol/sdk/client/index.js");
const { StdioClientTransport } = require("@modelcontextprotocol/sdk/client/stdio.js");
const { updateSilentRoom, initSilentRoom, renderFinalSummary } = require('../ui/silent-room');
const fs = require('fs');
const path = require('path');

let mcpClient = null;

// Boot up the OpenClaw MCP Client
async function initOpenClaw() {
  if (mcpClient) return mcpClient;
  
  const transport = new StdioClientTransport({
    command: "node",
    args: [path.join(__dirname, '../workers/openclaw-mcp.js')]
  });

  mcpClient = new Client({ name: "nexus-orchestrator", version: "1.0.0" }, { capabilities: {} });
  await mcpClient.connect(transport);
  return mcpClient;
}

async function executeTask(task, client) {
  updateSilentRoom(task.task_id, 'FIRING', task.node, task.action);
  const start = Date.now();

  try {
    // Map your JSON contract nodes to the registered OpenClaw MCP tools
    const toolName = `${task.node}_worker`; 
    
    // Call the OpenClaw MCP Server
    const response = await Promise.race([
      client.callTool({ name: toolName, arguments: { task } }),
      new Promise((_, reject) => setTimeout(() => reject(new Error('MCP Worker timeout (5s)')), 5000))
    ]);

    if (response.isError) throw new Error(response.content[0].text);

    const duration = Date.now() - start;
    const result = JSON.parse(response.content[0].text);
    
    updateSilentRoom(task.task_id, 'DONE', task.node, task.action, duration);
    return { task_id: task.task_id, node: task.node, status: 'success', result, duration_ms: duration };

  } catch (err) {
    const duration = Date.now() - start;
    updateSilentRoom(task.task_id, 'FAILED', task.node, task.action, duration, err.message);
    
    // Simplified rollback handling for MCP architecture omitted for brevity but caught here successfully
    return { task_id: task.task_id, node: task.node, status: 'failed', error: err.message, duration_ms: duration };
  }
}

async function executeSwarm(contract) {
  initSilentRoom(contract);
  const client = await initOpenClaw();
  const swarmStart = Date.now();

  // All MCP Tool calls fire simultaneously
  const results = await Promise.all(contract.tasks.map(task => executeTask(task, client)));

  const totalDuration = Date.now() - swarmStart;
  renderFinalSummary(results, totalDuration, contract.routing_metadata);

  // Write Session Log
  const logPath = path.join(__dirname, `../../logs/session-${contract.session_id || Date.now()}.json`);
  fs.writeFileSync(logPath, JSON.stringify({
    session_id: contract.session_id,
    timestamp: new Date().toISOString(),
    contract,
    results,
    totalDuration
  }, null, 2));

  return results;
}

module.exports = { executeSwarm };