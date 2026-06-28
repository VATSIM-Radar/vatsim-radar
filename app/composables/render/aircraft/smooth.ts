import type VectorSource from 'ol/source/Vector.js';
import type { Point } from 'ol/geom.js';
import { LineString, MultiLineString } from 'ol/geom.js';
import { degreesToRadians, point } from '@turf/helpers';
import greatCircle from '@turf/great-circle';
import { isMapFeature } from '~/utils/map/entities';
import type { MapFeatureProperties } from '~/utils/map/entities';
import type { VatsimMandatoryPilot } from '~/types/data/vatsim';
import { getZoomScaleMultiplier } from '~/utils/map/aircraft-scale';
import type { Coordinate } from 'ol/coordinate.js';

interface Sample {
    t: number;
    lon: number;
    lat: number;
    heading: number;
}

interface Track {
    samples: Sample[];
    aLon: number;
    aLat: number;
    aHeading: number;
    applied: boolean;
}

const SMOOTH_FRAME_RATE = 30;
const SMOOTH_FRAME_INTERVAL = 1000 / SMOOTH_FRAME_RATE;
const LIMIT_SMOOTH_FRAME_RATE = false;
const DELAY_GAPS = 1.3;
const DELAY_EXTRA = 500;
const MIN_DELAY = 1500;
const MAX_DELAY = 6000;
const CADENCE_SMOOTH = 0.2;
const DEFAULT_GAP = 4000;
const STALL_GAP = 15000;
const OFFSET_SMOOTH = 0.05;
const MAX_SAMPLES = 16;
const EXTRAP_CAP = 5000;
const MOVING_THRESHOLD = 30;
const MS_PER_HOUR = 1000 * 60 * 60;
const NM_PER_DEGREE = 60;
const POSITION_SMOOTH_MS = 300;
const HEADING_SMOOTH_MS = 900;
const INACTIVE_FRAME_GAP = 1000 * 10;
const INACTIVE_SNAP_DISTANCE_NM = 2;
const POSITION_SNAP_DISTANCE_NM = 0.03;

const tracks = new Map<number, Track>();
let lastServerTime = 0;
let lastTimestampNum = 0;
let lastSampleT = 0;
let recentMaxGap = DEFAULT_GAP;
let clockOffset = 0;
let clockOffsetReady = false;

export function isSmoothMovementEnabled() {
    return getKeyedValueFromSettings('map.traffic.smoothMovement') === true;
}

export function isSmoothMovementSuspendedForLoad() {
    const renderedPilots = useMapStore().renderedPilots;
    if (!renderedPilots) return false;

    return renderedPilots.length > getKeyedValueFromSettings('map.preferences.aircraft.showLimit');
}

function computeDelay() {
    return Math.min(Math.max((recentMaxGap * DELAY_GAPS) + DELAY_EXTRA, MIN_DELAY), MAX_DELAY);
}

export function recordSmoothSamples(pilots: VatsimMandatoryPilot[], serverTime: number, timestampNum: number, now = Date.now()) {
    if (serverTime && serverTime <= lastServerTime) return;

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
    let intervalSum = 0;
    let intervalCount = 0;

    for (const pilot of pilots) {
        seen.add(pilot.cid);
        const heading = pilot.heading ?? 0;
        const track = tracks.get(pilot.cid);

        if (!track) {
            tracks.set(pilot.cid, {
                samples: [{ t, lon: pilot.longitude, lat: pilot.latitude, heading }],
                aLon: NaN,
                aLat: NaN,
                aHeading: NaN,
                applied: false,
            });
            continue;
        }

        const last = track.samples[track.samples.length - 1];
        if (last.lon === pilot.longitude && last.lat === pilot.latitude && last.heading === heading) continue;

        changed++;

        const interval = t - last.t;
        if (interval >= 400 && interval <= STALL_GAP) {
            intervalSum += interval;
            intervalCount++;
        }

        track.samples.push({ t, lon: pilot.longitude, lat: pilot.latitude, heading });
        if (track.samples.length > MAX_SAMPLES) track.samples.shift();
    }

    if (intervalCount) {
        const meanInterval = intervalSum / intervalCount;
        recentMaxGap += (meanInterval - recentMaxGap) * CADENCE_SMOOTH;
        recentMaxGap = Math.min(Math.max(recentMaxGap, 400), STALL_GAP);
    }

    const changedFraction = pilots.length ? changed / pilots.length : 0;

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

function normalizeLon(lon: number) {
    return ((((lon + 180) % 360) + 360) % 360) - 180;
}

function smoothLon(from: number, to: number, amount: number) {
    return normalizeLon(from + (shortLonDelta(to - from) * amount));
}

function positionalSpeedKt(dLon: number, dLat: number, lat: number, dtMs: number) {
    if (dtMs <= 0) return 0;
    const dLonNm = dLon * Math.cos(degreesToRadians(lat)) * NM_PER_DEGREE;
    const dLatNm = dLat * NM_PER_DEGREE;
    return (Math.hypot(dLonNm, dLatNm) / dtMs) * MS_PER_HOUR;
}

function distanceNm(fromLon: number, fromLat: number, toLon: number, toLat: number) {
    const dLonNm = shortLonDelta(toLon - fromLon) * Math.cos(degreesToRadians(toLat)) * NM_PER_DEGREE;
    const dLatNm = (toLat - fromLat) * NM_PER_DEGREE;

    return Math.hypot(dLonNm, dLatNm);
}

function shouldSnapAfterInactiveGap(track: Track, lon: number, lat: number, sinceLast: number) {
    if (!track.applied || Number.isNaN(track.aLon) || sinceLast < INACTIVE_FRAME_GAP) return false;

    return distanceNm(track.aLon, track.aLat, lon, lat) >= INACTIVE_SNAP_DISTANCE_NM;
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

export function interpolateSamples(samples: Sample[], renderTime: number): InterpResult | null {
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
        if (dt <= 0) return { lon: b.lon, lat: b.lat, heading: b.heading };

        const dLon = shortLonDelta(b.lon - a.lon);
        const dLat = b.lat - a.lat;
        if (positionalSpeedKt(dLon, dLat, b.lat, dt) <= MOVING_THRESHOLD) {
            return { lon: b.lon, lat: b.lat, heading: b.heading };
        }

        const ext = Math.min(renderTime - b.t, EXTRAP_CAP);
        const lon = normalizeLon(b.lon + ((dLon / dt) * ext));
        const lat = b.lat + ((dLat / dt) * ext);
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

    const lon = normalizeLon(interpAxis(l0, p1.lon, l2, l3, hPrev, hCur, hNext, s));
    const lat = interpAxis(p0.lat, p1.lat, p2.lat, p3.lat, hPrev, hCur, hNext, s);
    const heading = lerpAngle(p1.heading, p2.heading, s);

    return { lon, lat, heading };
}

function getDynamicScale(properties: MapFeatureProperties<'aircraft'>, lat: number) {
    if (!isDynamicAircraftScale.value) return properties.scale;

    const icon = properties.icon?.icon;
    if (!icon || !(icon in radarIcons)) return properties.scale;

    const baseScale = getKeyedValueFromSettings('map.preferences.aircraft.scale');
    const iconWidth = radarIcons[icon as keyof typeof radarIcons].width;

    return +(baseScale * getZoomScaleMultiplier({
        zoom: useMapStore().zoom,
        baseScale,
        iconPixelWidth: iconWidth,
        latitude: lat,
        isPilotOnGround: properties.onGround,
    })).toFixed(3);
}

let rafId: number | null = null;
let activeSource: VectorSource | null = null;
let activeLinesSource: VectorSource | null = null;
let activeNavigraphRouteSource: VectorSource | null = null;
let lastSmoothFrameWall = 0;

export function setSmoothNavigraphRouteSource(source: VectorSource | null) {
    activeNavigraphRouteSource = source;
}

function getFirstCoordinate(geometry: LineString | MultiLineString | undefined): Coordinate | null {
    if (geometry instanceof LineString) return geometry.getFirstCoordinate();

    const coordinates = geometry?.getCoordinates();
    return coordinates?.[0]?.[0] ?? null;
}

function getLastCoordinate(geometry: LineString | MultiLineString | undefined): Coordinate | null {
    if (geometry instanceof LineString) return geometry.getLastCoordinate();

    const coordinates = geometry?.getCoordinates();
    return coordinates?.at(-1)?.at(-1) ?? null;
}

function getLineGeometry(from: Coordinate, to: Coordinate, npoints = 8) {
    return turfGeometryToOl(greatCircle(point(from), point(to), { npoints }));
}

function updateAircraftLineFeatures(cid: number, coordinate: Coordinate) {
    if (!activeLinesSource) return;

    for (const feature of activeLinesSource.getFeatures()) {
        const properties = feature.getProperties();
        if (!isMapFeature('aircraft-line', properties) || properties.cid !== cid) continue;

        const geometry = feature.getGeometry();
        if (!(geometry instanceof LineString) && !(geometry instanceof MultiLineString)) continue;

        if (properties.lineType === 'arrival-straight') {
            const end = getLastCoordinate(geometry);
            if (end) feature.setGeometry(getLineGeometry(coordinate, end));
        }
        else if (properties.lineType === 'departure-straight' || properties.lineType === 'aircraft') {
            const start = getFirstCoordinate(geometry);
            if (start) feature.setGeometry(getLineGeometry(start, coordinate));
        }
    }
}

function updateNavigraphRouteCoordinate(cid: number, coordinate: Coordinate) {
    const dataStore = useDataStore();
    const route = dataStore.navigraphWaypoints.value[cid.toString()];
    if (!route) return;

    route.coordinates = coordinate;
}

function updateNavigraphRouteFeature(callsign: string | undefined, coordinate: Coordinate) {
    if (!activeNavigraphRouteSource || !callsign) return;

    const feature = activeNavigraphRouteSource.getFeatureById(`enroute-${ callsign }`);
    if (!feature) return;

    const geometry = feature?.getGeometry();
    if (!(geometry instanceof LineString) && !(geometry instanceof MultiLineString)) return;

    const end = getLastCoordinate(geometry);
    if (end) feature.setGeometry(getLineGeometry(coordinate, end, 16));
}

function isDocumentHidden() {
    return typeof document !== 'undefined' && document.visibilityState === 'hidden';
}

function frame() {
    try {
        const source = activeSource;
        if (!source) return;
        if (isDocumentHidden()) return;

        const now = Date.now();
        const sinceLast = lastSmoothFrameWall ? now - lastSmoothFrameWall : SMOOTH_FRAME_INTERVAL;
        if (LIMIT_SMOOTH_FRAME_RATE && lastSmoothFrameWall && sinceLast < SMOOTH_FRAME_INTERVAL) return;
        lastSmoothFrameWall = now;

        if (isSmoothMovementSuspendedForLoad()) return;

        const renderTime = now - computeDelay();
        const positionAmount = 1 - Math.exp(-sinceLast / POSITION_SMOOTH_MS);
        const headingAmount = 1 - Math.exp(-sinceLast / HEADING_SMOOTH_MS);

        for (const feature of source.getFeatures()) {
            const properties = feature.getProperties();
            if (!isMapFeature('aircraft', properties)) continue;

            const cid = properties.cid;
            const track = tracks.get(cid);
            if (!track) continue;

            const result = interpolateSamples(track.samples, renderTime);
            if (!result) continue;

            const { lon, lat, heading } = result;

            const seeded = track.applied && !Number.isNaN(track.aLon);
            const snapAfterInactiveGap = shouldSnapAfterInactiveGap(track, lon, lat, sinceLast);
            const closeEnoughToTarget = seeded && distanceNm(track.aLon, track.aLat, lon, lat) <= POSITION_SNAP_DISTANCE_NM;
            const snapToTarget = snapAfterInactiveGap || closeEnoughToTarget;

            const nextLon = seeded && !snapToTarget ? smoothLon(track.aLon, lon, positionAmount) : lon;
            const nextLat = seeded && !snapToTarget ? track.aLat + ((lat - track.aLat) * positionAmount) : lat;
            const nextHeading = seeded && !snapToTarget ? lerpAngle(track.aHeading, heading, headingAmount) : heading;

            if (track.applied && track.aLon === nextLon && track.aLat === nextLat && track.aHeading === nextHeading) continue;
            track.aLon = nextLon;
            track.aLat = nextLat;
            track.aHeading = nextHeading;
            track.applied = true;

            const geometry = feature.getGeometry() as Point | undefined;
            if (!geometry) continue;

            feature.set('coordinates', [nextLon, nextLat], true);
            feature.set('scale', getDynamicScale(properties, nextLat), true);
            geometry.setCoordinates([nextLon, nextLat]);
            feature.set('rotation', degreesToRadians(properties.icon?.icon === 'ball' ? 0 : nextHeading), true);
            feature.set('heading', nextHeading, true);

            const coordinate: Coordinate = [nextLon, nextLat];
            updateAircraftLineFeatures(cid, coordinate);
            updateNavigraphRouteCoordinate(cid, coordinate);
            updateNavigraphRouteFeature(properties.callsign, coordinate);
        }
    }
    finally {
        rafId = requestAnimationFrame(frame);
    }
}

export function startSmoothMovement(source: VectorSource, linesSource?: VectorSource) {
    activeSource = source;
    activeLinesSource = linesSource ?? null;
    if (rafId === null) rafId = requestAnimationFrame(frame);
}

export function stopSmoothMovement() {
    if (rafId !== null) cancelAnimationFrame(rafId);
    rafId = null;
    activeSource = null;
    activeLinesSource = null;
    tracks.clear();
    lastServerTime = 0;
    lastTimestampNum = 0;
    lastSampleT = 0;
    lastSmoothFrameWall = 0;
    recentMaxGap = DEFAULT_GAP;
    clockOffset = 0;
    clockOffsetReady = false;
}
