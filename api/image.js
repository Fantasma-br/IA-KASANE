export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido.' });
  const prompt = String(req.body?.prompt || '').trim().slice(0, 4000);
  if (!prompt) return res.status(400).json({ error: 'Descreva a imagem que deseja criar.' });
  const key = process.env.GEMINI_API_KEY;
  if (!key) return res.status(500).json({ error: 'GEMINI_API_KEY não configurada no Vercel.' });

  const model = process.env.GEMINI_IMAGE_MODEL || 'gemini-2.5-flash-image';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(key)}`;
  const body = {
    contents: [{ role: 'user', parts: [{ text: `Crie uma imagem baseada neste pedido do usuário. Não explique o processo; gere a imagem. Pedido: ${prompt}` }] }],
    generationConfig: { responseModalities: ['TEXT', 'IMAGE'] }
  };

  try {
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const data = await r.json();
    if (!r.ok) return res.status(r.status).json({ error: data?.error?.message || 'Falha na geração de imagem.' });

    const parts = data?.candidates?.[0]?.content?.parts || [];
    const imagePart = parts.find(p => p?.inlineData?.data || p?.inline_data?.data);
    const inline = imagePart?.inlineData || imagePart?.inline_data;
    if (!inline?.data) return res.status(502).json({ error: 'O modelo não retornou dados de imagem.' });
    const mime = inline.mimeType || inline.mime_type || 'image/png';
    return res.status(200).json({ image: `data:${mime};base64,${inline.data}` });
  } catch (e) {
    return res.status(500).json({ error: 'Não foi possível conectar ao serviço de geração de imagens.' });
  }
}
