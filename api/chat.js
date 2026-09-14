export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido.' });
  const key = process.env.GEMINI_API_KEY;
  if (!key) return res.status(500).json({ error: 'GEMINI_API_KEY não configurada no Vercel.' });
  const model = process.env.GEMINI_MODEL || 'gemini-3.5-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(key)}`;
  try {
    const r = await fetch(url, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(req.body || {}) });
    const data = await r.json();
    return res.status(r.status).json(data);
  } catch (e) {
    return res.status(500).json({ error: 'Não foi possível conectar ao Gemini.' });
  }
}
