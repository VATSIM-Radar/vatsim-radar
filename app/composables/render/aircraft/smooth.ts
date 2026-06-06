import type VectorSource from 'ol/source/Vector.js';
import type { Point } from 'ol/geom.js';
import { degreesToRadians } from '@turf/helpers';
import { isMapFeature } from '~/utils/map/entities';
import { ownFlight } from '~/composables/vatsim/pilots';
import type { VatsimMandatoryPilot } from '~/types/data/vatsim';

interface Sample {
    t: number;
    lon: number;
    lat: number;
    heading: number;
}

interface Track {
    samples: Sample[];
    groundspeed: number;
    aLon: number;
    aLat: number;
    aHeading: number;
    applied: boolean;
}

const DELAY_GAPS = 2;
const DELAY_EXTRA = 200;
const MIN_DELAY = 1500;
const MAX_DELAY = 8000;
const GAP_DECAY = 0.9;
const DEFAULT_GAP = 1500;
const STALL_GAP = 15000;
const OFFSET_SMOOTH = 0.05;
const MAX_SAMPLES = 16;
const EXTRAP_CAP = 5000;
const MOVING_THRESHOLD = 30;
const BULK_CHANGE_FRACTION = 0.25;

const tracks = new Map<number, Track>();
let lastServerTime = 0;
let lastTimestampNum = 0;
let lastSampleT = 0;
let lastBulkWall = 0;
let recentMaxGap = DEFAULT_GAP;
let clockOffset = 0;
let clockOffsetReady = false;

export function isSmoothMovementEnabled() {
    return getKeyedValueFromSettings('map.traffic.smoothMovement') === true;
}

function computeDelay() {
    return Math.min(Math.max((recentMaxGap * DELAY_GAPS) + DELAY_EXTRA, MIN_DELAY), MAX_DELAY);
}

export function recordSmoothSamples(pilots: VatsimMandatoryPilot[], serverTime: number, timestampNum: number, now = Date.now()) {
    if (serverTime && serverTime <= lastServerTime) return;

    const dataStore = useDataStore();
    const keyedPilots = dataStore.vatsim.data.keyedPilots.value;
    const instantOffset = now - serverTime;
    if (!clockOffsetReady) {
        clockOffset = instantOffset;
        clockOffsetReady = true;
    }
    else {
        clockOffset += (instantOffset - clockOffset) * OFFSET_SMOOTH;
    }

    let t = serverTime ? serverTime + clockOffset : now;
    if (t <= lastSampleT) t = lastSampleT + 1;
    lastSampleT = t;

    const seen = new Set<number>();
    let changed = 0;

    for (const pilot of pilots) {
        seen.add(pilot.cid);
        const heading = pilot.heading ?? 0;
        const groundspeed = keyedPilots[pilot.cid]?.groundspeed ?? 0;
        const track = tracks.get(pilot.cid);

        if (!track) {
            tracks.set(pilot.cid, {
                samples: [{ t, lon: pilot.longitude, lat: pilot.latitude, heading }],
                groundspeed,
                aLon: NaN,
                aLat: NaN,
                aHeading: NaN,
                applied: false,
            });
            continue;
        }

        track.groundspeed = groundspeed;

        const last = track.samples[track.samples.length - 1];
        if (last.lon === pilot.longitude && last.lat === pilot.latitude) continue;

        changed++;
        track.samples.push({ t, lon: pilot.longitude, lat: pilot.latitude, heading });
        if (track.samples.length > MAX_SAMPLES) track.samples.shift();
    }

    const changedFraction = pilots.length ? changed / pilots.length : 0;
    if (changedFraction >= BULK_CHANGE_FRACTION) {
        const bulkGap = lastBulkWall ? now - lastBulkWall : DEFAULT_GAP;
        lastBulkWall = now;
        if (bulkGap >= 400 && bulkGap <= STALL_GAP) recentMaxGap = Math.max(bulkGap, recentMaxGap * GAP_DECAY);
    }

    if (useIsDebug()) {
        console.debug(`[smooth] dServer=${ serverTime - lastServerTime }ms dStamp=${ timestampNum - lastTimestampNum }ms moved=${ (changedFraction * 100).toFixed(0) }% cadence=${ Math.round(recentMaxGap) }ms delay=${ Math.round(computeDelay()) }ms pilots=${ pilots.length }`);
    }

    lastServerTime = serverTime || lastServerTime + 1;
    lastTimestampNum = timestampNum;

    for (const cid of tracks.keys()) {
        if (!seen.has(cid)) tracks.delete(cid);
    }
}

function shortLonDelta(delta: number) {
    if (delta > 180) return delta - 360;
    if (delta < -180) return delta + 360;
    return delta;
}

function lerpAngle(a: number, b: number, u: number) {
    const diff = ((((b - a) % 360) + 540) % 360) - 180;
    return a + (diff * u);
}

function pchipSlope(dPrev: number, dNext: number, hPrev: number, hNext: number) {
    if (dPrev === 0 || dNext === 0 || ((dPrev > 0) !== (dNext > 0))) return 0;
    const w1 = (2 * hNext) + hPrev;
    const w2 = hNext + (2 * hPrev);
    return (w1 + w2) / ((w1 / dPrev) + (w2 / dNext));
}

function hermite(y1: number, y2: number, m1: number, m2: number, h: number, s: number) {
    const s2 = s * s;
    const s3 = s2 * s;
    return (((2 * s3) - (3 * s2) + 1) * y1) +
        (((s3 - (2 * s2) + s) * h) * m1) +
        ((((-2) * s3) + (3 * s2)) * y2) +
        (((s3 - s2) * h) * m2);
}

function interpAxis(y0: number, y1: number, y2: number, y3: number, hPrev: number, hCur: number, hNext: number, s: number) {
    const dCur = (y2 - y1) / hCur;
    const dPrev = hPrev > 0 ? (y1 - y0) / hPrev : dCur;
    const dNext = hNext > 0 ? (y3 - y2) / hNext : dCur;
    const m1 = hPrev > 0 ? pchipSlope(dPrev, dCur, hPrev, hCur) : dCur;
    const m2 = hNext > 0 ? pchipSlope(dCur, dNext, hCur, hNext) : dCur;
    return hermite(y1, y2, m1, m2, hCur, s);
}

export interface InterpResult { lon: number; lat: number; heading: number }

export function interpolateSamples(samples: Sample[], renderTime: number, extrapolate: boolean): InterpResult | null {
    const n = samples.length;
    if (n === 0) return null;
    if (n === 1 || renderTime <= samples[0].t) {
        const s = samples[0];
        return { lon: s.lon, lat: s.lat, heading: s.heading };
    }
    if (renderTime >= samples[n - 1].t) {
        const b = samples[n - 1];
        const a = samples[n - 2];
        const dt = b.t - a.t;
        if (!extrapolate || dt <= 0) return { lon: b.lon, lat: b.lat, heading: b.heading };
        const ext = Math.min(renderTime - b.t, EXTRAP_CAP);
        let lon = b.lon + ((shortLonDelta(b.lon - a.lon) / dt) * ext);
        const lat = b.lat + (((b.lat - a.lat) / dt) * ext);
        if (lon > 180) lon -= 360;
        else if (lon < -180) lon += 360;
        return { lon, lat, heading: b.heading };
    }

    let i = n - 2;
    while (i > 0 && samples[i].t > renderTime) i--;

    const p0 = samples[i - 1] ?? samples[i];
    const p1 = samples[i];
    const p2 = samples[i + 1];
    const p3 = samples[i + 2] ?? samples[i + 1];

    const hCur = p2.t - p1.t;
    const hPrev = p1.t - p0.t;
    const hNext = p3.t - p2.t;
    const s = hCur > 0 ? (renderTime - p1.t) / hCur : 0;

    const l0 = p1.lon + shortLonDelta(p0.lon - p1.lon);
    const l2 = p1.lon + shortLonDelta(p2.lon - p1.lon);
    const l3 = p1.lon + shortLonDelta(p3.lon - p1.lon);

    let lon = interpAxis(l0, p1.lon, l2, l3, hPrev, hCur, hNext, s);
    const lat = interpAxis(p0.lat, p1.lat, p2.lat, p3.lat, hPrev, hCur, hNext, s);
    const heading = lerpAngle(p1.heading, p2.heading, s);

    if (lon > 180) lon -= 360;
    else if (lon < -180) lon += 360;

    return { lon, lat, heading };
}

let rafId: number | null = null;
let activeSource: VectorSource | null = null;

function frame() {
    rafId = requestAnimationFrame(frame);

    const source = activeSource;
    if (!source) return;

    const renderTime = Date.now() - computeDelay();
    const selfCid = ownFlight.value?.cid;

    for (const feature of source.getFeatures()) {
        const properties = feature.getProperties();
        if (!isMapFeature('aircraft', properties)) continue;

        const cid = properties.cid;
        if (cid === selfCid) continue;

        const track = tracks.get(cid);
        if (!track) continue;

        const result = interpolateSamples(track.samples, renderTime, track.groundspeed > MOVING_THRESHOLD);
        if (!result) continue;

        const { lon, lat, heading } = result;

        if (track.applied && track.aLon === lon && track.aLat === lat && track.aHeading === heading) continue;
        track.aLon = lon;
        track.aLat = lat;
        track.aHeading = heading;
        track.applied = true;

        const geometry = feature.getGeometry() as Point | undefined;
        if (!geometry) continue;

        geometry.setCoordinates([lon, lat]);
        feature.set('rotation', degreesToRadians(properties.icon?.icon === 'ball' ? 0 : heading), true);
        feature.set('heading', heading, true);
    }
}

export function startSmoothMovement(source: VectorSource) {
    activeSource = source;
    if (rafId === null) rafId = requestAnimationFrame(frame);
}

export function stopSmoothMovement() {
    if (rafId !== null) cancelAnimationFrame(rafId);
    rafId = null;
    activeSource = null;
    tracks.clear();
    lastServerTime = 0;
    lastTimestampNum = 0;
    lastSampleT = 0;
    lastBulkWall = 0;
    recentMaxGap = DEFAULT_GAP;
    clockOffset = 0;
    clockOffsetReady = false;
}
