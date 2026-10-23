const { cors, json } = require('./_common');

// O front espera: { ok: boolean, keyConfigured: boolean }
module.exports = async (req, res) => {
  if (cors(req, res)) return;
  const keyConfigured = Boolean(process.env.GEMINI_API_KEY);
  return json(res, 200, {
    ok: keyConfigured,
    keyConfigured,
    model: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
    imageModel: process.env.GEMINI_IMAGE_MODEL || 'gemini-2.5-flash-image',
    search: Boolean(process.env.TAVILY_API_KEY || process.env.BRAVE_API_KEY) ? 'api' : 'duckduckgo',
  });
};
