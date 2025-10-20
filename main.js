// 放在 main.js 最前面
import { setLocale } from '/i18n/i18n.js';
document.addEventListener('DOMContentLoaded', () => {
  const sel = document.getElementById('lang-switch');
  if (sel) sel.addEventListener('change', e => setLocale(e.target.value));
});
/* global t, setLocale, renderLang */
document.addEventListener('DOMContentLoaded', () => {
  const analyzeBtn = document.getElementById('analyze-btn');
  const langSwitch = document.getElementById('lang-switch');
  // 记住语言
  const saved = localStorage.getItem('factlens-lang');
  if (saved && saved !== 'en') langSwitch.value = saved;
  langSwitch.addEventListener('change', e => setLocale(e.target.value));

  analyzeBtn.addEventListener('click', async () => {
    const url = document.getElementById('url-input').value.trim();
    const text = document.getElementById('text-input').value.trim();
    if (!url && !text) return;
    document.getElementById('progress-section').classList.remove('hidden');
    document.getElementById('results-section').classList.add('hidden');
    try {
      const content = url ? await fetchPage(url) : text.slice(0, 3500);
      const report = await analyzeWithKimi(content, url || 'pasted text');
      displayResults(report);
    } catch (e) {
      document.getElementById('total-conclusion').textContent = t('error.fetch');
      document.getElementById('summary-banner').classList.remove('hidden');
    }
    document.getElementById('progress-section').classList.add('hidden');
  });
});

async function fetchPage(url) {
  const res = await fetch(`https://r.jina.ai/${encodeURIComponent(url)}`);
  if (!res.ok) throw new Error('fetch failed');
  return res.text();
}
async function analyzeWithKimi(content, title) {
  const prompt = `Role: You are FactLens, a "fact-opinion-bias" analyzer. Output strictly follows the format below.
Title: ${title}
Content: ${content}

Format:
| FactLens Report |
|----|
Credibility: X/10 (one-sentence reason)

#### Facts (max 8, falsifiable)
1. <fact>...</fact>

#### Opinions (max 8, not falsifiable)
1. <opinion>...</opinion>

#### Bias
- Emotional words: X eg <eg>sentence</eg>
- Binary opposition: X eg <eg>sentence</eg>
- Mind-reading: X eg <eg>sentence</eg>
- Overall slant: neutral/positive/negative X%

#### For Publishers (≤100 words, actionable)
xxx

#### PR Response Playbook (≤100 words)
xxx

#### Conclusion (≤80 words)
xxx`;
  const body = { model: 'moonshot-v1-8k', messages: [{ role: 'user', content: prompt }], temperature: 0.25, max_tokens: 2048 };
  const res = await fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  if (!res.ok) throw new Error('analysis failed');
  return (await res.json()).choices[0].message.content;
}
function displayResults(md) {
  // 简易解析，仅示例
  const credibility = md.match(/Credibility:\s*(\d+(?:\.\d+)?)\/10/)?.[1] || '8.5';
  document.getElementById('total-conclusion').textContent = `Credibility ${credibility}/10: ` + (md.match(/Conclusion:\s*(.+)/)?.[1] || '');
  document.getElementById('summary-banner').classList.remove('hidden');
  document.getElementById('results-section').classList.remove('hidden');
}
