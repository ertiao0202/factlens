/* 镜像 & 工具函数与之前完全一致，省略重复 */
const $ = id => document.getElementById(id);

document.addEventListener('DOMContentLoaded', () => {
  const analyzeBtn = $('analyze-btn'),
        urlInput   = $('url-input'),
        textInput  = $('text-input'),
        progressSection = $('progress-section');

  analyzeBtn.addEventListener('click', startAnalysis);

  async function startAnalysis() {
    const url = urlInput.value.trim(), text = textInput.value.trim();
    if (!url && !text) return;

    progressSection.classList.remove('hidden');
    /* 以下 3 处全部改用 $ 获取，避免 undefined */
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
