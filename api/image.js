const { cors, json, readBody, GEMINI_BASE } = require('./_common');

// O front envia { prompt } e espera { image: "data:image/png;base64,..." }
module.exports = async (req, res) => {
  if (cors(req, res)) return;
  if (req.method !== 'POST') return json(res, 405, { error: 'Use POST.' });

  const key = process.env.GEMINI_API_KEY;
  if (!key) return json(res, 500, { error: 'GEMINI_API_KEY não configurada na Vercel.' });

  const model = process.env.GEMINI_IMAGE_MODEL || 'gemini-2.5-flash-image';
  const body = await readBody(req);
  const prompt = String(body.prompt || '').trim().slice(0, 1500);
  if (!prompt) return json(res, 400, { error: 'Prompt ausente.' });

  try {
    const r = await fetch(`${GEMINI_BASE}/${encodeURIComponent(model)}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { responseModalities: ['TEXT', 'IMAGE'] },
      }),
    });
    const data = await r.json().catch(() => null);
    if (!r.ok) {
      return json(res, r.status, { error: data?.error?.message || `Erro do Gemini (${r.status}).` });
    }

    const parts = data?.candidates?.[0]?.content?.parts || [];
    const imgPart = parts.find((p) => (p.inlineData || p.inline_data)?.data);
    if (!imgPart) {
      const text = parts.map((p) => p.text).filter(Boolean).join(' ').slice(0, 200);
      return json(res, 422, { error: text || 'O Gemini não retornou uma imagem (o pedido pode ter sido bloqueado).' });
    }
    const inline = imgPart.inlineData || imgPart.inline_data;
    const mime = inline.mimeType || inline.mime_type || 'image/png';
    return json(res, 200, { image: `data:${mime};base64,${inline.data}` });
  } catch (err) {
    return json(res, 502, { error: 'Falha ao contatar o Gemini.' });
  }
};
