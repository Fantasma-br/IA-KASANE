const { cors, json, readBody, GEMINI_BASE } = require('./_common');

// Limites básicos para evitar abuso do endpoint público.
const MAX_BODY_CHARS = 4_000_000; // imagens em base64 podem ser grandes
const MAX_CONTENTS = 40;

module.exports = async (req, res) => {
  if (cors(req, res)) return;
  if (req.method !== 'POST') return json(res, 405, { error: 'Use POST.' });

  const key = process.env.GEMINI_API_KEY;
  if (!key) return json(res, 500, { error: 'GEMINI_API_KEY não configurada na Vercel.' });

  const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
  const body = await readBody(req);

  if (!Array.isArray(body.contents) || !body.contents.length) {
    return json(res, 400, { error: 'Campo "contents" ausente.' });
  }
  if (body.contents.length > MAX_CONTENTS || JSON.stringify(body).length > MAX_BODY_CHARS) {
    return json(res, 413, { error: 'Requisição grande demais.' });
  }

  // Só repassa os campos que o front realmente usa.
  const payload = {
    contents: body.contents,
    ...(body.system_instruction ? { system_instruction: body.system_instruction } : {}),
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 2048,
      ...(body.generationConfig || {}),
    },
  };
  // Teto de segurança para saída.
  payload.generationConfig.maxOutputTokens = Math.min(payload.generationConfig.maxOutputTokens || 2048, 4096);

  try {
    const r = await fetch(`${GEMINI_BASE}/${encodeURIComponent(model)}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify(payload),
    });
    const data = await r.json().catch(() => ({ error: 'Resposta inválida do Gemini.' }));
    return json(res, r.status, data);
  } catch (err) {
    return json(res, 502, { error: 'Falha ao contatar o Gemini.' });
  }
};
