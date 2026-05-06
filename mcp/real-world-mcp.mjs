import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import puppeteer from 'puppeteer';

// Initialize the Server
const server = new McpServer({
  name: "Nexus-Real-World-Hands",
  version: "1.0.0"
});

// ==========================================
// TOOL 1: The Browser Automator
// ==========================================
server.tool(
  "browse_website",
  "Opens a web browser and navigates to a URL.",
  { url: z.string().describe("The full URL to navigate to") },
  async ({ url }) => {
    console.error(`[HANDS] 🌐 Launching browser for: ${url}`);
    
    const browser = await puppeteer.launch({ headless: false, defaultViewport: null });
    const page = await browser.newPage();
    
    try {
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 15000 });
      const title = await page.title();
      console.error(`[HANDS] 🌐 Successfully loaded: ${title}`);
      
      // Keep open for 15 seconds for demo visibility
      await new Promise(r => setTimeout(r, 15000));
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
  "Searches for a specific food item on Zomato by typing into the search box.",
  { dishName: z.string().describe("The name of the food to search for, e.g., 'dum biryani'") },
  async ({ dishName }) => {
    console.error(`[HANDS] 🍕 Booting up Zomato AI Agent for: ${dishName}`);
    
    // Launch browser maximized for demo
    const browser = await puppeteer.launch({
      headless: false,
      defaultViewport: null,
      args: ['--start-maximized']
    });
    const page = await browser.newPage();
    
    try {
      // Step 1: Navigate to Zomato homepage
      console.error(`[HANDS] 🍕 Navigating to Zomato...`);
      await page.goto('https://www.zomato.com/bangalore', { waitUntil: 'networkidle2', timeout: 20000 });
      
      // Wait for page to settle
      await new Promise(r => setTimeout(r, 2000));

      // Step 2: Find and click the search input
      // Zomato uses multiple possible selectors for search
      console.error(`[HANDS] 🍕 Looking for search box...`);
      
      const searchSelectors = [
        'input[placeholder*="Search"]',
        'input[placeholder*="search"]',
        'input[placeholder*="restaurant"]',
        'input[placeholder*="dish"]',
        'input[type="search"]',
        'input[aria-label*="Search"]',
        'input[class*="search"]',
        '[data-testid="search-input"]',
        '.sc-bZQynM input',        // Common Zomato class pattern
        '.searchInput input',
        'input[name="q"]'
      ];

      let searchInput = null;
      for (const selector of searchSelectors) {
        try {
          searchInput = await page.waitForSelector(selector, { timeout: 3000 });
          if (searchInput) {
            console.error(`[HANDS] ✅ Found search box with selector: ${selector}`);
            break;
          }
        } catch {
          // Try next selector
        }
      }

      if (!searchInput) {
        // Fallback: try clicking any prominent input on the page
        console.error(`[HANDS] ⚠ No search box found with known selectors, trying generic approach...`);
        
        // Try to find any visible text input
        searchInput = await page.evaluateHandle(() => {
          const inputs = document.querySelectorAll('input[type="text"], input:not([type])');
          for (const input of inputs) {
            const rect = input.getBoundingClientRect();
            if (rect.width > 100 && rect.height > 20) {
              return input;
            }
          }
          return null;
        });

        if (!searchInput || !(await searchInput.asElement())) {
          // Ultimate fallback: use the URL-based search
          console.error(`[HANDS] ⚠ Falling back to URL-based search...`);
          const searchUrl = `https://www.zomato.com/bangalore/delivery?search_query=${encodeURIComponent(dishName)}`;
          await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 15000 });
          
          console.error(`[HANDS] ✅ URL-based search complete for: ${dishName}`);
          await new Promise(r => setTimeout(r, 30000));
          await browser.close();
          return { content: [{ type: "text", text: `Successfully searched Zomato for ${dishName} via URL.` }] };
        }
      }

      // Step 3: Click and type into the search box
      console.error(`[HANDS] 🍕 Typing "${dishName}" into search box...`);
      await searchInput.click();
      await new Promise(r => setTimeout(r, 500));
      
      // Type slowly (human-like) for demo effect
      await page.keyboard.type(dishName, { delay: 80 });
      
      console.error(`[HANDS] 🍕 Typed "${dishName}" — waiting for suggestions...`);
      await new Promise(r => setTimeout(r, 2000));
      
      // Step 4: Press Enter to search
      await page.keyboard.press('Enter');
      console.error(`[HANDS] 🍕 Pressed Enter — waiting for results...`);
      
      // Wait for results to load
      await new Promise(r => setTimeout(r, 3000));
      
      console.error(`[HANDS] ✅ Search complete! Results visible for: ${dishName}`);
      
      // Keep browser open for 30 seconds so judges/audience can see results
      await new Promise(r => setTimeout(r, 30000));
      await browser.close();
      
      return { content: [{ type: "text", text: `Successfully searched Zomato for "${dishName}". Typed into search box and displayed results.` }] };
    } catch (error) {
      console.error(`[HANDS] ❌ Zomato automation error: ${error.message}`);
      try { await browser.close(); } catch {}
      return { content: [{ type: "text", text: `Zomato search failed: ${error.message}` }] };
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