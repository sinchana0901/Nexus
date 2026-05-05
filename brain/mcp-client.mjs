import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

let mcpClient = null;
let availableTools = [];

export async function connectToMCP() {
  if (mcpClient) return { client: mcpClient, tools: availableTools };

  console.log("🔌 Connecting Brain to Real-World Hands...");

  // Point this directly to the server file we made in Step 1
  const transport = new StdioClientTransport({
    command: "node",
    args: ["./mcp/real-world-mcp.mjs"] 
  });

  const client = new Client(
    { name: "Nexus-Brain", version: "1.0.0" },
    { capabilities: { tools: {} } }
  );

  await client.connect(transport);
  
  // Ask the Hands what tools it has
  const toolsResponse = await client.listTools();
  availableTools = toolsResponse.tools;
  
  console.log("✅ Brain connected! Available Tools:", availableTools.map(t => t.name).join(', '));

  mcpClient = client;
  return { client, tools: availableTools };
}

// The function your Brain will call when Ollama says "use a tool"
export async function executeTool(toolName, args) {
  if (!mcpClient) await connectToMCP();
  
  console.log(`[BRAIN] Executing tool: ${toolName}...`);
  const result = await mcpClient.callTool({
    name: toolName,
    arguments: args
  });
  
  return result.content[0].text;
}