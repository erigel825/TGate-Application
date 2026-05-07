import express from 'express';
import cors from 'cors';
import path from 'path';
import { getDb, STAGES } from './db';
import projectsRouter from './routes/projects';
import gatesRouter from './routes/gates';
import usersRouter from './routes/users';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: ['http://localhost:5173', 'http://localhost:4173'] }));
app.use(express.json());

// Initialize DB on startup
getDb();

app.use('/api/projects', projectsRouter);
app.use('/api/gates', gatesRouter);
app.use('/api/users', usersRouter);

app.get('/api/stages', (_req, res) => res.json(STAGES));

// Serve static frontend in production
const clientDist = path.join(__dirname, '..', '..', 'client', 'dist');
app.use(express.static(clientDist));
app.get('*', (_req, res) => res.sendFile(path.join(clientDist, 'index.html')));

app.listen(PORT, () => {
  console.log(`TGate server running on http://localhost:${PORT}`);
});
