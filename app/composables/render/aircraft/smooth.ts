import type VectorSource from 'ol/source/Vector.js';
import type { Point } from 'ol/geom.js';
import { LineString, MultiLineString } from 'ol/geom.js';
import { degreesToRadians, point } from '@turf/helpers';
import greatCircle from '@turf/great-circle';
import { isMapFeature } from '~/utils/map/entities';
import type { MapFeatureProperties } from '~/utils/map/entities';
import { ownFlight } from '~/composables/vatsim/pilots';
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
    groundspeed: number;
    aLon: number;
    aLat: number;
    aHeading: number;
    lastApplyWall: number;
    applied: boolean;
}

const SMOOTH_FRAME_RATE = 30;
const SMOOTH_FRAME_INTERVAL = 1000 / SMOOTH_FRAME_RATE;
const DELAY_GAPS = 0.25;
const DELAY_EXTRA = 500;
const MIN_DELAY = 1000;
const MAX_DELAY = 8000;
const GAP_DECAY = 0.9;
const DEFAULT_GAP = 1500;
const STALL_GAP = 15000;
const OFFSET_SMOOTH = 0.05;
const MAX_SAMPLES = 16;
const MOVING_THRESHOLD = 30;
const CORRECTION_SMOOTH_MS = 900;
const EARTH_RADIUS_NM = 3440.065;
const MS_PER_HOUR = 1000 * 60 * 60;

const tracks = new Map<number, Track>();
let lastServerTime = 0;
let lastTimestampNum = 0;
let lastSampleT = 0;
let lastSampleWall = 0;
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
                lastApplyWall: 0,
                applied: false,
            });
            continue;
        }

        track.groundspeed = groundspeed;

        const last = track.samples[track.samples.length - 1];
        if (last.lon === pilot.longitude && last.lat === pilot.latitude && last.heading === pilot.heading) continue;

        changed++;
        track.samples.push({ t, lon: pilot.longitude, lat: pilot.latitude, heading });
        if (track.samples.length > MAX_SAMPLES) track.samples.shift();
    }

    const serverGap = serverTime && lastServerTime ? serverTime - lastServerTime : 0;
    const timestampGap = timestampNum && lastTimestampNum ? timestampNum - lastTimestampNum : 0;
    const wallGap = lastSampleWall ? now - lastSampleWall : DEFAULT_GAP;
    const sampleGap = serverGap || timestampGap || wallGap;

    lastSampleWall = now;

    if (sampleGap >= 400 && sampleGap <= STALL_GAP) {
        recentMaxGap = Math.max(sampleGap, recentMaxGap * GAP_DECAY);
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

function radiansToDegrees(value: number) {
    return value * (180 / Math.PI);
}

function projectByGroundspeed(sample: Sample, groundspeed: number, elapsedMs: number) {
    const distanceNm = (groundspeed * elapsedMs) / MS_PER_HOUR;
    if (distanceNm <= 0) return { lon: sample.lon, lat: sample.lat };

    const angularDistance = distanceNm / EARTH_RADIUS_NM;
    const bearing = degreesToRadians(sample.heading);
    const lat1 = degreesToRadians(sample.lat);
    const lon1 = degreesToRadians(sample.lon);

    const sinLat1 = Math.sin(lat1);
    const cosLat1 = Math.cos(lat1);
    const sinDistance = Math.sin(angularDistance);
    const cosDistance = Math.cos(angularDistance);

    const lat2 = Math.asin((sinLat1 * cosDistance) + (cosLat1 * sinDistance * Math.cos(bearing)));
    const lon2 = lon1 + Math.atan2(
        Math.sin(bearing) * sinDistance * cosLat1,
        cosDistance - (sinLat1 * Math.sin(lat2)),
    );

    return {
        lon: normalizeLon(radiansToDegrees(lon2)),
        lat: radiansToDegrees(lat2),
    };
}

type InterpMode = 'hold' | 'interpolate' | 'extrapolate';

export interface InterpResult { lon: number; lat: number; heading: number; mode: InterpMode }

// Keep aircraft speed predictable: linear interpolation between known points, then dead-reckon until fresh data arrives.
export function interpolateSamples(samples: Sample[], renderTime: number, groundspeed: number): InterpResult | null {
    const n = samples.length;
    if (n === 0) return null;
    if (n === 1 || renderTime <= samples[0].t) {
        const s = samples[0];
        return { lon: s.lon, lat: s.lat, heading: s.heading, mode: 'hold' };
    }
    if (renderTime >= samples[n - 1].t) {
        const b = samples[n - 1];
        if (groundspeed <= MOVING_THRESHOLD) return { lon: b.lon, lat: b.lat, heading: b.heading, mode: 'hold' };
        const { lon, lat } = projectByGroundspeed(b, groundspeed, renderTime - b.t);
        return { lon, lat, heading: b.heading, mode: 'extrapolate' };
    }

    let i = n - 2;
    while (i > 0 && samples[i].t > renderTime) i--;

    const p1 = samples[i];
    const p2 = samples[i + 1];
    const hCur = p2.t - p1.t;
    const s = hCur > 0 ? (renderTime - p1.t) / hCur : 0;

    const l2 = p1.lon + shortLonDelta(p2.lon - p1.lon);

    const lon = normalizeLon(p1.lon + ((l2 - p1.lon) * s));
    const lat = p1.lat + ((p2.lat - p1.lat) * s);
    const heading = lerpAngle(p1.heading, p2.heading, s);

    return { lon, lat, heading, mode: 'interpolate' };
}

function smoothLon(from: number, to: number, amount: number) {
    return normalizeLon(from + (shortLonDelta(to - from) * amount));
}

function correctionAmount(elapsed: number) {
    if (elapsed <= 0) return 1;
    return 1 - Math.exp(-elapsed / CORRECTION_SMOOTH_MS);
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

function frame() {
    rafId = requestAnimationFrame(frame);

    const source = activeSource;
    if (!source) return;

    const now = Date.now();
    if (lastSmoothFrameWall && now - lastSmoothFrameWall < SMOOTH_FRAME_INTERVAL) return;
    lastSmoothFrameWall = now;

    if (isSmoothMovementSuspendedForLoad()) return;

    const renderTime = now - computeDelay();
    const selfCid = ownFlight.value?.cid;

    for (const feature of source.getFeatures()) {
        const properties = feature.getProperties();
        if (!isMapFeature('aircraft', properties)) continue;

        const cid = properties.cid;
        if (cid === selfCid) continue;

        const track = tracks.get(cid);
        if (!track) continue;

        const result = interpolateSamples(track.samples, renderTime, track.groundspeed);
        if (!result) continue;

        const { lon, lat, heading } = result;
        let nextLon = lon;
        let nextLat = lat;
        let nextHeading = heading;

        if (result.mode === 'interpolate' && track.applied) {
            const amount = correctionAmount(now - track.lastApplyWall);

            nextLon = smoothLon(track.aLon, lon, amount);
            nextLat = track.aLat + ((lat - track.aLat) * amount);
            nextHeading = lerpAngle(track.aHeading, heading, amount);
        }

        if (track.applied && track.aLon === nextLon && track.aLat === nextLat && track.aHeading === nextHeading) continue;
        track.aLon = nextLon;
        track.aLat = nextLat;
        track.aHeading = nextHeading;
        track.lastApplyWall = now;
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
    lastSampleWall = 0;
    lastSmoothFrameWall = 0;
    recentMaxGap = DEFAULT_GAP;
    clockOffset = 0;
    clockOffsetReady = false;
}
