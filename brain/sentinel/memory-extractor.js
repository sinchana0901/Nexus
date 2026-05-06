const fs = require('fs');
const path = require('path');

const SECTION_KEYWORDS = {
  'CONTACTS DIRECTORY': ['text', 'message', 'tell', 'notify', 'send', 'whatsapp', 'call', 'boss', 'contact', 'phone', 'late', 'PERSON_'],
  'CONTACTS': ['rahul', 'sinchana', 'prajwal', 'pranav', 'raghav', 'person', 'meet', 'sync', 'text', 'message', 'tell', 'notify', 'PERSON_'],
  'ROUTINES':  ['coffee', 'morning', 'gym', 'commute', 'order', 'usual', 'route', 'traffic', 'food', 'biryani', 'meghana', 'LOCATION_'],
  'FINANCE_LIMITS': ['money', 'pay', 'cost', 'buy', 'order', 'spend', '₹', 'FINANCIAL_'],
  'PATTERNS': ['late', 'tired', 'usually', 'often', 'pattern', 'running late'],
  'RECENT_30D': ['recently', 'last time', 'before', 'yesterday']
};

function extractRelevantMemory(userInput, memoryKeys = [], memoryFilePath) {
  const memoryFile = memoryFilePath || process.env.MEMORY_FILE_PATH?.trim() || path.join(__dirname, '../memory/MEMORY.md');
  const memoryPath = path.isAbsolute(memoryFile) ? memoryFile : path.resolve(process.cwd(), memoryFile);
  const memory = fs.readFileSync(memoryPath, 'utf8');
  const inputLower = userInput.toLowerCase();
  
  // Split memory by headers
  const sections = memory.split(/^##/m);
  const relevantSections = [];

  // Use Sentinel's suggested memory_keys
  for (const key of memoryKeys) {
    const section = sections.find(s => s.trim().startsWith(key));
    if (section) relevantSections.push('##' + section);
  }

  // Backup keyword matching
  for (const [sectionName, keywords] of Object.entries(SECTION_KEYWORDS)) {
    if (memoryKeys.includes(sectionName)) continue;
    const isRelevant = keywords.some(kw => inputLower.includes(kw.toLowerCase()));
    if (isRelevant) {
      const section = sections.find(s => s.trim().startsWith(sectionName));
      if (section && !relevantSections.some(r => r.includes(sectionName))) {
        relevantSections.push('##' + section);
      }
    }
  }

  // Always inject the SOUL limits implicitly via finance section
  if (!relevantSections.some(s => s.includes('FINANCE_LIMITS') || s.includes('FINANCIAL PREFERENCES'))) {
    const fin = sections.find(s => s.trim().startsWith('FINANCE') || s.trim().startsWith('FINANCIAL PREFERENCES'));
    if (fin) relevantSections.push('##' + fin);
  }

  const extracted = relevantSections.join('\n');
  console.log(`📚 Memory: ${extracted.length} chars extracted.`);
  return extracted;
}

module.exports = { extractRelevantMemory };