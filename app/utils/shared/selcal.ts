import { useStore } from '~/store';

// ARINC 596 SELCAL tone frequencies (Hz). I, N and O are never assigned to avoid
// confusion with the digits 1 and 0.
export const SELCAL_FREQUENCIES: Record<string, number> = {
    A: 312.6,
    B: 346.7,
    C: 384.6,
    D: 426.6,
    E: 473.2,
    F: 524.8,
    G: 582.1,
    H: 645.7,
    J: 716.1,
    K: 794.3,
    L: 881.0,
    M: 977.2,
    P: 1083.9,
    Q: 1202.3,
    R: 1333.5,
    S: 1479.1,
};

export function parseSelcalCode(raw: string): string[] | null {
    const letters = raw.toUpperCase().replace(/[^A-Z]/g, '').split('');

    if (letters.length !== 4 || letters.some(letter => !SELCAL_FREQUENCIES[letter])) return null;

    return letters;
}

// Not reactive: playback state must never trigger a Vue re-render, and the
// AudioContext has to be a singleton shared by every caller.
let sharedAudioContext: AudioContext | null = null;
let isSelcalPlaying = false;
let distortionCurve: Float32Array<ArrayBuffer> | null = null;

function getAudioContext(): AudioContext {
    if (!sharedAudioContext) {
        const AudioContextCtor = window.AudioContext ?? (window as any).webkitAudioContext;
        sharedAudioContext = new AudioContextCtor();
    }

    return sharedAudioContext;
}

// Soft-clip curve for a WaveShaperNode. Not part of the ARINC 596 spec — it
// emulates the harmonic grit a dual-tone burst picks up over a radio's audio path.
function getDistortionCurve(): Float32Array<ArrayBuffer> {
    if (!distortionCurve) {
        const amount = 22;
        const samples = 44100;
        const deg = Math.PI / 180;
        const curve = new Float32Array(samples);

        for (let i = 0; i < samples; i++) {
            const x = ((i * 2) / samples) - 1;
            curve[i] = ((3 + amount) * x * 20 * deg) / (Math.PI + (amount * Math.abs(x)));
        }

        distortionCurve = curve;
    }

    return distortionCurve;
}

export function playSelcal(code: string | null) {
    if (!code) return;

    const letters = parseSelcalCode(code);
    if (!letters) {
        useStore().addError(`Invalid SELCAL code, cannot play tone: ${ code }`);
        return;
    }

    if (isSelcalPlaying) return;
    isSelcalPlaying = true;

    const ctx = getAudioContext();
    if (ctx.state === 'suspended') ctx.resume();

    // ICAO Annex 10 / ARINC 596: each 2-tone pulse lasts ~1s, separated by a ~0.2s gap.
    const toneDuration = 1;
    const gapDuration = 0.2;
    const attack = 0.008;
    const release = 0.02;
    const peakGain = 0.3;

    const nodes: AudioNode[] = [];
    let lastOscillator: OscillatorNode | null = null;

    [[letters[0], letters[1]], [letters[2], letters[3]]].forEach((pair, pulse) => {
        const startTime = ctx.currentTime + (pulse * (toneDuration + gapDuration));

        const gainNode = ctx.createGain();
        gainNode.gain.setValueAtTime(0, startTime);
        gainNode.gain.linearRampToValueAtTime(peakGain, startTime + attack);
        gainNode.gain.setValueAtTime(peakGain, startTime + toneDuration - release);
        gainNode.gain.linearRampToValueAtTime(0, startTime + toneDuration);

        const distortion = ctx.createWaveShaper();
        distortion.curve = getDistortionCurve();
        distortion.oversample = '4x';

        gainNode.connect(distortion);
        distortion.connect(ctx.destination);
        nodes.push(gainNode, distortion);

        pair.forEach(letter => {
            const oscillator = ctx.createOscillator();
            oscillator.type = 'sine';
            oscillator.frequency.value = SELCAL_FREQUENCIES[letter];
            oscillator.connect(gainNode);
            oscillator.start(startTime);
            oscillator.stop(startTime + toneDuration);
            nodes.push(oscillator);
            lastOscillator = oscillator;
        });
    });

    if (lastOscillator) {
        (lastOscillator as OscillatorNode).onended = () => {
            nodes.forEach(node => node.disconnect());
            isSelcalPlaying = false;
        };
    }
}
