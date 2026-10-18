import { nodes, links, passages, steps } from './model-data.js';

const $ = selector => document.querySelector(selector);
const all = selector => [...document.querySelectorAll(selector)];
const state = { step: 0, frontier: 0, artifact: 'worksheet', playing: false };
let timer;
const actorIds = ['research', 'workshop', 'materials', 'verification'];
const artifactNames = {
  source: 'Source R5', requirement: 'Requirement RQ-06',
  workshop: 'Workshop exercise', worksheet: 'Worksheet instruction', decision: 'Decision record',
};

function stop() {
  clearTimeout(timer);
  state.playing = false;
  $('#play').textContent = 'Play';
  $('#play-state').textContent = steps[state.step].gate ? 'Waiting for your simulation action' : 'Paused';
}

function snapshot() {
  return steps[state.step];
}

function setPassages(before, current, status, href, note) {
  $('#before-text').textContent = before;
  $('#current-text').textContent = current;
  $('#document-status').textContent = status;
  $('#artifact-source').href = href;
  $('#passage-note').textContent = note;
  $('#current-text').classList.toggle('changed-passage', before !== current);
  $('#current-label').textContent = before === current ? 'Unchanged wording' : 'Changed wording';
}

function renderArtifact() {
  const step = snapshot();
  const activeRule = state.step >= 2;
  $('#document-title').textContent = artifactNames[state.artifact];
  $('#revision-state').textContent = step.revision;
  all('[data-artifact]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.artifact === state.artifact)));
  const quoteNote = 'Passages from the fictional workshop example.';
  if (state.artifact === 'worksheet') {
    const corrected = step.worksheet === 'current';
    const status = corrected ? 'Materials Operations owns this corrected passage. Its review and acceptance state depends on the selected event.' : activeRule ? 'Draft defect in the illustration. This invitation conflicts with the applied R5 rule.' : 'Historical baseline. This permission will be superseded by R5.';
    setPassages(passages.baseline, corrected ? passages.corrected : passages.baseline, status, './docs/examples/workshop-example/change-case.html#wording-changes', quoteNote);
    if (activeRule && !corrected) $('#current-label').textContent = 'Unchanged, correction required';
  } else if (state.artifact === 'workshop') {
    setPassages(passages.exerciseBefore, step.workshop === 'current' ? passages.exerciseAfter : passages.exerciseBefore,
      step.workshop === 'current' ? 'Workshop Operations has revised the exercise. The worksheet correction leaves this artifact unchanged.' : 'Historical exercise before the replacement.', links.workshop, quoteNote);
  } else if (state.artifact === 'source') {
    setPassages('Participants may use anonymized excerpts from their own project records. Remove personal identifiers and confidential details before bringing an excerpt.', passages.rule,
      activeRule ? 'R5 is the controlling source in this simulation. R1 remains historical evidence.' : state.step === 0 ? 'Comparison with the replacement rule. R5 has not yet been introduced at this timeline step.' : 'R5 is available. Apply it to begin revising dependent records.', links.source, 'Quoted passages from fictional source records R1 and R5.');
    $('#current-label').textContent = 'Replacement source';
  } else if (state.artifact === 'requirement') {
    setPassages('Allow anonymized project excerpts when identifiers and confidential details have been removed.',
      step.requirement === 'current' ? 'Admit only wholly fictional workshop material and remove invitations to supply original content.' : 'Allow anonymized project excerpts when identifiers and confidential details have been removed.',
      'Research owns the requirement. Revising it does not automatically correct downstream documents.', links.requirement, 'Quoted requirement wording from the fictional workshop.');
  } else {
    setPassages('No material acceptance is recorded.', ['writeback', 'resume'].includes(step.id) ? 'Illustrative acceptance recorded for the corrected material. Grounds include R5, RQ-06, the corrected worksheet and its recheck. H-01 remains open.' : 'Material acceptance is pending. The owner must explicitly act at the acceptance gate.',
      'This decision record exists only in the teaching simulation.', './docs/examples/workshop-example/process-walkthrough.html', 'Additional fictional record. No real project file is written.');
    $('#current-label').textContent = 'Decision at this step';
  }
}

function updateUrl() {
  // A copied URL restores only the baseline; past decision gates require fresh actions.
  history.replaceState(null, '', `#example&artifact=${state.artifact}`);
}

function render() {
  const step = snapshot();
  $('#scene-position').textContent = `Event ${state.step + 1} of ${steps.length}`;
  $('#scene-title').textContent = step.title;
  $('#scene-text').textContent = step.summary;
  $('#gate').hidden = !step.gate;
  $('#gate').textContent = step.gate || '';
  $('#next').disabled = Boolean(step.gate) || state.step === steps.length - 1;
  $('#back').disabled = state.step === 0;
  $('#play').disabled = Boolean(step.gate) || state.step === steps.length - 1;
  $('#play-state').textContent = step.gate ? 'Waiting for your simulation action' : state.playing ? 'Playing authored events' : 'Paused';
  all('[data-step]').forEach(button => {
    const index = Number(button.dataset.step);
    button.disabled = index > state.frontier;
    button.setAttribute('aria-current', index === state.step ? 'step' : 'false');
  });
  $('[data-node="research"] > span:first-child').textContent = step.id === 'resume' ? 'Session E, new Research context' : 'Session A';
  if ($('[data-node="research"]').getAttribute('aria-pressed') === 'true') {
    $('#operator-title').textContent = step.id === 'resume' ? 'Research, AI Operator in Session E' : 'Research, AI Operator in Session A';
  }
  actorIds.forEach((id, index) => {
    const button = $(`[data-node="${id}"]`);
    button.querySelector('.track-state').textContent = step.activity[index];
    button.classList.toggle('is-working', step.id === 'parallel' ? index === 1 || index === 2 : ['requirement', 'writeback', 'resume'].includes(step.id) ? index === 0 : step.id === 'correction' ? index === 2 : ['submission', 'finding', 'recheck'].includes(step.id) ? index === 3 : false);
  });
  $('#message-heading').textContent = step.id === 'routing' ? 'Proposed handover, not sent' : step.id === 'acceptance' ? 'Acceptance pending' : step.id === 'parallel' ? 'Prepared report, not sent' : step.id === 'submission' ? 'Producer claim, not verified' : 'Handover at this step';
  const reviewed = ['recheck', 'acceptance', 'writeback', 'resume'].includes(step.id);
  const accepted = ['writeback', 'resume'].includes(step.id);
  $('#review-state').textContent = reviewed ? 'Corrected revision rechecked in illustration' : ['finding', 'routing', 'correction'].includes(step.id) ? 'Correction required; initial finding retained' : 'Not yet reviewed';
  $('#acceptance-state').textContent = accepted ? 'Accepted in illustration only' : 'Pending';
  $('#message-from').textContent = step.message.from;
  $('#message-to').textContent = step.message.to;
  $('#message-artifact').textContent = step.message.artifact;
  $('#message-body').textContent = step.message.body;
  $('#message-evidence').textContent = (step.id === 'parallel' ? 'Prepared report, not yet submitted. ' : step.gate && state.step > 1 ? 'Prepared decision, not yet routed. ' : '') + step.message.evidence;
  $('#message-source').href = step.message.href;
  renderArtifact();
}

function animateEvent(previousPassage) {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const message = $('#message-body');
  if (typeof message.animate !== 'function') return;
  message.animate([
    { transform: 'translateX(8px)', opacity: .75 },
    { transform: 'translateX(0)', opacity: 1 },
  ], { duration: 320, easing: 'ease-out' });
  const passage = $('#current-text');
  if (passage.textContent !== previousPassage) {
    const highlight = getComputedStyle(document.documentElement).getPropertyValue('--active').trim();
    passage.animate([
      { backgroundColor: highlight, transform: 'translateY(3px)' },
      { backgroundColor: 'transparent', transform: 'translateY(0)' },
    ], { duration: 600, easing: 'ease-out' });
  }
}

function revealCurrentEvent() {
  const timeline = $('#event-timeline');
  const active = timeline.querySelector('[aria-current="step"]');
  if (!active) return;
  const frame = timeline.getBoundingClientRect();
  const item = active.getBoundingClientRect();
  // Scroll the event strip only; document reading position stays with the passage.
  if (item.left < frame.left) timeline.scrollLeft += item.left - frame.left;
  else if (item.right > frame.right) timeline.scrollLeft += item.right - frame.right;
}

function moveTo(index) {
  const focusedControl = document.activeElement;
  const previousPassage = $('#current-text').textContent;
  if (index < state.step) state.frontier = index;
  state.step = index;
  state.frontier = Math.max(state.frontier, index);
  state.artifact = steps[index].artifact;
  if (snapshot().gate || index === steps.length - 1) stop();
  render();
  revealCurrentEvent();
  if (focusedControl === $('#gate') ||
      (['next', 'play', 'back'].includes(focusedControl.id) && focusedControl.disabled)) {
    const focusTarget = snapshot().gate ? $('#gate') : $('#scene-title');
    focusTarget.focus({ preventScroll: true });
  }
  animateEvent(previousPassage);
  updateUrl();
}

function schedule() {
  timer = setTimeout(() => {
    if (!state.playing || snapshot().gate) return;
    moveTo(state.step + 1);
    if (state.playing) schedule();
  }, 5000);
}

steps.forEach((step, index) => {
  const li = document.createElement('li');
  const button = document.createElement('button');
  button.type = 'button';
  button.dataset.step = String(index);
  button.textContent = `${index + 1}. ${step.title}`;
  button.addEventListener('click', () => { stop(); moveTo(index); });
  li.append(button);
  $('#event-timeline').append(li);
});

$('#next').addEventListener('click', () => {
  stop();
  if (!snapshot().gate && state.step < steps.length - 1) moveTo(state.step + 1);
});
$('#back').addEventListener('click', () => { stop(); if (state.step > 0) moveTo(state.step - 1); });
$('#gate').addEventListener('click', () => { stop(); if (snapshot().gate) moveTo(state.step + 1); });
$('#restart').addEventListener('click', () => { stop(); state.frontier = 0; moveTo(0); });
$('#play').addEventListener('click', () => {
  if (state.playing) { stop(); return; }
  if (snapshot().gate || state.step === steps.length - 1) return;
  state.playing = true;
  $('#play').textContent = 'Pause';
  $('#play-state').textContent = 'Playing authored events';
  schedule();
});
all('[data-artifact]').forEach(button => {
  button.disabled = false;
  button.addEventListener('click', () => { stop(); state.artifact = button.dataset.artifact; renderArtifact(); updateUrl(); });
});
all('[data-node]').forEach(button => {
  button.disabled = false;
  button.addEventListener('click', () => {
    stop();
    const node = nodes[button.dataset.node];
    $('#operator-explanation').hidden = false;
    const context = button.dataset.node === 'research' && snapshot().id === 'resume' ? 'AI Operator in Session E' : node.type;
    $('#operator-title').textContent = `${node.title}, ${context}`;
    $('#operator-description').textContent = `${node.role} ${node.writes} ${node.next}`;
    $('#operator-source').href = node.sources[0][1];
    all('[data-node]').forEach(item => item.setAttribute('aria-pressed', String(item === button)));
  });
});
all('nav [data-mode]').forEach(link => {
  link.addEventListener('click', () => {
    stop();
    if (link.dataset.mode === 'model') $('.structure-reference').open = true;
  });
});
document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); });
$('#playback').hidden = false;
const requestedArtifact = new URLSearchParams(location.hash.slice(1)).get('artifact');
if (Object.hasOwn(artifactNames, requestedArtifact)) state.artifact = requestedArtifact;
render();

window.addEventListener('resize', revealCurrentEvent);
