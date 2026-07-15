import { parseSelcalCode, SELCAL_FREQUENCIES } from '~/utils/shared/selcal';

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
        console.warn(`Invalid SELCAL code, cannot play tone: ${ code }`);
        return;
    }

    if (isSelcalPlaying) return;
    isSelcalPlaying = true;

    const ctx = getAudioContext();
    if (ctx.state === 'suspended') ctx.resume();

    // ICAO Annex 10 / ARINC 596: each 2-tone pulse lasts ~1s, separated by a ~0.2s gap.
    const toneDuration = 1;
    const gapDuration = 0.2;
    // Short, snappy edges for a "bursty" gated feel rather than a smooth fade.
    const attack = 0.008;
    const release = 0.02;
    const peakGain = 0.3;

    const nodes: (OscillatorNode | GainNode | WaveShaperNode)[] = [];
    const now = ctx.currentTime;

    function schedulePair(freqA: number, freqB: number, startTime: number) {
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

        [freqA, freqB].forEach(frequency => {
            const oscillator = ctx.createOscillator();
            oscillator.type = 'sine';
            oscillator.frequency.value = frequency;
            oscillator.connect(gainNode);
            oscillator.start(startTime);
            oscillator.stop(startTime + toneDuration);
            nodes.push(oscillator);
        });
    }

    schedulePair(SELCAL_FREQUENCIES[letters[0]], SELCAL_FREQUENCIES[letters[1]], now);
    schedulePair(SELCAL_FREQUENCIES[letters[2]], SELCAL_FREQUENCIES[letters[3]], now + toneDuration + gapDuration);

    const totalDuration = (toneDuration * 2) + gapDuration;
    setTimeout(() => {
        nodes.forEach(node => node.disconnect());
        isSelcalPlaying = false;
    }, (totalDuration + 0.1) * 1000);
}
