export default function handler(req: any, res: any) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) { res.status(401).json({ error: 'Not authenticated' }); return; }
  try {
    const data = JSON.parse(Buffer.from(auth.slice(7), 'base64').toString());
    res.json({ userId: data.userId, username: data.username });
  } catch { res.status(401).json({ error: 'Invalid token' }); }
}
