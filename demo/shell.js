'use strict';

const uiShell = (de, en) => globalThis.window?.UI_LANGUAGE?.t(de, en) ?? de;


window.SECOND_BRAIN_SHELL = (() => {
  function configuration(attributes, pathname) {
    // Deployment attributes may select relative directories, never another origin or executable URLs.
    const directory = (value) => typeof value === 'string' && /^(?:(?:\.{1,2}|[a-z\d_-]+)\/)*$/i.test(value);
    const base = directory(attributes.shellBase) ? attributes.shellBase : './';
    const publicTemplate = attributes.shellPublic === 'true';
    const template = publicTemplate && directory(attributes.shellTemplate) ? attributes.shellTemplate : null;
    const file = pathname.split('/').pop();
    const inferred = file === 'collective.html' ? 'collective'
      : ['sources.html', 'review.html', 'experiment.html'].includes(file) ? 'knowledge' : 'work';
    const page = ['work', 'collective', 'knowledge', 'template'].includes(attributes.shellPage)
      ? attributes.shellPage : inferred;
    return { base, publicTemplate, template, page };
  }

  function link(parent, label, href) {
    const anchor = document.createElement('a');
    anchor.textContent = label;
    anchor.setAttribute('href', href);
    parent.append(anchor);
    return anchor;
  }

  function mount() {
    if (!document.body) return;
    const config = configuration(document.body.dataset, location.pathname);
    const previous = document.querySelector('header.shell-kopf');
    if (previous?.dataset.shellMounted === 'true') return;
    const status = document.createDocumentFragment();
    for (const node of previous?.querySelectorAll('.kopf-stand') || []) status.append(node);
    const header = window.SECOND_BRAIN_NAVIGATION.create({
      view: ['knowledge', 'collective'].includes(config.page) ? 'wissen' : config.page === 'work' ? 'uebersicht' : '',
      status,
      base: new URL(config.base + 'mission-control/', location.href),
    });
    header.classList.add('shell-kopf');
    header.dataset.shellMounted = 'true';
    if (previous) previous.replaceWith(header);
    else document.body.prepend(header);
    for (const anchor of document.querySelectorAll('a[href^="obsidian://"]')) window.SECOND_BRAIN_VAULT?.decorate(anchor);

    if (config.template !== null) {
      let secondary = header.querySelector('nav.shell-secondary');
      if (!secondary) {
        secondary = document.createElement('nav');
        secondary.classList.add('shell-secondary');
        secondary.setAttribute('aria-label', uiShell('Vorlage', "Template"));
        header.append(secondary);
      }
      const template = secondary.querySelector('a') || link(secondary, uiShell('Vorlage', "Template"), config.template);
      secondary.append(template);
      template.textContent = uiShell('Vorlage', "Template");
      template.setAttribute('href', config.template);
      if (config.page === 'template') template.setAttribute('aria-current', 'page');
      else template.removeAttribute('aria-current');
    }

    if (config.publicTemplate && !header.querySelector('#stand')) {
      const status = document.createElement('p');
      status.id = 'stand';
      status.classList.add('kopf-stand');
      status.textContent = uiShell('Demo · öffentliche Vorlage', "Demo, public template");
      header.append(status);
    }

    let footer = document.querySelector('footer.shell-footer');
    if (!footer) {
      footer = document.createElement('footer');
      footer.classList.add('shell-footer');
      const footerNavigation = document.createElement('nav');
      footerNavigation.setAttribute('aria-label', uiShell('Repository und Lizenzen', "Repository and licences"));
      footer.append(footerNavigation);
      if (config.publicTemplate) link(footerNavigation, 'Repository', 'https://github.com/DigitalHumanitiesCraft/research-mission-control');
      link(footerNavigation, uiShell('Code · MIT', "Code, MIT"), 'https://opensource.org/license/mit');
      link(footerNavigation, uiShell('Text · CC BY 4.0', "Text, CC BY 4.0"), 'https://creativecommons.org/licenses/by/4.0/');
      document.body.append(footer);
    }
  }

  if (document.body) mount();
  else document.addEventListener('DOMContentLoaded', mount, { once: true });
  return Object.freeze({ mount });
})();
