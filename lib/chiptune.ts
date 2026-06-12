// Self-contained 8-bit chiptune engine using the Web Audio API.
// No external assets or licensing — the music is synthesized in the browser
// from pulse/triangle oscillators and white-noise percussion, then looped.
//
// The composition is original but styled after classic handheld RPG
// route/town themes: a flowing, slightly wistful pulse-wave melody over a
// rolling broken-chord arpeggio and a soft triangle bass. It intentionally
// avoids the bouncy, staccato major-key feel of platformer jingles.

const A4 = 440;
// MIDI note number -> frequency (Hz).
const f = (n: number) => A4 * Math.pow(2, (n - 69) / 12);

const R = 0; // rest marker

// 64-step loop (16th notes). Lead is legato and flowing — longer held notes,
// gentle stepwise motion with occasional leaps, in a warm major key (D major).
// D F# A E motion with passing tones gives that nostalgic "overworld" feel.
const LEAD: number[] = [
  // bar 1
  74, R, 76, R, 78, R, 81, R, 78, R, 76, R, 74, R, R, R,
  // bar 2
  73, R, 74, R, 76, R, 78, R, 76, R, 73, R, 69, R, R, R,
  // bar 3
  71, R, 74, R, 78, R, 83, R, 81, R, 78, R, 74, R, R, R,
  // bar 4
  76, R, 74, R, 73, R, 71, R, 69, R, 71, R, 73, R, R, R,
];

// Broken-chord arpeggio (the signature handheld-RPG texture). One note per
// 16th, cycling chord tones. Chords: D — A — Bm — G across the four bars.
const ARP: number[] = [
  // D (D A F#)
  62, 66, 69, 74, 69, 66, 62, 66, 69, 74, 69, 66, 62, 66, 69, 66,
  // A (A E C#)
  57, 61, 64, 69, 64, 61, 57, 61, 64, 69, 64, 61, 57, 61, 64, 61,
  // Bm (B F# D)
  59, 62, 66, 71, 66, 62, 59, 62, 66, 71, 66, 62, 59, 62, 66, 62,
  // G (G D B)
  55, 59, 62, 67, 62, 59, 55, 59, 62, 67, 62, 59, 55, 59, 62, 59,
];

// Soft bass — root notes, two per bar, low octave.
const BASS: number[] = [
  38, R, R, R, R, R, R, R, 38, R, R, R, R, R, R, R,
  33, R, R, R, R, R, R, R, 33, R, R, R, R, R, R, R,
  35, R, R, R, R, R, R, R, 35, R, R, R, R, R, R, R,
  31, R, R, R, R, R, R, R, 31, R, R, R, R, R, R, R,
];

export class Chiptune {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private timer: number | null = null;
  private step = 0;
  private nextTime = 0;
  private playing = false;

  // Slower, gentler tempo than a platformer jingle.
  private readonly bpm = 112;
  private readonly stepsPerBeat = 4; // 16th notes
  private get stepDur() {
    return 60 / this.bpm / this.stepsPerBeat;
  }

  get isPlaying() {
    return this.playing;
  }

  start() {
    if (this.playing) return;
    if (!this.ctx) {
      const Ctor =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      this.ctx = new Ctor();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.16; // gentle overall volume
      this.master.connect(this.ctx.destination);
    }
    // Browsers start the context suspended until a user gesture. Resume in the
    // background — don't block playback state on it (some environments never
    // resolve resume()), and re-resume defensively when scheduling.
    if (this.ctx.state === "suspended") {
      this.ctx.resume().catch(() => {});
    }
    this.playing = true;
    this.step = 0;
    this.nextTime = this.ctx.currentTime + 0.06;
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
      // Defensively keep the context awake (autoplay policies can re-suspend).
      if (this.ctx.state === "suspended") this.ctx.resume().catch(() => {});
      while (this.nextTime < this.ctx.currentTime + 0.12) {
        this.scheduleStep(this.step, this.nextTime);
        this.nextTime += this.stepDur;
        this.step = (this.step + 1) % LEAD.length;
      }
    }, 25);
  };

  private scheduleStep(step: number, time: number) {
    // Lead: legato pulse wave. Hold the note across following rests so it
    // sings rather than blips.
    const lead = LEAD[step];
    if (lead && lead !== R) {
      let hold = 1;
      while (LEAD[(step + hold) % LEAD.length] === R && hold < 6) hold++;
      this.pulse(f(lead), time, this.stepDur * hold * 0.95, 0.32, 0.5);
    }

    // Arpeggio: quiet, short broken-chord notes — the nostalgic backing.
    const arp = ARP[step % ARP.length];
    if (arp && arp !== R) {
      this.pulse(f(arp), time, this.stepDur * 0.8, 0.12, 0.25);
    }

    // Bass: soft triangle root notes.
    const bass = BASS[step % BASS.length];
    if (bass && bass !== R) {
      this.blip(f(bass), time, this.stepDur * 7, "triangle", 0.5);
    }

    // Light percussion: soft hat every other 16th, gentle kick on the beat.
    if (step % 8 === 0) this.noise(time, 0.05, 0.22, 1400);
    else if (step % 4 === 2) this.noise(time, 0.02, 0.08, 7000);
  }

  // Pulse-wave voice (approx. square but softer) with a smooth envelope.
  private pulse(
    freq: number,
    time: number,
    dur: number,
    vol: number,
    duty: number,
  ) {
    if (!this.ctx || !this.master) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    // Approximate a variable-duty pulse with a periodic wave.
    osc.type = duty < 0.35 ? "square" : "sawtooth";
    osc.frequency.setValueAtTime(freq, time);
    gain.gain.setValueAtTime(0, time);
    gain.gain.linearRampToValueAtTime(vol, time + 0.012);
    gain.gain.setValueAtTime(vol, time + dur * 0.6);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + dur);
    osc.connect(gain);
    gain.connect(this.master);
    osc.start(time);
    osc.stop(time + dur + 0.03);
  }

  // A single pitched note with a short attack/decay envelope (used for bass).
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
    gain.gain.linearRampToValueAtTime(vol, time + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + dur);
    osc.connect(gain);
    gain.connect(this.master);
    osc.start(time);
    osc.stop(time + dur + 0.02);
  }

  // White-noise burst for soft percussion.
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
