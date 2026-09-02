import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import compression from 'compression';
import helmet from 'helmet';
import path from 'path';
import { fileURLToPath } from 'url';
import connectDB from './config/db.js';
import pathsRoutes from './routes/paths.js';
import usersRoutes from './routes/users.js';
import videosRoutes from './routes/videos.js';
import smartStudyRoutes from './routes/smartStudyRoutes.js';
import smartboardRoutes from './routes/smartboard.js';
import authRoutes from './routes/auth.js';
import studyRoutes from './routes/studyRoutes.js';
import studySessionFilesRoutes from './routes/studySessionFiles.js';
import documentRoutes from './routes/documentRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import studentRoutes from './routes/studentRoutes.js';
import chatRoutes from './routes/chat.js';
import memoryRoutes from './routes/memoryRoutes.js';
import { initRAG, ragLocalStorage } from './config/ragConfig.js';
import { apiRateLimiter } from './middleware/rateLimiter.js';
import { requestId } from './middleware/requestId.js';
import { byokShield } from './middleware/byokShield.js';
import logger, { loggerMiddleware } from './utils/logger.js';

// ─── STARTUP GUARDS ─────────────────────────────────────────────────────────
// Fatal: JWT_SECRET is non-negotiable.
if (!process.env.JWT_SECRET) {
  console.error('FATAL ERROR: JWT_SECRET is not defined.');
  process.exit(1);
}

// Fatal: DB_ENCRYPTION_KEY is required for BYOK key-at-rest encryption.
if (!process.env.DB_ENCRYPTION_KEY) {
  console.error('FATAL ERROR: DB_ENCRYPTION_KEY is not defined. Generate one with:');
  console.error('  node -e "require(\'crypto\').randomBytes(32).toString(\'hex\')"');
  process.exit(1);
}

// Fatal in production: GOOGLE_CLIENT_ID is required for SSO verification.
if (process.env.NODE_ENV === 'production' && !process.env.GOOGLE_CLIENT_ID) {
  console.error('FATAL ERROR: GOOGLE_CLIENT_ID is required in production.');
  process.exit(1);
}

const ytKey = process.env.YOUTUBE_API_KEY?.trim() || '';
if (ytKey.length > 20 && !ytKey.includes('your_')) {
  logger.info('YouTube Data API v3: enabled (Smartboard + video verify)');
} else {
  logger.warn('YouTube Data API v3: DISABLED — add YOUTUBE_API_KEY to backend/.env for accurate videos');
}

const app = express();
const PORT = process.env.PORT || 5000;

// Connect to MongoDB
connectDB();
initRAG().catch(err => logger.error({ err }, `RAG Init Warning: ${err.message}`));

// ─── SECURITY MIDDLEWARE ─────────────────────────────────────────────────────
// Helmet: Sets security-critical HTTP headers (CSP, HSTS, X-Frame-Options, etc.)
app.use(helmet());

// Trust first proxy (Render, Railway, Vercel, etc.) for correct IP resolution
app.set('trust proxy', 1);

// Request ID: Every request gets a unique traceable ID
app.use(requestId);
app.use(loggerMiddleware);

// Initialize per-request isolated storage context for RAG embeddings settings
app.use((req, res, next) => {
  ragLocalStorage.run({ embedModel: null }, () => {
    next();
  });
});

const allowedOrigins = process.env.FRONTEND_URL
  ? process.env.FRONTEND_URL.split(',').map(url => url.trim())
  : [
      'http://localhost:3000',
      'http://127.0.0.1:3000',
      'http://localhost:5001',
      'http://localhost:5173',
      'http://127.0.0.1:5173'
    ];

// Use a function-based origin handler — required by the cors package to correctly
// echo the matched origin in Access-Control-Allow-Origin on both preflight and
// credentialed requests. A plain array silently omits the header for unrecognized origins.
const corsOriginFn = (origin, callback) => {
  // Allow requests with no origin (server-to-server, curl, Postman, mobile)
  if (!origin) return callback(null, true);
  if (allowedOrigins.includes(origin)) {
    return callback(null, origin); // echo back exact origin
  }
  return callback(new Error(`CORS: Origin "${origin}" is not allowed.`));
};

app.use(cors({
  origin: corsOriginFn,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'x-embedding-provider',
    'x-embedding-api-key',
    'x-user-gemini-key',
    'x-byok-mode',
    'x-byok-provider',
    'x-byok-api-key',
    'x-byok-model',
    'x-byok-endpoint',
    'x-byok-active-model',
    'x-persona-pace',
    'x-persona-mode',
    'x-persona-analogy',
    'x-persona-temp',
    'x-user-gemini-byok'
  ],
}));
// Handle preflight requests for all routes explicitly
app.options('*', cors({ origin: corsOriginFn, credentials: true }));

// General API rate limiting: 100 requests per minute per IP
app.use('/api', apiRateLimiter);

// BYOK Shield: decrypt x-byok-api-key header in-memory, strip it from the wire
// This must run before any route handler that uses req.rawByokKey
app.use('/api', byokShield);

app.use(compression());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use('/uploads', express.static(path.join(__dirname, '../public/uploads')));

// ─── ROUTES ──────────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/paths', pathsRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/videos', videosRoutes);
app.use('/api/smart-study', smartStudyRoutes);
app.use('/api/smartboard', smartboardRoutes);
app.use('/api/study', studyRoutes);
app.use('/api/study', studySessionFilesRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/memory', memoryRoutes);

// Health check
app.get('/api/health', (req, res) => {
  const geminiKey = process.env.GEMINI_API_KEY?.trim() || '';
  const geminiConfigured = geminiKey.length > 20 && !geminiKey.includes('your_');
  res.json({
    status: 'ok',
    message: 'Vidyal.ai API is running',
    geminiConfigured,
  });
});

// ─── ERROR HANDLER ───────────────────────────────────────────────────────────
// Production-grade: never leak stack traces or internal details.
app.use((err, req, res, _next) => {
  const requestIdHeader = req.id || 'unknown';
  const log = req.log || logger;
  log.error({
    err: {
      message: err.message,
      stack: process.env.NODE_ENV !== 'production' ? err.stack : undefined,
    },
    method: req.method,
    url: req.originalUrl,
  }, `Request failed: ${err.message}`);

  const status = err.status || err.statusCode || 500;
  res.status(status).json({
    error: status === 500 ? 'Internal server error' : err.message,
    requestId: requestIdHeader,
  });
});

app.listen(PORT, () => {
  logger.info(`🚀 Server running on port ${PORT}`);
  logger.info(`📡 API: http://localhost:${PORT}/api/health`);
  logger.info(`🔒 Helmet: enabled | Rate Limiting: enabled | Request IDs: enabled | Pino JSON: enabled`);
});
