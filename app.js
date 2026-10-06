(() => {
  'use strict';
  const root = document.documentElement;
  const opening = document.getElementById('opening');
  const page = document.querySelector('.page-shell');
  const skip = document.getElementById('intro-skip');
  const replay = document.getElementById('replay-intro');
  const copy = document.getElementById('story-copy');
  const pauseButton = document.getElementById('story-pause');
  const previousButton = document.getElementById('story-prev');
  const nextButton = document.getElementById('story-next');
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
  let index = 0;
  let isPlaying = false;
  let paused = false;
  let timer;
  let deadline = 0;
  let remaining = 0;
  let animations = [];
  let returnFocus = null;
  const ease = 'cubic-bezier(.16,1,.3,1)';

  function cancelScene() {
    clearTimeout(timer);
    animations.forEach(animation => animation.cancel());
    animations = [];
  }
  function finishIntro(restoreFocus = true) {
    cancelScene();
    clearTimeout(window.introFailSafe);
    isPlaying = false;
    root.classList.remove('intro-pending');
    opening.setAttribute('aria-hidden', 'true');
    opening.removeAttribute('aria-modal');
    opening.removeAttribute('role');
    page.inert = false;
    try { sessionStorage.setItem('kenny-intro-seen', '1'); } catch (_) {}
    if (restoreFocus && opening.contains(document.activeElement)) {
      (returnFocus || document.querySelector('.wordmark')).focus({ preventScroll: true });
    }
  }
  function addAnimation(element, frames, options) {
    if (!element) return;
    const animation = element.animate(frames, { fill: 'both', ...options });
    if (paused) {
      // Show the text immediately while freezing longer scans on their first frame.
      if (options.duration <= 1000) animation.finish();
      else { animation.pause(); animation.currentTime = 0; }
    }
    animations.push(animation);
  }
  function schedule() {
    clearTimeout(timer);
    if (paused || !isPlaying) return;
    deadline = performance.now() + remaining;
    timer = setTimeout(() => {
      if (index < scenes.length - 1) showScene(index + 1);
      else finishIntro();
    }, remaining);
  }
  function showScene(newIndex) {
    cancelScene();
    index = Math.max(0, Math.min(newIndex, scenes.length - 1));
    const scene = scenes[index];
    copy.setAttribute('aria-live', paused ? 'polite' : 'off');
    copy.setAttribute('aria-atomic', 'true');
    copy.innerHTML = scene.html;
    opening.classList.toggle('has-resume', !!scene.resume);
    opening.scrollTop = 0;
    document.getElementById('story-count').textContent = `${String(index + 1).padStart(2, '0')} / ${scenes.length}`;
    document.getElementById('story-progress-fill').style.transform = `scaleX(${(index + 1) / scenes.length})`;
    previousButton.disabled = index === 0;
    nextButton.textContent = index === scenes.length - 1 ? 'Portfolio' : 'Next';
    nextButton.setAttribute('aria-label', index === scenes.length - 1 ? 'Go to portfolio' : 'Next scene');
    remaining = scene.duration;
    try {
      addAnimation(copy, [{ opacity: 0, transform: 'translateY(35px) rotate(2deg)' }, { opacity: 1, transform: 'translateY(0) rotate(0)' }], { duration: 620, easing: ease });
      addAnimation(document.querySelector('.story-slash'), [{ transform: `rotate(${index % 2 ? -9 : -22}deg) translateX(-5%)`, opacity: .015 }, { transform: `rotate(${index % 2 ? -17 : -12}deg) translateX(0)`, opacity: .07 }], { duration: 1000, easing: ease });
      if (scene.resume) {
        const preview = document.querySelector('.resume-preview');
        addAnimation(preview, [{ opacity: 0, transform: 'translate(60px,30px) rotate(9deg)' }, { opacity: 1, transform: 'translate(0,0) rotate(3deg)' }], { duration: 750, easing: ease });
        const paper = document.getElementById('resume-paper');
        const viewport = document.querySelector('.resume-viewport');
        const target = document.querySelector('.scan-target');
        // Bounds are taken from the actual, contact-free résumé crop.
        const names = index === 2 ? [
          { x: 24, y: 69.45, width: 312.41 },
          { x: 24, y: 371.51, width: 72.79 },
          { x: 24, y: 657.24, width: 275.99 }
        ] : [
          { x: 24, y: 902.32, width: 103.03 },
          { x: 24, y: 1102.27, width: 390.34 }
        ];
        const ratio = viewport.clientWidth / 1668;
        const readableZoom = Math.max(2.3, 18 / (32.73 * ratio));
        const focusY = viewport.clientHeight * .34;
        const focusX = viewport.clientWidth * .05;
        const transforms = names.flatMap((name, i) => {
          const zoom = Math.min(5.5, readableZoom, (viewport.clientWidth * .9) / (name.width * ratio));
          const transform = `translate(${focusX - name.x * ratio * zoom}px, ${focusY - name.y * ratio * zoom}px) scale(${zoom})`;
          return [{ transform, offset: i / names.length }, { transform, offset: (i + .65) / names.length }];
        });
        transforms.push({ ...transforms[transforms.length - 1], offset: 1 });
        target.style.top = `${focusY - 7}px`;
        target.style.height = `${Math.min(22, 32.73 * ratio * readableZoom) + 14}px`;
        addAnimation(paper, transforms, { duration: scene.duration, easing: 'cubic-bezier(.65,0,.35,1)' });
        addAnimation(target, [{ opacity: 0 }, { opacity: 1 }], { duration: 400, delay: 350 });
        addAnimation(document.querySelector('.scan-line'), [{ transform: 'translateY(0)' }, { transform: `translateY(${viewport.clientHeight}px)` }], { duration: scene.duration, easing: 'linear' });
      }
      // A scene entered manually stays still after its short entrance.
      schedule();
    } catch (_) { finishIntro(); }
  }
  function setPaused(value) {
    if (!isPlaying) return;
    if (value && !paused) remaining = Math.max(0, deadline - performance.now());
    paused = value;
    pauseButton.textContent = paused ? 'Play' : 'Pause';
    pauseButton.setAttribute('aria-label', paused ? 'Play story' : 'Pause story');
    if (paused) { clearTimeout(timer); animations.forEach(animation => animation.pause()); }
    else { animations.forEach(animation => animation.play()); schedule(); }
  }
  function playIntro(isReplay = false) {
    if (motion.matches || !Element.prototype.animate) { finishIntro(false); return; }
    cancelScene();
    clearTimeout(window.introFailSafe);
    returnFocus = isReplay ? replay : null;
    isPlaying = true;
    paused = false;
    pauseButton.textContent = 'Pause';
    pauseButton.setAttribute('aria-label', 'Pause story');
    root.classList.add('intro-pending');
    opening.setAttribute('aria-hidden', 'false');
    opening.setAttribute('role', 'dialog');
    opening.setAttribute('aria-modal', 'true');
    page.inert = true;
    try { sessionStorage.setItem('kenny-intro-seen', '1'); } catch (_) {}
    showScene(0);
    if (isPlaying) skip.focus({ preventScroll: true });
  }
  function navigate(direction) {
    if (!isPlaying) return;
    if (direction > 0 && index === scenes.length - 1) { finishIntro(); return; }
    paused = true;
    pauseButton.textContent = 'Play';
    pauseButton.setAttribute('aria-label', 'Play story');
    showScene(index + direction);
  }
  skip.addEventListener('click', () => finishIntro());
  replay.addEventListener('click', () => playIntro(true));
  pauseButton.addEventListener('click', () => setPaused(!paused));
  previousButton.addEventListener('click', () => navigate(-1));
  nextButton.addEventListener('click', () => navigate(1));
  document.getElementById('story-read').addEventListener('click', () => {
    finishIntro(false);
    const transcript = document.getElementById('story-transcript');
    transcript.open = true;
    transcript.scrollIntoView({ behavior: 'instant', block: 'center' });
    document.getElementById('story-transcript-text').focus({ preventScroll: true });
  });
  document.addEventListener('keydown', event => {
    if (!isPlaying) return;
    if (event.key === 'Escape') { event.preventDefault(); finishIntro(); }
    else if (event.key === 'ArrowRight') { event.preventDefault(); navigate(1); }
    else if (event.key === 'ArrowLeft') { event.preventDefault(); navigate(-1); }
    else if (event.key === ' ' && event.target === opening) { event.preventDefault(); setPaused(!paused); }
    else if (event.key === 'Tab') {
      const buttons = [...opening.querySelectorAll('button:not(:disabled)')];
      const first = buttons[0], last = buttons[buttons.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
  });
  // Leaving or restoring the page never restarts the sequence.
  window.addEventListener('pagehide', () => finishIntro(false));
  window.addEventListener('pageshow', event => { if (event.persisted) finishIntro(false); });
  document.addEventListener('visibilitychange', () => { if (document.hidden && isPlaying) setPaused(true); });
  function handleMotion() {
    replay.hidden = motion.matches || !Element.prototype.animate;
    if (motion.matches) finishIntro();
  }
  if (motion.addEventListener) motion.addEventListener('change', handleMotion);
  else if (motion.addListener) motion.addListener(handleMotion);
  handleMotion();
  if (root.classList.contains('intro-pending')) {
    Promise.race([document.fonts ? document.fonts.ready : Promise.resolve(), new Promise(resolve => setTimeout(resolve, 180))]).then(() => {
      if (root.classList.contains('intro-pending')) playIntro();
    }).catch(() => finishIntro(false));
  }
  const filterButtons = document.querySelectorAll('[data-filter]');
  const projects = document.querySelectorAll('[data-category]');
  const status = document.querySelector('.filter-status');
  document.querySelector('.filters').hidden = false;
  filterButtons.forEach(button => button.addEventListener('click', () => {
    filterButtons.forEach(item => {
      const active = item === button;
      item.classList.toggle('active', active);
      item.setAttribute('aria-pressed', String(active));
    });
    let count = 0;
    projects.forEach(project => {
      project.hidden = button.dataset.filter !== 'all' && project.dataset.category !== button.dataset.filter;
      if (!project.hidden) count++;
    });
    status.textContent = `${count} ${count === 1 ? 'project' : 'projects'} shown.`;
  }));
})();
