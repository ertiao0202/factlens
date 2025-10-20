// i18n.js  (ESM 浏览器版)
let LANG = localStorage.getItem('factlens-lang') || 'en';
const cache = {};

async function fetchJSON(url) {
  return fetch(url).then(r => r.json());
}
async function loadLocale(l) {
  if (cache[l]) return cache[l];
  cache[l] = await fetchJSON(`/i18n/${l}.json`);
  return cache[l];
}
export function t(key, obj) {
  const str = (cache[LANG] || {})[key] || key;
  return obj ? str.replace(/\{\{(\w+)\}\}/g, (_, k) => obj[k] || '') : str;
}
export async function setLocale(l) {
  LANG = l;
  localStorage.setItem('factlens-lang', l);
  document.documentElement.lang = l;
  await loadLocale(l);
  renderLang();
}
export function renderLang() {
  // 常规文案
  document.querySelectorAll('[data-i18n]').forEach(el => el.textContent = t(el.dataset.i18n));
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => el.placeholder = t(el.dataset.i18nPlaceholder));

  // 强制刷新维度标签 & 按钮文字
  ['eb-score','ts-score','fd-score','cs-score','emotional-words','binary-opposition','motivation-guessing','overall-tendency','publisher-recommendation','pr-recommendation']
    .forEach(id => {
      const el = document.getElementById(id);
      if (el && el.dataset.i18n) el.textContent = t(el.dataset.i18n);
    });
}
// 自动初始化
(async () => {
  await loadLocale('en');
  renderLang();
})();
