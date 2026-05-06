/**
 * MCP Comms Worker — Real WhatsApp Bridge Integration
 * Connects to the WhatsApp MCP server via SSE at localhost:8081
 * and sends real messages through the WhatsApp Web bridge.
 */

const { Client } = require("@modelcontextprotocol/sdk/client/index.js");
const { SSEClientTransport } = require("@modelcontextprotocol/sdk/client/sse.js");
const fs = require('fs');
const path = require('path');

let waClient = null;

// ── Contact Resolver ───────────────────────────────────────
// Reads the CONTACTS DIRECTORY table from MEMORY.md
// Handles anonymized placeholders (PERSON_A, PERSON_B) from Sentinel

const ANONYMIZED_PATTERN = /^(PERSON|CONTACT|NAME|USER)_[A-Z]$/i;

function loadContacts() {
  try {
    const memoryPath = path.resolve(process.cwd(), process.env.MEMORY_FILE_PATH || './brain/memory/MEMORY.md');
    const memory = fs.readFileSync(memoryPath, 'utf8');
    const lines = memory.split('\n');
    const contacts = [];

    for (const line of lines) {
      if (line.includes('|') && !line.includes('---') && !line.includes('Name')) {
        const cols = line.split('|').map(c => c.trim()).filter(Boolean);
        if (cols.length >= 2) {
          const phone = cols[1].replace(/\D/g, '');
          if (phone.length >= 10) {
            contacts.push({
              name: cols[0].trim(),
              phone: phone,
              relationship: cols[2]?.trim() || ''
            });
          }
        }
      }
    }
    return contacts;
  } catch (err) {
    console.error(`[COMMS] Contact file load failed:`, err.message);
    return [];
  }
}

function resolveContact(nameOrId, triggerText) {
  if (!nameOrId) return null;

  // If it's already a pure number, return it
  const cleaned = String(nameOrId).replace(/\D/g, '');
  if (cleaned.length >= 10) {
    return cleaned.length === 10 ? '91' + cleaned : cleaned;
  }

  const contacts = loadContacts();

  // ── ANONYMIZED PLACEHOLDER DETECTION ──────────────────────
  // If the LLM returned PERSON_A (sentinel missed PII detection),
  // try to find the real contact name from the original trigger text.
  if (ANONYMIZED_PATTERN.test(nameOrId)) {
    console.error(`[COMMS] ⚠ Detected anonymized placeholder: "${nameOrId}" — attempting recovery from trigger text`);

    if (triggerText) {
      const triggerLower = triggerText.toLowerCase();
      // Try to find a contact whose name appears in the original user input
      for (const c of contacts) {
        const nameParts = c.name.toLowerCase().split(/\s+/);
        // Match if any part of the contact name (first name or last name) appears in the trigger
        if (nameParts.some(part => part.length >= 3 && triggerLower.includes(part))) {
          console.error(`[COMMS] ✅ Recovered "${nameOrId}" → "${c.name}" (${c.phone}) from trigger text`);
          return c.phone;
        }
      }
    }

    // Last resort: if there's only one contact with a matching relationship hint
    // or just the first contact for PERSON_A
    const idx = nameOrId.charCodeAt(nameOrId.length - 1) - 65; // A=0, B=1...
    if (idx >= 0 && idx < contacts.length) {
      console.error(`[COMMS] ⚠ Fallback: mapping "${nameOrId}" → "${contacts[idx].name}" (${contacts[idx].phone}) by index`);
      return contacts[idx].phone;
    }

    console.error(`[COMMS] ❌ Could not recover real identity for placeholder "${nameOrId}"`);
    return null;
  }

  // ── NORMAL NAME LOOKUP ────────────────────────────────────
  const nameLower = nameOrId.toLowerCase().trim();
  for (const c of contacts) {
    const contactName = c.name.toLowerCase();
    // Exact or partial match
    if (contactName.includes(nameLower) || nameLower.includes(contactName)) {
      console.error(`[COMMS] Resolved "${nameOrId}" → ${c.phone}`);
      return c.phone;
    }
    // First-name match (e.g. "Pranav" matches "Pranav Mane")
    const firstWord = nameLower.split(/\s+/)[0];
    const contactFirst = contactName.split(/\s+/)[0];
    if (firstWord.length >= 3 && (contactFirst.includes(firstWord) || firstWord.includes(contactFirst))) {
      console.error(`[COMMS] Resolved "${nameOrId}" → ${c.phone} (first-name match)`);
      return c.phone;
    }
  }

  console.error(`[COMMS] Could not resolve contact: "${nameOrId}"`);
  return null;
}

// ── WhatsApp MCP Connection ────────────────────────────────
async function getWhatsAppClient() {
  if (waClient) return waClient;

  try {
    console.error('[COMMS] Connecting to WhatsApp MCP at http://localhost:8081/sse ...');
    const transport = new SSEClientTransport(new URL("http://localhost:8081/sse"));
    waClient = new Client(
      { name: "Nexus-Hands-Comms", version: "1.0.0" },
      { capabilities: { tools: {} } }
    );
    await waClient.connect(transport);

    // List available tools for debugging
    const toolsResp = await waClient.listTools();
    console.error('[COMMS] WhatsApp MCP tools:', toolsResp.tools.map(t => t.name).join(', '));

    return waClient;
  } catch (err) {
    console.error('[COMMS] Failed to connect to WhatsApp MCP:', err.message);
    waClient = null;
    throw new Error(`WhatsApp MCP connection failed: ${err.message}`);
  }
}

// ── Main Executor ──────────────────────────────────────────
async function executeMCPComms(task) {
  const payload = task.payload || {};

  // Resolve recipient — pass trigger text so anonymized placeholders can be recovered
  const recipientRaw = payload.contact_id || payload.recipient || payload.recipient_name;
  const triggerText = task.trigger || payload._trigger || '';
  const recipient = resolveContact(recipientRaw, triggerText);

  if (!recipient) {
    throw new Error(`Cannot resolve contact: "${recipientRaw}". Add them to MEMORY.md CONTACTS DIRECTORY.`);
  }

  const message = payload.message || payload.content || `Message from NEXUS on behalf of the user.`;

  console.error(`[COMMS] Sending WhatsApp to ${recipient}: "${message.substring(0, 60)}..."`);

  try {
    const client = await getWhatsAppClient();

    const result = await client.callTool({
      name: 'send_message',
      arguments: {
        recipient: recipient,
        message: message
      }
    });

    const resultText = result.content?.[0]?.text || 'Message sent';
    console.error(`[COMMS] ✅ WhatsApp result: ${resultText}`);

    return {
      mocked: false,
      node: 'comms',
      action: task.action,
      status: 'sent',
      recipient: recipient,
      message_preview: message.substring(0, 80),
      mcp_result: resultText
    };
  } catch (err) {
    console.error(`[COMMS] ❌ WhatsApp send failed: ${err.message}`);
    waClient = null; // Clear stale cache in case Docker restarted
    throw new Error(`WhatsApp send failed: ${err.message}`);
  }
}

module.exports = { executeMCPComms };