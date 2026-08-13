const API_SECRET = process.env.COMPILER_API_KEY || 'codenexus-compiler-secret-key';

/**
 * Authentication Middleware for Compiler Service
 */
const authMiddleware = (req, res, next) => {
  // Allow health check without API key
  if (req.path === '/health' || req.path === '/') {
    return next();
  }

  const apiKey = req.headers['x-api-key'];
  if (apiKey !== API_SECRET) {
    return res.status(401).json({ error: 'Unauthorized access to Custom Compiler Microservice' });
  }
  next();
};

module.exports = authMiddleware;
