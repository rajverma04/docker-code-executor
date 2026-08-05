const { executeSingleCode, LANGUAGE_CONFIGS } = require('./dockerRunner');
const { executeBatchCode, evaluateProblemSubmission, normalizeOutput } = require('./batchRunner');

module.exports = {
  executeSingleCode,
  executeBatchCode,
  evaluateProblemSubmission,
  normalizeOutput,
  LANGUAGE_CONFIGS
};
