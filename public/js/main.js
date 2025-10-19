// 镜像：去掉 401 的 s.jina，换成无鉴权节点
const mirrors = [
  url => `https://r.jina.ai/${encodeURIComponent(url)}?chunk_num=1&chunk_order=0&html=false`,
  url => `https://jina.readers.vercel.app/${encodeURIComponent(url)}`
];

/* 以下与之前完全一致，只加 1 处硬限 */
async function fetchText(url, maxTry = 2) {
  for (let i = 0; i < mirrors.length; i++) {
    try {
      const res = await fetch(mirrors[i](url), { signal: AbortSignal.timeout(8000) });
      if (res.ok) return await res.text();
    } catch (e) {
      if (i === mirrors.length - 1) throw e;
    }
  }
  return '';
}

function isValidBody(text) {
  if (!text || text.length < 20) return false;
  const invalid = /完成验证后方可继续访问|百度安全验证|Sina Visitor System|请开启 JavaScript|访客验证|无法访问|403 Forbidden|404 Not Found|Access Denied|Please enable cookies/i;
  return !invalid.test(text);
}

async function analyzeWithKimi(content, title) {
  const r = await fetch('/api/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content, title })
  });
  if (!r.ok) {
    const err = await r.json();
    throw new Error(err.error || '分析失败');
  }
  const { markdown } = await r.json();
  return markdown;
}

function parseKimiResponse(md) { /* 与之前完全一致 */ }
function displayResults(d) { /* 与之前完全一致 */ }
function drawRadar(data) { /* 与之前完全一致 */ }

const $ = id => document.getElementById(id);
document.addEventListener('DOMContentLoaded', () => {
  /* 以下与之前完全一致，省略重复绑定代码 */
  const analyzeBtn = $('analyze-btn'), urlInput = $('url-input'), textInput = $('text-input'), progressSection = $('progress-section');
  analyzeBtn.addEventListener('click', startAnalysis);

  async function startAnalysis() {
    const url = urlInput.value.trim(), text = textInput.value.trim();
    if (!url && !text) return;
    progressSection.classList.remove('hidden');
    $('results-section')?.classList.add('hidden');
    $('four-dim-card')?.classList.add('hidden');
    $('summary-banner')?.classList.add('hidden');

    try {
      let content = '', title = '';
      if (url) {
        $('progress-text').textContent = '正在获取网页内容...';
        $('progress-bar').style.width = '20%';
        content = await fetchText(url);
        if (!isValidBody(content)) throw new Error('NO_VALID_BODY');
        // 硬限 3500 字符，避免 413
        if (content.length > 3500) content = content.slice(0, 3500) + '……';
        title = url;
      } else {
        $('progress-text').textContent = '正在处理文本内容...';
        $('progress-bar').style.width = '20%';
        content = text.slice(0, 3500);
        title = '直接粘贴的文本内容';
      }
      $('progress-text').textContent = 'AI深度分析中...';
      $('progress-bar').style.width = '60%';
      const kimiMd = await analyzeWithKimi(content, title);
      $('progress-text').textContent = '生成可信度报告...';
      $('progress-bar').style.width = '100%';
      displayResults(parseKimiResponse(kimiMd));
    } catch (err) {
      $('progress-text').textContent = '分析失败';
      $('progress-bar').style.width = '100%';
      $('total-conclusion').textContent =
        err.message === 'NO_VALID_BODY'
          ? '因网站设置原因，明鉴AI无法访问原始内容，请复制粘贴文本内容直接进行分析。'
          : '分析过程出现异常，请稍后重试。';
      $('summary-banner').classList.remove('hidden');
      resultsSection.classList.add('hidden');
      fourDimCard.classList.add('hidden');
      setTimeout(() => progressSection.classList.add('hidden'), 1500);
      return;
    }

    setTimeout(() => {
      progressSection.classList.add('hidden');
      $('results-section').classList.remove('hidden');
      $('four-dim-card').classList.remove('hidden');
      $('results-section').classList.add('fade-in');
      $('four-dim-card').classList.add('fade-in');
    }, 1000);
  }
});
