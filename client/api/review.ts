import express from 'express';
import cors from 'cors';

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use('/api/review', (_req: any, res: any) => res.status(404).json({ error: 'Not found' }));
export default app;
