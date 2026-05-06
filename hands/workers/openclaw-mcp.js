const { Server } = require("@modelcontextprotocol/sdk/server/index.js");
const { StdioServerTransport } = require("@modelcontextprotocol/sdk/server/stdio.js");
const { CallToolRequestSchema, ListToolsRequestSchema } = require("@modelcontextprotocol/sdk/types.js");

// Import worker modules
const { executeMCPComms } = require('./MCP-Comms-Worker');
const { executeMCPCalendar } = require('./MCP-Calendar-Worker');
const { executeMCPGeo } = require('./MCP-Geo-Worker');
const { executeMCPFinance } = require('./MCP-Finance-Worker');
const { executeGoogleWorkspace } = require('./mcp-google-worker');

// Initialize the OpenClaw MCP Server
const server = new Server(
  { name: "nexus-openclaw-swarm", version: "1.0.0" },
  { capabilities: { tools: {} } }
);

// Register the Swarm Tools with OpenClaw
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    { name: "comms_worker", description: "OpenClaw node for communication (WhatsApp)", inputSchema: { type: "object" } },
    { name: "calendar_worker", description: "OpenClaw node for scheduling", inputSchema: { type: "object" } },
    { name: "geo_worker", description: "OpenClaw node for location, food ordering, browsing", inputSchema: { type: "object" } },
    { name: "finance_worker", description: "OpenClaw node for transactions", inputSchema: { type: "object" } },
    { name: "google_worker", description: "OpenClaw node for Google Calendar and Tasks", inputSchema: { type: "object" } }
  ]
}));

// Route requests to worker logic
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  let result;

  try {
    // Detect food-order payloads misrouted to finance_worker
    let effectiveName = name;
    if (name === 'finance_worker' && args.task) {
      const p = args.task.payload || {};
      const a = (args.task.action || '').toLowerCase();
      // Only reroute if action is explicitly a food order
      if (a === 'order_food' || a === 'food_order' || p.platform === 'zomato') {
        console.error('[OPENCLAW] ⚡ Re-routing food order from finance_worker → geo_worker');
        effectiveName = 'geo_worker';
      }
    }

    switch (effectiveName) {
      case "comms_worker":
        result = await executeMCPComms(args.task);
        break;
      case "calendar_worker":
        result = await executeMCPCalendar(args.task);
        break;
      case "geo_worker":
        result = await executeMCPGeo(args.task);
        break;
      case "finance_worker":
        result = await executeMCPFinance(args.task);
        break;
      case "google_worker":
        result = await executeGoogleWorkspace(args.task);
        break;
      default:
        throw new Error(`Unknown OpenClaw node: ${effectiveName}`);
    }
    return { content: [{ type: "text", text: JSON.stringify(result) }] };
  } catch (error) {
    return { content: [{ type: "text", text: `Error: ${error.message}` }], isError: true };
  }
});

// Start listening via standard I/O
async function runOpenClawServer() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("OpenClaw MCP Server running on stdio");
}

runOpenClawServer().catch(console.error);