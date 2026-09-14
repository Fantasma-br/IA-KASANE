const INSTANCES = [
  'https://search.bus-hit.me/search',
  'https://searx.tiekoetter.com/search',
  'https://search.inetol.net/search'
];

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Método não permitido.' });
  const q = String(req.query?.q || '').trim();
  if (!q) return res.status(400).json({ error: 'Informe uma pesquisa.' });
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 7000);
  try {
    const responses = await Promise.allSettled(INSTANCES.map(base =>
      fetch(`${base}?q=${encodeURIComponent(q)}&format=json&language=pt-BR&safesearch=1`, {
        headers:{Accept:'application/json'}, signal:controller.signal
      }).then(r => r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`)))
    ));
    const all = [];
    for (const result of responses) {
      if (result.status !== 'fulfilled') continue;
      for (const item of (result.value?.results || [])) {
        if (!item?.url || !item?.title) continue;
        all.push({ title:String(item.title), url:String(item.url), snippet:String(item.content || item.snippet || '') });
      }
    }
    const seen = new Set();
    const results = all.filter(x => { try { const u = new URL(x.url); u.hash=''; const key=u.toString().replace(/\/$/,''); if(seen.has(key)) return false; seen.add(key); return true; } catch { return false; } }).slice(0,8);
    return res.status(200).json({ results });
  } catch (e) {
    return res.status(502).json({ error: 'Não foi possível pesquisar na web agora.' });
  } finally { clearTimeout(timer); }
}
