const { Server } = require("@modelcontextprotocol/sdk/server/index.js");
const { StdioServerTransport } = require("@modelcontextprotocol/sdk/server/stdio.js");
const { CallToolRequestSchema, ListToolsRequestSchema } = require("@modelcontextprotocol/sdk/types.js");

// Import your existing mock logic
const { executeMCPComms } = require('./MCP-Comms-Worker');
const { executeMCPCalendar } = require('./MCP-Calendar-Worker');
const { executeMCPGeo } = require('./MCP-Geo-Worker');
const { executeMCPFinance } = require('./MCP-Finance-Worker');

// Initialize the OpenClaw MCP Server
const server = new Server(
  { name: "nexus-openclaw-swarm", version: "1.0.0" },
  { capabilities: { tools: {} } }
);

// Register the Swarm Tools with OpenClaw
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    { name: "comms_worker", description: "OpenClaw node for communication", inputSchema: { type: "object" } },
    { name: "calendar_worker", description: "OpenClaw node for scheduling", inputSchema: { type: "object" } },
    { name: "geo_worker", description: "OpenClaw node for location", inputSchema: { type: "object" } },
    { name: "finance_worker", description: "OpenClaw node for transactions", inputSchema: { type: "object" } }
  ]
}));

// Route requests to your existing worker logic
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  let result;

  try {
    switch (name) {
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
      default:
        throw new Error(`Unknown OpenClaw node: ${name}`);
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