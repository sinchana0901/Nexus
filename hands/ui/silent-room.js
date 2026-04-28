let taskStates = new Map();
let contractMeta = null;

function initSilentRoom(contract) {
  taskStates = new Map();
  contractMeta = contract;
  for (const task of contract.tasks || []) {
    taskStates.set(task.task_id, {
      status: 'QUEUED', node: task.node,
      action: task.action, duration: null, error: null
    });
  }
  render();
}

function updateSilentRoom(taskId, status, node, action, duration, error) {
  taskStates.set(taskId, { status, node, action, duration, error });
  render();
}

function render() {
  process.stdout.write('\x1Bc');

  const lines = [
    '\x1b[36m╔══════════════════════════════════════════════════════════╗\x1b[0m',
    '\x1b[36m║           N E X U S  ·  S I L E N T   R O O M           ║\x1b[0m',
    '\x1b[36m╚══════════════════════════════════════════════════════════╝\x1b[0m',
    ''
  ];

  if (contractMeta?.routing_metadata) {
    const rm = contractMeta.routing_metadata;
    const routingColor = rm.inference_used === 'ollama' ? '\x1b[32m' : rm.inference_used === 'cache' ? '\x1b[35m' : '\x1b[33m';
    lines.push(`  \x1b[90mInference:\x1b[0m ${routingColor}${rm.inference_used?.toUpperCase() || 'UNKNOWN'}\x1b[0m   \x1b[90mSentinel:\x1b[0m ${rm.sentinel_latency_ms || 0}ms   \x1b[90mAnonymized:\x1b[0m ${rm.anonymization_applied ? '✓' : '✗'}`);
    lines.push('');
  }

  lines.push('  \x1b[90m' + '─'.repeat(56) + '\x1b[0m');

  for (const [taskId, state] of taskStates.entries()) {
    const { icon, color } = getStyle(state.status);
    const durationStr = state.duration != null ? `\x1b[90m${state.duration}ms\x1b[0m` : '';
    const errorStr = state.error ? `\x1b[31m${state.error}\x1b[0m` : '';

    lines.push(
      `  ${icon}  ${color}${state.node.toUpperCase().padEnd(9)}\x1b[0m  ` +
      `${state.action.padEnd(28)} ${getLabel(state.status).padEnd(12)} ${durationStr}${errorStr}`
    );
  }

  lines.push('  \x1b[90m' + '─'.repeat(56) + '\x1b[0m');
  lines.push('');
  lines.push('  \x1b[90mAll tasks dispatched simultaneously via Promise.all\x1b[0m');

  console.log(lines.join('\n'));
}

function renderFinalSummary(results, totalDuration, routingMeta) {
  const succeeded = results.filter(r => r.status === 'success').length;
  const failed = results.filter(r => r.status === 'failed').length;

  console.log('\n' + '═'.repeat(60));
  console.log(`  ⚡ SWARM COMPLETE`);
  console.log(`  ✓ ${succeeded} succeeded   ✗ ${failed} failed   ⏱ ${totalDuration}ms total`);

  if (routingMeta) {
    const privacyNote = routingMeta.anonymization_applied
      ? '  🔒 Personal data anonymized before cloud inference'
      : routingMeta.inference_used === 'ollama'
        ? '  🔒 Fully local inference — no data left device'
        : '  ☁️  Cloud inference used';
    console.log(privacyNote);
  }
  console.log('═'.repeat(60) + '\n');
}

function getStyle(status) {
  const styles = {
    QUEUED:       { icon: '\x1b[90m○\x1b[0m',  color: '\x1b[90m' },
    FIRING:       { icon: '\x1b[33m⟳\x1b[0m',  color: '\x1b[33m' },
    DONE:         { icon: '\x1b[32m✓\x1b[0m',  color: '\x1b[32m' },
    FAILED:       { icon: '\x1b[31m✗\x1b[0m',  color: '\x1b[31m' },
    ROLLING_BACK: { icon: '\x1b[35m↩\x1b[0m',  color: '\x1b[35m' },
    ROLLED_BACK:  { icon: '\x1b[35m↩\x1b[0m',  color: '\x1b[35m' },
    ROLLBACK_FAILED: { icon: '\x1b[31m⚠\x1b[0m', color: '\x1b[31m' }
  };
  return styles[status] || { icon: '?', color: '\x1b[0m' };
}

function getLabel(status) {
  const labels = {
    QUEUED: 'QUEUED', FIRING: 'FIRING...', DONE: 'COMPLETE',
    FAILED: 'FAILED', ROLLING_BACK: 'REVERTING',
    ROLLED_BACK: 'REVERTED', ROLLBACK_FAILED: 'STUCK'
  };
  return labels[status] || status;
}

module.exports = { initSilentRoom, updateSilentRoom, renderFinalSummary };