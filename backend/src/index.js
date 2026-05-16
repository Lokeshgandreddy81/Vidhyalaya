import express from 'express';
import cors from 'cors';
import compression from 'compression';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import connectDB from './config/db.js';
import pathsRoutes from './routes/paths.js';
import usersRoutes from './routes/users.js';
import videosRoutes from './routes/videos.js';
import smartStudyRoutes from './routes/smartStudyRoutes.js';
import smartboardRoutes from './routes/smartboard.js';
import authRoutes from './routes/auth.js';
import devRoutes from './routes/devRoutes.js';
import studyRoutes from './routes/studyRoutes.js';
import documentRoutes from './routes/documentRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import { initRAG } from './config/ragConfig.js';

dotenv.config({ override: true });

if (!process.env.JWT_SECRET) {
  console.error('FATAL ERROR: JWT_SECRET is not defined.');
  process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 5000;

// Connect to MongoDB
connectDB();
initRAG().catch(err => console.error("RAG Init Warning:", err.message));

// Middleware
const allowedOrigins = process.env.FRONTEND_URL
  ? process.env.FRONTEND_URL.split(',').map(url => url.trim())
  : ['http://localhost:3000'];

app.use(cors({
  origin: allowedOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use('/uploads', express.static(path.join(__dirname, '../public/uploads')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/paths', pathsRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/videos', videosRoutes);
app.use('/api/smart-study', smartStudyRoutes);
app.use('/api/smartboard', smartboardRoutes);
app.use('/api/dev', devRoutes);
app.use('/api/study', studyRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/admin', adminRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Vidyal.ai API is running' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📡 API: http://localhost:${PORT}/api/health`);
});
