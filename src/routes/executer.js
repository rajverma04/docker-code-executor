const express = require('express');
const router = express.Router();
const {
  healthCheck,
  executeSingle,
  executeBatch,
  evaluateProblem
} = require('../controllers/executer');
const {
  validateSingleExecution,
  validateBatchExecution,
  validateProblemEvaluation
} = require('../middleware/validation');

// Health check endpoint
router.get('/health', healthCheck);

// Execution endpoints with validation
router.post('/execute/single', validateSingleExecution, executeSingle);
router.post('/execute/batch', validateBatchExecution, executeBatch);
router.post('/execute/problem', validateProblemEvaluation, evaluateProblem);

module.exports = router;
