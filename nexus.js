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
    console.log('\\n🖐️  Hands executing swarm...\\n');

    // ==========================================
    // 🚀 REAL-WORLD MCP SWARM INJECTION 
    // ==========================================
    async function runSwarmAction(contract) {
        try {
            console.log("\\n[NEXUS] Contract Tasks Breakdown:");
            console.log(JSON.stringify(contract.tasks, null, 2));

            // 1. Load the MCP bridge dynamically
            const mcpBridge = await import('./brain/mcp-client.mjs');
            
            // 2. Connect to the Hands
            const { tools } = await mcpBridge.connectToMCP();
            
            for (const task of contract.tasks) {
                console.log(`\n===================================`);
                console.log(`🚀 Executing Task Node: ${task.node} | Action: ${task.action}`);

                if (task.node === 'comms' || task.action.includes('WhatsApp') || (task.payload && task.payload.message)) {
                    console.log("🟢 Routing to WhatsApp MCP...");
                    try {
                        const recipient = task.payload.contact_id || task.payload.recipient || "918660573165";
                        let message = task.payload.message || task.payload.content || "Hello from NEXUS!";
                        
                        if (recipient === "8660573165" || recipient === "+918660573165" || recipient.includes("8660573165")) {
                            message = message + " [Sent via NEXUS Auto-Routing]";
                        }

                        let formatRecipient = String(recipient).replace(/\\D/g, '');
                        if (formatRecipient.length === 10) formatRecipient = "91" + formatRecipient;
                        else if (!formatRecipient.startsWith("91")) formatRecipient = "91" + formatRecipient.slice(-10);

                        const waResult = await mcpBridge.executeTool('send_message', { 
                            recipient: formatRecipient,
                            message: message
                        });
                        console.log("✅ Result from WhatsApp:", waResult);
                    } catch (waErr) {
                        console.error("🔥 WhatsApp tool failed:", waErr.message);
                    }
                } else if (task.node === 'geo' || task.node === 'finance' || task.action.includes('Order') || task.action.includes('Zomato') || (task.payload && (task.payload.item || task.payload.query || task.payload.amount))) {
                    console.log("🤖 Routing to Zomato Automator...");
                    try {
                        // Extract dish dynamically from the payload (or default to dum biryani if unspecified)
                        const dish = task.payload.item || task.payload.query || task.payload.dishName || 'dum biryani';
                        const result = await mcpBridge.executeTool('order_food', { 
                            dishName: dish 
                        });
                        console.log("✅ Result from Zomato:", result);
                    } catch (err) {
                        console.error("🔥 Zomato tool failed:", err.message);
                    }
                } else {
                     console.log("⚠️ Unknown task routing. Payload:", task.payload);
                }
            }
        } catch (error) {
            console.error("🔥 Swarm execution failed:", error);
        }
    }

    // Call the test function
    await runSwarmAction(contract);
    // ==========================================
    
    // Original hands endpoint trigger (Silent room handling)
    await axios.post(`${HANDS_URL}/execute`, { contract });
    
  } catch (err) {
    console.error('\\n🔥 System Error:', err.response?.data?.error || err.message);
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
console.log('\\n╔════════════════════════════════════╗');
console.log('║        N E X U S   L I V E         ║');
console.log('╚════════════════════════════════════╝\\n');

const promptUser = () => {
  rl.question('> ', async (line) => {
    if (line.trim()) {
      await nexus(line.trim());
    }
    promptUser();
  });
};

promptUser();
