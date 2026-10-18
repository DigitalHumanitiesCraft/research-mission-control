// Dated session observations never establish current activity or executed model requests.
(function () {
  'use strict';
  const tr = (de, en) => window.UI_LANGUAGE ? window.UI_LANGUAGE.t(de, en) : de;
  const uuid = value => typeof value === 'string' && /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(value);
  const date = value => typeof value === 'string' && /(?:Z|[+-]\d{2}:\d{2})$/.test(value) && Number.isFinite(Date.parse(value));
  const model = value => typeof value === 'string' && /^[A-Za-z0-9][A-Za-z0-9._:-]{0,99}$/.test(value) ? value : tr('Modell nicht verfügbar', 'Model unavailable');
  const efforts = new Set(['none', 'auto', 'minimal', 'low', 'medium', 'high', 'xhigh', 'max', 'ultra']);
  const effort = value => efforts.has(value) ? value : tr('nicht verfügbar', 'unavailable');
  function el(tag, attrs = {}, ...children) {
    if (window.LEITSTAND_SHELL?.el) return window.LEITSTAND_SHELL.el(tag, attrs, ...children);
    const node = document.createElement(tag);
    for (const [key, value] of Object.entries(attrs)) {
      if (key === 'text') node.textContent = value;
      else node.setAttribute(key, value);
    }
    node.append(...children.filter(value => value != null));
    return node;
  }
  function stamp(value) {
    return date(value) ? new Date(value).toLocaleString(window.UI_LANGUAGE?.locale || 'de-DE', { timeZone: 'Europe/Vienna', dateStyle: 'short', timeStyle: 'short' }) : tr('Zeitpunkt nicht verfügbar', 'Time unavailable');
  }
  const reasons = {
    loading: ['Sitzungsmetadaten werden geladen.', 'Loading session metadata.'],
    'load-error': ['Sitzungsmetadaten konnten nicht abgerufen werden. Erneutes Laden ist über den angebotenen Knopf möglich.', 'The session metadata request failed. Use the offered reload button to try again.'],
    'invalid-data': ['Die Metadatenantwort ist ungültig; frühere Modellwerte werden nicht als neuer Befund angezeigt.', 'The metadata response is invalid; earlier model values are not shown as a new observation.'],
    retired: ['Dieses Profil wurde zurückgenommen.', 'This profile was withdrawn.'],
    'record-missing': ['Die Antwort enthält keinen Metadatensatz für dieses Profil.', 'The response contains no metadata record for this profile.'],
    'session-changed': ['Die Sitzungsdatei hat sich beim Lesen geändert; diese Probe liefert keine Konfiguration.', 'The session file changed during reading; this sample supplies no configuration.'],
    'session-unavailable': ['Die registrierten Sitzungsmetadaten konnten nicht gelesen werden.', 'The registered session metadata could not be read.'],
    'configuration-mismatch': ['Die Konfigurationsmetadaten passen nicht zur registrierten Sitzung oder zum Beobachtungszeitpunkt.', 'The configuration metadata does not match the registered session or observation time.'],
    'conflicting-configuration': ['Die aufgezeichneten Konfigurationsangaben widersprechen sich.', 'The recorded configuration fields conflict.'],
    'unsupported-harness': ['Für die registrierte Umgebung ist kein Metadatenadapter verfügbar.', 'No metadata adapter is available for the registered harness.'],
    'source-unavailable': ['Die kanonische Lane-Quelle konnte nicht gelesen werden.', 'The canonical lane source could not be read.'],
    'invalid-source': ['Die Lane-Quelle ist nicht gültig zugeordnet.', 'The lane source binding is invalid.'],
    'ambiguous-source': ['Die kanonische Lane-Quelle enthält mehrdeutige Metadatenfelder.', 'The canonical lane source has ambiguous metadata fields.'],
    'report-unavailable': ['Die genaue historische Berichtsnachricht konnte nicht bestätigt werden.', 'The exact historical report message could not be confirmed.'],
    planned: ['Geplantes Profil; keine Sitzung aktiviert.', 'Planned profile; no session activated.'],
    paused: ['Pausiert; keine aktuelle Konfiguration ausgewiesen.', 'Paused; no current configuration asserted.'],
    unregistered: ['Keine aktuelle Sitzung registriert.', 'No current session registered.'],
    'source-changed': ['Sitzungsquelle geändert; Metadaten nicht verfügbar.', 'Session source changed; metadata unavailable.'],
    'ambiguous-session': ['Sitzungszuordnung nicht eindeutig.', 'Session binding is ambiguous.'],
    'missing-session': ['Registrierte Sitzungsdatei nicht verfügbar.', 'Registered session file unavailable.'],
    'session-mismatch': ['Sitzungsdatei passt nicht zur registrierten ID.', 'Session file does not match the registered ID.'],
    'configuration-unavailable': ['Turn-Konfiguration nicht verfügbar.', 'Turn configuration unavailable.'],
  };
  function read(lane) {
    const empty = reason => ({ reason, config: null, report: null, binding: null, observedAt: '', paused: lane?.paused === true });
    if (!lane || !/^[a-z0-9][a-z0-9-]*$/.test(lane.key || '')) return empty('unavailable');
    if (lane.state === 'RETIRED') return empty('retired');
    if (lane.setup === 'planned') return empty('planned');
    const loading = window.OPERATOR_SESSION_LOAD;
    if (loading?.state === 'loading') return empty('loading');
    if (loading?.state === 'error') return empty(loading.error === 'invalid-data' ? 'invalid-data' : 'load-error');
    const snapshot = window.OPERATOR_SESSIONS;
    if (!snapshot || typeof snapshot !== 'object' || !snapshot.operators || typeof snapshot.operators !== 'object' || Array.isArray(snapshot.operators) || !date(snapshot.observedAt)) return empty(loading?.state === 'loaded' ? 'invalid-data' : lane.paused ? 'paused' : 'unavailable');
    if (!Object.hasOwn(snapshot.operators, lane.key)) return empty('record-missing');
    const record = snapshot.operators[lane.key];
    if (!record || typeof record !== 'object' || Array.isArray(record) || record.observedAt !== snapshot.observedAt) return empty('invalid-data');
    const bound = source => source?.source === 'demo-sources/' + lane.key + '.md'
      && source.source === lane.setupSource && /^[a-f0-9]{64}$/.test(source.revision || '') && source.revision === lane.setupRevision;
    const binding = record.sessionBinding;
    const validBinding = bound(binding) && uuid(binding.sessionId) && ['codex', 'claude-code'].includes(binding.harness);
    const config = record.configurationObserved;
    const validConfig = record.reason === 'dated-configuration' && validBinding && binding.harness === 'codex' && uuid(config?.turnId)
      && config?.source?.kind === 'codex-turn-context' && config.source.sessionId === binding.sessionId
      && date(config.recordedAt) && Date.parse(config.recordedAt) <= Date.parse(record.observedAt);
    const report = record.reportMetadata;
    const validReport = bound(report?.binding) && report?.harness === 'claude-code'
      && uuid(report.sessionId) && uuid(report.messageId) && date(report.reportedAt)
      && Date.parse(report.reportedAt) <= Date.parse(record.observedAt)
      && report.source?.kind === 'claude-assistant-message' && report.source.sessionId === report.sessionId && report.source.messageId === report.messageId;
    const changed = binding && !bound(binding) || report && !bound(report.binding);
    if (changed) return empty('source-changed');
    return { reason: lane.paused ? 'paused' : config && !validConfig ? 'configuration-mismatch' : record.reason, observedAt: record.observedAt, paused: lane.paused === true,
      binding: validBinding ? binding : null, config: !lane.paused && validConfig ? config : null,
      report: validReport ? report : null };
  }
  function compactStamp(value) {
    return date(value) ? new Date(value).toLocaleString(window.UI_LANGUAGE?.locale || 'de-DE', { timeZone: 'Europe/Vienna', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : tr('Zeitpunkt nicht verfügbar', 'Time unavailable');
  }
  const essentials = config => 'Codex · ' + model(config.model) + ' · ' + effort(config.effort);
  const dateLine = config => tr('Konfiguration erfasst: ', 'Configuration recorded: ') + compactStamp(config.recordedAt);
  function description(lane) {
    const value = read(lane);
    const content = el('div', { class: 'operator-session-description' },
      el('p', { class: 'operator-session-essential', text: value.config ? essentials(value.config) : label(lane) }));
    if (value.config) content.append(el('p', { class: 'operator-session-date', text: dateLine(value.config) }));
    const proof = el('details', { class: 'operator-session-proof' }, el('summary', { text: tr('Nachweis', 'Evidence') }));
    const reason = reasons[value.reason] || ['Keine verlässlichen Sitzungsmetadaten verfügbar.', 'No reliable session metadata available.'];
    proof.append(el('p', { text: value.config ? tr('Verfasstes synthetisches Konfigurationsbeispiel; keine tatsächliche Sitzungsbeobachtung.', 'Authored synthetic configuration example; no actual session observation.') : tr(...reason) }));
    const fields = el('dl');
    const field = (de, en, text) => fields.append(el('dt', { text: tr(de, en) }), el('dd', { text }));
    const binding = value.binding || value.report?.binding;
    if (value.binding) field('Registrierte Sitzung', 'Registered session', (value.binding.harness === 'codex' ? 'Codex' : 'Claude Code') + ', ' + value.binding.sessionId);
    if (binding) {
      field('Lane-Quelle', 'Lane source', binding.source);
      field('Quellenrevision', 'Source revision', binding.revision);
    }
    if (value.config) {
      field('Konfigurationsnachweis vom', 'Configuration evidence dated', stamp(value.config.recordedAt) + ' Europe/Vienna');
      field('Turn-ID', 'Turn ID', value.config.turnId);
    }
    if (value.report) {
      proof.append(el('p', { class: 'operator-session-report-label', text: tr('Historischer Bericht vom ', 'Historical report dated ') + stamp(value.report.reportedAt) + ' Europe/Vienna: Claude Code · ' + model(value.report.model) + ' · ' + effort(value.report.effort) }));
      field('Berichtssitzung', 'Report session', value.report.sessionId);
      field('Berichtsnachricht', 'Report message', value.report.messageId);
      field('Berichtsbezug', 'Report binding', value.report.binding.source + ', ' + value.report.binding.revision);
    }
    if (value.observedAt) field('Metadaten gelesen', 'Metadata read', stamp(value.observedAt) + ' Europe/Vienna');
    proof.append(fields);
    content.append(proof);
    return content;
  }
  function label(lane) {
    const value = read(lane);
    if (value.reason === 'loading') return (value.paused ? tr('Pausiert, ', 'Paused, ') : '') + tr('Sitzungsmetadaten werden geladen …', 'Loading session metadata …');
    if (value.reason === 'load-error') return (value.paused ? tr('Pausiert, ', 'Paused, ') : '') + tr('Abruf der Sitzungsmetadaten fehlgeschlagen', 'Session metadata request failed');
    if (value.reason === 'invalid-data') return tr('Ungültige Metadatenantwort', 'Invalid metadata response');
    if (value.reason === 'retired') return tr('Profil zurückgenommen', 'Profile withdrawn');
    if (value.reason === 'source-changed') return tr('Sitzungsquelle geändert', 'Session source changed');
    if (value.reason === 'missing-session') return tr('Registrierte Sitzungsdatei fehlt', 'Registered session file unavailable');
    if (value.reason === 'session-changed') return tr('Sitzungsdatei beim Lesen geändert', 'Session file changed during reading');
    if (value.reason === 'session-mismatch') return tr('Sitzungs-ID stimmt nicht überein', 'Session ID mismatch');
    if (value.reason === 'ambiguous-session') return tr('Sitzungszuordnung mehrdeutig', 'Session binding ambiguous');
    if (value.reason === 'record-missing') return tr('Metadatensatz fehlt', 'Metadata record missing');
    if (value.reason === 'session-unavailable') return tr('Sitzungsmetadaten nicht lesbar', 'Session metadata unreadable');
    if (value.reason === 'conflicting-configuration') return tr('Widersprüchliche Turn-Konfiguration', 'Conflicting turn configuration');
    if (value.reason === 'configuration-mismatch') return tr('Konfigurationsbezug stimmt nicht überein', 'Configuration binding mismatch');
    if (value.reason === 'unsupported-harness') return tr('Metadatenadapter nicht verfügbar', 'Metadata adapter unavailable');
    if (value.reason === 'source-unavailable') return tr('Lane-Quelle nicht verfügbar', 'Lane source unavailable');
    if (value.reason === 'invalid-source') return tr('Lane-Quelle ungültig', 'Invalid lane source');
    if (value.reason === 'ambiguous-source') return tr('Lane-Metadaten mehrdeutig', 'Lane metadata ambiguous');
    if (value.reason === 'report-unavailable') return tr('Historische Berichtsmetadaten nicht verfügbar', 'Historical report metadata unavailable');
    if (value.reason === 'configuration-unavailable') return (value.binding ? (value.binding.harness === 'codex' ? 'Codex, ' : 'Claude Code, ') : '') + tr('Turn-Konfiguration nicht verfügbar', 'Turn configuration unavailable');
    if (value.reason === 'planned') return tr('Geplant, keine Sitzung', 'Planned, no session');
    if (value.reason === 'paused') return tr('Pausiert, Modell/Effort nicht verfügbar', 'Paused, model/effort unavailable');
    if (value.reason === 'unregistered') return tr('Keine registrierte Sitzung', 'No registered session');
    return value.config ? essentials(value.config) + ' — ' + dateLine(value.config)
      : (value.binding ? (value.binding.harness === 'codex' ? 'Codex, ' : 'Claude Code, ') : '') + tr('Sitzungsmetadaten nicht verfügbar', 'Session metadata unavailable');
  }
  function line(lane) {
    return el('div', { class: 'operator-session-metadata' }, description(lane));
  }
  window.OPERATOR_SESSION_METADATA = { line, description, label, compactLabel: label };
})();
