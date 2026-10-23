const { cors, json } = require('./_common');

// O front espera: { results: [{ title, url, snippet }] }
// Provedores (nesta ordem): Tavily (TAVILY_API_KEY), Brave (BRAVE_API_KEY),
// e DuckDuckGo HTML como fallback sem chave (menos estável).

const clean = (s) => String(s || '').replace(/<[^>]+>/g, '').replace(/&amp;/g, '&')
  .replace(/&quot;/g, '"').replace(/&#x27;|&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  .replace(/\s+/g, ' ').trim();

async function tavily(q) {
  const r = await fetch('https://api.tavily.com/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.TAVILY_API_KEY}` },
    body: JSON.stringify({ query: q, max_results: 8, search_depth: 'basic' }),
  });
  if (!r.ok) throw new Error(`Tavily ${r.status}`);
  const d = await r.json();
  return (d.results || []).map((x) => ({ title: x.title, url: x.url, snippet: x.content }));
}

async function brave(q) {
  const r = await fetch(`https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(q)}&count=8&country=br&search_lang=pt`, {
    headers: { Accept: 'application/json', 'X-Subscription-Token': process.env.BRAVE_API_KEY },
  });
  if (!r.ok) throw new Error(`Brave ${r.status}`);
  const d = await r.json();
  return (d.web?.results || []).map((x) => ({ title: x.title, url: x.url, snippet: x.description }));
}

async function duckduckgo(q) {
  const r = await fetch('https://html.duckduckgo.com/html/?q=' + encodeURIComponent(q) + '&kl=br-pt', {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; KasaneBot/1.0)', 'Accept-Language': 'pt-BR,pt;q=0.9' },
  });
  if (!r.ok) throw new Error(`DuckDuckGo ${r.status}`);
  const html = await r.text();
  const out = [];
  const re = /<a[^>]+class="result__a"[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?<a[^>]+class="result__snippet"[^>]*>([\s\S]*?)<\/a>/g;
  let m;
  while ((m = re.exec(html)) && out.length < 8) {
    let url = m[1];
    const redirect = url.match(/uddg=([^&]+)/);
    if (redirect) url = decodeURIComponent(redirect[1]);
    if (url.startsWith('//')) url = 'https:' + url;
    out.push({ title: clean(m[2]), url, snippet: clean(m[3]) });
  }
  return out;
}

module.exports = async (req, res) => {
  if (cors(req, res)) return;
  if (req.method !== 'GET') return json(res, 405, { error: 'Use GET.' });

  const q = String(req.query?.q || new URL(req.url, 'http://x').searchParams.get('q') || '').trim().slice(0, 300);
  if (!q) return json(res, 400, { error: 'Parâmetro "q" ausente.', results: [] });

  const providers = [];
  if (process.env.TAVILY_API_KEY) providers.push(tavily);
  if (process.env.BRAVE_API_KEY) providers.push(brave);
  providers.push(duckduckgo);

  let lastErr = null;
  for (const p of providers) {
    try {
      const raw = await p(q);
      const seen = new Set();
      const results = raw
        .filter((x) => x.url && /^https?:\/\//.test(x.url) && x.title)
        .filter((x) => (seen.has(x.url) ? false : seen.add(x.url)))
        .map((x) => ({ title: clean(x.title).slice(0, 160), url: x.url, snippet: clean(x.snippet).slice(0, 400) }));
      if (results.length) return json(res, 200, { results });
    } catch (e) { lastErr = e; }
  }
  return json(res, 200, {
    results: [],
    error: lastErr ? 'Os provedores de busca falharam. Configure TAVILY_API_KEY ou BRAVE_API_KEY na Vercel.' : 'Nenhum resultado encontrado.',
  });
};
