(function () {
  'use strict';
  const base = new URL('.', document.currentScript.src);
  const tr = (de, en) => window.UI_LANGUAGE ? window.UI_LANGUAGE.t(de, en)
    : new URL(location.href).searchParams.get('lang') === 'de' ? de : en;
  const nativeFetch = window.fetch.bind(window);
  const address = new URL(location.href);
  const registry = window.MISSION_CONTROL_DEMO_PROFILES;
  const validRegistry = registry?.schema === 'mission-control-demo-profiles-1' && Array.isArray(registry.profiles)
    && registry.profiles.length && registry.profiles.some(profile => profile.id === registry.defaultProfile)
    && typeof registry.invariant?.en === 'string' && typeof registry.invariant?.de === 'string' && new Set(registry.profiles.map(profile => profile.id)).size === registry.profiles.length
    && registry.profiles.every(profile => /^[a-z][a-z-]+$/.test(profile.id) && profile.prefix === 'profiles/' + profile.id + '/'
      && ['en', 'de'].every(language => typeof profile.title?.[language] === 'string' && typeof profile.description?.[language] === 'string') && Array.isArray(profile.sources)
      && profile.sources.every(source => typeof source.id === 'string' && source.id && /^[a-f0-9]{64}$/.test(source.revision)
        && typeof source.storagePath === 'string' && source.storagePath.startsWith(profile.prefix)
        && /^[a-z0-9./-]+\.json$/.test(source.storagePath) && source.storagePath.split('/').every(part => part && !part.startsWith('.'))));
  const choices = validRegistry ? registry.profiles : [];
  const defaultProfile = choices.find(profile => profile.id === registry.defaultProfile);
  const selectorKey = 'mission-control-demo-profile';
  let storedProfile = '', storageUnavailable = false;
  try { storedProfile = localStorage.getItem(selectorKey) || ''; } catch { storageUnavailable = true; }
  const requestedProfiles = address.searchParams.getAll('profile');
  const requested = requestedProfiles.length === 1 ? choices.find(profile => profile.id === requestedProfiles[0]) : null;
  const invalidProfile = requestedProfiles.length > 0 && !requested;
  const profile = requested || (!requestedProfiles.length && choices.find(profile => profile.id === storedProfile)) || defaultProfile;
  const prefix = profile?.prefix || '';
  const profileAddress = value => {
    const target = new URL(value, location.href);
    if (profile && target.origin === base.origin && !target.username && !target.password && target.pathname.startsWith(base.pathname)) {
      target.searchParams.set('profile', profile.id);
      const language = window.UI_LANGUAGE?.language || new URL(location.href).searchParams.get('lang');
      if (!['en', 'de'].includes(target.searchParams.get('lang')) && ['en', 'de'].includes(language)) target.searchParams.set('lang', language);
    }
    return target;
  };
  if (profile) {
    try { localStorage.setItem(selectorKey, profile.id); } catch { storageUnavailable = true; }
    // Only the existing demo namespace is scoped; private application keys are never read or copied.
    const storageMethods = typeof Storage === 'undefined' ? null : Object.fromEntries(['getItem', 'setItem', 'removeItem'].map(name => [name, Storage.prototype[name]]));
    if (storageMethods) for (const name of ['getItem', 'setItem', 'removeItem']) {
      const original = storageMethods[name];
      Storage.prototype[name] = function (key, ...args) {
        key = String(key);
        if (key.startsWith('mission-control-demo') && !key.startsWith('mission-control-demo@') && key !== selectorKey) {
          const scoped = 'mission-control-demo@' + profile.id + ':' + key;
          if (name === 'getItem' && profile.id === registry.defaultProfile) {
            const value = original.call(this, scoped);
            if (value !== null) return value;
            const legacy = original.call(this, key);
            if (legacy !== null) {
              try { storageMethods.setItem.call(this, scoped, legacy); storageMethods.removeItem.call(this, key); } catch { /* The original remains readable when migration cannot be saved. */ }
            }
            return legacy;
          }
          key = scoped;
        }
        return original.call(this, key, ...args);
      };
    }
    if (typeof history !== 'undefined') {
      for (const method of ['pushState', 'replaceState']) {
        const original = history[method].bind(history);
        history[method] = (state, title, url) => original(state, title, url == null ? url : profileAddress(url).href);
      }
      if (address.searchParams.get('profile') !== profile.id || requestedProfiles.length !== 1) history.replaceState(history.state, '', profileAddress(address).href);
    }
  }

  function sourceHref(reference, anchor = '') {
    if (typeof reference !== 'string' || typeof anchor !== 'string' || /[\\:\x00-\x1f]/.test(reference)
      || reference.split('/').some(part => !part || part.startsWith('.'))) return '';
    const aliases = { HOME: 'demo-guide', 'demo-guide.md': 'demo-guide' };
    const id = Object.hasOwn(aliases, reference) ? aliases[reference]
      : /^demo-sources\/demo-[a-z0-9-]+$/.test(reference) ? reference + '.md' : reference;
    const project = new URL(location.href).searchParams.get('projekt') || new URLSearchParams(location.hash.slice(1)).get('bezug') || (id === 'demo-guide' ? 'demo-atlas' : '');
    return profileAddress(new URL('research.html#' + new URLSearchParams({ view: 'context', source: id, read: '1', ...(project ? { bezug: project } : {}),
      ...(anchor ? { anchor: anchor.toLowerCase().replace(/[^\p{L}\p{N}_\s-]/gu, '').replace(/\s/g, '-') } : {}) }), base)).href;
  }
  window.MISSION_CONTROL_DEMO = Object.freeze({ sourceHref, profile: profile?.id || '', profiles: choices });
  const sourceMap = nativeFetch(new URL(prefix + 'source-map.json', base), { credentials: 'omit', redirect: 'error' }).then(async response => {
    if (!response.ok) throw new Error(tr('Das statische Quellenregister ist nicht lesbar.', 'The static source registry is unreadable.'));
    const value = await response.json();
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(tr('Das statische Quellenregister ist ungültig.', 'The static source registry is invalid.'));
    for (const [id, file] of Object.entries(value)) {
      if (!id || /[\\:\x00-\x1f\x7f]/.test(id) || id.split('/').some(part => !part || part.startsWith('.')) || typeof file !== 'string' || !/^[\p{L}\p{N}_./-]+\.json$/u.test(file) || file.split('/').some(part => !part || part.startsWith('.'))
        || !new URL(file, base).pathname.startsWith(base.pathname)) throw new Error(tr('Unsicherer Quellenpfad.', 'Unsafe source path.'));
    }
    return value;
  });
  sourceMap.catch(() => {});
  window.fetch = async (input, options = {}) => {
    const url = new URL(typeof input === 'string' || input instanceof URL ? input : input.url, location.href);
    const method = String(options.method || input?.method || 'GET').toUpperCase();
    if (url.origin !== base.origin || url.username || url.password || !['GET', 'HEAD'].includes(method)) return Promise.reject(new Error(tr('Demo: externe Zugriffe und Übertragung sind nicht verfügbar. Es wurde nichts gesendet.', 'Demo: external access and transmission are unavailable. Nothing was sent.')));
    const endpoint = url.pathname.startsWith('/api/') ? url.pathname
      : url.pathname.startsWith(base.pathname + 'api/') ? '/' + url.pathname.slice(base.pathname.length) : '';
    // Remap read-only consumer URLs to reviewed files, even below a hosting subpath.
    const readOptions = { method, credentials: 'omit', redirect: 'error',
      ...(options.cache ? { cache: options.cache } : {}),
      ...((options.signal || input?.signal) ? { signal: options.signal || input.signal } : {}) };
    if (endpoint) {
      if (endpoint === '/api/source') {
        const sources = await sourceMap;
        const id = url.searchParams.get('path');
        if (!Object.hasOwn(sources, id)) throw new Error(tr('Diese Quelle ist nicht im statischen Paket ausgewählt.', 'This source is not selected in the static package.'));
        return nativeFetch(new URL(sources[id], base), readOptions);
      }
      const asset = endpoint === '/api/research' ? 'coverage.json' : endpoint === '/api/work' ? 'work.json'
        : endpoint === '/api/acceptance-review' && url.searchParams.get('lane') === 'demo-research' && url.searchParams.get('kennung') === 'DEMO-COMPARE' ? 'acceptance.json'
        : endpoint === '/api/agent-work' ? 'agent-work.json'
        : endpoint === '/api/operator-sessions' ? 'operator-sessions.json'
        : endpoint === '/api/relations' ? 'relations.json' : endpoint === '/api/progress' ? 'progress.json' : '';
      if (!asset) return Promise.reject(new Error(tr('Diese Quelle oder Dienstfunktion ist im synthetischen Beispiel nicht verfügbar.', 'This source or service is unavailable in the synthetic example.')));
      return nativeFetch(new URL(prefix + 'demo-assets/' + asset, base), readOptions);
    }
    if (!url.pathname.startsWith(base.pathname)) return Promise.reject(new Error(tr('Der Demo-Zugriff verlässt das veröffentlichte Paket.', 'This demo request leaves the published package.')));
    const relative = url.pathname.slice(base.pathname.length);
    if (prefix && relative.startsWith('mission-control/briefings/')) return nativeFetch(new URL(prefix + relative, base), readOptions);
    return nativeFetch(input, options);
  };
  document.addEventListener('DOMContentLoaded', () => {
    const notice = document.createElement('aside'); notice.className = 'demo-notice'; notice.setAttribute('aria-label', tr('Demostand', 'Demo status'));
    const label = document.createElement('strong'); label.textContent = tr('Synthetische Demo · 0.9.0 RC3', 'Synthetic demo · 0.9.0 RC3');
    const text = document.createElement('span'); text.textContent = tr(' Alle Projekte, Rollen, Befunde, Sitzungsmetadaten und Termine sind erfunden. Quellenlesen, Kopieren und Browser-Einstellungen funktionieren lokal. Versand, Agentenaktivität, Kalenderverbindung und kanonische Übernahme sind nicht verfügbar.', ' All projects, roles, findings, session metadata and dates are fictional. Source reading, copying and browser settings work locally. Sending, agent activity, calendar connections and canonical adoption are unavailable.');
    const profileControls = document.createElement('section'); profileControls.className = 'demo-profile';
    if (profile) {
      const language = window.UI_LANGUAGE?.language === 'de' ? 'de' : 'en';
      const label = document.createElement('label'); label.textContent = tr('Quellenorganisation ', 'Source organization ');
      const select = document.createElement('select'); select.id = 'demo-profile';
      for (const item of choices) { const option = document.createElement('option'); option.value = item.id; option.textContent = item.title[language]; option.selected = item.id === profile.id; select.append(option); }
      label.append(select);
      const description = document.createElement('p'); description.textContent = profile.description[language];
      const same = document.createElement('p'); same.textContent = registry.invariant[language];
      const detail = document.createElement('details');
      const summary = document.createElement('summary'); summary.textContent = tr('Quellenablage und stabile Identitäten ansehen', 'Inspect source layout and stable identities'); detail.append(summary);
      const tree = Object.create(null);
      for (const source of profile.sources) {
        const parts = source.storagePath.slice(profile.prefix.length).split('/');
        let branch = tree;
        for (const part of parts.slice(0, -1)) branch = branch[part] ||= Object.create(null);
        branch[parts.at(-1)] = source;
      }
      const list = branch => {
        const ul = document.createElement('ul');
        for (const [name, value] of Object.entries(branch)) {
          const li = document.createElement('li');
          if (value.storagePath) {
            const link = document.createElement('a'); link.href = sourceHref(value.id); link.textContent = value.title;
            const mapping = document.createElement('code'); mapping.textContent = value.id + ' → ' + name;
            li.append(link, mapping);
          } else { const folder = document.createElement('span'); folder.textContent = name + '/'; li.append(folder, list(value)); }
          ul.append(li);
        }
        return ul;
      };
      detail.append(list(tree));
      select.addEventListener('change', () => {
        const target = new URL(location.href); target.searchParams.set('profile', select.value);
        target.searchParams.set('lang', window.UI_LANGUAGE?.language || language);
        location.href = target.href;
      });
      profileControls.append(label, description, same, detail);
      if (invalidProfile || storageUnavailable) {
        const message = document.createElement('p'); message.setAttribute('role', 'status');
        message.textContent = invalidProfile ? tr('Unbekanntes oder mehrfach angegebenes Profil: Standardprofil wird angezeigt.', 'Unknown or repeated profile: showing the default profile.')
          : tr('Browser-Speicherung ist nicht verfügbar. Die Profilwahl bleibt in der URL erhalten.', 'Browser storage is unavailable. The profile choice remains in the URL.');
        profileControls.append(message);
      }
      const decorate = root => {
        for (const link of [ ...(root.matches?.('a[href]') ? [root] : []), ...(root.querySelectorAll?.('a[href]') || []) ]) {
          const target = new URL(link.getAttribute('href'), location.href);
          if (target.origin === base.origin && target.pathname.startsWith(base.pathname)) { const href = profileAddress(target).href; if (link.href !== href) link.href = href; }
        }
      };
      document.addEventListener('click', event => { const link = event.target.closest?.('a[href]'); if (link) decorate(link); }, true);
      decorate(document.body);
      const observer = new MutationObserver(records => { for (const record of records) { if (record.type === 'attributes') decorate(record.target); else for (const node of record.addedNodes) if (node.nodeType === 1) decorate(node); } });
      observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['href'] });
    }
    const reset = document.createElement('button'); reset.type = 'button'; reset.textContent = tr('Demo zurücksetzen', 'Reset demo');
    const status = document.createElement('span'); status.setAttribute('role', 'status');
    reset.addEventListener('click', () => {
      try {
        for (const storage of [localStorage, sessionStorage]) {
          for (const key of Object.keys(storage)) if (profile ? key.startsWith('mission-control-demo@' + profile.id + ':') : key.startsWith('mission-control-demo')) storage.removeItem(key);
        }
        location.href = profileAddress(new URL('index.html', base)).href;
      } catch { status.textContent = tr('Der Browser erlaubt keinen vollständigen Reset. Die Beispieldaten wurden nicht verändert.', 'The browser does not allow a complete reset. Example data was not changed.'); }
    });
    notice.append(label, text, profileControls, reset, status); document.body.prepend(notice);
    const original = document.querySelector('.research-baseline');
    if (original) { original.textContent = tr('Beispielquelle', 'Example source'); original.href = sourceHref('demo-guide'); }
  }, { once: true });
})();
