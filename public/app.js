/**
 * ═══════════════════════════════════════════════════════════
 *  NEXUS Frontend — Voice Interface Controller
 *  Handles: Speech Recognition, Pipeline Comms, Task Viz,
 *           Sentinel Telemetry, Privacy Display
 * ═══════════════════════════════════════════════════════════
 */

// ── DOM References ─────────────────────────────────────────
const micBtn       = document.getElementById('micBtn');
const micLabel     = document.getElementById('micLabel');
const terminalFeed = document.getElementById('terminalFeed');
const latencyDisp  = document.getElementById('latencyDisplay');
const brainDot     = document.getElementById('brainDot');
const handsDot     = document.getElementById('handsDot');
const voiceDot     = document.getElementById('voiceDot');

// Telemetry panel refs
const telPanel     = document.getElementById('telemetryPanel');
const telInference = document.getElementById('telInference');
const telIntent    = document.getElementById('telIntent');
const telPrivacy   = document.getElementById('telPrivacy');
const telSentinelMs= document.getElementById('telSentinelMs');
const telExecutorMs= document.getElementById('telExecutorMs');
const telTotalMs   = document.getElementById('telTotalMs');


// ── Particle System ────────────────────────────────────────
(function initParticles() {
    const container = document.getElementById('particles');
    const count = 25;
    for (let i = 0; i < count; i++) {
        const p = document.createElement('div');
        p.className = 'particle';
        p.style.left     = Math.random() * 100 + '%';
        p.style.animationDuration = (8 + Math.random() * 16) + 's';
        p.style.animationDelay    = (Math.random() * 12) + 's';
        p.style.width  = (1 + Math.random() * 2) + 'px';
        p.style.height = p.style.width;
        container.appendChild(p);
    }
})();


// ── Node-to-Icon Mapping ───────────────────────────────────
const NODE_ICONS = {
    comms:    '📡',
    geo:      '🗺️',
    finance:  '💳',
    calendar: '📅',
    browser:  '🌐',
    search:   '🔍',
    default:  '⚡'
};

function getNodeIcon(node) {
    return NODE_ICONS[node] || NODE_ICONS.default;
}


// ── Routing Badge HTML ─────────────────────────────────────
function routingBadge(routing) {
    if (!routing) return '';
    const r = routing.toLowerCase();
    const cls = r.includes('ollama') || r === 'local'
        ? 'local'
        : r.includes('cache')
            ? 'cache'
            : 'cloud';
    const label = routing.toUpperCase();
    return `<span class="routing-badge ${cls}">${label}</span>`;
}


// ── Telemetry Panel Update ─────────────────────────────────
function updateTelemetry(telemetry) {
    if (!telemetry || !telPanel) return;

    telPanel.classList.add('visible');

    // Inference engine
    const inf = (telemetry.inference_used || 'unknown').toLowerCase();
    telInference.textContent = telemetry.inference_used?.toUpperCase() || '—';
    telInference.className = 'telemetry-value';
    if (inf.includes('ollama') || inf === 'local') telInference.classList.add('ollama');
    else if (inf.includes('groq') || inf === 'cloud') telInference.classList.add('groq');
    else if (inf.includes('cache')) telInference.classList.add('cache');

    // Intent class
    telIntent.textContent = telemetry.intent_class?.toUpperCase() || '—';

    // Privacy
    if (telemetry.anonymization_applied) {
        telPrivacy.innerHTML = `<span class="privacy-badge masked">🔒 PII MASKED (${telemetry.sensitive_entities_count || 0} entities)</span>`;
    } else if (inf.includes('ollama') || inf === 'local') {
        telPrivacy.innerHTML = `<span class="privacy-badge local">🏠 FULLY LOCAL</span>`;
    } else {
        telPrivacy.innerHTML = `<span class="privacy-badge local">✓ NO PII</span>`;
    }

    // Latencies
    telSentinelMs.textContent = telemetry.sentinel_latency_ms ? `${telemetry.sentinel_latency_ms}ms` : '—';
    telExecutorMs.textContent = telemetry.executor_latency_ms ? `${telemetry.executor_latency_ms}ms` : '—';
    telTotalMs.textContent = telemetry.total_latency_ms ? `${telemetry.total_latency_ms}ms` : '—';
}


// ── Terminal Logger ────────────────────────────────────────
function log(message, cls = 'log-system', isHTML = false) {
    const div = document.createElement('div');
    div.className = `log-entry ${cls}`;
    if (isHTML) {
        div.innerHTML = `&gt; ${message}`;
    } else {
        div.textContent = `> ${message}`;
    }
    terminalFeed.appendChild(div);
    terminalFeed.scrollTop = terminalFeed.scrollHeight;
}

function logTaskCard(task, delay = 0) {
    return new Promise(resolve => {
        setTimeout(() => {
            const card = document.createElement('div');
            card.className = `task-card ${task.status || ''}`;

            // Build payload preview
            let payloadPreview = '';
            if (task.payload) {
                if (task.payload.message) {
                    payloadPreview = `"${task.payload.message.substring(0, 50)}${task.payload.message.length > 50 ? '...' : ''}"`;
                } else if (task.payload.item) {
                    payloadPreview = `🍕 ${task.payload.item}`;
                } else if (task.payload.recipient_name) {
                    payloadPreview = `→ ${task.payload.recipient_name}`;
                }
            }

            card.innerHTML = `
                <div class="task-icon">${getNodeIcon(task.node)}</div>
                <div class="task-info">
                    <div class="task-node">${task.node || 'unknown'}</div>
                    <div class="task-action">${task.action || ''}${payloadPreview ? ` · ${payloadPreview}` : ''}</div>
                </div>
                <div class="task-status">${task.status || 'queued'}</div>
            `;
            terminalFeed.appendChild(card);
            terminalFeed.scrollTop = terminalFeed.scrollHeight;
            resolve();
        }, delay);
    });
}

function logApprovalButtons(sessionId) {
    const row = document.createElement('div');
    row.className = 'approval-row';
    row.id = `approval-${sessionId}`;
    row.innerHTML = `
        <button class="approval-btn approve" onclick="handleApproval('${sessionId}', true)">✓ Approve</button>
        <button class="approval-btn deny" onclick="handleApproval('${sessionId}', false)">✕ Deny</button>
    `;
    terminalFeed.appendChild(row);
    terminalFeed.scrollTop = terminalFeed.scrollHeight;
}


// ── State Management ───────────────────────────────────────
let isListening  = false;
let isProcessing = false;

function setMicState(state) {
    micBtn.classList.remove('listening', 'processing');
    micLabel.classList.remove('active', 'processing');

    switch (state) {
        case 'idle':
            micLabel.textContent = 'CLICK TO SPEAK';
            break;
        case 'listening':
            micBtn.classList.add('listening');
            micLabel.classList.add('active');
            micLabel.textContent = 'LISTENING...';
            break;
        case 'processing':
            micBtn.classList.add('processing');
            micLabel.classList.add('processing');
            micLabel.textContent = 'PROCESSING...';
            break;
    }
}


// ── Speech Recognition ─────────────────────────────────────
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

if (!SpeechRecognition) {
    log('ERROR: Speech Recognition not supported. Use Chrome or Edge.', 'log-error');
    micLabel.textContent = 'UNSUPPORTED BROWSER';
    micBtn.style.opacity = '0.3';
    micBtn.style.pointerEvents = 'none';
} else {
    const recognition = new SpeechRecognition();
    recognition.continuous      = false;
    recognition.interimResults  = false;
    recognition.lang            = 'en-US';
    recognition.maxAlternatives = 1;

    // ── Mic Click Handler ──────────────────────────────
    micBtn.addEventListener('click', () => {
        if (isProcessing) return;

        if (isListening) {
            recognition.stop();
        } else {
            try {
                recognition.start();
            } catch (err) {
                console.error('Mic start error:', err);
                log('Failed to start microphone. Try clicking again.', 'log-error');
            }
        }
    });

    // ── Recognition Events ─────────────────────────────
    recognition.onstart = () => {
        isListening = true;
        setMicState('listening');
        log('Microphone active. Speak now...', 'log-routing');
    };

    recognition.onspeechend = () => {
        recognition.stop();
    };

    recognition.onend = () => {
        isListening = false;
        if (!isProcessing) {
            setMicState('idle');
        }
    };

    recognition.onerror = (event) => {
        isListening = false;
        setMicState('idle');

        if (event.error === 'no-speech') {
            log('No speech detected. Try again.', 'log-routing');
        } else if (event.error === 'not-allowed') {
            log('Microphone access denied. Check browser permissions.', 'log-error');
        } else {
            log(`Speech error: ${event.error}`, 'log-error');
        }
    };

    // ── Result Handler (the main pipeline trigger) ─────
    recognition.onresult = async (event) => {
        const transcript = event.results[0][0].transcript;
        const confidence = (event.results[0][0].confidence * 100).toFixed(0);

        isProcessing = true;
        setMicState('processing');

        // Log user input
        log(`User: "${transcript}"`, 'log-user');
        log(`Confidence: ${confidence}% — Routing to Brain (Port 3001)...`, 'log-routing');

        try {
            const response = await fetch('/api/command', {
                method:  'POST',
                headers: { 'Content-Type': 'application/json' },
                body:    JSON.stringify({ text: transcript })
            });

            const data = await response.json();

            // ── Update Telemetry Panel ─────────────────────
            if (data.telemetry) {
                updateTelemetry(data.telemetry);
                latencyDisp.textContent = `${data.telemetry.total_latency_ms || 0}ms`;
            }

            // ── Handle Response Types ──────────────────────
            if (data.status === 'error') {
                log(`ERROR: ${data.text}`, 'log-error');
            }

            else if (data.status === 'narrative') {
                const inf = data.telemetry?.inference_used || '';
                const routeHTML = routingBadge(inf);
                log(`NEXUS ${routeHTML}: ${data.text}`, 'log-narrative', true);
            }

            else if (data.status === 'approval_required') {
                log(`⚠ APPROVAL REQUIRED`, 'log-alert');
                if (data.narrative) {
                    log(`NEXUS: ${data.narrative}`, 'log-narrative');
                }
                log(data.text, 'log-alert');

                // Show tasks pending approval
                if (data.tasks && data.tasks.length > 0) {
                    for (let i = 0; i < data.tasks.length; i++) {
                        await logTaskCard(data.tasks[i], i * 150);
                    }
                }

                logApprovalButtons(data.session_id);
            }

            else if (data.status === 'executed') {
                const inf = data.telemetry?.inference_used || '';
                const routeHTML = routingBadge(inf);

                // Show narrative if present
                if (data.text && data.text !== `Executing parallel swarm. ${(data.tasks || []).length} tasks deployed.`) {
                    log(`NEXUS ${routeHTML}: ${data.text}`, 'log-narrative', true);
                }

                // Show swarm execution header
                log(`SWARM DEPLOYED ${routeHTML} — ${(data.tasks || []).length} parallel task(s)`, 'log-exec', true);

                // Show task cards with staggered animation
                if (data.tasks && data.tasks.length > 0) {
                    for (let i = 0; i < data.tasks.length; i++) {
                        await logTaskCard(data.tasks[i], i * 250);
                    }
                }

                // Show privacy status in terminal
                if (data.telemetry) {
                    const t = data.telemetry;
                    if (t.anonymization_applied) {
                        log(`🔒 PII anonymized — ${t.sensitive_entities_count} sensitive entities masked before cloud inference`, 'log-routing');
                    } else if (t.inference_used?.toLowerCase().includes('ollama') || t.sentinel_decision === 'local') {
                        log(`🏠 Fully local inference — no data left device`, 'log-routing');
                    }
                }
            }

            else if (data.status === 'cancelled') {
                log(data.text, 'log-routing');
            }

        } catch (err) {
            console.error('Pipeline error:', err);
            log('NETWORK ERROR: Could not reach Voice-NEXUS server.', 'log-error');
        }

        isProcessing = false;
        setMicState('idle');
    };
}


// ── Approval Handler ───────────────────────────────────────
async function handleApproval(sessionId, approved) {
    const row = document.getElementById(`approval-${sessionId}`);
    if (row) row.remove();

    if (approved) {
        log('User approved. Executing swarm...', 'log-exec');
    } else {
        log('User denied. Execution cancelled.', 'log-routing');
    }

    try {
        const response = await fetch('/api/approve', {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ session_id: sessionId, approved })
        });

        const data = await response.json();

        if (data.status === 'executed' && data.tasks) {
            log(`${data.tasks.length} task(s) dispatched:`, 'log-exec');
            for (let i = 0; i < data.tasks.length; i++) {
                await logTaskCard(data.tasks[i], i * 200);
            }
        } else if (data.status === 'cancelled') {
            log(data.text, 'log-routing');
        } else if (data.status === 'error') {
            log(`ERROR: ${data.text}`, 'log-error');
        }

    } catch (err) {
        log('Failed to send approval decision.', 'log-error');
    }
}


// ── Health Check ───────────────────────────────────────────
async function checkHealth() {
    voiceDot.classList.remove('offline');
}

checkHealth();


// ── Keyboard Shortcut (Space to toggle mic) ────────────────
document.addEventListener('keydown', (e) => {
    if (e.code === 'Space' && e.target === document.body) {
        e.preventDefault();
        micBtn.click();
    }
});
