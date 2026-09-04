export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  return res.status(200).json({
    ok: Boolean(process.env.GEMINI_API_KEY),
    model: process.env.GEMINI_MODEL || "gemini-3.5-flash"
  });
}
