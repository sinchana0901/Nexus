const fs = require('fs');
require('dotenv').config();

function evaluateAgainstSoul(contract) {
  // Rule 1: Strict Financial Limit
  if (contract.total_estimated_cost >= parseInt(process.env.SOUL_COST_LIMIT_NOTIFY || 2000)) {
    return {
      override: true,
      reason: `Total estimated cost ₹${contract.total_estimated_cost} exceeds the auto-approval threshold.`
    };
  }

  // Rule 2: Mass Communication Check
  const commsTasks = contract.tasks.filter(t => t.node === 'comms');
  if (commsTasks.length >= 3) {
    return {
      override: true,
      reason: `Action sends ${commsTasks.length} messages simultaneously. Explicit approval required.`
    };
  }

  // Rule 3: Calendar Deletion Prevention
  const cancelTasks = contract.tasks.filter(t => t.action === 'cancel_event');
  if (cancelTasks.length > 0) {
    return {
      override: true,
      reason: 'Calendar event cancellation requires explicit approval. We only auto-reschedule.'
    };
  }

  return { override: false };
}

module.exports = { evaluateAgainstSoul };