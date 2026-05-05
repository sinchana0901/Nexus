import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import puppeteer from 'puppeteer';

// Initialize the Server
const server = new McpServer({
  name: "Nexus-Real-World-Hands",
  version: "1.0.0"
});

// The Browser Automator Tool
server.tool(
  "browse_website",
  "Opens a web browser and navigates to a URL.",
  { url: z.string().describe("The full URL to navigate to") },
  async ({ url }) => {
    console.error(`[HANDS] 🌐 Launching browser for: ${url}`);
    
    // Launch a visible browser!
    const browser = await puppeteer.launch({ headless: false }); 
    const page = await browser.newPage();
    
    try {
      await page.goto(url, { waitUntil: 'networkidle2' });
      const title = await page.title();
      console.error(`[HANDS] 🌐 Successfully loaded: ${title}`);
      
      // Wait 3 seconds so you can see it, then close
      await new Promise(r => setTimeout(r, 3000));
      await browser.close();
      
      return { content: [{ type: "text", text: `Successfully browsed ${url}. Page title: ${title}` }] };
    } catch (error) {
      await browser.close();
      return { content: [{ type: "text", text: `Failed to load ${url}: ${error.message}` }] };
    }
  }
);

// ==========================================
// TOOL 2: The Food Order Automator
// ==========================================
server.tool(
  "order_food",
  "Searches for a specific food item on Zomato to begin the ordering process.",
  { dishName: z.string().describe("The name of the food to search for, e.g., 'dum biryani'") },
  async ({ dishName }) => {
    console.error(`[HANDS] 🍕 Booting up Zomato AI Agent for: ${dishName}`);
    
    // Launch browser (maximized so it looks cool for the demo)
    const browser = await puppeteer.launch({ headless: false, defaultViewport: null }); 
    const page = await browser.newPage();
    
    try {
      // Direct navigation to Zomato's internal search URL is the most reliable hackathon trick
      const searchUrl = `https://www.zomato.com/bangalore/restaurants?search_query=${encodeURIComponent(dishName)}`;
      
      console.error(`[HANDS] 🍕 Navigating directly to search query...`);
      await page.goto(searchUrl, { waitUntil: 'networkidle2' });
      
      console.error(`[HANDS] ✅ Search complete! Waiting for user to select restaurant.`);
      
      // Keep it open for 5 seconds so the judges can see the biryani results!
      await new Promise(r => setTimeout(r, 5000));
      await browser.close();
      
      return { content: [{ type: "text", text: `Successfully searched Zomato for ${dishName}.` }] };
    } catch (error) {
      await browser.close();
      return { content: [{ type: "text", text: `Failed to search for food: ${error.message}` }] };
    }
  }
);

// Start the Server
async function run() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("[HANDS] ⚡ Real-World MCP Server running on stdio");
}

run().catch(console.error);