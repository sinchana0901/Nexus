/**
 * MCP Google Worker — Real Google Calendar Integration
 * Uses googleapis with OAuth2 credentials from credentials.json + token.json
 * Supports: get_schedule, create_event
 */

const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

// ── Silent Authentication ──────────────────────────────────
function getAuthClient() {
  const credPath = path.join(__dirname, 'credentials.json');
  // token.json might be in workers/ or in project root (depending on where get-token.js saved it)
  let tokenPath = path.join(__dirname, 'token.json');
  if (!fs.existsSync(tokenPath)) {
    tokenPath = path.resolve(__dirname, '../../token.json');
  }

  if (!fs.existsSync(credPath)) {
    throw new Error(`Missing credentials.json at ${credPath}`);
  }
  if (!fs.existsSync(tokenPath)) {
    throw new Error(`Missing token.json. Run 'node hands/workers/get-token.js' first.`);
  }

  const credentials = JSON.parse(fs.readFileSync(credPath, 'utf8'));
  const token = JSON.parse(fs.readFileSync(tokenPath, 'utf8'));

  const { client_secret, client_id, redirect_uris } = credentials.installed;
  const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);
  oAuth2Client.setCredentials(token);

  return oAuth2Client;
}

// ── Get Today's Schedule ───────────────────────────────────
async function getSchedule() {
  const auth = getAuthClient();
  const calendar = google.calendar({ version: 'v3', auth });

  const now = new Date();
  const endOfDay = new Date(now);
  endOfDay.setHours(23, 59, 59, 999);

  console.error(`[GOOGLE] 📅 Fetching calendar events for today...`);

  const res = await calendar.events.list({
    calendarId: 'primary',
    timeMin: now.toISOString(),
    timeMax: endOfDay.toISOString(),
    maxResults: 10,
    singleEvents: true,
    orderBy: 'startTime',
  });

  const events = res.data.items || [];

  if (events.length === 0) {
    return {
      mocked: false,
      node: 'google',
      action: 'get_schedule',
      status: 'success',
      events: [],
      summary: 'No upcoming events for the rest of today.'
    };
  }

  const eventList = events.map(event => {
    const start = event.start.dateTime || event.start.date;
    const end = event.end.dateTime || event.end.date;
    return {
      title: event.summary || 'Untitled Event',
      start,
      end,
      location: event.location || null,
      description: event.description || null
    };
  });

  const summaryLines = eventList.map(e => {
    const startTime = new Date(e.start).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    const endTime = new Date(e.end).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    return `${e.title} (${startTime} – ${endTime})`;
  });

  console.error(`[GOOGLE] ✅ Found ${events.length} events`);

  return {
    mocked: false,
    node: 'google',
    action: 'get_schedule',
    status: 'success',
    events: eventList,
    summary: `Today's schedule: ${summaryLines.join(', ')}`
  };
}

// ── Create Calendar Event ──────────────────────────────────
async function createEvent(payload) {
  const auth = getAuthClient();
  const calendar = google.calendar({ version: 'v3', auth });

  const title = payload.title || 'NEXUS Event';
  let start = payload.start || payload.start_time;
  let end = payload.end || payload.end_time;

  // Fallback if LLM provides "date" and "time" separately
  if (!start && payload.date && payload.time) {
    const startObj = new Date(`${payload.date}T${payload.time}:00+05:30`);
    start = startObj.toISOString();
    const endObj = new Date(startObj.getTime() + 60 * 60 * 1000); // +1 hour
    end = endObj.toISOString();
  }

  if (!start || !end) {
    throw new Error(`create_event requires payload.start and payload.end (ISO strings). Received payload: ${JSON.stringify(payload)}`);
  }

  // The LLM often mistakenly appends 'Z' (UTC) to times. 
  // We strip any existing timezone and explicitly force +05:30 (IST).
  const cleanStart = start.replace(/Z$/, '').replace(/[\+\-]\d{2}:\d{2}$/, '');
  const cleanEnd = end.replace(/Z$/, '').replace(/[\+\-]\d{2}:\d{2}$/, '');
  
  const finalStart = `${cleanStart}+05:30`;
  const finalEnd = `${cleanEnd}+05:30`;

  console.error(`[GOOGLE] 📅 Creating event: "${title}" from ${finalStart} to ${finalEnd}`);

  const event = {
    summary: title,
    start: { dateTime: finalStart, timeZone: 'Asia/Kolkata' },
    end: { dateTime: finalEnd, timeZone: 'Asia/Kolkata' },
  };

  if (payload.description) event.description = payload.description;
  if (payload.location) event.location = payload.location;

  const res = await calendar.events.insert({
    calendarId: 'primary',
    resource: event,
  });

  console.error(`[GOOGLE] ✅ Event created: ${res.data.htmlLink}`);

  return {
    mocked: false,
    node: 'google',
    action: 'create_event',
    status: 'created',
    event_id: res.data.id,
    title: title,
    start: start,
    end: end,
    link: res.data.htmlLink
  };
}

// ── Main Executor ──────────────────────────────────────────
async function executeGoogleWorkspace(task) {
  const payload = task.payload || {};
  const action = task.action || '';

  try {
    if (action === 'get_schedule' || action === 'check_schedule' || action === 'view_schedule') {
      return await getSchedule();
    }

    if (action === 'create_event' || action === 'book_meeting' || action === 'schedule_event') {
      return await createEvent(payload);
    }

    throw new Error(`Unsupported Google action: "${action}". Use get_schedule or create_event.`);
  } catch (err) {
    console.error(`[GOOGLE] ❌ Error: ${err.message}`);
    throw err;
  }
}

module.exports = { executeGoogleWorkspace };
