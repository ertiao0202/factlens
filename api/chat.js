// 边缘函数：代替浏览器调用 Kimi，密钥仅存在服务端
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const body = req.body;                  // { model, messages, temperature, max_tokens }
  const apiKey = process.env.KIMI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'Server misconfigured' });

  try {
    const response = await fetch('https://api.moonshot.cn/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const txt = await response.text();
      return res.status(response.status).json({ error: txt });
    }
    const data = await response.json();
    return res.status(200).json(data);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
