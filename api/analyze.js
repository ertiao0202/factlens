export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method Not Allowed' }),
      { status: 405, headers: { 'Content-Type': 'application/json' } });
  }
  const { content, title } = await req.json();
  if (!content || !title) {
    return new Response(JSON.stringify({ error: '缺少 content 或 title' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } });
  }
  const prompt = `【角色】你是明鉴AI，专做“事实-观点-偏见”三色拆解，风格犀利、简洁、中性。
【输入】Markdown正文如下：
${content}
【输出格式】
| 明鉴·FactLens 报告 |
|------------------|
| 标题：${title} |
| 可信度：X / 10（一句话理由） |

#### 事实区（≤5 条，每条≤25 字）
1. xxx
...

#### 观点区（≤5 条，每条≤25 字）
1. xxx
...

#### 偏见指标
- 情绪化词汇：X 处
- 二元对立：X 组
- 动机揣测：X 处
- 整体倾向：批判/中性/赞扬 X%

#### 一句话摘要（≤40 字）
xxx

#### 对内容发布者的建议（≤60 字）
必须给出具体建议，不能写“暂无”或“无”。

#### 公关回应建议（≤60 字）
必须给出具体建议，不能写“暂无”或“无”。`;

  try {
    const moonResp = await fetch('https://api.moonshot.cn/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.KIMI_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'moonshot-v1-8k',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.25,
        max_tokens: 2048
      })
    });
    if (!moonResp.ok) throw new Error('Moonshot 返回异常');
    const json = await moonResp.json();
    const markdown = json.choices[0].message.content;
    return new Response(JSON.stringify({ markdown }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
