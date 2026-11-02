(() => {
  'use strict';

  let context;
  let enabled = true;

  function getContext() {
    const AudioContextConstructor = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextConstructor) return null;
    if (!context) context = new AudioContextConstructor();
    if (context.state === 'suspended') context.resume();
    return context;
  }

  function tone(ctx, frequency, start, duration, volume, type = 'sine', endFrequency = frequency) {
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, start);
    if (endFrequency !== frequency) oscillator.frequency.exponentialRampToValueAtTime(Math.max(1, endFrequency), start + duration);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(volume, start + Math.min(.018, duration * .25));
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    oscillator.connect(gain);
    gain.connect(ctx.destination);
    oscillator.start(start);
    oscillator.stop(start + duration + .015);
  }

  function noise(ctx, start, duration, volume, cutoff, resonance = .7) {
    const sampleRate = ctx.sampleRate;
    const buffer = ctx.createBuffer(1, Math.ceil(sampleRate * duration), sampleRate);
    const data = buffer.getChannelData(0);
    for (let index = 0; index < data.length; index += 1) data[index] = (Math.random() * 2 - 1) * (1 - index / data.length * .55);
    const source = ctx.createBufferSource();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();
    source.buffer = buffer;
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(cutoff, start);
    filter.Q.value = resonance;
    gain.gain.setValueAtTime(volume, start);
    gain.gain.exponentialRampToValueAtTime(.0001, start + duration);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    source.start(start);
    source.stop(start + duration);
  }

  function playSink() {
    if (!enabled) return;
    const ctx = getContext();
    if (!ctx) return;
    const now = ctx.currentTime + .015;
    tone(ctx, 180, now, .46, .09, 'sawtooth', 48);
    tone(ctx, 92, now + .06, .62, .11, 'triangle', 32);
    tone(ctx, 520, now + .02, .2, .035, 'sine', 170);
    noise(ctx, now + .11, .5, .085, 420, .45);
  }

  window.BattleshipAudio = {
    setEnabled(value) {
      enabled = Boolean(value);
      if (enabled) getContext();
      return enabled;
    },
    isEnabled() { return enabled; },
    hit(isSinking = false) {
      if (!enabled) return;
      const ctx = getContext();
      if (!ctx) return;
      const now = ctx.currentTime + .015;
      tone(ctx, 640, now, .12, .075, 'sine', 250);
      tone(ctx, 125, now + .015, .22, .09, 'triangle', 58);
      noise(ctx, now + .025, .18, .08, 900, .35);
      if (isSinking) window.setTimeout(playSink, 200);
    },
    rescue() {
      if (!enabled) return;
      const ctx = getContext();
      if (!ctx) return;
      const now = ctx.currentTime + .015;
      tone(ctx, 523.25, now, .18, .08, 'sine');
      tone(ctx, 659.25, now + .14, .2, .085, 'sine');
      tone(ctx, 783.99, now + .3, .38, .1, 'sine');
    }
  };
})();
