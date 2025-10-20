// Edge function: proxy to Moonshot
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const apiKey = process.env.KIMI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'Server misconfigured' });
  try {
    const response = await fetch('https://api.moonshot.cn/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body),
    });
    if (!response.ok) throw new Error(await response.text());
    return res.status(200).json(await response.json());
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
