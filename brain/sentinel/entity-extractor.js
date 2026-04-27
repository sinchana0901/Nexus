function extractEntities(classificationResult) {
  const entityMap = {};
  const reverseMap = {};
  const entityCounters = {};

  // Safely handle empty arrays
  const entities = classificationResult.sensitive_entities || [];

  for (const entity of entities) {
    const type = entity.type;
    if (!entityCounters[type]) entityCounters[type] = 0;
    entityCounters[type]++;

    const placeholder = `${type}_${String.fromCharCode(64 + entityCounters[type])}`; // A, B, C...

    entityMap[entity.token] = placeholder;
    reverseMap[placeholder] = entity.token;
  }

  return { entityMap, reverseMap };
}

module.exports = { extractEntities };