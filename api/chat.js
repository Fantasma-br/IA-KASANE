export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: { message: "Método não permitido." }
    });
  }

  const key = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_MODEL || "gemini-3.5-flash";

  if (!key) {
    return res.status(500).json({
      error: { message: "GEMINI_API_KEY não configurada na Vercel." }
    });
  }

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(key)}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(req.body)
      }
    );

    const data = await response.json();
    return res.status(response.status).json(data);
  } catch (error) {
    console.error("Erro ao conectar ao Gemini:", error);

    return res.status(500).json({
      error: { message: "Falha ao conectar ao Gemini." }
    });
  }
}
