const INSTANCES = [
  "https://searx.be",
  "https://searx.tiekoetter.com",
  "https://priv.au"
];

function normalizeResults(results) {
  return (Array.isArray(results) ? results : [])
    .filter((r) => r && r.url)
    .slice(0, 8)
    .map((r) => ({
      title: r.title || "(sem título)",
      url: r.url,
      snippet: String(r.content || "").slice(0, 260)
    }));
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({
      error: "Método não permitido."
    });
  }

  const q = String(req.query?.q || "").trim();

  if (!q) {
    return res.status(400).json({
      error: "Digite algo para pesquisar."
    });
  }

  for (const instance of INSTANCES) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 7000);

    try {
      const url =
        `${instance}/search?q=${encodeURIComponent(q)}` +
        `&format=json&language=pt-BR`;

      const response = await fetch(url, {
        headers: {
          "Accept": "application/json",
          "User-Agent": "Kasane/1.0"
        },
        signal: controller.signal
      });

      clearTimeout(timer);

      if (!response.ok) continue;

      const data = await response.json();
      const results = normalizeResults(data.results);

      if (results.length) {
        return res.status(200).json({
          query: q,
          results
        });
      }
    } catch (error) {
      clearTimeout(timer);
    }
  }

  return res.status(502).json({
    error: "Os serviços gratuitos de pesquisa não responderam agora."
  });
}
