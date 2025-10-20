// API/chat.js  (ESM 版，文件名保持原样即可)
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const apiKey = process.env.KIMI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'Server misconfigured' });

  try {
    const resp = await fetch('https://api.moonshot.cn/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(req.body),
    });
    if (!resp.ok) throw new Error(await resp.text());
    return res.status(200).json(await resp.json());
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
