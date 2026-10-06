/*
 * Kenny Lin — recorded-library soundtrack and scene-synchronized foley.
 * Primary soundtrack and foley: locally hosted, credited CC0 sound-library assets.
 * The original score below is an offline fallback if those assets cannot load.
 * No external runtime services or automatic playback.
 * Original fallback: "Something of Value", 96 BPM / 4:4 / eight bars: Dm9 · Bbmaj9 · Fmaj9 · C6/9.
 * The written bass line, chord inversions, and answering motif repeat as a song;
 * only instrument envelopes and the story arrangement evolve.
 *
 * Timing/envelope references (implementation, not musical source material):
 * https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Advanced_techniques
 * https://developer.mozilla.org/en-US/docs/Web/API/AudioContext/resume
 * https://developer.mozilla.org/en-US/docs/Web/API/AudioScheduledSourceNode/ended_event
 * https://developer.mozilla.org/en-US/docs/Web/API/DynamicsCompressorNode
 */
(() => {
  'use strict';
  const BPM = 96;
  const BEAT = 60 / BPM;
  const BAR = BEAT * 4;
  const LOOP = BAR * 8;
  const EPSILON = 0.0001;
  const DEFAULT_SCENES = [0, 1.3, 3.5, 7.8, 11.3, 13.8, 18, 20.7, 23.1, 26.4, 29.4, 32.8, 34.2, 37.5, 41.4, 44.4, 47.9];
  const HARMONY = [
    { name: 'Dm9', root: 38, notes: [53, 57, 60, 64], melody: [69, 67, 64, 65, 64, 62] },
    { name: 'Bbmaj9', root: 34, notes: [53, 57, 60, 62], melody: [69, 67, 65, 62, 60, 62] },
    { name: 'Fmaj9', root: 41, notes: [57, 60, 64, 67], melody: [69, 67, 64, 72, 69, 67] },
    { name: 'C6/9', root: 36, notes: [52, 57, 62, 67], melody: [67, 64, 62, 64, 67, 62] }
  ];
  const clamp = (value, low, high) => Math.min(high, Math.max(low, value));
  const hz = midi => 440 * Math.pow(2, (midi - 69) / 12);
  const finite = (value, fallback) => Number.isFinite(Number(value)) ? Number(value) : fallback;

  // A written eight-bar arrangement. Fractional beats are intentional syncopation.
  function makeScore() {
    const events = [];
    const add = (beat, type, data = {}) => events.push({ at: beat * BEAT, type, ...data });
    HARMONY.forEach((chord, c) => {
      const beat = c * 8;
      add(beat, 'pad', { chord: c });
      add(beat, 'keys', { chord: c, velocity: 0.88, length: 1.9 });
      add(beat + 2.75, 'keys', { chord: c, velocity: 0.43, length: 0.85 });
      add(beat + 5.5, 'keys', { chord: c, velocity: 0.61, length: 1.25 });
      const nextRoot = HARMONY[(c + 1) % HARMONY.length].root;
      [[0, chord.root, 0.85], [1.5, chord.root, 0.6], [2.75, chord.root + 7, 0.5],
        [4, chord.root, 0.85], [5.75, chord.root + 12, 0.47], [7.25, nextRoot + 2, 0.55]]
        .forEach(([offset, note, velocity]) => add(beat + offset, 'bass', { note, velocity }));
      const phrase = [[1.5, 0.72], [2.25, 0.27], [3, 0.73], [5, 0.46], [6.5, 0.24], [7, 0.7]];
      phrase.forEach(([offset, length], n) => add(beat + offset, 'motif', {
        note: chord.melody[n], length, velocity: [0.8, 0.48, 0.65, 0.72, 0.46, 0.6][n], phraseNote: n
      }));
      for (let b = 0; b < 2; b++) {
        const start = beat + b * 4;
        add(start, 'kick', { velocity: 0.82 });
        add(start + 2.5, 'kick', { velocity: 0.5 });
        if (b) add(start + 3.5, 'kick', { velocity: 0.3 });
        add(start + 1.04, 'brush', { velocity: 0.68, pan: -0.18 });
        add(start + 3.04, 'brush', { velocity: 0.57, pan: 0.18 });
        [0.55, 1.55, 2.55, 3.55].forEach((offset, n) => add(start + offset, 'shaker', {
          velocity: [0.48, 0.27, 0.38, 0.22][n], pan: n % 2 ? 0.37 : -0.37
        }));
      }
    });
    return events.sort((a, b) => a.at - b.at);
  }
  const SCORE = makeScore();

  class PortfolioAudio {
    constructor(options = {}) {
      this._sceneStarts = Array.isArray(options.sceneStarts) && options.sceneStarts.length
        ? options.sceneStarts.map(value => Math.max(0, finite(value, 0))) : DEFAULT_SCENES.slice();
      this._duration = Math.max(1, finite(options.duration, 51.4));
      this._volume = clamp(finite(options.volume, 0.32), 0, 1);
      this._muted = Boolean(options.muted);
      this._mode = 'story';
      this._status = 'locked';
      this._playing = false;
      this._position = 0;
      this._origin = 0;
      this._context = null;
      this._timer = null;
      this._voices = new Set();
      this._graph = [];
      this._disposed = false;
      this._unlocked = false;
      this._assets = Object.assign({
        music: 'assets/audio/moil-loop.mp3',
        swish: 'assets/audio/swish.wav',
        scan: 'assets/audio/scan.wav',
        impact: 'assets/audio/impact.wav'
      }, options.assets || {});
      this._buffers = {};
      this._assetErrors = [];
      this._assetStatus = 'idle';
      this._fetchPromise = null;
      this._decodePromise = null;
      this._fetchControllers = new Set();
      this._sampleNextCycle = 0;
      this._sfx = [];
      this._sceneStarts.forEach((at, scene) => {
        if (at < this._duration) this._sfx.push({ at, scene, type: 'transition' });
        if (scene === 2 || scene === 3) {
          const end = this._sceneStarts[scene + 1] || this._duration;
          const count = scene === 2 ? 3 : 2;
          for (let i = 0; i < count; i++) {
            this._sfx.push({ at: at + 0.4 + i * (end - at) / count, scene, type: 'scan', accent: i });
          }
        }
      });
      this._sfx.sort((a, b) => a.at - b.at);
    }

    get positionSeconds() {
      return this._playing && this._context
        ? Math.max(this._position, this._context.currentTime - this._origin) : this._position;
    }

    get state() {
      return {
        status: this._status,
        available: !this._disposed && Boolean(window.AudioContext || window.webkitAudioContext),
        unlocked: this._unlocked,
        playing: this._playing,
        running: this._playing && this._context?.state === 'running',
        paused: this._status === 'paused',
        muted: this._muted,
        volume: this._volume,
        mode: this._mode,
        position: this.positionSeconds,
        source: this._buffers.music ? 'samples' : 'synthesis',
        assetStatus: this._assetStatus,
        assetErrors: this._assetErrors.slice(),
        activeSources: [...this._voices].reduce((sum, voice) => sum + voice.remaining, 0)
      };
    }

    // Optional prefetch: bytes only, no AudioContext and no audio output.
    // The caller may use this while the story's sound-choice gate is visible.
    preload() {
      if (this._disposed) return Promise.resolve({});
      if (this._fetchPromise) return this._fetchPromise;
      this._assetStatus = 'loading';
      this._fetchPromise = Promise.all(Object.entries(this._assets).map(async ([name, url]) => {
        if (!url) return [name, null];
        const controller = new AbortController();
        this._fetchControllers.add(controller);
        const timeout = setTimeout(() => controller.abort(), 12000);
        try {
          const response = await fetch(url, { signal: controller.signal, credentials: 'same-origin' });
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          return [name, await response.arrayBuffer()];
        } catch (_) {
          this._assetErrors.push(name);
          return [name, null];
        } finally {
          clearTimeout(timeout);
          this._fetchControllers.delete(controller);
        }
      })).then(entries => Object.fromEntries(entries));
      return this._fetchPromise;
    }

    async _decodeAssets() {
      if (this._decodePromise) return this._decodePromise;
      this._decodePromise = this.preload().then(async bytes => {
        await Promise.all(Object.entries(bytes).map(async ([name, data]) => {
          if (!data || this._disposed) return;
          try {
            const buffer = await this._context.decodeAudioData(data);
            if (!this._disposed) this._buffers[name] = buffer;
          } catch (_) { if (!this._assetErrors.includes(name)) this._assetErrors.push(name); }
        }));
        if (this._buffers.music) {
          this._crossfade = Math.min(1.6, this._buffers.music.duration * 0.12);
          this._samplePeriod = Math.max(0.1, this._buffers.music.duration - this._crossfade);
        }
        this._assetStatus = this._buffers.music ? 'ready' : 'fallback';
      });
      return this._decodePromise;
    }

    // Invoke directly inside the explicit Sound On / music-button gesture.
    // Neither construction nor start() silently requests autoplay permission.
    async unlock() {
      if (this._disposed) return false;
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) { this._status = 'unavailable'; return false; }
      try {
        if (!this._context) {
          this._context = new AudioContext({ latencyHint: 'interactive' });
          this._buildGraph();
        }
        if (this._context.state !== 'running') await this._context.resume();
        this._unlocked = this._context.state === 'running';
        if (this._unlocked) await this._decodeAssets();
        if (this._disposed) return false;
        if (this._unlocked && this._status === 'locked') this._status = 'ready';
        return this._unlocked;
      } catch (_) {
        this._unlocked = false;
        this._status = 'unavailable';
        return false;
      }
    }

    setVolume(value) {
      this._volume = clamp(finite(value, this._volume), 0, 1);
      this._updateOutput();
    }

    setMuted(value) {
      this._muted = Boolean(value);
      this._updateOutput();
    }

    start(positionSeconds = 0) {
      const position = Math.max(0, finite(positionSeconds, 0));
      return this._begin(position, position >= this._duration ? 'background' : 'story');
    }

    pause() {
      if (!this._playing) return;
      this._position = this.state.position;
      this._playing = false;
      this._status = 'paused';
      this._clearSchedule();
      this._ramp(this._transport.gain, 0, 0.075);
      this._releaseVoices();
    }

    resume(positionSeconds) {
      if (positionSeconds === undefined && this._playing) return true;
      const position = positionSeconds === undefined ? this._position : Math.max(0, finite(positionSeconds, this._position));
      return this._begin(position, this._mode);
    }

    seek(positionSeconds) {
      const position = Math.max(0, finite(positionSeconds, 0));
      if (this._playing) return this._begin(position, position >= this._duration ? 'background' : 'story');
      this._position = position;
      this._mode = position >= this._duration ? 'background' : 'story';
      return true;
    }

    // Continue the existing musical phrase, then settle into a quieter loop.
    // If already paused/stopped, this changes mode without starting any sound.
    finishStory() {
      this._mode = 'background';
      this._sfxIndex = this._sfx.length;
      if (this._music) this._ramp(this._music.gain, 0.6, 1.8);
      if (this._effects) this._ramp(this._effects.gain, 0, 0.4);
      if (this._sampleTone) this._ramp(this._sampleTone.frequency, 4700, 1.8);
    }

    stop() {
      this._clearSchedule();
      this._playing = false;
      this._position = 0;
      if (this._context) {
        this._ramp(this._transport.gain, 0, 0.09);
        this._releaseVoices();
      }
      if (!this._disposed) this._status = this._unlocked ? 'stopped' : 'locked';
    }

    async dispose() {
      if (this._disposed) return;
      this.stop();
      this._disposed = true;
      this._fetchControllers.forEach(controller => controller.abort());
      this._unlocked = false;
      this._status = 'disposed';
      const context = this._context;
      if (context && context.state !== 'closed') {
        // Let the 90 ms output release finish before closing the device.
        await new Promise(resolve => setTimeout(resolve, 100));
        try { await context.close(); } catch (_) {}
      }
      this._voices.forEach(voice => this._disconnectVoice(voice));
      this._graph.forEach(node => { try { node.disconnect(); } catch (_) {} });
      this._graph = [];
      this._noise = null;
      this._buffers = {};
      this._fetchPromise = null;
      this._decodePromise = null;
    }

    _buildGraph() {
      const ctx = this._context;
      const keep = node => { this._graph.push(node); return node; };
      this._music = keep(ctx.createGain());
      this._effects = keep(ctx.createGain());
      const mix = keep(ctx.createGain());
      const highpass = keep(ctx.createBiquadFilter());
      highpass.type = 'highpass'; highpass.frequency.value = 29; highpass.Q.value = 0.55;
      const lowpass = keep(ctx.createBiquadFilter());
      lowpass.type = 'lowpass'; lowpass.frequency.value = 7200; lowpass.Q.value = 0.4;
      const compressor = keep(ctx.createDynamicsCompressor());
      compressor.threshold.value = -11;
      compressor.knee.value = 12;
      compressor.ratio.value = 2.4;
      compressor.attack.value = 0.014;
      compressor.release.value = 0.24;
      this._transport = keep(ctx.createGain()); this._transport.gain.value = 0;
      this._output = keep(ctx.createGain());
      this._output.gain.value = this._muted ? 0 : this._volume * 0.72;
      this._music.gain.value = 0.85;
      this._sampleTone = keep(ctx.createBiquadFilter());
      this._sampleTone.type = 'lowpass'; this._sampleTone.frequency.value = 6500; this._sampleTone.Q.value = 0.4;
      this._sampleLevel = keep(ctx.createGain()); this._sampleLevel.gain.value = 2.6;
      this._sampleTone.connect(this._sampleLevel); this._sampleLevel.connect(this._music);
      this._effects.gain.value = 0.8;
      this._music.connect(mix); this._effects.connect(mix);
      mix.connect(highpass); highpass.connect(lowpass); lowpass.connect(compressor);
      compressor.connect(this._transport); this._transport.connect(this._output); this._output.connect(ctx.destination);

      // A short, dark stereo room. Deterministic synthetic impulse; no assets.
      const room = keep(ctx.createConvolver());
      const roomSend = keep(ctx.createGain()); roomSend.gain.value = 0.17;
      const roomTone = keep(ctx.createBiquadFilter());
      roomTone.type = 'lowpass'; roomTone.frequency.value = 2300;
      room.buffer = this._makeImpulse();
      this._music.connect(roomSend); this._effects.connect(roomSend);
      roomSend.connect(room); room.connect(roomTone); roomTone.connect(mix);

      // The lead gets a quiet dotted-eighth echo; the drums stay dry and clear.
      this._echoSend = keep(ctx.createGain()); this._echoSend.gain.value = 0.16;
      const echo = keep(ctx.createDelay(1)); echo.delayTime.value = BEAT * 0.75;
      const echoTone = keep(ctx.createBiquadFilter()); echoTone.type = 'lowpass'; echoTone.frequency.value = 1700;
      const feedback = keep(ctx.createGain()); feedback.gain.value = 0.2;
      this._echoSend.connect(echo); echo.connect(echoTone); echoTone.connect(feedback); feedback.connect(echo);
      echoTone.connect(this._music);
      this._noise = this._makeNoise();
      this._warmWave = ctx.createPeriodicWave(new Float32Array(6), new Float32Array([0, 1, 0.23, 0.075, 0.018, 0.007]));
    }

    _makeNoise() {
      const ctx = this._context;
      const buffer = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * 2), ctx.sampleRate);
      const channel = buffer.getChannelData(0);
      let seed = 28117; let smooth = 0;
      for (let i = 0; i < channel.length; i++) {
        seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
        const white = seed / 2147483648 - 1;
        smooth = smooth * 0.68 + white * 0.32;
        channel[i] = smooth * 1.7;
      }
      return buffer;
    }

    _makeImpulse() {
      const ctx = this._context;
      const buffer = ctx.createBuffer(2, Math.ceil(ctx.sampleRate * 1.35), ctx.sampleRate);
      for (let c = 0; c < 2; c++) {
        const data = buffer.getChannelData(c);
        let seed = 98411 + c * 3191; let smooth = 0;
        for (let i = 0; i < data.length; i++) {
          seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
          smooth = smooth * 0.52 + (seed / 2147483648 - 1) * 0.48;
          const t = i / ctx.sampleRate;
          data[i] = smooth * Math.exp(-t * 5.3) * Math.min(1, t / 0.012);
        }
      }
      return buffer;
    }

    _ramp(param, value, duration) {
      if (!this._context || this._context.state === 'closed') return;
      const now = this._context.currentTime;
      if (typeof param.cancelAndHoldAtTime === 'function') param.cancelAndHoldAtTime(now);
      else { const current = param.value; param.cancelScheduledValues(now); param.setValueAtTime(current, now); }
      param.linearRampToValueAtTime(value, now + duration);
    }

    _updateOutput() {
      if (this._output) this._ramp(this._output.gain, this._muted ? 0 : this._volume * 0.72, 0.055);
    }

    _clearSchedule() {
      if (this._timer !== null) clearInterval(this._timer);
      this._timer = null;
    }

    _begin(position, mode) {
      if (this._disposed || !this._unlocked || !this._context || this._context.state !== 'running') return false;
      this._clearSchedule();
      this._releaseVoices();
      this._mode = mode;
      this._position = position;
      this._origin = this._context.currentTime + 0.03 - position;
      this._playing = true;
      this._status = 'playing';
      this._resetCursor(position);
      this._sfxIndex = this._sfx.findIndex(event => event.at >= position - 0.002);
      if (this._sfxIndex < 0 || mode === 'background') this._sfxIndex = this._sfx.length;
      this._ramp(this._music.gain, mode === 'background' ? 0.6 : 0.85, 0.16);
      this._ramp(this._effects.gain, mode === 'background' ? 0 : 0.8, 0.12);
      this._ramp(this._transport.gain, 1, 0.16);
      // Seeking into a sustained harmony should not leave an empty wait for a downbeat.
      const chordPosition = position % (BAR * 2);
      if (this._buffers.music) {
        const cycle = Math.floor(position / this._samplePeriod);
        const offset = position - cycle * this._samplePeriod;
        this._sampleNextCycle = cycle + 1;
        this._sampleMusic(this._context.currentTime + 0.03, offset, true);
        this._shapeSampleMusic(position, this._context.currentTime, true);
      }
      if (!this._buffers.music && chordPosition > 0.035) {
        this._pad(Math.floor(position / (BAR * 2)) % 4, this._context.currentTime + 0.035,
          Math.max(0.3, BAR * 2 - chordPosition), this._arrangement(position));
      }
      this._schedule();
      this._timer = setInterval(() => this._schedule(), 25);
      return true;
    }

    _resetCursor(position) {
      this._cycle = Math.floor(position / LOOP);
      const inside = position - this._cycle * LOOP;
      this._eventIndex = SCORE.findIndex(event => event.at >= inside - 0.002);
      if (this._eventIndex < 0) { this._eventIndex = 0; this._cycle++; }
    }

    _schedule() {
      if (!this._playing || this._context.state !== 'running') return;
      const now = this._context.currentTime;
      const horizon = now + 0.17;
      if (!this._buffers.music) {
        let next = this._origin + this._cycle * LOOP + SCORE[this._eventIndex].at;
        // A throttled tab must never dump a backlog of notes into one audio frame.
        if (next < now - 0.08) {
          this._resetCursor(Math.max(0, now - this._origin + 0.006));
          next = this._origin + this._cycle * LOOP + SCORE[this._eventIndex].at;
        }
        let scheduled = 0;
        while (next < horizon && scheduled++ < 64) {
          const event = SCORE[this._eventIndex];
          const position = this._cycle * LOOP + event.at;
          this._playEvent(event, Math.max(now + 0.003, next), this._arrangement(position));
          this._eventIndex++;
          if (this._eventIndex === SCORE.length) { this._eventIndex = 0; this._cycle++; }
          next = this._origin + this._cycle * LOOP + SCORE[this._eventIndex].at;
        }
      } else {
        let next = this._origin + this._sampleNextCycle * this._samplePeriod;
        if (next < now - 0.08) {
          // Recover a throttled timer at the current phrase, never play a backlog.
          const position = Math.max(0, now - this._origin + 0.006);
          const cycle = Math.floor(position / this._samplePeriod);
          this._sampleNextCycle = cycle + 1;
          this._sampleMusic(now + 0.006, position - cycle * this._samplePeriod, true);
          next = this._origin + this._sampleNextCycle * this._samplePeriod;
        }
        if (next < horizon) {
          this._sampleMusic(next, 0, false);
          this._sampleNextCycle++;
        }
      }
      while (this._sfxIndex < this._sfx.length && this._origin + this._sfx[this._sfxIndex].at < horizon) {
        const event = this._sfx[this._sfxIndex++];
        const time = this._origin + event.at;
        if (this._mode === 'story' && time >= now - 0.05) this._playEffect(event, Math.max(time, now + 0.003));
      }
    }

    _arrangement(position) {
      if (this._mode === 'background' || position >= this._duration) {
        return { body: 0.7, rhythm: 0.52, lead: 0.5, color: 1300, quiet: false };
      }
      const reflectiveStart = this._sceneStarts[7] ?? this._duration * 0.4;
      const turningPoint = this._sceneStarts[11] ?? this._duration * 0.64;
      if (position >= reflectiveStart && position < turningPoint) {
        return { body: 0.58, rhythm: 0.26, lead: 0.38, color: 840, quiet: true };
      }
      if (position >= turningPoint) {
        const growth = clamp((position - turningPoint) / 5, 0, 1);
        return { body: 0.74 + 0.22 * growth, rhythm: 0.6 + 0.4 * growth, lead: 0.68 + 0.25 * growth, color: 1500 + 650 * growth, quiet: false };
      }
      const growth = clamp(position / 9, 0, 1);
      return { body: 0.68 + 0.12 * growth, rhythm: 0.35 + 0.4 * growth, lead: 0.5 + 0.16 * growth, color: 1450, quiet: false };
    }

    _voice(sources, nodes, envelope, destination, time, end, pan = 0, echo = false, offset = 0) {
      const ctx = this._context;
      let output = envelope;
      if (ctx.createStereoPanner) {
        const panner = ctx.createStereoPanner(); panner.pan.value = pan;
        envelope.connect(panner); nodes.push(panner); output = panner;
      }
      output.connect(destination);
      if (echo) output.connect(this._echoSend);
      const voice = { sources, nodes, envelope, remaining: sources.length, released: false };
      this._voices.add(voice);
      sources.forEach(source => {
        source.onended = () => {
          if (voice.remaining > 0) voice.remaining--;
          if (!voice.remaining) this._disconnectVoice(voice);
        };
        if ('buffer' in source) source.start(time, offset);
        else source.start(time);
        source.stop(end);
      });
      return voice;
    }

    _disconnectVoice(voice) {
      voice.sources.forEach(source => { source.onended = null; try { source.disconnect(); } catch (_) {} });
      voice.nodes.forEach(node => { try { node.disconnect(); } catch (_) {} });
      this._voices.delete(voice);
    }

    _releaseVoices() {
      if (!this._context) return;
      const now = this._context.currentTime;
      this._voices.forEach(voice => {
        if (voice.released) return;
        voice.released = true;
        this._ramp(voice.envelope.gain, 0, 0.045);
        voice.sources.forEach(source => { try { source.stop(now + 0.055); } catch (_) {} });
      });
    }

    _pad(chordIndex, time, length, arrangement) {
      const ctx = this._context;
      const chord = HARMONY[chordIndex];
      chord.notes.forEach((note, n) => {
        const gain = ctx.createGain();
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass'; filter.frequency.value = arrangement.color * 0.7; filter.Q.value = 0.3;
        const level = 0.027 * arrangement.body;
        const attack = Math.min(0.65, length * 0.35);
        gain.gain.setValueAtTime(0, time);
        gain.gain.linearRampToValueAtTime(level, time + attack);
        gain.gain.setValueAtTime(level * 0.92, time + Math.max(attack, length - 0.5));
        gain.gain.linearRampToValueAtTime(0, time + length + 0.58);
        const sources = [-3.2, 3.2].map(detune => {
          const osc = ctx.createOscillator(); osc.setPeriodicWave(this._warmWave);
          osc.frequency.value = hz(note - 12); osc.detune.value = detune;
          osc.connect(filter); return osc;
        });
        filter.connect(gain);
        this._voice(sources, [filter, gain], gain, this._music, time, time + length + 0.6, (n - 1.5) * 0.28);
      });
    }

    _keys(chordIndex, time, length, velocity, arrangement) {
      HARMONY[chordIndex].notes.forEach((note, n) => {
        this._tone(note, time + n * 0.012, length + (3 - n) * 0.025,
          0.062 * velocity * arrangement.body, (n - 1.5) * 0.2, arrangement.color, false);
      });
    }

    _tone(note, time, length, level, pan, color, lead) {
      const ctx = this._context;
      const fundamental = ctx.createOscillator(); fundamental.setPeriodicWave(this._warmWave); fundamental.frequency.value = hz(note);
      const tine = ctx.createOscillator(); tine.type = 'sine'; tine.frequency.value = hz(note) * 2.001;
      const tineGain = ctx.createGain();
      tineGain.gain.setValueAtTime(lead ? 0.17 : 0.13, time);
      tineGain.gain.exponentialRampToValueAtTime(EPSILON, time + 0.45);
      const filter = ctx.createBiquadFilter(); filter.type = 'lowpass'; filter.Q.value = 0.45;
      filter.frequency.setValueAtTime(color * (lead ? 1.5 : 1.12), time);
      filter.frequency.exponentialRampToValueAtTime(Math.max(500, color * 0.58), time + length + 0.4);
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0, time);
      gain.gain.linearRampToValueAtTime(level, time + (lead ? 0.035 : 0.022));
      gain.gain.exponentialRampToValueAtTime(Math.max(EPSILON, level * 0.18), time + Math.max(0.12, length));
      gain.gain.exponentialRampToValueAtTime(EPSILON, time + length + 0.65);
      gain.gain.linearRampToValueAtTime(0, time + length + 0.69);
      fundamental.connect(filter); tine.connect(tineGain); tineGain.connect(filter); filter.connect(gain);
      this._voice([fundamental, tine], [tineGain, filter, gain], gain, this._music, time, time + length + 0.71, pan, lead);
    }

    _bass(note, time, velocity, arrangement) {
      const ctx = this._context;
      const osc = ctx.createOscillator(); osc.type = 'triangle'; osc.frequency.value = hz(note);
      const filter = ctx.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.value = 320; filter.Q.value = 0.5;
      const gain = ctx.createGain();
      const level = 0.17 * velocity * arrangement.body;
      gain.gain.setValueAtTime(0, time); gain.gain.linearRampToValueAtTime(level, time + 0.024);
      gain.gain.exponentialRampToValueAtTime(level * 0.35, time + 0.27);
      gain.gain.linearRampToValueAtTime(0, time + 0.48);
      osc.connect(filter); filter.connect(gain);
      this._voice([osc], [filter, gain], gain, this._music, time, time + 0.5);
    }

    _kick(time, velocity, rhythm) {
      const ctx = this._context;
      const osc = ctx.createOscillator(); osc.type = 'sine';
      osc.frequency.setValueAtTime(91, time); osc.frequency.exponentialRampToValueAtTime(48, time + 0.14);
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0, time); gain.gain.linearRampToValueAtTime(0.16 * velocity * rhythm, time + 0.011);
      gain.gain.exponentialRampToValueAtTime(EPSILON, time + 0.27); gain.gain.linearRampToValueAtTime(0, time + 0.3);
      osc.connect(gain);
      this._voice([osc], [gain], gain, this._music, time, time + 0.32);
    }

    _air(time, length, level, low, high, pan, destination, attack = 0.03) {
      const ctx = this._context;
      const noise = ctx.createBufferSource(); noise.buffer = this._noise;
      const highpass = ctx.createBiquadFilter(); highpass.type = 'highpass'; highpass.frequency.value = low; highpass.Q.value = 0.45;
      const lowpass = ctx.createBiquadFilter(); lowpass.type = 'lowpass'; lowpass.Q.value = 0.4;
      lowpass.frequency.setValueAtTime(high, time);
      lowpass.frequency.exponentialRampToValueAtTime(Math.max(low * 1.2, high * 0.42), time + length);
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0, time);
      gain.gain.linearRampToValueAtTime(level, time + Math.min(attack, length * 0.5));
      gain.gain.exponentialRampToValueAtTime(EPSILON, time + length);
      gain.gain.linearRampToValueAtTime(0, time + length + 0.015);
      noise.connect(highpass); highpass.connect(lowpass); lowpass.connect(gain);
      this._voice([noise], [highpass, lowpass, gain], gain, destination, time, time + length + 0.025, pan);
    }

    _playEvent(event, time, arrangement) {
      switch (event.type) {
        case 'pad': this._pad(event.chord, time, BAR * 2, arrangement); break;
        case 'keys': this._keys(event.chord, time, event.length, event.velocity, arrangement); break;
        case 'bass': this._bass(event.note, time, event.velocity, arrangement); break;
        case 'motif':
          if (!arrangement.quiet || event.phraseNote === 0 || event.phraseNote === 5) {
            this._tone(event.note, time, event.length, 0.072 * event.velocity * arrangement.lead,
              event.phraseNote % 2 ? 0.13 : -0.13, arrangement.color, true);
          }
          break;
        case 'kick': this._kick(time, event.velocity, arrangement.rhythm); break;
        case 'brush': this._air(time, 0.22, 0.12 * event.velocity * arrangement.rhythm, 480, 3100, event.pan, this._music, 0.033); break;
        case 'shaker': this._air(time, 0.085, 0.075 * event.velocity * arrangement.rhythm, 2300, 4800, event.pan, this._music, 0.014); break;
      }
    }

    _sampleMusic(time, offset, first) {
      const ctx = this._context;
      const buffer = this._buffers.music;
      const source = ctx.createBufferSource(); source.buffer = buffer;
      const gain = ctx.createGain();
      const length = buffer.duration - offset;
      const fade = Math.min(this._crossfade, length * 0.45);
      gain.gain.setValueAtTime(0, time);
      // Linear overlap adds to unity for correlated loop material; no gain bump.
      gain.gain.linearRampToValueAtTime(1, time + (first ? Math.min(0.22, fade) : fade));
      gain.gain.setValueAtTime(1, time + Math.max(fade, length - fade));
      gain.gain.linearRampToValueAtTime(0, time + length);
      source.connect(gain);
      this._voice([source], [gain], gain, this._sampleTone, time, time + length + 0.01, 0, false, offset);
    }

    _shapeSampleMusic(position, time, reset = false) {
      if (reset) {
        [this._sampleTone.frequency, this._sampleLevel.gain].forEach(param => {
          if (typeof param.cancelAndHoldAtTime === 'function') param.cancelAndHoldAtTime(time);
          else { const value = param.value; param.cancelScheduledValues(time); param.setValueAtTime(value, time); }
        });
      }
      const arrangement = this._arrangement(position);
      this._sampleTone.frequency.setTargetAtTime(arrangement.quiet ? 2350 : this._mode === 'background' ? 4700 : 6500, time, 0.55);
      // Asset mastered at -22.4 LUFS: modest makeup keeps the default 0.32
      // volume audible without asking the user to compensate for double attenuation.
      this._sampleLevel.gain.setTargetAtTime(arrangement.quiet ? 1.85 : 2.6, time, 0.65);
    }

    _sampleEffect(name, time, level, rate, pan, color) {
      const buffer = this._buffers[name];
      if (!buffer) return false;
      const ctx = this._context;
      const source = ctx.createBufferSource(); source.buffer = buffer; source.playbackRate.value = rate;
      const tone = ctx.createBiquadFilter(); tone.type = 'lowpass'; tone.frequency.value = color; tone.Q.value = 0.4;
      const gain = ctx.createGain();
      const length = buffer.duration / rate;
      const attack = Math.min(0.012, length * 0.2);
      const release = Math.min(0.1, length * 0.35);
      gain.gain.setValueAtTime(0, time); gain.gain.linearRampToValueAtTime(level, time + attack);
      gain.gain.setValueAtTime(level, time + length - release);
      gain.gain.linearRampToValueAtTime(0, time + length);
      source.connect(tone); tone.connect(gain);
      this._voice([source], [tone, gain], gain, this._effects, time, time + length + 0.01, pan);
      return true;
    }

    _playEffect(event, time) {
      if (event.type === 'transition' && this._buffers.music) this._shapeSampleMusic(event.at, time);
      if (event.type === 'scan' && this._sampleEffect('scan', time, 0.33, 0.92, event.accent % 2 ? 0.22 : -0.22, 2700)) return;
      if (event.type === 'transition' && this._buffers.swish) {
        const quiet = event.scene >= 7 && event.scene <= 10;
        const important = [0, 4, 12, 16].includes(event.scene);
        this._sampleEffect('swish', time, quiet ? 0.24 : important ? 0.53 : 0.4,
          [1, 1.08, 0.95][event.scene % 3], event.scene % 2 ? 0.2 : -0.2, quiet ? 1700 : 3300);
        if (important) this._sampleEffect('impact', time + 0.035, 0.34, 0.84, 0, 2400);
        return;
      }
      if (event.type === 'scan') {
        // A fingertip/paper accent, deliberately unpitched rather than a UI beep.
        this._air(time, 0.11, 0.13, 700, 2800, event.accent % 2 ? 0.28 : -0.28, this._effects, 0.018);
        return;
      }
      const quiet = event.scene >= 7 && event.scene <= 10;
      const important = event.scene === 0 || event.scene === 4 || event.scene === 12 || event.scene === 16;
      this._air(time, quiet ? 0.48 : 0.38, quiet ? 0.055 : important ? 0.13 : 0.09,
        180, quiet ? 1250 : 2450, event.scene % 2 ? 0.22 : -0.22, this._effects, 0.075);
      if (important) {
        // A soft felt-like low impact follows the swish. No sharp transient.
        const ctx = this._context;
        const osc = ctx.createOscillator(); osc.type = 'sine';
        osc.frequency.setValueAtTime(95, time); osc.frequency.exponentialRampToValueAtTime(51, time + 0.24);
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0, time); gain.gain.linearRampToValueAtTime(0.075, time + 0.03);
        gain.gain.exponentialRampToValueAtTime(EPSILON, time + 0.48); gain.gain.linearRampToValueAtTime(0, time + 0.5);
        osc.connect(gain);
        this._voice([osc], [gain], gain, this._effects, time, time + 0.52);
      }
    }
  }

  // Inspectable composition metadata, useful for QA without constructing audio.
  PortfolioAudio.composition = Object.freeze({ title: 'Something of Value', bpm: BPM, beatsPerBar: 4, bars: 8,
    loopSeconds: LOOP, chords: Object.freeze(HARMONY.map(chord => chord.name)), eventsPerLoop: SCORE.length });
  window.PortfolioAudio = PortfolioAudio;
})();
