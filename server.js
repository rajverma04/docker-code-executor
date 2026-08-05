require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { executeSingleCode, executeBatchCode, evaluateProblemSubmission } = require('./index');

const app = express();

const allowedOrigins = [
  'http://localhost:4000',
  (process.env.ALLOWED_BACKEND_URL || '').trim()
].filter(Boolean);

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin) || allowedOrigins.includes(origin.replace(/\/$/, ''))) {
      callback(null, true);
    } else {
      callback(new Error('CORS policy: Access denied for this origin'));
    }
  }
}));
app.use(express.json({ limit: '10mb' }));

const API_SECRET = process.env.COMPILER_API_KEY || 'codenexus-compiler-secret-key';

// Authentication Middleware for Compiler Service
app.use((req, res, next) => {
  // Allow health check without API key
  if (req.path === '/health' || req.path === '/') {
    return next();
  }

  const apiKey = req.headers['x-api-key'];
  if (apiKey !== API_SECRET) {
    return res.status(401).json({ error: 'Unauthorized access to Custom Compiler Microservice' });
  }
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'active',
    service: 'custom-docker-compiler',
    uptime: process.uptime(),
    timestamp: new Date()
  });
});

// Single execution endpoint
app.post('/execute/single', async (req, res) => {
  try {
    const { code, input, language, timeoutMs } = req.body;
    const result = await executeSingleCode(code, input, language, timeoutMs);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Batch testcases execution endpoint
app.post('/execute/batch', async (req, res) => {
  try {
    const { code, language, testCases, timeoutMs } = req.body;
    const result = await executeBatchCode(code, language, testCases, timeoutMs);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Full Problem evaluation endpoint
app.post('/execute/problem', async (req, res) => {
  try {
    const { userCode, userLanguage, problem, isRunOnly } = req.body;
    const result = await evaluateProblemSubmission(userCode, userLanguage, problem, isRunOnly);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = Number(process.env.PORT) || 5001;
app.listen(PORT, () => {
  console.log(`🚀 Custom Docker Compiler Microservice running at http://localhost:${PORT}`);
});
