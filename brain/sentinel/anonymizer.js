function anonymize(text, entityMap) {
  let anonymized = text;
  // Sort by length descending to avoid partial replacements (e.g., replacing "Pranav" before "Pranav Mane")
  const tokens = Object.keys(entityMap).sort((a, b) => b.length - a.length);
  
  for (const token of tokens) {
    // Escape regex characters so weird input doesn't crash the engine
    const regex = new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    anonymized = anonymized.replace(regex, entityMap[token]);
  }
  return anonymized;
}

module.exports = { anonymize };