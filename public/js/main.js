/* ========== 镜像 & 工具函数（同上一版，省略重复） ========== */
const mirrors = [
  url => `https://r.jina.ai/${encodeURIComponent(url)}?chunk_num=1&chunk_order=0&html=false`,
  url => `https://jina.readers.vercel.app/${encodeURIComponent(url)}`
];
const $ = id => document.getElementById(id);

/* fetchText / isValidBody / analyzeWithKimi / parse / display / drawRadar 与上一版完全一致，此处省略 */

/* ========== 页面初始化 ========== */
document.addEventListener('DOMContentLoaded', () => {
  const analyzeBtn = $('analyze-btn'),
        urlInput   = $('url-input'),
        textInput  = $('text-input'),
        progressSection = $('progress-section');

  /* 工具：存在才操作 */
  const show = (id, show = true) => { const el = $(id); el && el.classList.toggle('hidden', !show); };
  const setWidth = (id, v) => { const el = $(id); el && (el.style.width = v); };
  const setText = (id, v) => { const el = $(id); el && (el.textContent = v); };

  /* 清空按钮交互（带 null 保护） */
  ['urlInput', 'textInput'].forEach(id => {
    const input = $(id), clearBtn = $(id.replace('Input', '-btn'));
    if (!input || !clearBtn) return;
    input.addEventListener('input', () => {
      const has = !!input.value;
      if (id === 'urlInput') {
        if (has && textInput) textInput.value = '';
      } else {
        if (has && urlInput) urlInput.value = '';
      }
      clearBtn.classList.toggle('hidden', !has);
      if (analyzeBtn) {
        analyzeBtn.disabled = !has;
        analyzeBtn.classList.toggle('opacity-50', !has);
      }
    });
    clearBtn.addEventListener('click', () => { input.value = ''; input.dispatchEvent(new Event('input')); });
  });

  /* 关键：存在才绑定 */
  if (analyzeBtn) analyzeBtn.addEventListener('click', startAnalysis);

  async function startAnalysis() {
    const url = urlInput ? urlInput.value.trim() : '';
    const text = textInput ? textInput.value.trim() : '';
    if (!url && !text) return;

    show('progress-section', true);
    show('results-section', false);
    show('four-dim-card', false);
    show('summary-banner', false);

    try {
      let content = '', title = '';
      if (url) {
        setText('progress-text', '正在获取网页内容...');
        setWidth('progress-bar', '20%');
        content = await fetchText(url);
        if (!isValidBody(content)) throw new Error('NO_VALID_BODY');
        if (content.length > 3500) content = content.slice(0, 3500) + '……';
        title = url;
      } else {
        setText('progress-text', '正在处理文本内容...');
        setWidth('progress-bar', '20%');
        content = text.slice(0, 3500);
        title = '直接粘贴的文本内容';
      }
      setText('progress-text', 'AI深度分析中...');
      setWidth('progress-bar', '60%');
      const kimiMd = await analyzeWithKimi(content, title);
      setText('progress-text', '生成可信度报告...');
      setWidth('progress-bar', '100%');
      displayResults(parseKimiResponse(kimiMd));
    } catch (err) {
      setText('progress-text', '分析失败');
      setWidth('progress-bar', '100%');
      setText('total-conclusion',
        err.message === 'NO_VALID_BODY'
          ? '因网站设置原因，明鉴AI无法访问原始内容，请复制粘贴文本内容直接进行分析。'
          : '分析过程出现异常，请稍后重试。');
      show('summary-banner', true);
      show('results-section', false);
      show('four-dim-card', false);
      setTimeout(() => show('progress-section', false), 1500);
      return;
    }

    setTimeout(() => {
      show('progress-section', false);
      show('results-section', true);
      show('four-dim-card', true);
      $('#results-section').classList.add('fade-in');
      $('#four-dim-card').classList.add('fade-in');
    }, 1000);
  }
});
