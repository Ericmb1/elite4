// Self-contained 8-bit chiptune engine using the Web Audio API.
// No external assets or licensing — the music is synthesized in the browser
// from square/triangle oscillators and white-noise percussion, then looped.

const A4 = 440;
// MIDI note number -> frequency (Hz).
const f = (n: number) => A4 * Math.pow(2, (n - 69) / 12);

// Note name helpers (MIDI numbers). C4 = 60.
const R = 0; // rest marker

// Lead melody — a bright, looping GameBoy-style theme (eighth notes).
// 32 steps so the loop has some breathing room.
const LEAD: number[] = [
  76, 76, R, 76, R, 72, 76, R, 79, R, R, R, 67, R, R, R,
  72, R, R, 67, R, R, 64, R, 69, R, 71, R, 70, 69, R, R,
  67, 76, 79, 81, R, 77, 79, R, 76, R, 72, 74, 71, R, R, R,
  72, R, R, 67, R, R, 64, R, 69, R, 71, R, 70, 69, R, R,
];

// Bass line (one note per two lead steps), lower octave, square/triangle.
const BASS: number[] = [
  48, 48, 55, 55, 53, 53, 47, 47,
  48, 48, 55, 55, 53, 53, 47, 47,
  45, 45, 52, 52, 50, 50, 43, 43,
  48, 48, 55, 55, 53, 53, 47, 47,
];

export class Chiptune {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private timer: number | null = null;
  private step = 0;
  private nextTime = 0;
  private playing = false;

  private readonly bpm = 132;
  private readonly stepsPerBeat = 2; // eighth notes
  private get stepDur() {
    return 60 / this.bpm / this.stepsPerBeat;
  }

  get isPlaying() {
    return this.playing;
  }

  async start() {
    if (this.playing) return;
    if (!this.ctx) {
      const Ctor =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      this.ctx = new Ctor();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.18; // gentle overall volume
      this.master.connect(this.ctx.destination);
    }
    // Browsers start the context suspended until a user gesture.
    if (this.ctx.state === "suspended") {
      try {
        await this.ctx.resume();
      } catch {
        /* ignore */
      }
    }
    this.playing = true;
    this.step = 0;
    this.nextTime = this.ctx.currentTime + 0.05;
    this.scheduler();
  }

  stop() {
    this.playing = false;
    if (this.timer !== null) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  // Lookahead scheduler: every 25ms, queue any steps due in the next 120ms.
  private scheduler = () => {
    if (!this.ctx) return;
    if (this.timer !== null) clearInterval(this.timer);
    this.timer = window.setInterval(() => {
      if (!this.ctx || !this.playing) return;
      while (this.nextTime < this.ctx.currentTime + 0.12) {
        this.scheduleStep(this.step, this.nextTime);
        this.nextTime += this.stepDur;
        this.step = (this.step + 1) % LEAD.length;
      }
    }, 25);
  };

  private scheduleStep(step: number, time: number) {
    const lead = LEAD[step];
    if (lead && lead !== R) {
      this.blip(f(lead), time, this.stepDur * 0.9, "square", 0.5);
    }
    const bass = BASS[step % BASS.length];
    if (bass && bass !== R) {
      this.blip(f(bass), time, this.stepDur * 0.95, "triangle", 0.7);
    }
    // Simple percussion: kick on the beat, hat on the off-beat.
    if (step % 2 === 0) this.noise(time, 0.06, 0.35, 1800);
    else this.noise(time, 0.03, 0.18, 6000);
  }

  // A single pitched note with a short attack/decay envelope.
  private blip(
    freq: number,
    time: number,
    dur: number,
    type: OscillatorType,
    vol: number,
  ) {
    if (!this.ctx || !this.master) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, time);
    gain.gain.setValueAtTime(0, time);
    gain.gain.linearRampToValueAtTime(vol, time + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + dur);
    osc.connect(gain);
    gain.connect(this.master);
    osc.start(time);
    osc.stop(time + dur + 0.02);
  }

  // White-noise burst for kick/hi-hat percussion.
  private noise(time: number, dur: number, vol: number, cutoff: number) {
    if (!this.ctx || !this.master) return;
    const frames = Math.floor(this.ctx.sampleRate * dur);
    const buffer = this.ctx.createBuffer(1, frames, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < frames; i++) data[i] = Math.random() * 2 - 1;
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = cutoff > 3000 ? "highpass" : "lowpass";
    filter.frequency.value = cutoff;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(vol, time);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + dur);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.master);
    src.start(time);
    src.stop(time + dur + 0.02);
  }
}
