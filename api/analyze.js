// 镜像列表：去掉 401 的 s.jina，换成无需鉴权的新节点
const mirrors = [
  url => `https://r.jina.ai/${encodeURIComponent(url)}?chunk_num=1&chunk_order=0&html=false`,
  url => `https://jina.readers.vercel.app/${encodeURIComponent(url)}` // 备用，无鉴权
];

/* 其余代码完全不变，只加两处硬限 */
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', process.env.FRONTEND_URL || '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { content = '', title = '用户输入' } = req.body || {};
  if (!content || content.length < 10) return res.status(400).json({ error: '文本过短' });

  // 1. 硬限 3500 字符，避免 413
  if (content.length > 3500) content = content.slice(0, 3500) + '……';

  const prompt = `【角色】你是明鉴AI——专门做「事实-观点-偏见」三色拆解的内容鉴定器。
【格式规范】
| 明鉴·FactLens 报告 |
|------------------|
| 标题：${title} |
| 可信度：X / 10（一句话理由）|

#### 事实区（≤8 条，每条≤40 字，必须可证伪）
1. <fact>xxx</fact>
...

#### 观点区（≤8 条，每条≤40 字，必须不可证伪）
1. <opinion>xxx</opinion>

#### 偏见指标
- 情绪化词汇：X 处；示例：<eg>原句1</eg>
- 二元对立：X 组；示例：<eg>原句</eg>
- 动机揣测：X 处；示例：<eg>原句</eg>
- 逻辑谬误：X 处；类型：<type>滑坡/稻草人/诉诸权威</type>；示例：<eg>原句</eg>
- 整体倾向：批判/中性/赞扬 X%

#### 对内容发布者的建议（≤100 字，必须可执行）
【场景】${title}
【问题】{{一句话指出最大风险}}
【行动】{{动词开头，量化优先}}
xxx

#### 公关回应建议（≤100 字，必须可执行）
【场景】${title}
【舆情风险】{{公众最可能误解的点}}
【回应要点】{{可直接发布的口径，≤100 字}}
xxx

#### 报告总结论（≤80 字）
两句话以内概括原文核心信息。
xxx

【正文】
${content}`;

  try {
    const moonRes = await fetch('https://api.moonshot.cn/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.MOONSHOT_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'moonshot-v1-8k',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.25,
        max_tokens: 2048,
      }),
    });
    if (!moonRes.ok) {
      const txt = await moonRes.text();
      return res.status(500).json({ error: `Moonshot ${moonRes.status}: ${txt}` });
    }
    const json = await moonRes.json();
    return res.status(200).json({ markdown: json.choices[0].message.content });
  } catch (e) {
    return res.status(500).json({ error: '网络异常，请重试' });
  }
}
