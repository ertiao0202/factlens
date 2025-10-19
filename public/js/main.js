/* ========== 镜像抓取：去掉 401 的 s.jina，换无需鉴权节点 ========== */
const mirrors = [
  url => `https://r.jina.ai/${encodeURIComponent(url)}?chunk_num=1&chunk_order=0&html=false`,
  url => `https://jina.readers.vercel.app/${encodeURIComponent(url)}`
];

/* ========== 工具函数 ========== */
const $ = id => document.getElementById(id);

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

function parseKimiResponse(md) {
  const r = { title: '', credibility: 0, reason: '', facts: [], opinions: [], bias: { emotionalWords: 0, binaryOpposition: 0, motivationGuessing: 0, logicalFallacy: 0, overallTendency: '中性 0%' }, summaryForBanner: '', publisherRecommendation: '', recommendation: '' };
  const mCred = md.match(/可信度[:：]\s*(\d+(?:\.\d+)?)\s*\/\s*10\s*（(.+?)）/);
  if (mCred) { r.credibility = parseFloat(mCred[1]); r.reason = mCred[2]; }
  const mTitle = md.match(/标题[:：]\s*(.+?)(?:\n|\||$)/);
  if (mTitle) r.title = mTitle[1].trim();
  const fBlock = md.match(/#### 事实区[\s\S]*?(?=#### 观点区)/);
  if (fBlock) r.facts = fBlock[0].split('\n').filter(l => /^\d+\./.test(l)).map(l => l.replace(/^\d+\.\s*<fact>(.*)<\/fact>.*/, '$1').trim()).filter(Boolean);
  const oBlock = md.match(/#### 观点区[\s\S]*?(?=#### 偏见指标)/);
  if (oBlock) r.opinions = oBlock[0].split('\n').filter(l => /^\d+\./.test(l)).map(l => l.replace(/^\d+\.\s*<opinion>(.*)<\/opinion>.*/, '$1').trim()).filter(Boolean);
  const bBlock = md.match(/#### 偏见指标[\s\S]*?(?=#### 对内容发布者的建议)/);
  if (bBlock) {
    const b = bBlock[0];
    const emo = b.match(/情绪化词汇[:：]\s*(\d+)\s*处/);
    const bin = b.match(/二元对立[:：]\s*(\d+)\s*组/);
    const mot = b.match(/动机揣测[:：]\s*(\d+)\s*处/);
    const fall = b.match(/逻辑谬误[:：]\s*(\d+)\s*处/);
    const tend = b.match(/整体倾向[:：]\s*([\u4e00-\u9fa5]+\s*\d+%|\d+%\s*[\u4e00-\u9fa5]+)/);
    if (emo) r.bias.emotionalWords = parseInt(emo[1]);
    if (bin) r.bias.binaryOpposition = parseInt(bin[1]);
    if (mot) r.bias.motivationGuessing = parseInt(mot[1]);
    if (fall) r.bias.logicalFallacy = parseInt(fall[1]);
    if (tend) r.bias.overallTendency = tend[1].trim();
  }
  const pub = md.match(/#### 对内容发布者的建议[\s\S]*?\n【行动】\s*(.+?)\s*(?=####|$)/s);
  if (pub) r.publisherRecommendation = pub[1].replace(/\s+/g,' ').trim();
  const pr  = md.match(/#### 公关回应建议[\s\S]*?\n【回应要点】\s*(.+?)\s*(?=####|$)/s);
  if (pr) r.recommendation = pr[1].replace(/\s+/g,' ').trim();
  const banner = md.match(/#### 报告总结论（≤80 字）\s*\n([\s\S]*?)(?=###|\|$$|\n*$|$)/);
  if (banner) r.summaryForBanner = banner[1].replace(/\s+/g,' ').trim();
  return r;
}

function displayResults(d) {
  const ts = Math.min(10, 0.5 + (d.credibility || 8.5));
  const ebRaw = d.bias.emotionalWords + d.bias.binaryOpposition + d.bias.motivationGuessing;
  const eb = Math.max(0, 10 - ebRaw * 1.2);

  let biasTxt = '';
  if (ebRaw === 0)       biasTxt = '基本中立';
  else if (ebRaw <= 2)   biasTxt = '略有倾向';
  else if (ebRaw <= 4)   biasTxt = '存在明显偏见';
  else                   biasTxt = '存在严重偏见';

  const stance = eb >= 8 ? '客观中立' : eb >= 6 ? '有失偏颇' : '不够客观';
  const conclusion = d.summaryForBanner
    ? `${d.summaryForBanner} 这是一篇${stance}的报道，${biasTxt}。`
    : `这是一篇${stance}的报道，${biasTxt}。`;
  $('total-conclusion').textContent = conclusion;
  $('summary-banner').classList.remove('hidden');

  const factsList = $('facts-list');
  factsList.innerHTML = d.facts.length ? d.facts.map((f, i) => `<div class="text-sm text-gray-700 bg-blue-50 p-3 rounded-lg">${i + 1}. ${f}</div>`).join('') : '<div class="text-sm text-gray-500">未检测到明确的事实陈述</div>';
  const opList = $('opinions-list');
  opList.innerHTML = d.opinions.length ? d.opinions.map((o, i) => `<div class="text-sm text-gray-700 bg-green-50 p-3 rounded-lg">${i + 1}. ${o}</div>`).join('') : '<div class="text-sm text-gray-500">未检测到明确的观点表达</div>';
  $('emotional-words').textContent = d.bias.emotionalWords + ' 处';
  $('binary-opposition').textContent = d.bias.binaryOpposition + ' 组';
  $('motivation-guessing').textContent = d.bias.motivationGuessing + ' 处';
  $('overall-tendency').textContent = d.bias.overallTendency || '中性 0%';
  $('publisher-recommendation').textContent = d.publisherRecommendation || '建议提升内容质量';
  $('pr-recommendation').textContent = d.recommendation || '建议谨慎处理';

  const fd = Math.min(10, 1.5 + (d.facts.length || 0) * 1.8);
  const cs = Math.min(10, 0.5 + (ts + fd + eb) / 3);
  $('eb-score').textContent = eb.toFixed(1);
  $('ts-score').textContent = ts.toFixed(1);
  $('fd-score').textContent = fd.toFixed(1);
  $('cs-score').textContent = cs.toFixed(1);

  const ebPercent = eb * 10;
  const hue        = 34 - (ebPercent * 0.34);
  const lightness  = 55 - (ebPercent * 0.15);
  const barColor   = `hsl(${hue}, 90%, ${lightness}%)`;
  $('eb-bar').style.cssText = `width:${ebPercent.toFixed(0)}%;background:${barColor}`;
  $('ts-bar').style.cssText = `width:${(ts * 10).toFixed(0)}%;background-color:#2563eb`;
  $('fd-bar').style.cssText = `width:${(fd * 10).toFixed(0)}%;background-color:#16a34a`;
  $('cs-bar').style.cssText = `width:${(cs * 10).toFixed(0)}%;background-color:#9333ea`;

  const avg = (ts + fd + eb + cs) / 4;
  let lvl = 'D', txt = '低可信度';
  if (avg >= 8.5) { lvl = 'A'; txt = '高可信度'; } else if (avg >= 7) { lvl = 'B'; txt = '中等可信度'; } else if (avg >= 5) { lvl = 'C'; txt = '偏低可信度'; }
  $('badge-level').textContent = lvl + ' 级';
  $('badge-text').textContent = txt;
  drawRadar([ts, fd, eb, cs]);
}

function drawRadar(data) {
  const ctx = $('radar-canvas');
  if (window.radarInstance) window.radarInstance.destroy();
  window.radarInstance = new Chart(ctx, {
    type: 'radar',
    data: {
      labels: ['信源透明度', '事实密度', '情绪中立度', '一致性'],
      datasets: [{ label: '得分', data: data, backgroundColor: 'rgba(59, 130, 246, 0.2)', borderColor: 'rgba(59, 130, 246, 1)', pointBackgroundColor: 'rgba(59, 130, 246, 1)', pointBorderColor: '#fff', pointHoverBackgroundColor: '#fff', pointHoverBorderColor: 'rgba(59, 130, 246, 1)' }]
    },
    options: { scales: { r: { angleLines: false, suggestedMin: 0, suggestedMax: 10 } }, plugins: { legend: { display: false } } }
  });
}

/* ========== 页面初始化 ========== */
document.addEventListener('DOMContentLoaded', () => {
  const analyzeBtn = $('analyze-btn'),
        urlInput   = $('url-input'),
        textInput  = $('text-input'),
        progressSection = $('progress-section');

  /* 清空按钮交互 */
  ['urlInput', 'textInput'].forEach(id => {
    const input = $(id), clear = $(id.replace('Input', '-btn'));
    input.addEventListener('input', () => {
      const has = !!input.value;
      if (id === 'urlInput') {
        if (has) textInput.value = '';
        $('clear-btn').classList.toggle('hidden', !has);
      } else {
        if (has) urlInput.value = '';
        $('clear-text-btn').classList.toggle('hidden', !has);
      }
      analyzeBtn.disabled = !has;
      analyzeBtn.classList.toggle('opacity-50', !has);
    });
    if (clear) clear.addEventListener('click', () => { input.value = ''; input.dispatchEvent(new Event('input')); });
  });

  analyzeBtn.addEventListener('click', startAnalysis);

  async function startAnalysis() {
    const url = urlInput.value.trim(), text = textInput.value.trim();
    if (!url && !text) return;

    progressSection.classList.remove('hidden');
    /* 以下全部改用 $ 获取，避免 undefined */
    $('#results-section').classList.add('hidden');
    $('#four-dim-card').classList.add('hidden');
    $('#summary-banner').classList.add('hidden');

    try {
      let content = '', title = '';
      if (url) {
        $('progress-text').textContent = '正在获取网页内容...';
        $('progress-bar').style.width = '20%';
        content = await fetchText(url);
        if (!isValidBody(content)) throw new Error('NO_VALID_BODY');
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
      $('#summary-banner').classList.remove('hidden');
      $('#results-section').classList.add('hidden');
      $('#four-dim-card').classList.add('hidden');
      setTimeout(() => progressSection.classList.add('hidden'), 1500);
      return;
    }

    setTimeout(() => {
      progressSection.classList.add('hidden');
      $('#results-section').classList.remove('hidden');
      $('#four-dim-card').classList.remove('hidden');
      $('#results-section').classList.add('fade-in');
      $('#four-dim-card').classList.add('fade-in');
    }, 1000);
  }
});
