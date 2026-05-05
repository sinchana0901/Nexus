const axios = require('axios');
const readline = require('readline');
require('dotenv').config();

const BRAIN_URL = `http://localhost:${process.env.BRAIN_PORT || 3001}`;
const HANDS_URL = `http://localhost:${process.env.HANDS_PORT || 3002}`;

async function nexus(userInput) {
  console.log(`\n⚡ NEXUS activated: "${userInput}"\n`);
  
  try {
    // Step 1: Brain Thinks
    console.log('🧠 Brain processing...');
    const thinkResponse = await axios.post(`${BRAIN_URL}/think`, { input: userInput });
    const { contract } = thinkResponse.data;
    
    const rm = contract.routing_metadata;
    console.log(`✓ Contract generated | Inference: ${rm.inference_used.toUpperCase()} | Tasks: ${contract.tasks.length}`);
    
    // Step 2: Soul Guard Approval Gate
    if (contract.requires_approval) {
      console.log(`\n⚠️  APPROVAL REQUIRED: ${contract.approval_reason}`);
      const approved = await askUserApproval();
      if (!approved) {
        console.log('❌ User declined. Execution aborted.');
        return;
      }
      contract.requires_approval = false; // Override approved
    }
    
    // Step 3: Hands Execute
    console.log('\n🖐️  Hands executing swarm...\n');
    console.log("🖐️ Hands executing swarm...");

// ==========================================
// 🚀 REAL-WORLD MCP SWARM INJECTION 
// ==========================================
async function runSwarmAction() {
    try {
        // 1. Load the MCP bridge dynamically (Note the updated path!)
        const mcpBridge = await import('./brain/mcp-client.mjs');
        
        // 2. Connect to the Hands
        const { tools } = await mcpBridge.connectToMCP();
        
        // 3. NEW TEST: Let's trigger the actual Food Automator!
        console.log("🤖 Triggering the Zomato Automator Tool...");
        const result = await mcpBridge.executeTool('order_food', { 
            dishName: 'dum biryani' 
        });
        
        console.log("✅ Result from Hands:", result);
    } catch (error) {
        console.error("🔥 Swarm execution failed:", error);
    }
}

// Call the test function
runSwarmAction();
// ==========================================
    await axios.post(`${HANDS_URL}/execute`, { contract });
    // The visual output will primarily be handled by the Hands server's Silent Room
    
  } catch (err) {
    console.error('\n🔥 System Error:', err.response?.data?.error || err.message);
    if (err.response?.data?.details) {
      console.error('Details:', err.response.data.details);
    }
  }
}

async function askUserApproval() {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => {
    rl.question('Approve execution? (y/n): ', answer => {
      rl.close();
      resolve(answer.toLowerCase() === 'y');
    });
  });
}

// Interactive REPL Setup
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
console.log('\n╔════════════════════════════════════╗');
console.log('║        N E X U S   L I V E         ║');
console.log('╚════════════════════════════════════╝\n');

const promptUser = () => {
  rl.question('> ', async (line) => {
    if (line.trim()) {
      await nexus(line.trim());
    }
    promptUser();
  });
};

promptUser();