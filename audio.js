// ============================================================================
// DÖNER READY! — Ses Motoru (Klasik Türk Müziği, Sadece Kesimde Mangal Sesi & Tık-Tık Efektleri)
// - Arka planda rahatsız edici sürekli cızırtı YOKTUR! Sadece oyuncu döner keserken
//   doğal köz/mangal ateşi ve döner bıçağı kesim sesi duyulur.
// - Döner/ürün alırken tek tek yükselen "Tık - Tık - Tık" (playPickupTik) ses efekti
// - Tezgaha ürün bırakırken, çöp toplarken, çöpe atarken ve para toplarken özel ses efektleri
// - Gerçek Telifsiz Klasik Türk Müziği MP3 Kitaplığı (5 Eser)
// ============================================================================

class SoundEngine {
  constructor() {
    this.ctx = null;
    this.started = false;

    // Independent Music & SFX states and volumes (0.0 to 1.0)
    this.musicEnabled = true;
    this.musicVolume = 0.60;

    this.sizzleEnabled = true;
    this.sizzleVolume = 0.60;

    // 1. Real MP3 Turkish Classical Music Library
    this.tracks = [
      { title: 'Kürdilihicazkar Longa', src: 'audio/kurdilihicazkar_longa.mp3' },
      { title: 'Nihavend Sirto', src: 'audio/nihavend_sirto.mp3' },
      { title: 'Hicaz Sirto', src: 'audio/hicaz_sirto.mp3' },
      { title: 'Suzinak Sirto', src: 'audio/suzinak_sirto.mp3' },
      { title: 'Müstear Sirto', src: 'audio/mustear_sirto.mp3' }
    ];
    this.currentTrackIndex = 0;
    this.musicAudio = new Audio();
    this.musicAudio.preload = 'auto';
    this.musicAudio.src = this.tracks[0].src;
    this.musicAudio.volume = this.musicVolume;

    this.musicAudio.addEventListener('ended', () => {
      this.nextTrack(true);
    });

    // 2. Real Wooden Door Sound from Sound Library (audio/tahta_kapi.mp3)
    this.doorAudio = new Audio();
    this.doorAudio.preload = 'auto';
    this.doorAudio.src = 'audio/tahta_kapi.mp3';
    this.doorAudio.volume = 0.35;
    this.lastDoorSoundTime = 0;

    // 3. Warm Mangal Charcoal Fire Nodes (ONLY active while player is cutting doner!)
    this.isCarvingNow = false;
    this.mangalFireGain = null;
    this.mangalPopTimer = null;

    this.cashCombo = 0;
    this.lastCashTime = 0;
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) this.ctx = new AudioCtx();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    if (!this.started) {
      this.started = true;
      this.setupMangalCarvingFire();
      this.syncMusicPlayback();
      this.syncSizzlePlayback();
    }
  }

  // --------------------------------------------------------------------------
  // 1. REAL TURKISH CLASSICAL MUSIC MP3 PLAYER
  // --------------------------------------------------------------------------
  syncMusicPlayback() {
    this.musicAudio.muted = !this.musicEnabled;
    const duckFactor = (this.isCarvingNow && this.sizzleEnabled) ? 0.90 : 1.0;
    this.musicAudio.volume = this.musicEnabled ? Math.max(0, Math.min(1, this.musicVolume * duckFactor)) : 0;

    if (this.started && this.musicEnabled && this.musicAudio.paused) {
      this.musicAudio.play().catch(() => {});
    } else if (!this.musicEnabled && !this.musicAudio.paused) {
      this.musicAudio.pause();
    }
  }

  toggleMusic() {
    this.musicEnabled = !this.musicEnabled;
    this.syncMusicPlayback();
    return this.musicEnabled;
  }

  toggleMusicMute() {
    this.musicEnabled = !this.musicEnabled;
    this.syncMusicPlayback();
    return !this.musicEnabled;
  }

  setMusicVolume(val0to1) {
    this.musicVolume = Math.max(0, Math.min(1, val0to1));
    if (this.musicVolume === 0) {
      this.musicEnabled = false;
    } else if (!this.musicEnabled) {
      this.musicEnabled = true;
    }
    this.syncMusicPlayback();
  }

  nextTrack() {
    this.currentTrackIndex = (this.currentTrackIndex + 1) % this.tracks.length;
    const tr = this.tracks[this.currentTrackIndex];
    this.musicAudio.src = tr.src;
    this.musicAudio.currentTime = 0;
    if (this.started && this.musicEnabled) {
      this.musicAudio.play().catch(() => {});
    }
    const label = document.getElementById('current-track-label');
    if (label) label.textContent = `🎼 ${tr.title}`;
    return tr.title;
  }

  // --------------------------------------------------------------------------
  // 2. WARM MANGAL SOUND — ONLY PLAYS WHILE PLAYER IS CARVING DONER!
  //    (Zero continuous background hiss/static!)
  // --------------------------------------------------------------------------
  setupMangalCarvingFire() {
    if (!this.ctx || this.mangalFireGain) return;

    // Create a warm, low-passed charcoal fire buffer (no harsh high frequencies!)
    const dur = 3.0;
    const sr = this.ctx.sampleRate;
    const buf = this.ctx.createBuffer(1, Math.floor(sr * dur), sr);
    const data = buf.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0;
    for (let i = 0; i < data.length; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99 * b0 + white * 0.05;
      b1 = 0.96 * b1 + white * 0.12;
      b2 = 0.85 * b2 + white * 0.20;
      // Gentle flame modulation
      const flameWave = 0.75 + 0.25 * Math.sin((i / sr) * Math.PI * 4.0);
      data[i] = (b0 + b1 * 0.5 + b2 * 0.25) * flameWave * 0.45;
    }

    const fireSrc = this.ctx.createBufferSource();
    fireSrc.buffer = buf;
    fireSrc.loop = true;

    // Warm low-pass filter at 380 Hz so it sounds like deep glowing charcoal embers, NEVER static hiss!
    const lowpass = this.ctx.createBiquadFilter();
    lowpass.type = 'lowpass';
    lowpass.frequency.value = 380;

    this.mangalFireGain = this.ctx.createGain();
    this.mangalFireGain.gain.value = 0;

    fireSrc.connect(lowpass);
    lowpass.connect(this.mangalFireGain);
    this.mangalFireGain.connect(this.ctx.destination);
    fireSrc.start(0);

    // Warm wood-charcoal crackles ONLY when carving doner
    if (this.mangalPopTimer) clearInterval(this.mangalPopTimer);
    this.mangalPopTimer = setInterval(() => {
      if (!this.ctx || !this.sizzleEnabled || !this.isCarvingNow || this.sizzleVolume <= 0.01) return;
      if (Math.random() < 0.55) {
        this.triggerWarmCharcoalCrackle();
      }
    }, 140);
  }

  triggerWarmCharcoalCrackle() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    const startF = 420 + Math.random() * 480;
    osc.frequency.setValueAtTime(startF, now);
    osc.frequency.exponentialRampToValueAtTime(110, now + 0.032);

    const vol = (0.035 + Math.random() * 0.03) * this.sizzleVolume;
    gain.gain.setValueAtTime(vol, now);
    gain.gain.exponentialRampToValueAtTime(0.0005, now + 0.035);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.038);
  }

  syncSizzlePlayback() {
    if (!this.ctx || !this.mangalFireGain) return;
    const now = this.ctx.currentTime;
    // ONLY audible when this.isCarvingNow is true! Otherwise 0!
    const targetVol = (this.sizzleEnabled && this.isCarvingNow)
      ? Math.max(0, Math.min(0.45, this.sizzleVolume * 0.38))
      : 0;
    this.mangalFireGain.gain.setTargetAtTime(targetVol, now, 0.06);
  }

  toggleSFX() {
    this.sizzleEnabled = !this.sizzleEnabled;
    this.syncSizzlePlayback();
    this.syncMusicPlayback();
    return this.sizzleEnabled;
  }

  toggleSizzleMute() {
    this.sizzleEnabled = !this.sizzleEnabled;
    this.syncSizzlePlayback();
    this.syncMusicPlayback();
    return !this.sizzleEnabled;
  }

  setSizzleActive(isCarving) {
    this.setSizzleProximity(isCarving ? 1.0 : 0.0, Boolean(isCarving));
  }

  playPop() {
    this.playDropPop(1);
  }

  setSizzleVolume(val0to1) {
    this.sizzleVolume = Math.max(0, Math.min(1, val0to1));
    if (this.sizzleVolume === 0) {
      this.sizzleEnabled = false;
    } else if (!this.sizzleEnabled) {
      this.sizzleEnabled = true;
    }
    this.syncSizzlePlayback();
    this.syncMusicPlayback();
  }

  setSizzleProximity(prox, isSlicing = false) {
    const prevCarving = this.isCarvingNow;
    this.isCarvingNow = Boolean(isSlicing);
    if (prevCarving !== this.isCarvingNow) {
      this.syncSizzlePlayback();
      this.syncMusicPlayback();
    }
  }

  // Smooth juicy doner knife slice sound while carving at the spit
  playCarveStroke() {
    if (!this.sizzleEnabled || this.sizzleVolume <= 0.01) return;
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    // Soft low-mid knife-through-tender-meat stroke
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(240, now);
    osc.frequency.exponentialRampToValueAtTime(420, now + 0.065);

    gain.gain.setValueAtTime(0.065 * this.sizzleVolume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.075);
  }

  // --------------------------------------------------------------------------
  // 3. SEQUENTIAL "TIK - TIK - TIK" ITEM PICKUP, DROP, TRASH & CASH SOUNDS!
  // --------------------------------------------------------------------------
  // Crisp, tactile ascending "Tık - Tık - Tık" when picking up Doner/Ayran 1 by 1!
  playPickupTik(stackIndex = 1) {
    if (!this.sizzleEnabled || this.sizzleVolume <= 0.01) return;
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const step = Math.min(stackIndex, 16);
    // Ascending pentatonic-like pitch so 1, 2, 3, 4... sounds super satisfying!
    const baseFreq = 460 * Math.pow(1.058, step);

    // Tactile "Tık" transient
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(baseFreq, now);
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.45, now + 0.045);

    gain.gain.setValueAtTime(0.16 * this.sizzleVolume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.055);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.06);
  }

  // Warm "Pıt - Pıt" sound when placing items onto a service counter
  playDropPop(stackIndex = 1) {
    if (!this.sizzleEnabled || this.sizzleVolume <= 0.01) return;
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const baseFreq = 320 + Math.min(stackIndex * 28, 300);
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(baseFreq, now);
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.72, now + 0.055);

    gain.gain.setValueAtTime(0.14 * this.sizzleVolume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.065);
  }

  playSlice(stackIndex = 1) {
    this.playPickupTik(stackIndex);
  }

  // Distinct plate/crumple pickup sound when clearing trash from a table
  playTrashPickup(stackIndex = 1) {
    if (!this.sizzleEnabled || this.sizzleVolume <= 0.01) return;
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    const freq = 260 + Math.min(stackIndex * 35, 200);
    osc.frequency.setValueAtTime(freq, now);
    osc.frequency.exponentialRampToValueAtTime(freq * 1.25, now + 0.05);

    gain.gain.setValueAtTime(0.13 * this.sizzleVolume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.065);
  }

  // Satisfying bin thump + swish when tossing trash into the Trash Container
  playTrashToss() {
    if (!this.sizzleEnabled || this.sizzleVolume <= 0.01) return;
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(280, now);
    osc.frequency.exponentialRampToValueAtTime(85, now + 0.13);

    gain.gain.setValueAtTime(0.18 * this.sizzleVolume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.15);
  }

  // Rich Cash Register Coin Chime + Bill Rustle ("Para Toplama Sesi")!
  playCash() {
    if (!this.sizzleEnabled || this.sizzleVolume <= 0.01) return;
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    if (now - this.lastCashTime > 0.65) {
      this.cashCombo = 0;
    } else {
      this.cashCombo = Math.min(this.cashCombo + 1, 14);
    }
    this.lastCashTime = now;

    // Layer 1: Bright double-chime ("Ka-Ching!")
    const baseFreq = 784 + this.cashCombo * 45; // G5 upwards
    [baseFreq, baseFreq * 1.25].forEach((freq, idx) => {
      const t = now + idx * 0.042;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);

      gain.gain.setValueAtTime(0.16 * this.sizzleVolume, t);
      gain.gain.exponentialRampToValueAtTime(0.0008, t + 0.18);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.19);
    });
  }

  // --------------------------------------------------------------------------
  // 4. TRADITIONAL WOODEN DOOR CREAK & SLAP SOUND EFFECTS
  // --------------------------------------------------------------------------
  playWoodenDoor() {
    if (!this.sizzleEnabled || this.sizzleVolume <= 0.01 || !this.started) return;
    const nowMs = performance.now();
    if (nowMs - this.lastDoorSoundTime < 2200) return;
    this.lastDoorSoundTime = nowMs;

    try {
      this.doorAudio.volume = Math.min(0.45, 0.35 * this.sizzleVolume);
      this.doorAudio.currentTime = 0;
      this.doorAudio.play().catch(() => {});
    } catch (_) {}

    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(165, now);
    osc.frequency.linearRampToValueAtTime(215, now + 0.09);
    osc.frequency.linearRampToValueAtTime(140, now + 0.22);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 420;
    filter.Q.value = 4.0;

    gain.gain.setValueAtTime(0.045 * this.sizzleVolume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.24);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.25);
  }

  playSlap() {
    if (!this.sizzleEnabled || this.sizzleVolume <= 0.01) return;
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const dur = 0.075;
    const buf = this.ctx.createBuffer(1, Math.floor(this.ctx.sampleRate * dur), this.ctx.sampleRate);
    const ch = buf.getChannelData(0);
    for (let i = 0; i < ch.length; i++) {
      const t = i / ch.length;
      const env = t < 0.08 ? (t / 0.08) : Math.pow(1 - (t - 0.08) / 0.92, 2.2);
      ch[i] = (Math.random() * 2 - 1) * env;
    }
    const noiseSrc = this.ctx.createBufferSource();
    noiseSrc.buffer = buf;

    const slapFilter = this.ctx.createBiquadFilter();
    slapFilter.type = 'bandpass';
    slapFilter.frequency.setValueAtTime(1850, now);
    slapFilter.frequency.exponentialRampToValueAtTime(950, now + dur);
    slapFilter.Q.value = 1.6;

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.38 * this.sizzleVolume, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + dur);

    noiseSrc.connect(slapFilter);
    slapFilter.connect(noiseGain);
    noiseGain.connect(this.ctx.destination);
    noiseSrc.start(now);

    const popOsc = this.ctx.createOscillator();
    const popGain = this.ctx.createGain();
    popOsc.type = 'triangle';
    popOsc.frequency.setValueAtTime(420, now);
    popOsc.frequency.exponentialRampToValueAtTime(95, now + 0.09);

    popGain.gain.setValueAtTime(0.28 * this.sizzleVolume, now);
    popGain.gain.exponentialRampToValueAtTime(0.001, now + 0.095);

    popOsc.connect(popGain);
    popGain.connect(this.ctx.destination);
    popOsc.start(now);
    popOsc.stop(now + 0.10);
  }

  playSmack() {
    this.playSlap();
  }

  playCologneSpray() {
    if (!this.sizzleEnabled || this.sizzleVolume <= 0.01 || !this.ctx) return;
    const now = this.ctx.currentTime;
    const dur = 0.09;
    const buf = this.ctx.createBuffer(1, Math.floor(this.ctx.sampleRate * dur), this.ctx.sampleRate);
    const ch = buf.getChannelData(0);
    for (let i = 0; i < ch.length; i++) {
      ch[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / ch.length, 1.4);
    }
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const hp = this.ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 3200;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.06 * this.sizzleVolume, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + dur);
    src.connect(hp);
    hp.connect(g);
    g.connect(this.ctx.destination);
    src.start(now);
  }

  playTeaClink() {
    if (!this.sizzleEnabled || this.sizzleVolume <= 0.01 || !this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(2450, now);
    osc.frequency.exponentialRampToValueAtTime(2410, now + 0.12);
    g.gain.setValueAtTime(0.065 * this.sizzleVolume, now);
    g.gain.exponentialRampToValueAtTime(0.0005, now + 0.13);
    osc.connect(g);
    g.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.14);
  }

  playPadTick(progress = 0.5) {
    if (!this.sizzleEnabled || this.sizzleVolume <= 0.01) return;
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(310 + progress * 420, now);

    gain.gain.setValueAtTime(0.065 * this.sizzleVolume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.055);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.06);
  }

  playComplaint() {
    if (!this.sizzleEnabled || this.sizzleVolume <= 0.01) return;
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(340, now);
    osc.frequency.linearRampToValueAtTime(240, now + 0.18);

    gain.gain.setValueAtTime(0.09 * this.sizzleVolume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.21);
  }

  playResolveXP() {
    if (!this.sizzleEnabled || this.sizzleVolume <= 0.01) return;
    this.init();
    if (!this.ctx) return;

    [440, 554.37, 659.25].forEach((freq, idx) => {
      const now = this.ctx.currentTime + idx * 0.065;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now);
      gain.gain.setValueAtTime(0.13 * this.sizzleVolume, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.21);
    });
  }

  playTruckCrate() {
    if (!this.sizzleEnabled || this.sizzleVolume <= 0.01) return;
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(180, now);
    osc.frequency.exponentialRampToValueAtTime(320, now + 0.12);

    gain.gain.setValueAtTime(0.14 * this.sizzleVolume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.15);
  }

  playFanfare() {
    if (!this.sizzleEnabled || this.sizzleVolume <= 0.01) return;
    this.init();
    if (!this.ctx) return;

    [523.25, 659.25, 783.99, 1046.5].forEach((freq, idx) => {
      const now = this.ctx.currentTime + idx * 0.08;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now);
      gain.gain.setValueAtTime(0.14 * this.sizzleVolume, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.26);
    });
  }

  playAlarm() {
    if (!this.sizzleEnabled || this.sizzleVolume <= 0.01) return;
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(680, now);
    osc.frequency.linearRampToValueAtTime(920, now + 0.12);
    osc.frequency.linearRampToValueAtTime(640, now + 0.24);

    gain.gain.setValueAtTime(0.11 * this.sizzleVolume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.26);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.27);
  }
}

window.SFX = new SoundEngine();
