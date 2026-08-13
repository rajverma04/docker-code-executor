require('dotenv').config();
const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const authMiddleware = require('./src/middleware/auth');
const router = require('./src/routes/executer');

const app = express();
let server;

const allowedOrigins = [
  'http://localhost:4000',
  (process.env.ALLOWED_BACKEND_URL || '').trim()
].filter(Boolean);

function log(level, message, meta = {}) {
  const timestamp = new Date().toISOString();
  console.log(JSON.stringify({ timestamp, level, message, ...meta }));
}

function requestLogger(req, res, next) {
  const start = process.hrtime.bigint();
  const requestId = crypto.randomUUID();
  req.requestId = requestId;

  log('info', 'Request started', {
    requestId,
    method: req.method,
    path: req.path,
    ip: req.ip
  });

  res.on('finish', () => {
    const end = process.hrtime.bigint();
    const durationMs = Number(end - start) / 1e6;
    log('info', 'Request completed', {
      requestId,
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      durationMs: durationMs.toFixed(2)
    });
  });

  next();
}
app.use(requestLogger);
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

// Authentication Middleware
app.use(authMiddleware);

// API Routes
app.use('/', router);

// Global error handler
app.use((err, req, res, next) => {
  log('error', 'Unhandled error', {
    requestId: req.requestId,
    error: err.message,
    stack: err.stack
  });
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = Number(process.env.PORT) || 5001;

function gracefulShutdown(signal) {
  log('info', `Received ${signal}, starting graceful shutdown`);
  
  if (server) {
    server.close((err) => {
      if (err) {
        log('error', 'Error during server close', { error: err.message });
        process.exit(1);
      }
      log('info', 'Server closed, exiting');
      process.exit(0);
    });

    setTimeout(() => {
      log('error', 'Forced shutdown after timeout');
      process.exit(1);
    }, 10000);
  } else {
    process.exit(0);
  }
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

server = app.listen(PORT, () => {
  log('info', `Custom Docker Compiler Microservice running`, { port: PORT });
});
server.timeout = 120000;
server.headersTimeout = 120000;
server.keepAliveTimeout = 120000;


