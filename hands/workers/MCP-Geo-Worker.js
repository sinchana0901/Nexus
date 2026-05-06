/**
 * MCP Geo Worker — Real Zomato + Maps Integration
 * For food orders: spawns the real-world MCP (Puppeteer) to open Zomato
 * For ETA/Maps: uses Google Maps Directions API
 */

const { Client } = require("@modelcontextprotocol/sdk/client/index.js");
const { StdioClientTransport } = require("@modelcontextprotocol/sdk/client/stdio.js");
const axios = require('axios');
const path = require('path');

let foodClient = null;

// ── Zomato Food Order via Real-World MCP ───────────────────
async function getFoodClient() {
  if (foodClient) return foodClient;

  try {
    console.error('[GEO] Booting Real-World MCP for Zomato automation...');
    const transport = new StdioClientTransport({
      command: "node",
      args: [path.resolve(__dirname, '../../mcp/real-world-mcp.mjs')]
    });

    foodClient = new Client(
      { name: "Nexus-Hands-Geo", version: "1.0.0" },
      { capabilities: { tools: {} } }
    );
    await foodClient.connect(transport);

    const toolsResp = await foodClient.listTools();
    console.error('[GEO] Real-World MCP tools:', toolsResp.tools.map(t => t.name).join(', '));

    return foodClient;
  } catch (err) {
    console.error('[GEO] Failed to boot Real-World MCP:', err.message);
    foodClient = null;
    throw new Error(`Real-World MCP boot failed: ${err.message}`);
  }
}

// ── Main Executor ──────────────────────────────────────────
async function executeMCPGeo(task) {
  const payload = task.payload || {};
  const action = (task.action || '').toLowerCase();

  // ── Food Order (EXACT action match only) ─────────────
  // Only trigger on explicit food order actions — NOT substring matches
  const isFoodOrder = (
    action === 'order_food' ||
    action === 'food_order' ||
    action === 'order_from_zomato' ||
    payload.platform === 'zomato'
  );

  if (isFoodOrder) {
    const dish = payload.item || payload.dishName || payload.query || 'dum biryani';
    console.error(`[GEO] 🍕 Ordering "${dish}" via Zomato...`);

    try {
      const client = await getFoodClient();

      const result = await client.callTool({
        name: 'order_food',
        arguments: { dishName: dish }
      });

      const resultText = result.content?.[0]?.text || 'Food search initiated';
      console.error(`[GEO] ✅ Zomato result: ${resultText}`);

      return {
        mocked: false,
        node: 'geo',
        action: 'order_food',
        status: 'browser_opened',
        item: dish,
        mcp_result: resultText
      };
    } catch (err) {
      console.error(`[GEO] ❌ Zomato order failed: ${err.message}`);
      throw new Error(`Zomato order failed: ${err.message}`);
    }
  }

  // ── ETA / Directions ─────────────────────────────────
  if (action === 'get_eta' || action === 'get_directions' || action === 'navigate' || payload.location) {
    const mapsKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!mapsKey) {
      // Simulate ETA if no API key
      console.error('[GEO] No GOOGLE_MAPS_API_KEY — returning estimate');
      return {
        mocked: true,
        node: 'geo',
        action: 'get_eta',
        eta_minutes: '15-20 min (estimated)',
        note: 'Set GOOGLE_MAPS_API_KEY for real directions'
      };
    }

    const origin = payload.origin || 'HSR Layout, Bangalore';
    const destination = payload.location || payload.destination || 'Koramangala, Bangalore';

    try {
      const resp = await axios.get('https://maps.googleapis.com/maps/api/directions/json', {
        params: { origin, destination, key: mapsKey }
      });

      if (resp.data.status !== 'OK') throw new Error(`Maps API: ${resp.data.status}`);

      const leg = resp.data.routes[0].legs[0];
      return {
        mocked: false,
        node: 'geo',
        action: 'get_eta',
        eta_minutes: leg.duration.text,
        distance: leg.distance.text
      };
    } catch (err) {
      throw new Error(`Google Maps failed: ${err.message}`);
    }
  }

  // ── Browse URL ───────────────────────────────────────
  if (action === 'browse_website' || action === 'browse' || payload.url) {
    const url = payload.url || 'https://www.google.com';
    console.error(`[GEO] 🌐 Browsing: ${url}`);

    try {
      const client = await getFoodClient();
      const result = await client.callTool({
        name: 'browse_website',
        arguments: { url }
      });

      return {
        mocked: false,
        node: 'geo',
        action: 'browse',
        url: url,
        mcp_result: result.content?.[0]?.text || 'Page loaded'
      };
    } catch (err) {
      throw new Error(`Browser automation failed: ${err.message}`);
    }
  }

  throw new Error(`Unsupported geo action: "${action}". Valid actions: order_food, get_eta, browse_website`);
}

module.exports = { executeMCPGeo };