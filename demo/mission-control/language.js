// Explicit authored UI translations. Source data and quoted text are never rewritten.
(function () {
  'use strict';
  const key = 'mission-control-demo-language';
  const valid = value => value === 'en' || value === 'de';
  const address = new URL(location.href);
  let stored;
  try { stored = localStorage.getItem(key); } catch { /* A URL choice works without storage. */ }
  const requested = address.searchParams.get('lang');
  const language = valid(requested) ? requested : valid(stored) ? stored : 'en';
  if (valid(requested)) {
    try { localStorage.setItem(key, language); } catch { /* Keep the explicit URL choice. */ }
  }
  const t = (german, english) => language === 'de' ? german : english;
  document.documentElement.lang = language;
  function href(value) {
    const target = new URL(value, location.href);
    if (target.origin === address.origin && ['http:', 'https:'].includes(target.protocol) && /\.html$/.test(target.pathname)) target.searchParams.set('lang', language);
    return target.href;
  }
  function selector() {
    const label = document.createElement('label');
    label.className = 'app-language';
    const caption = document.createElement('span');
    caption.textContent = t('Sprache', 'Language');
    const select = document.createElement('select');
    select.setAttribute('aria-label', caption.textContent);
    for (const [value, text] of [['en', 'English'], ['de', 'Deutsch']]) {
      const option = document.createElement('option');
      option.value = value; option.textContent = text; select.append(option);
    }
    select.value = language;
    select.addEventListener('change', () => {
      if (!valid(select.value)) return;
      if (typeof window.dispatchEvent === 'function' && typeof CustomEvent === 'function') {
        const event = new CustomEvent('ui-language-before-change', { cancelable: true, detail: { language: select.value } });
        if (!window.dispatchEvent(event)) { select.value = language; return; }
      }
      try { localStorage.setItem(key, select.value); } catch { /* The query retains the choice. */ }
      const target = new URL(location.href);
      target.searchParams.set('lang', select.value);
      location.assign(target.href);
    });
    label.append(caption, select);
    return label;
  }
  function authoredLabels() {
    for (const node of document.querySelectorAll('a[href]')) node.href = href(node.href);
    for (const node of document.querySelectorAll('[data-i18n-de]')) {
      // A renderer may already have replaced the placeholder with source content.
      if ([node.dataset.i18nDe, node.dataset.i18nEn].includes(node.textContent)) node.textContent = t(node.dataset.i18nDe, node.dataset.i18nEn);
    }
    for (const attribute of ['aria-label', 'title', 'placeholder']) {
      for (const node of document.querySelectorAll('[data-i18n-' + attribute + '-de]')) {
        const de = node.getAttribute('data-i18n-' + attribute + '-de'), en = node.getAttribute('data-i18n-' + attribute + '-en');
        if ([de, en].includes(node.getAttribute(attribute))) node.setAttribute(attribute, t(de, en));
      }
    }
  }
  window.UI_LANGUAGE = Object.freeze({ t, language, locale: language === 'de' ? 'de-AT' : 'en-GB', selector, href });
  document.addEventListener('DOMContentLoaded', authoredLabels, { once: true });
})();
