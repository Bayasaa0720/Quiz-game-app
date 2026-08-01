// Synthesized Web Audio SFX — no external audio files needed.
let audioCtx = null;
let muted = localStorage.getItem('quiz_sfx_muted') === 'true';

function getCtx() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') audioCtx.resume();
    return audioCtx;
}

function tone({ freq, duration, type = 'sine', startTime = 0, gain = 0.15, freqEnd }) {
    if (muted) return;
    try {
        const ctx = getCtx();
        const osc = ctx.createOscillator();
        const gainNode = ctx.createGain();
        osc.type = type;
        const t0 = ctx.currentTime + startTime;
        osc.frequency.setValueAtTime(freq, t0);
        if (freqEnd) osc.frequency.exponentialRampToValueAtTime(freqEnd, t0 + duration);
        gainNode.gain.setValueAtTime(gain, t0);
        gainNode.gain.exponentialRampToValueAtTime(0.001, t0 + duration);
        osc.connect(gainNode);
        gainNode.connect(ctx.destination);
        osc.start(t0);
        osc.stop(t0 + duration + 0.02);
    } catch {
        // Autoplay/AudioContext unavailable — SFX are non-critical, fail silently.
    }
}

export function isMuted() {
    return muted;
}

export function setMuted(value) {
    muted = value;
    localStorage.setItem('quiz_sfx_muted', String(value));
}

export function toggleMuted() {
    setMuted(!muted);
    return muted;
}

export function playCorrectHit() {
    tone({ freq: 440, freqEnd: 880, duration: 0.15, type: 'triangle', gain: 0.18 });
}

export function playWrongHit() {
    tone({ freq: 180, freqEnd: 80, duration: 0.25, type: 'sawtooth', gain: 0.15 });
}

export function playVictory() {
    tone({ freq: 523.25, duration: 0.12, type: 'triangle' });
    tone({ freq: 659.25, duration: 0.12, type: 'triangle', startTime: 0.12 });
    tone({ freq: 783.99, duration: 0.12, type: 'triangle', startTime: 0.24 });
    tone({ freq: 1046.5, duration: 0.3, type: 'triangle', startTime: 0.36 });
}

export function playDefeat() {
    tone({ freq: 300, freqEnd: 100, duration: 0.4, type: 'sawtooth', gain: 0.18 });
    tone({ freq: 250, freqEnd: 80, duration: 0.5, type: 'sawtooth', startTime: 0.15, gain: 0.15 });
}

export function playClick() {
    tone({ freq: 600, duration: 0.05, type: 'square', gain: 0.08 });
}
