import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";

let mcpClients = [];
let availableTools = [];
let toolToClientMap = new Map();

export async function connectToMCP() {
  if (mcpClients.length > 0) return { clients: mcpClients, tools: availableTools };

  console.log("🔌 Connecting Brain to Real-World Hands & WhatsApp...");

  // 1. Real-World Hands (Stdio)
  const transport1 = new StdioClientTransport({
    command: "node",
    args: ["./mcp/real-world-mcp.mjs"] 
  });
  const client1 = new Client(
    { name: "Nexus-Brain-RW", version: "1.0.0" },
    { capabilities: { tools: {} } }
  );
  await client1.connect(transport1);
  mcpClients.push(client1);

  // 2. WhatsApp MCP (SSE)
  try {
    // FastMCP uses /sse
    const transport2 = new SSEClientTransport(new URL("http://localhost:8081/sse"));
    const client2 = new Client(
      { name: "Nexus-Brain-WA", version: "1.0.0" },
      { capabilities: { tools: {} } }
    );
    await client2.connect(transport2);
    mcpClients.push(client2);
    console.log("✅ Connected to WhatsApp MCP via SSE");
  } catch (e) {
    console.warn("⚠️ Failed to connect to WhatsApp MCP:", e.message);
  }
  
  // Ask the Hands what tools they have
  availableTools = [];
  toolToClientMap.clear();

  for (const client of mcpClients) {
    const toolsResponse = await client.listTools();
    for (const tool of toolsResponse.tools) {
      availableTools.push(tool);
      toolToClientMap.set(tool.name, client);
    }
  }
  
  console.log("✅ Brain connected! Available Tools:", availableTools.map(t => t.name).join(', '));

  return { clients: mcpClients, tools: availableTools };
}

// The function your Brain will call when Ollama says "use a tool"
export async function executeTool(toolName, args) {
  if (mcpClients.length === 0) await connectToMCP();
  
  console.log(`[BRAIN] Executing tool: ${toolName}...`);
  const client = toolToClientMap.get(toolName);
  
  if (!client) {
    throw new Error(`Tool ${toolName} not found in any connected MCP server.`);
  }

  const result = await client.callTool({
    name: toolName,
    arguments: args
  });
  
  return result.content[0].text;
}