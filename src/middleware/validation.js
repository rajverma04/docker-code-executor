const SUPPORTED_LANGUAGES = ['cpp', 'c++', 'java', 'javascript', 'js'];

function validateSingleExecution(req, res, next) {
  const { code, language } = req.body;

  if (code === undefined || code === null) {
    return res.status(400).json({ error: 'Missing required field: code' });
  }

  if (typeof code !== 'string') {
    return res.status(400).json({ error: 'Field "code" must be a string' });
  }

  if (code.length > 100000) {
    return res.status(400).json({ error: 'Code exceeds maximum size of 100KB' });
  }

  if (language !== undefined && language !== null) {
    if (typeof language !== 'string') {
      return res.status(400).json({ error: 'Field "language" must be a string' });
    }
    if (!SUPPORTED_LANGUAGES.includes(language.toLowerCase().trim())) {
      return res.status(400).json({
        error: `Unsupported language. Supported: ${SUPPORTED_LANGUAGES.join(', ')}`
      });
    }
  }

  if (req.body.input !== undefined && req.body.input !== null) {
    if (typeof req.body.input !== 'string') {
      return res.status(400).json({ error: 'Field "input" must be a string' });
    }
    if (req.body.input.length > 10000) {
      return res.status(400).json({ error: 'Input exceeds maximum size of 10KB' });
    }
  }

  if (req.body.timeoutMs !== undefined) {
    const timeout = Number(req.body.timeoutMs);
    if (isNaN(timeout) || timeout < 1000 || timeout > 30000) {
      return res.status(400).json({ error: 'timeoutMs must be a number between 1000 and 30000' });
    }
  }

  next();
}

function validateBatchExecution(req, res, next) {
  const { code, language, testCases } = req.body;

  if (code === undefined || code === null) {
    return res.status(400).json({ error: 'Missing required field: code' });
  }

  if (typeof code !== 'string') {
    return res.status(400).json({ error: 'Field "code" must be a string' });
  }

  if (code.length > 100000) {
    return res.status(400).json({ error: 'Code exceeds maximum size of 100KB' });
  }

  if (!language || typeof language !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid required field: language' });
  }

  if (!SUPPORTED_LANGUAGES.includes(language.toLowerCase().trim())) {
    return res.status(400).json({
      error: `Unsupported language. Supported: ${SUPPORTED_LANGUAGES.join(', ')}`
    });
  }

  if (!Array.isArray(testCases)) {
    return res.status(400).json({ error: 'Field "testCases" must be an array' });
  }

  if (testCases.length === 0) {
    return res.status(400).json({ error: 'At least one test case is required' });
  }

  if (testCases.length > 50) {
    return res.status(400).json({ error: 'Maximum 50 test cases allowed per request' });
  }

  for (let i = 0; i < testCases.length; i++) {
    const tc = testCases[i];
    if (!tc || typeof tc !== 'object') {
      return res.status(400).json({ error: `Test case ${i + 1} must be an object` });
    }
    if (tc.input !== undefined && tc.input !== null && typeof tc.input !== 'string') {
      return res.status(400).json({ error: `Test case ${i + 1}: input must be a string` });
    }
    if (tc.output !== undefined && tc.output !== null && typeof tc.output !== 'string') {
      return res.status(400).json({ error: `Test case ${i + 1}: output must be a string` });
    }
    if (tc.input && tc.input.length > 10000) {
      return res.status(400).json({ error: `Test case ${i + 1}: input exceeds 10KB` });
    }
    if (tc.output && tc.output.length > 10000) {
      return res.status(400).json({ error: `Test case ${i + 1}: output exceeds 10KB` });
    }
  }

  if (req.body.timeoutMs !== undefined) {
    const timeout = Number(req.body.timeoutMs);
    if (isNaN(timeout) || timeout < 1000 || timeout > 30000) {
      return res.status(400).json({ error: 'timeoutMs must be a number between 1000 and 30000' });
    }
  }

  next();
}

function validateProblemEvaluation(req, res, next) {
  const { userCode, userLanguage, problem, isRunOnly } = req.body;

  if (userCode === undefined || userCode === null) {
    return res.status(400).json({ error: 'Missing required field: userCode' });
  }

  if (typeof userCode !== 'string') {
    return res.status(400).json({ error: 'Field "userCode" must be a string' });
  }

  if (userCode.length > 100000) {
    return res.status(400).json({ error: 'Code exceeds maximum size of 100KB' });
  }

  if (!userLanguage || typeof userLanguage !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid required field: userLanguage' });
  }

  if (!SUPPORTED_LANGUAGES.includes(userLanguage.toLowerCase().trim())) {
    return res.status(400).json({
      error: `Unsupported language. Supported: ${SUPPORTED_LANGUAGES.join(', ')}`
    });
  }

  if (!problem || typeof problem !== 'object') {
    return res.status(400).json({ error: 'Missing or invalid required field: problem' });
  }

  const targetTestCases = isRunOnly ? problem.visibleTestCases : problem.hiddenTestCases;
  if (!Array.isArray(targetTestCases) || targetTestCases.length === 0) {
    return res.status(400).json({
      error: `No ${isRunOnly ? 'visible' : 'hidden'} test cases found in problem`
    });
  }

  if (problem.referenceSolution !== undefined && !Array.isArray(problem.referenceSolution)) {
    return res.status(400).json({ error: 'referenceSolution must be an array' });
  }

  if (req.body.timeoutMs !== undefined) {
    const timeout = Number(req.body.timeoutMs);
    if (isNaN(timeout) || timeout < 1000 || timeout > 30000) {
      return res.status(400).json({ error: 'timeoutMs must be a number between 1000 and 30000' });
    }
  }

  next();
}

module.exports = {
  validateSingleExecution,
  validateBatchExecution,
  validateProblemEvaluation,
  SUPPORTED_LANGUAGES
};
