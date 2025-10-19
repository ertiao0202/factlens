/* ========== 镜像 & 工具函数（与之前完全一致，省略重复） ========== */
const mirrors = [
  url => `https://r.jina.ai/${encodeURIComponent(url)}?chunk_num=1&chunk_order=0&html=false`,
  url => `https://jina.readers.vercel.app/${encodeURIComponent(url)}`
];
const $ = id => document.getElementById(id);

/* 以下 fetchText / isValidBody / analyzeWithKimi / parse / display / drawRadar 全部保持上一版内容，此处省略重复 */

/* ========== 页面初始化 ========== */
document.addEventListener('DOMContentLoaded', () => {
  const analyzeBtn = $('analyze-btn'),
        urlInput   = $('url-input'),
        textInput  = $('text-input'),
        progressSection = $('progress-section');

  /* 清空按钮交互：加非空判断，避免 null.addEventListener */
  ['urlInput', 'textInput'].forEach(id => {
    const input = $(id), clearBtn = $(id.replace('Input', '-btn'));
    if (!input || !clearBtn) return;                   // ← 关键：空节点直接跳过
    input.addEventListener('input', () => {
      const has = !!input.value;
      if (id === 'urlInput') {
        if (has) textInput.value = '';
        clearBtn.classList.toggle('hidden', !has);
      } else {
        if (has) urlInput.value = '';
        clearBtn.classList.toggle('hidden', !has);
      }
      analyzeBtn.disabled = !has;
      analyzeBtn.classList.toggle('opacity-50', !has);
    });
    clearBtn.addEventListener('click', () => { input.value = ''; input.dispatchEvent(new Event('input')); });
  });

  analyzeBtn.addEventListener('click', startAnalysis);

  async function startAnalysis() {
    const url = urlInput.value.trim(), text = textInput.value.trim();
    if (!url && !text) return;

    progressSection.classList.remove('hidden');
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
