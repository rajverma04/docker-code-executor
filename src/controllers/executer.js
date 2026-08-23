const { executeSingleCode } = require('../services/dockerRunner');
const { executeBatchCode, evaluateProblemSubmission } = require('../services/batchRunner');

/**
 * Health check handler
 */
const healthCheck = (req, res) => {
  res.json({
    status: 'active',
    service: 'custom-docker-compiler',
    uptime: process.uptime(),
    timestamp: new Date()
  });
};

/**
 * Single execution handler
 */
const executeSingle = async (req, res) => {
  try {
    const { code, input, language, timeoutMs } = req.body;
    const result = await executeSingleCode(code, input, language, timeoutMs);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * Batch testcases execution handler
 */
const executeBatch = async (req, res) => {
  try {
    const { code, language, testCases, timeoutMs } = req.body;
    const result = await executeBatchCode(code, language, testCases, timeoutMs);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * Full Problem evaluation handler
 */
const evaluateProblem = async (req, res) => {
  try {
    const { userCode, userLanguage, problem, isRunOnly, timeoutMs } = req.body;
    const perCaseTimeoutMs = Number.isFinite(Number(timeoutMs))
      ? Number(timeoutMs)
      : Number(process.env.EXECUTION_TIMEOUT) || 30000;
    const result = await evaluateProblemSubmission(
      userCode,
      userLanguage,
      problem,
      Boolean(isRunOnly),
      perCaseTimeoutMs
    );
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = {
  healthCheck,
  executeSingle,
  executeBatch,
  evaluateProblem
};
