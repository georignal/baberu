import app from '../../server/src/index';

export default async function handler(req: any, res: any) {
  try {
    await app(req, res);
  } catch (e: any) {
    res.status(500).json({ error: String(e?.message ?? e), stack: String(e?.stack ?? '') });
  }
}
