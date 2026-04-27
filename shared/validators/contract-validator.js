const Ajv = require('ajv');
const addFormats = require('ajv-formats');
const schema = require('../contract.schema.json');
const { v4: uuidv4 } = require('uuid');

const ajv = new Ajv({ allErrors: true });
addFormats(ajv);
const validate = ajv.compile(schema);

function validateContract(payload) {
  const valid = validate(payload);
  if (!valid) {
    return {
      valid: false,
      errors: validate.errors.map(e => `${e.instancePath} ${e.message}`)
    };
  }
  return { valid: true, errors: [] };
}

module.exports = { validateContract };