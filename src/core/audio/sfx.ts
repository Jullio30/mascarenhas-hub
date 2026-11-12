/**
 * Mascarenhas Hub — sintetizador leve via Web Audio API (sem arquivos MP3).
 */
type Wave = OscillatorType;

let ctx: AudioContext | null = null;
let enabled = true;

function audio(): AudioContext | null {
  if (!enabled || typeof window === 'undefined') return null;
  const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  if (!ctx) ctx = new AC();
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

function tone(freq: number, duration: number, opts: { type?: Wave; gain?: number; delay?: number; slideTo?: number } = {}) {
  const ac = audio();
  if (!ac) return;
  const t0 = ac.currentTime + (opts.delay ?? 0);
  const osc = ac.createOscillator();
  const g = ac.createGain();
  osc.type = opts.type ?? 'sine';
  osc.frequency.setValueAtTime(freq, t0);
  if (opts.slideTo) osc.frequency.exponentialRampToValueAtTime(opts.slideTo, t0 + duration);
  const peak = opts.gain ?? 0.18;
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(peak, t0 + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
  osc.connect(g).connect(ac.destination);
  osc.start(t0);
  osc.stop(t0 + duration + 0.02);
}

export const sfx = {
  setEnabled(value: boolean) {
    enabled = value;
  },
  isEnabled() {
    return enabled;
  },
  /** Desbloqueia o áudio no primeiro gesto do usuário (exigência do iOS/Chrome). */
  unlock() {
    audio();
  },
  tick() {
    tone(1100, 0.05, { type: 'square', gain: 0.06 });
  },
  tickUrgent() {
    tone(1500, 0.07, { type: 'square', gain: 0.1 });
  },
  click() {
    tone(660, 0.04, { type: 'triangle', gain: 0.08 });
  },
  /** Ficha de fliperama: "plim-pliiim" clássico (Si → Mi). */
  coin() {
    tone(988, 0.08, { type: 'square', gain: 0.09 });
    tone(1319, 0.42, { type: 'square', gain: 0.09, delay: 0.075 });
  },
  /** Ganhou pontos: chuva de moedinhas. */
  success() {
    sfx.coin();
    tone(1568, 0.1, { type: 'square', gain: 0.06, delay: 0.32 });
    tone(2093, 0.25, { type: 'square', gain: 0.06, delay: 0.4 });
  },
  error() {
    tone(220, 0.25, { type: 'sawtooth', gain: 0.1, slideTo: 140 });
  },
  reveal() {
    tone(392, 0.1, { type: 'triangle' });
    tone(523, 0.1, { type: 'triangle', delay: 0.08 });
    tone(784, 0.25, { type: 'triangle', delay: 0.16 });
  },
  buzzer() {
    tone(110, 0.5, { type: 'sawtooth', gain: 0.14 });
    tone(116, 0.5, { type: 'square', gain: 0.06 });
  },
  pop() {
    tone(880, 0.06, { type: 'sine', gain: 0.1, slideTo: 1400 });
  },
  win() {
    [523, 659, 784, 1047, 784, 1047].forEach((f, i) => tone(f, 0.18, { type: 'square', delay: i * 0.12, gain: 0.08 }));
    [0, 1, 2, 3, 4].forEach((i) => {
      tone(988, 0.06, { type: 'square', gain: 0.05, delay: 0.8 + i * 0.13 });
      tone(1319, 0.16, { type: 'square', gain: 0.05, delay: 0.86 + i * 0.13 });
    });
  },
};
