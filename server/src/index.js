import 'dotenv/config';
import express from 'express';
import cors from 'cors';

import { requireAuth } from './middleware/auth.js';
import authRoutes from './routes/auth.js';
import imagesRoutes from './routes/images.js';
import searchRoutes from './routes/search.js';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

// Public routes (no JWT required)
app.use('/api/auth', authRoutes);
app.get('/api/health', (_, res) => res.json({ ok: true }));

// Protected routes: require valid Supabase JWT (sets req.userId)
app.use('/api/images', requireAuth, imagesRoutes);
app.use('/api/search', requireAuth, searchRoutes);

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
