(() => {
  'use strict';
  const root = document.documentElement;
  const opening = document.getElementById('opening');
  const page = document.querySelector('.page-shell');
  const skip = document.getElementById('intro-skip');
  const replay = document.getElementById('replay-intro');
  const copy = document.getElementById('story-copy');
  const gate = document.getElementById('story-gate');
  const pauseButton = document.getElementById('story-pause');
  const previousButton = document.getElementById('story-prev');
  const nextButton = document.getElementById('story-next');
  const soundButton = document.getElementById('sound-toggle');
  const soundLabel = document.getElementById('sound-label');
  const soundDock = document.getElementById('sound-dock');
  const soundStatus = document.getElementById('sound-status');
  const volume = document.getElementById('sound-volume');
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const scenes = [
    { html: '<span class="story-huge">Hi,</span>', duration: 1300 },
    { html: '<span class="story-name">I’m <em>Kenny.</em></span>', duration: 2200 },
    { html: 'If you’ve seen<br>my résumé<span class="probably">(probably)</span>', duration: 4300, resume: true },
    { html: 'It’s very<br><em>game focused.</em>', duration: 3500, resume: true },
    { html: 'Let me tell you<br><em>about myself.</em>', duration: 2500 },
    { html: 'Like many other<br>people in <em>2020,</em><span class="story-small">I found myself with a lot of time!</span>', duration: 4200 },
    { html: 'The first 6 months<br>were <em>fun.</em>', duration: 2700 },
    { html: 'But I felt<br><em>bored.</em>', duration: 2400 },
    { html: 'I didn’t know<br>what it was<br><em>at the time.</em>', duration: 3300 },
    { html: 'But I felt<br><em class="underlined">unfulfilled.</em>', duration: 3000 },
    { html: 'I needed to create<br>something<br><em>of value.</em>', duration: 3400 },
    { html: '<span class="story-huge">So...</span>', duration: 1400 },
    { html: 'I turned to<br><em>game development.</em>', duration: 3300 },
    { html: 'It’s a tangible way<br>of seeing your progress<span class="story-small">In real time.</span>', duration: 3900 },
    { html: 'And this is a<br>little <em>egotistical...</em>', duration: 3000 },
    { html: 'But I love the<br><em>compliments</em><span class="story-small">I get for my work.</span>', duration: 3500 },
    { html: 'Hope you enjoy<br>your time looking<br>at my <em>portfolio!</em>', duration: 3500 }
  ];
  // All scenes share this clock. No text replacement, frame-by-frame layout, or
  // per-scene timers: the browser's animation compositor performs the motion.
  let total = 0;
  scenes.forEach(scene => { scene.start = total; total += scene.duration; });
  let tracks = [];
  let frame = 0;
  let index = -1;
  let position = 0;
  let epoch = 0;
  let active = false;
  let started = false;
  let paused = true;
  let returnFocus = null;
  let audio = null;
  let soundOn = false;
  let audioReady = false;
  let musicPaused = false;
  let run = 0;
  let audioRequest = 0;
  let resizeTimer;
  const ease = 'cubic-bezier(.22,1,.36,1)';
  const glide = 'cubic-bezier(.45,0,.2,1)';
  const now = () => document.timeline.currentTime ?? performance.now();
  const currentPosition = () => !started || paused ? position : Math.min(total, now() - epoch);

  function track(element, frames, start, duration) {
    const animation = element.animate(frames, { delay: start, duration, fill: 'both', easing: 'linear' });
    animation.pause();
    animation.currentTime = position;
    tracks.push(animation);
    return animation;
  }
  function clearTracks() {
    cancelAnimationFrame(frame);
    tracks.forEach(animation => animation.cancel());
    tracks = [];
  }
  function buildTimeline() {
    clearTracks();
    copy.replaceChildren();
    scenes.forEach((scene, i) => {
      const layer = document.createElement('div');
      layer.className = `story-scene${scene.resume ? ' scene-resume' : ''}`;
      layer.setAttribute('aria-hidden', 'true');
      const type = document.createElement('div');
      type.className = 'story-copy';
      type.innerHTML = scene.html.split('<br>').map(line => `<span class="story-line">${line}</span>`).join('');
      layer.append(type);
      copy.append(layer);
      scene.element = layer;
      const lead = i ? 230 : 0;
      const start = scene.start - lead;
      const duration = scene.duration + lead + (i === scenes.length - 1 ? 0 : 170);
      const entrance = Math.min(700, duration * .35);
      const exit = 520;
      const direction = i % 3 === 1 ? -1 : 1;
      track(layer, [
        { opacity: 0, offset: 0, easing: ease },
        { opacity: 1, offset: entrance / duration },
        { opacity: 1, offset: Math.max(entrance / duration, 1 - exit / duration), easing: glide },
        { opacity: 0, offset: 1 }
      ], start, duration);
      track(type, [
        { transform: `translate3d(${direction * 26}px,54px,0) rotate(${direction * 1.7}deg) scale(.972)`, offset: 0, easing: ease },
        { transform: 'translate3d(0,0,0) rotate(0deg) scale(1)', offset: entrance / duration },
        { transform: 'translate3d(0,-7px,0) rotate(-.25deg) scale(1.012)', offset: 1 - exit / duration, easing: glide },
        { transform: `translate3d(${-direction * 22}px,-55px,0) rotate(${-direction * 1.1}deg) scale(1.025)`, offset: 1 }
      ], start, duration);
      [...type.children].forEach((line, lineIndex) => {
        if (!lineIndex) return;
        track(line, [
          { transform: 'translate3d(0,18px,0)', opacity: 0, easing: ease },
          { transform: 'translate3d(0,0,0)', opacity: 1 }
        ], start + 55 * lineIndex, 600);
      });
    });
    // One continuous, slow background arc holds the sequence together.
    track(document.querySelector('.story-slash'), [
      { transform: 'translate3d(-5%,-5%,0) rotate(-22deg) scale(.96)', opacity: .045 },
      { transform: 'translate3d(4%,7%,0) rotate(-9deg) scale(1.1)', opacity: .08 }
    ], 0, total);
    track(document.querySelector('.story-orbit'), [
      { transform: 'translate(-50%,-50%) rotate(-18deg) scale(.88)' },
      { transform: 'translate(-46%,-53%) rotate(32deg) scale(1.17)' }
    ], 0, total);
    track(document.getElementById('story-progress-fill'), [{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }], 0, total);
    buildResumeTrack();
  }
  function buildResumeTrack() {
    const preview = document.getElementById('resume-preview');
    const viewport = document.querySelector('.resume-viewport');
    const paper = document.getElementById('resume-paper');
    const start = scenes[2].start - 220;
    const duration = scenes[2].duration + scenes[3].duration + 440;
    track(preview, [
      { opacity: 0, transform: 'translate3d(65px,25px,0) rotate(8deg) scale(.95)', offset: 0, easing: ease },
      { opacity: 1, transform: 'translate3d(0,0,0) rotate(3deg) scale(1)', offset: .10 },
      { opacity: 1, transform: 'translate3d(-5px,-6px,0) rotate(1.5deg) scale(1.018)', offset: .9, easing: glide },
      { opacity: 0, transform: 'translate3d(-18px,-40px,0) rotate(-1deg) scale(1.03)', offset: 1 }
    ], start, duration);
    // Read these once when building (or resizing), never in the animation loop.
    const width = viewport.clientWidth;
    const height = viewport.clientHeight;
    const ratio = width / 1668;
    const readableZoom = Math.max(2.3, 18 / (32.73 * ratio));
    const focusY = height * .34;
    const focusX = width * .05;
    // Actual headings in the sanitized résumé image; the card never resets
    // between the two résumé scenes.
    const names = [
      { x: 24, y: 69.45, width: 312.41 },
      { x: 24, y: 371.51, width: 72.79 },
      { x: 24, y: 657.24, width: 275.99 },
      { x: 24, y: 902.32, width: 103.03 },
      { x: 24, y: 1102.27, width: 390.34 }
    ];
    const camera = [];
    names.forEach((name, i) => {
      const zoom = Math.min(5.5, readableZoom, (width * .9) / (name.width * ratio));
      const transform = `translate3d(${focusX - name.x * ratio * zoom}px,${focusY - name.y * ratio * zoom}px,0) scale(${zoom})`;
      camera.push({ transform, offset: i / names.length, easing: 'linear' });
      camera.push({ transform, offset: (i + .54) / names.length, easing: 'cubic-bezier(.45,0,.25,1)' });
    });
    camera.push({ ...camera[camera.length - 1], offset: 1 });
    track(paper, camera, start + 400, duration - 650);
    const target = document.querySelector('.scan-target');
    target.style.top = `${focusY - 7}px`;
    target.style.height = `${Math.min(22, 32.73 * ratio * readableZoom) + 14}px`;
    track(document.querySelector('.scan-line'), [
      { transform: 'translate3d(0,0,0)', opacity: 0, offset: 0 },
      { opacity: .65, offset: .08 },
      { opacity: .65, offset: .92 },
      { transform: `translate3d(0,${height}px,0)`, opacity: 0, offset: 1 }
    ], start, duration);
  }
  function syncInfo(force = false) {
    const at = currentPosition();
    const found = scenes.findLastIndex ? scenes.findLastIndex(scene => at >= scene.start) : scenes.filter(scene => at >= scene.start).length - 1;
    if (force || found !== index) {
      index = Math.max(0, found);
      document.getElementById('story-count').textContent = `${String(index + 1).padStart(2, '0')} / ${scenes.length}`;
      previousButton.disabled = index === 0;
      nextButton.textContent = index === scenes.length - 1 ? 'Portfolio' : 'Next';
      nextButton.setAttribute('aria-label', index === scenes.length - 1 ? 'Go to portfolio' : 'Next scene');
      scenes.forEach((scene, i) => {
        scene.element?.setAttribute('aria-hidden', String(i !== index));
        scene.element?.classList.toggle('is-near', Math.abs(i - index) <= 1);
      });
    }
    if (at >= total && started && !paused) { finishIntro(); return; }
  }
  function tick() {
    if (!active || paused || !started) return;
    syncInfo();
    if (active) frame = requestAnimationFrame(tick);
  }
  function seek(at, syncAudio = true) {
    position = Math.max(0, Math.min(total - 1, at));
    epoch = now() - position;
    tracks.forEach(animation => { animation.pause(); animation.currentTime = position; });
    if (!paused) tracks.forEach(animation => { animation.play(); animation.startTime = epoch; });
    if (syncAudio && audioReady && soundOn) audio.seek(position / 1000);
    syncInfo(true);
  }
  function updateSound() {
    const audible = soundOn && audioReady && !musicPaused && (!active || (started && !paused));
    soundButton.setAttribute('aria-pressed', String(audible));
    soundButton.setAttribute('aria-label', audible ? 'Mute music and sound' : 'Turn on music and sound');
    soundLabel.textContent = audible ? 'Sound on' : musicPaused ? 'Resume sound' : 'Sound off';
    soundDock.classList.toggle('is-audible', audible);
    soundDock.classList.toggle('in-story', active);
  }
  async function enableAudio() {
    try {
      if (!window.PortfolioAudio) throw new Error('Audio module unavailable');
      if (!audio) audio = new window.PortfolioAudio({ sceneStarts: scenes.map(scene => scene.start / 1000), duration: total / 1000 });
      const instance = audio;
      const result = await instance.unlock();
      if (audio !== instance) return false;
      if (result === false) throw new Error('Audio could not start');
      audioReady = true;
      audio.setVolume(Number(volume.value) / 100);
      return true;
    } catch (_) {
      soundOn = false;
      soundStatus.textContent = 'Sound is unavailable in this browser. The story works silently.';
      return false;
    }
  }
  function setPaused(value) {
    if (!active || !started) return;
    if (value === paused) return;
    position = currentPosition();
    paused = value;
    pauseButton.textContent = paused ? 'Play' : 'Pause';
    pauseButton.setAttribute('aria-label', paused ? 'Play story' : 'Pause story');
    cancelAnimationFrame(frame);
    if (paused) {
      tracks.forEach(animation => { animation.pause(); animation.currentTime = position; });
      if (audioReady) audio.pause();
    } else {
      if (soundStatus.textContent.startsWith('Scene ')) soundStatus.textContent = '';
      epoch = now() - position;
      tracks.forEach(animation => { animation.currentTime = position; animation.play(); animation.startTime = epoch; });
      if (audioReady && soundOn) { audio.resume(position / 1000); musicPaused = false; }
      frame = requestAnimationFrame(tick);
    }
    updateSound();
  }
  function openIntro(isReplay = false) {
    if (motion.matches || !Element.prototype.animate) { finishIntro(false); return; }
    run++;
    clearTracks();
    clearTimeout(window.introFailSafe);
    if (audioReady) audio.pause();
    if (soundOn) musicPaused = true;
    soundStatus.textContent = '';
    active = true;
    started = false;
    paused = true;
    position = 0;
    index = -1;
    returnFocus = isReplay ? replay : null;
    root.classList.add('intro-pending');
    opening.classList.add('is-gated');
    opening.setAttribute('aria-hidden', 'false');
    opening.setAttribute('role', 'dialog');
    opening.setAttribute('aria-modal', 'true');
    opening.setAttribute('tabindex', '-1');
    gate.hidden = false;
    page.inert = true;
    document.getElementById('story-controls').append(soundDock);
    soundDock.hidden = true;
    try { sessionStorage.setItem('kenny-intro-seen', '1'); } catch (_) {}
    if (!audio && window.PortfolioAudio && (window.AudioContext || window.webkitAudioContext)) {
      audio = new window.PortfolioAudio({ sceneStarts: scenes.map(scene => scene.start / 1000), duration: total / 1000 });
      audio.preload();
    }
    document.getElementById('story-start-sound').focus({ preventScroll: true });
  }
  async function beginStory(withSound) {
    if (!active || started) return;
    started = true; // Blocks double clicks during asynchronous audio setup.
    const token = run;
    // unlock starts/resumes the AudioContext in the click event. Visual playback
    // is never held behind asset download; late audio joins at the current time.
    const request = ++audioRequest;
    soundOn = withSound;
    const ready = withSound ? enableAudio() : Promise.resolve(false);
    if (!withSound && audioReady) { audio.setMuted(true); audio.pause(); }
    await Promise.race([document.fonts ? document.fonts.ready : Promise.resolve(), new Promise(resolve => setTimeout(resolve, 180))]);
    if (run !== token || !active) { ready.then(() => { if (audioReady) audio.pause(); }); return; }
    gate.hidden = true;
    opening.classList.remove('is-gated');
    soundDock.hidden = false;
    position = 0;
    buildTimeline();
    paused = true;
    setPaused(false);
    skip.focus({ preventScroll: true });
    const enabled = await ready;
    if (run !== token || !active || !started) { if (audioReady) audio.pause(); return; }
    if (enabled && request === audioRequest && soundOn) {
      audio.setMuted(false);
      musicPaused = false;
      if (!paused) audio.start(currentPosition() / 1000);
    }
    updateSound();
  }
  function finishIntro(restoreFocus = true, stopMusic = false) {
    const hadStarted = started;
    const wasPaused = paused;
    run++;
    clearTracks();
    clearTimeout(window.introFailSafe);
    soundStatus.textContent = '';
    active = false;
    started = false;
    paused = true;
    root.classList.remove('intro-pending');
    opening.classList.remove('is-gated');
    opening.setAttribute('aria-hidden', 'true');
    opening.removeAttribute('aria-modal');
    opening.removeAttribute('role');
    page.inert = false;
    document.body.append(soundDock);
    if (hadStarted && !motion.matches && !stopMusic) {
      document.querySelector('.hero h1').animate([{ opacity: 0, transform: 'translate3d(0,25px,0)' }, { opacity: 1, transform: 'translate3d(0,0,0)' }], { duration: 850, easing: ease });
      document.querySelector('.hero-print').animate([{ opacity: 0, transform: 'rotate(3deg) scale(.96)' }, { opacity: 1, transform: 'rotate(9deg) scale(1)' }], { duration: 1000, easing: ease });
    }
    if (audioReady) {
      if (stopMusic || !soundOn || (hadStarted && wasPaused)) { audio.pause(); if (soundOn) musicPaused = true; }
      else if (hadStarted) { audio.finishStory(); if (!musicPaused && !audio.state.running) audio.resume(); }
    }
    soundDock.hidden = !Element.prototype.animate && !audioReady;
    updateSound();
    try { sessionStorage.setItem('kenny-intro-seen', '1'); } catch (_) {}
    if (restoreFocus && opening.contains(document.activeElement)) {
      (returnFocus || document.querySelector('.wordmark')).focus({ preventScroll: true });
    }
  }
  function navigate(direction) {
    if (!active || !started) return;
    if (direction > 0 && index === scenes.length - 1) { finishIntro(); return; }
    setPaused(true);
    const next = Math.max(0, Math.min(scenes.length - 1, index + direction));
    seek(scenes[next].start + Math.min(850, scenes[next].duration / 2));
    if (audioReady) audio.pause();
    soundStatus.textContent = `Scene ${next + 1} of ${scenes.length}. Paused.`;
  }
  function readStory() {
    finishIntro(false);
    const transcript = document.getElementById('story-transcript');
    transcript.open = true;
    transcript.scrollIntoView({ behavior: 'instant', block: 'center' });
    document.getElementById('story-transcript-text').focus({ preventScroll: true });
  }
  skip.addEventListener('click', () => finishIntro());
  replay.addEventListener('click', () => openIntro(true));
  document.getElementById('story-start-sound').addEventListener('click', () => beginStory(true));
  document.getElementById('story-start-silent').addEventListener('click', () => beginStory(false));
  document.getElementById('gate-read').addEventListener('click', readStory);
  pauseButton.addEventListener('click', () => setPaused(!paused));
  previousButton.addEventListener('click', () => navigate(-1));
  nextButton.addEventListener('click', () => navigate(1));
  document.getElementById('story-read').addEventListener('click', readStory);
  soundButton.addEventListener('click', async () => {
    const token = run;
    const request = ++audioRequest;
    if (soundOn && !musicPaused && (!active || !paused)) {
      soundOn = false;
      if (audioReady) audio.setMuted(true);
      updateSound();
      return;
    }
    soundOn = true;
    const enabled = await enableAudio();
    if (!enabled || token !== run || request !== audioRequest) { updateSound(); return; }
    audio.setMuted(false);
    musicPaused = false;
    if (active && started) {
      if (paused) setPaused(false);
      else audio.resume(currentPosition() / 1000);
    } else if (!active) {
      audio.finishStory();
      audio.resume();
    }
    updateSound();
  });
  volume.addEventListener('input', () => {
    if (audioReady) audio.setVolume(Number(volume.value) / 100);
    volume.setAttribute('aria-valuetext', `${volume.value} percent`);
  });
  document.addEventListener('keydown', event => {
    if (!active) return;
    if (event.key === 'Escape') { event.preventDefault(); finishIntro(); }
    else if (started && event.key === 'ArrowRight' && event.target !== volume) { event.preventDefault(); navigate(1); }
    else if (started && event.key === 'ArrowLeft' && event.target !== volume) { event.preventDefault(); navigate(-1); }
    else if (started && event.key === ' ' && event.target === opening) { event.preventDefault(); setPaused(!paused); }
    else if (event.key === 'Tab') {
      const controls = [...opening.querySelectorAll('button:not(:disabled)'), ...(!soundDock.hidden ? soundDock.querySelectorAll('button,input') : [])].filter(element => element.getClientRects().length);
      const first = controls[0], last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
  });
  window.addEventListener('pagehide', () => {
    finishIntro(false, true);
    if (audio) audio.dispose();
    audio = null; audioReady = false; soundOn = false;
  });
  window.addEventListener('pageshow', event => { if (event.persisted) finishIntro(false, true); });
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) return;
    if (active && started) setPaused(true);
    if (audioReady) audio.pause();
    if (soundOn) musicPaused = true;
    updateSound();
  });
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      if (!active || !started) return;
      position = currentPosition();
      buildTimeline();
      seek(position, false);
      if (paused && audioReady) audio.pause();
      if (!paused) frame = requestAnimationFrame(tick);
    }, 160);
  });
  function handleMotion() {
    replay.hidden = motion.matches || !Element.prototype.animate;
    if (motion.matches) finishIntro(true, true);
  }
  if (motion.addEventListener) motion.addEventListener('change', handleMotion);
  else if (motion.addListener) motion.addListener(handleMotion);
  handleMotion();
  if (root.classList.contains('intro-pending')) openIntro();
  else soundDock.hidden = false;

  const filterButtons = document.querySelectorAll('[data-filter]');
  const projects = document.querySelectorAll('[data-category]');
  const status = document.querySelector('.filter-status');
  document.querySelector('.filters').hidden = false;
  filterButtons.forEach(button => button.addEventListener('click', () => {
    filterButtons.forEach(item => {
      const selected = item === button;
      item.classList.toggle('active', selected);
      item.setAttribute('aria-pressed', String(selected));
    });
    let count = 0;
    projects.forEach(project => {
      project.hidden = button.dataset.filter !== 'all' && project.dataset.category !== button.dataset.filter;
      if (!project.hidden) count++;
    });
    status.textContent = `${count} ${count === 1 ? 'project' : 'projects'} shown.`;
  }));
})();
