/**
 * ═══════════════════════════════════════════════════════════
 *  NEXUS Voice Server — Port 3000
 *  The final presentation layer: Voice ↔ Brain ↔ Hands
 * ═══════════════════════════════════════════════════════════
 */

const express = require('express');
const axios   = require('axios');
const { spawn } = require('child_process');
const path    = require('path');
require('dotenv').config();

const app  = express();
const PORT = process.env.VOICE_PORT || 3000;

const BRAIN_URL = `http://localhost:${process.env.BRAIN_PORT || 3001}`;
const HANDS_URL = `http://localhost:${process.env.HANDS_PORT || 3002}`;

// ── Middleware ──────────────────────────────────────────────
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));


// ── TTS Helper ─────────────────────────────────────────────
function speak(text) {
    return new Promise((resolve) => {
        const sanitized = text.replace(/"/g, '\\"');
        const proc = spawn('python', ['tts_worker.py', sanitized], {
            cwd: __dirname,
            stdio: 'ignore',
            windowsHide: true
        });
        proc.on('close', () => resolve());
        proc.on('error', (err) => {
            console.error('[TTS] Spawn error:', err.message);
            resolve();
        });
    });
}


// ── Approval State ─────────────────────────────────────────
const pendingApprovals = new Map();


// ═══════════════════════════════════════════════════════════
//  POST /api/command — Main voice command pipeline
// ═══════════════════════════════════════════════════════════
app.post('/api/command', async (req, res) => {
    const { text } = req.body;
    if (!text || !text.trim()) {
        return res.status(400).json({ status: 'error', text: 'No input received.' });
    }

    const startTime = Date.now();
    console.log(`\n[VOICE] ▶ "${text}"`);

    try {
        // ── 1. Send to Brain ───────────────────────────────
        const brainRes = await axios.post(`${BRAIN_URL}/think`, { input: text }, {
            timeout: 120000
        });
        const data = brainRes.data;

        const latency = Date.now() - startTime;
        console.log(`[VOICE] Brain responded in ${latency}ms`);

        // Extract top-level sentinel telemetry from Brain
        const sentinel = data.sentinel || {};
        const routingMeta = data.routing_metadata || {};

        // Build telemetry object for frontend
        const telemetry = {
            inference_used: routingMeta.inference_used || sentinel.routing_decision || 'unknown',
            sentinel_decision: sentinel.routing_decision || routingMeta.sentinel_decision || 'unknown',
            intent_class: sentinel.intent_class || 'unknown',
            confidence: sentinel.confidence || 0,
            anonymization_applied: sentinel.anonymization_applied || false,
            sensitive_entities_count: (sentinel.sensitive_entities || []).length,
            sensitive_entities: (sentinel.sensitive_entities || []).map(e => ({
                type: e.type,
                masked: true  // don't leak the actual tokens to frontend
            })),
            sentinel_latency_ms: routingMeta.sentinel_latency_ms || 0,
            executor_latency_ms: routingMeta.executor_latency_ms || 0,
            total_latency_ms: latency
        };

        console.log(`[VOICE] Telemetry: ${telemetry.inference_used.toUpperCase()} | Intent: ${telemetry.intent_class} | PII: ${telemetry.anonymization_applied ? 'MASKED' : 'NONE'}`);

        // ── 2. Get Contract ────────────────────────────────
        const contract = data.contract;
        if (!contract) {
            return res.status(500).json({
                status: 'error',
                text: 'Brain returned an unrecognized format.'
            });
        }

        const tasks = contract.tasks || [];

        // ── 3. Handle Narrative (introspective / conversational) ──
        // If the contract has a narrative_response and no tasks, it's a pure conversation
        if (contract.narrative_response && tasks.length === 0) {
            const narrative = contract.narrative_response;
            console.log(`[VOICE] Narrative: "${narrative.substring(0, 80)}..."`);
            speak(narrative);

            return res.json({
                status:      'narrative',
                text:        narrative,
                telemetry:   telemetry,
                session_id:  contract.session_id
            });
        }

        // ── 4. Handle narrative + tasks (conversational + action) ──
        // Speak the narrative, then execute the tasks
        if (contract.narrative_response) {
            await speak(contract.narrative_response);
        }

        // ── 5. Requires Approval? ──────────────────────────
        if (contract.requires_approval) {
            const reason = contract.approval_reason || 'This action requires your explicit confirmation.';
            const warningMsg = contract.narrative_response
                ? `${contract.narrative_response} But first — ${reason}. Do you approve?`
                : `Attention. ${reason}. Do you approve?`;

            if (!contract.narrative_response) speak(warningMsg);

            console.log(`[VOICE] Approval required: ${reason}`);
            pendingApprovals.set(contract.session_id, contract);

            return res.json({
                status:      'approval_required',
                text:        warningMsg,
                narrative:   contract.narrative_response || null,
                session_id:  contract.session_id,
                tasks:       tasks.map(t => ({
                    node:    t.node,
                    action:  t.action,
                    payload: t.payload || {},
                    status:  'pending_approval'
                })),
                telemetry:   telemetry
            });
        }

        // ── 6. Auto-Execute Swarm ──────────────────────────
        const execMsg = contract.narrative_response
            || `Executing parallel swarm. ${tasks.length} task${tasks.length !== 1 ? 's' : ''} deployed.`;

        if (!contract.narrative_response) {
            speak(`Executing parallel swarm. ${tasks.length} task${tasks.length !== 1 ? 's' : ''} deployed.`);
        }

        console.log(`[VOICE] Dispatching ${tasks.length} tasks to Hands...`);

        // Fire to Hands (don't block UI response)
        axios.post(`${HANDS_URL}/execute`, { contract })
            .then(r => {
                console.log(`[VOICE] Hands result:`, r.data?.status);
                const execResults = r.data?.results || [];
                for (const taskResult of execResults) {
                    if (taskResult.status === 'success' && taskResult.result) {
                        // Read out schedule
                        if (taskResult.node === 'google' && taskResult.result.action === 'get_schedule' && taskResult.result.summary) {
                            console.log(`[VOICE] Reading out schedule: ${taskResult.result.summary}`);
                            speak(taskResult.result.summary);
                        }
                        // Read out event creation
                        if (taskResult.node === 'google' && taskResult.result.action === 'create_event' && taskResult.result.status === 'created') {
                            const eventMsg = `Successfully scheduled ${taskResult.result.title}.`;
                            console.log(`[VOICE] Reading out event creation: ${eventMsg}`);
                            speak(eventMsg);
                        }
                        // Read out ETA
                        if (taskResult.node === 'geo' && taskResult.result.action === 'get_eta') {
                            const etaMsg = `The estimated travel time is ${taskResult.result.eta_minutes}.`;
                            console.log(`[VOICE] Reading out ETA: ${etaMsg}`);
                            speak(etaMsg);
                        }
                    }
                }
            })
            .catch(err => console.error('[VOICE] Hands error:', err.message));

        return res.json({
            status:      'executed',
            text:        execMsg,
            session_id:  contract.session_id,
            tasks:       tasks.map(t => ({
                node:    t.node,
                action:  t.action,
                payload: t.payload || {},
                task_id: t.task_id,
                status:  'dispatched'
            })),
            telemetry:   telemetry
        });

    } catch (error) {
        const errMsg = error.response?.data?.error || error.message;
        console.error(`[VOICE] Pipeline error: ${errMsg}`);
        speak('System error. Internal communication failed.');
        return res.status(500).json({
            status: 'error',
            text:   `NEXUS Pipeline Failure: ${errMsg}`
        });
    }
});


// ═══════════════════════════════════════════════════════════
//  POST /api/approve — Handle approval flow
// ═══════════════════════════════════════════════════════════
app.post('/api/approve', async (req, res) => {
    const { session_id, approved } = req.body;

    if (!session_id) {
        return res.status(400).json({ status: 'error', text: 'Missing session_id.' });
    }

    const contract = pendingApprovals.get(session_id);
    if (!contract) {
        return res.status(404).json({ status: 'error', text: 'No pending contract found for this session.' });
    }

    pendingApprovals.delete(session_id);

    if (!approved) {
        speak('Execution cancelled.');
        return res.json({ status: 'cancelled', text: 'Contract execution cancelled by user.' });
    }

    contract.requires_approval = false;
    const tasks = contract.tasks || [];
    const execMsg = `Approved. Executing ${tasks.length} task${tasks.length !== 1 ? 's' : ''}.`;

    speak(execMsg);

    axios.post(`${HANDS_URL}/execute`, { contract })
        .then(r => {
            console.log(`[VOICE] Approved execution result:`, r.data?.status);
            const execResults = r.data?.results || [];
            for (const taskResult of execResults) {
                if (taskResult.status === 'success' && taskResult.result) {
                    if (taskResult.node === 'google' && taskResult.result.action === 'get_schedule' && taskResult.result.summary) {
                        speak(taskResult.result.summary);
                    }
                    if (taskResult.node === 'google' && taskResult.result.action === 'create_event' && taskResult.result.status === 'created') {
                        speak(`Successfully scheduled ${taskResult.result.title}.`);
                    }
                    if (taskResult.node === 'geo' && taskResult.result.action === 'get_eta') {
                        speak(`The estimated travel time is ${taskResult.result.eta_minutes}.`);
                    }
                }
            }
        })
        .catch(err => console.error('[VOICE] Approved execution error:', err.message));

    return res.json({
        status: 'executed',
        text:   execMsg,
        tasks:  tasks.map(t => ({
            node:   t.node,
            action: t.action,
            payload: t.payload || {},
            task_id: t.task_id,
            status: 'dispatched'
        }))
    });
});


// ═══════════════════════════════════════════════════════════
//  Health Check
// ═══════════════════════════════════════════════════════════
app.get('/health', (req, res) => res.json({
    status: 'voice-nexus online',
    port:   PORT,
    uptime: process.uptime()
}));


// ═══════════════════════════════════════════════════════════
//  Start Server
// ═══════════════════════════════════════════════════════════
app.listen(PORT, () => {
    console.log(`\n╔═══════════════════════════════════════╗`);
    console.log(`║   🎙️  VOICE-NEXUS ONLINE  [Port ${PORT}]  ║`);
    console.log(`║   Brain → ${BRAIN_URL}              ║`);
    console.log(`║   Hands → ${HANDS_URL}              ║`);
    console.log(`╚═══════════════════════════════════════╝\n`);
});
