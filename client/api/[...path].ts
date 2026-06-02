import express from 'express';
import cors from 'cors';
import { setCurrentUser } from '../../server/src/db.js';
import authRouter from '../../server/src/routes/auth.js';

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.get('/api/health', (_req: any, res: any) => res.json({ status: 'ok' }));

app.use((req: any, _res: any, next: any) => {
  const auth = req.headers.authorization;
  if (auth?.startsWith('Bearer ')) {
    try {
      const d = JSON.parse(Buffer.from(auth.slice(7), 'base64').toString());
      if (d.userId) setCurrentUser(d.userId);
    } catch {}
  }
  next();
});

app.use('/api/auth', authRouter);

export default app;
