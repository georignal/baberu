import express from 'express';
import cors from 'cors';

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.get('/api/health', (_req: any, res: any) => res.json({ status: 'ok', express: true }));

export default app;
