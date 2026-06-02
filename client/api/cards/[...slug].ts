import express from 'express';
import cors from 'cors';
import { setCurrentUser } from '../../../server/src/db.js';
import cardsRouter from '../../../server/src/routes/cards.js';

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

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

app.use('/api/cards', cardsRouter);

export default app;
