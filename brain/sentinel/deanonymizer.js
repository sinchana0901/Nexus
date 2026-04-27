function deanonymize(contractString, reverseMap) {
  let restored = contractString;
  for (const [placeholder, realValue] of Object.entries(reverseMap)) {
    const regex = new RegExp(placeholder, 'g');
    restored = restored.replace(regex, realValue);
  }
  return restored;
}

module.exports = { deanonymize };