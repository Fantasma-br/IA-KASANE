export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Método não permitido.' });
  const configured = !!process.env.GEMINI_API_KEY;
  return res.status(200).json({ ok: configured, keyConfigured: configured, model: process.env.GEMINI_MODEL || 'gemini-3.5-flash' });
}
