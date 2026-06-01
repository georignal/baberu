import express from 'express';
const app = express();
const PORT = parseInt(process.env.PORT || '3001', 10);
app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));
app.get('/', (_req, res) => res.send('baberu API'));
app.listen(PORT, () => console.log(`Listening on ${PORT}`));
