import { rateLimiter } from '@vercel/edge';

async function handler(req) {
  if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405 });

  const body = await req.json();
  const apiKey = process.env.KIMI_API_KEY;
  if (!apiKey) return new Response('Server misconfigured', { status: 500 });

  try {
    const res = await fetch('https://api.moonshot.cn/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const t = await res.text();
      return new Response(t, { status: res.status });
    }
    const data = await res.json();
    return new Response(JSON.stringify(data), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(e.message, { status: 500 });
  }
}

// 每 IP 每 60 秒最多 10 次
export default rateLimiter(handler, { max: 10, window: '60s' });
