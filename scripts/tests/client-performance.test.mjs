import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
import ts from 'typescript';
import Feature from 'ol/Feature.js';
import Point from 'ol/geom/Point.js';
import LineString from 'ol/geom/LineString.js';
import MultiLineString from 'ol/geom/MultiLineString.js';
import VectorSource from 'ol/source/Vector.js';
import * as vue from 'vue';
import greatCircle from '@turf/great-circle';
import { point } from '@turf/helpers';

// Execute the repository functions with explicit Nuxt/browser dependencies. No feed,
// server, DOM renderer or external API is needed for these regression scenarios.
function loadModule(path, globals) {
    let input = readFileSync(new URL(`../../${ path }`, import.meta.url), 'utf8');
    const ast = ts.createSourceFile(path, input, ts.ScriptTarget.Latest, true);
    for (const node of [...ast.statements].reverse()) {
        if (ts.isImportDeclaration(node)) input = input.slice(0, node.pos) + input.slice(node.end);
    }
    const output = ts.transpileModule(input, {
        compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText;
    const context = { exports: {}, console, AbortController, ...globals };
    vm.runInNewContext(output, context, { filename: path });
    return context.exports;
}

function fixture() {
    let now = 100_000;
    let callback;
    let builds = 0;
    let requests = 0;
    let fetch = async () => null;
    let smoothing = false;
    const pilot = { cid: 42, longitude: 30, latitude: 60, heading: 90, icon: 'test', callsign: 'TEST42', logon_time: 'flight1' };
    const data = {
        vatsim: { data: { keyedPilots: { value: { 42: pilot } } }, tracksPilotsData: { value: {} }, selfCoordinate: { value: null } },
        airportsList: { value: {} }, navigraphWaypoints: { value: {} }, vatspy: { value: null }, navigraph: { version: { value: null } },
    };
    const map = { overlays: [], renderedPilots: new Set([42]), moving: false, preciseZoom: 10, getRenderedPilotsCount: 1 };
    const source = new VectorSource();
    const settings = { source, linesSource: new VectorSource(), historySource: new VectorSource(), shownPilots: [pilot], tracks: { 42: { pilot, show: 'full', isShown: true } } };
    for (const key of ['layer', 'linesLayer', 'historyLayer']) settings[key] = { getStyle: () => null };
    const globals = {
        Date: class extends Date { static now() { return now; } },
        Point, LineString, MultiLineString,
        useDataStore: () => data, useMapStore: () => map, useStore: () => ({ config: {} }),
        useIsDebug: () => false, ownFlight: { value: null },
        getKeyedValueFromSettings: key => key.endsWith('showLimit') ? 1000 : undefined,
        getAircraftStatusColor: () => 'blue', getFilteredAircraftSettings: () => undefined,
        getAircraftDynamicScale: () => 1, triggerRef: () => {},
        degreesToRadians: x => x * Math.PI / 180,
        getMapFeature: (_type, target, id) => target.getFeatureById(id),
        createMapFeature: (_type, properties) => { const feature = new Feature(properties); feature.setId(properties.id); return feature; },
        isMapFeature: (type, properties) => properties.type === type,
        greatCircleToOl: (a, b) => { builds++; return new LineString([a, b]); },
        useRadarError: error => { throw error; },
        $fetch: (...args) => { requests++; return fetch(...args); },
        requestAnimationFrame: fn => { callback = fn; return 1; }, cancelAnimationFrame: () => {}, unByKey: () => {},
    };
    const state = loadModule('app/composables/render/aircraft/state.ts', globals);
    Object.assign(globals, state);
    const lines = loadModule('app/composables/render/aircraft/lines.ts', globals);
    Object.assign(globals, lines);
    const smooth = loadModule('app/composables/render/aircraft/smooth.ts', globals);
    Object.assign(globals, smooth);
    const tracks = loadModule('app/composables/render/aircraft/tracks.ts', globals);
    const aircraft = loadModule('app/composables/render/aircraft/index.ts', {
        ...globals, ...tracks,
        updateAircraftTracksData: () => {},
        createDefaultStyle: () => {}, isSmoothMovementEnabled: () => smoothing,
        allPilotsOnGround: { value: new Set() }, isPilotOverlayParked: () => false,
        aircraftIcons: { test: { icon: 'test' } }, pruneAircraftStyleCache: () => {},
    });
    return {
        pilot, source, data, map, settings, state, smooth, lines,
        setTime: value => { now = value; }, setFetch: value => { fetch = value; }, setSmoothing: value => { smoothing = value; },
        builds: () => builds, requests: () => requests, frame: () => callback(),
        render: () => aircraft.setMapAircraft(settings),
        updateTracks: () => tracks.updateAircraftTracksData(settings, {
            aircraft: pilot, pilot, coordinates: [pilot.longitude, pilot.latitude], status: 'default',
            tracksFeatures: [...settings.linesSource.getFeatures(), ...settings.historySource.getFeatures()],
        }),
    };
}

function turns() {
    return {
        flightPlanTime: 'flight1', flightPlan: '',
        features: [{ type: 'FeatureCollection', features: [30, 29].map((lon, index) => ({
            type: 'Feature', geometry: { type: 'Point', coordinates: [lon, 60] },
            properties: { timestamp: `t${ 1 - index }`, color: 'blue' },
        })) }],
    };
}

test('unchanged aircraft emit no source updates; moved aircraft synchronize popup coordinates', () => {
    const f = fixture(); f.render();
    let changes = 0; f.source.on('changefeature', () => changes++);
    f.render(); assert.equal(changes, 0);
    f.pilot.longitude = 31; f.render();
    const feature = f.source.getFeatureById(42);
    assert.equal(feature.getGeometry().getCoordinates()[0], 31);
    assert.equal(feature.get('coordinates')[0], 31);
});

test('offscreen direct writes reseed interpolation and RAF only looks up rendered aircraft', () => {
    const f = fixture(); f.setSmoothing(true);
    f.smooth.recordSmoothSamples([f.pilot], 100_000, 1, 100_000); f.render();
    f.smooth.startSmoothMovement(f.source); f.frame();
    f.setTime(104_000); f.pilot.longitude = 30.1;
    f.smooth.recordSmoothSamples([f.pilot], 104_000, 2, 104_000);
    f.map.renderedPilots = new Set(); f.render();
    assert.equal(f.source.getFeatureById(42).get('coordinates')[0], 30.1);
    f.setTime(106_000); f.map.renderedPilots = new Set([42]);
    f.source.getFeatures = () => { throw new Error('RAF scanned the global source'); };
    f.frame();
    assert.ok(Math.abs(f.source.getFeatureById(42).getGeometry().getCoordinates()[0] - 30.1) < 1e-9);
    f.smooth.stopSmoothMovement();
});

test('empty replies obey the retry deadline, including hide/reopen', async () => {
    const f = fixture();
    await f.updateTracks(); await f.updateTracks(); assert.equal(f.requests(), 1);
    f.settings.tracks = {}; await f.updateTracks();
    f.settings.tracks = { 42: { pilot: f.pilot, show: 'full', isShown: true } };
    await f.updateTracks(); assert.equal(f.requests(), 1);
    f.setTime(115_000); await f.updateTracks(); assert.equal(f.requests(), 2);
});

test('unchanged history is not rebuilt and moving the tail leaves the history source unchanged', async () => {
    const f = fixture(); f.setFetch(async () => turns());
    await f.updateTracks();
    const builds = f.builds(); const revision = f.settings.historySource.getRevision();
    const feature = f.settings.historySource.getFeatures()[0];
    await f.updateTracks();
    assert.equal(f.builds(), builds); assert.equal(f.requests(), 1);
    f.pilot.longitude = 31; await f.updateTracks();
    assert.equal(f.settings.historySource.getRevision(), revision);
    assert.equal(f.settings.historySource.getFeatures()[0], feature);
    assert.equal(f.settings.linesSource.getFeatures()[0].getGeometry().getLastCoordinate()[0], 31);
    assert.equal('lastTurnsUpdateData' in f.state.aircraftState[42], false);
    f.settings.tracks = {}; await f.updateTracks();
    assert.equal(f.state.aircraftState[42], undefined);
    assert.equal(f.settings.historySource.getFeatures().length, 0);
});

test('hiding a track aborts an in-flight request and its late response cannot resurrect history', async () => {
    const f = fixture(); let resolve; let signal;
    f.setFetch((_url, options) => { signal = options.signal; return new Promise(done => { resolve = done; }); });
    const pending = f.updateTracks();
    f.settings.tracks = {}; await f.updateTracks(); assert.equal(signal.aborted, true);
    resolve(turns()); await pending;
    assert.equal(f.settings.historySource.getFeatures().length, 0);
    assert.equal(f.state.aircraftState[42], undefined);
});

test('short mode releases history and rejects a late full-track response', async () => {
    const f = fixture(); let resolve;
    f.setFetch(() => new Promise(done => { resolve = done; }));
    const pending = f.updateTracks();
    f.settings.tracks[42].show = 'short'; await f.updateTracks();
    resolve(turns()); await pending;
    assert.equal(f.settings.historySource.getFeatures().length, 0);
    f.settings.tracks[42].show = 'full'; await f.updateTracks();
    assert.equal(f.requests(), 1);
});

test('failed refresh preserves history and does not retry before its deadline', async () => {
    const f = fixture(); f.setFetch(async () => turns()); await f.updateTracks();
    const feature = f.settings.historySource.getFeatures()[0];
    f.setTime(115_000); f.setFetch(async () => { throw new Error('synthetic timeout'); });
    await f.updateTracks(); await f.updateTracks();
    assert.equal(f.requests(), 2);
    assert.equal(f.settings.historySource.getFeatures()[0], feature);
});

test('flight identity changes clear old history but preserve the request interval', async () => {
    const f = fixture(); f.setFetch(async () => turns()); await f.updateTracks();
    f.pilot.logon_time = 'flight2'; await f.updateTracks();
    assert.equal(f.settings.historySource.getFeatures().length, 0);
    assert.equal(f.requests(), 1);
    let url;
    f.setFetch(async value => { url = value; return { ...turns(), flightPlanTime: 'flight2' }; });
    f.setTime(115_000); await f.updateTracks();
    assert.ok(url.endsWith('start='));
    assert.equal(f.settings.historySource.getFeatures().length, 1);
});

test('live connectors preserve antimeridian splitting and update fixed endpoints', () => {
    const utils = loadModule('app/utils/index.ts', { greatCircle, point, LineString, MultiLineString });
    const lines = loadModule('app/composables/render/aircraft/lines.ts', { ...utils, LineString, MultiLineString });
    const feature = new Feature({ lineType: 'arrival-straight', geometry: utils.greatCircleToOl([179, 40], [-179, 41], { npoints: 8 }) });
    lines.updateAircraftLineCoordinates([feature], [179.5, 40]);
    assert.ok(feature.getGeometry() instanceof MultiLineString);
    for (const part of feature.getGeometry().getCoordinates()) {
        for (let index = 1; index < part.length; index++) assert.ok(Math.abs(part[index][0] - part[index - 1][0]) <= 180);
    }
    lines.setAircraftLineEndpoints(feature, [179.5, 40], [-178, 42]);
    assert.equal(feature.getGeometry().getLastCoordinate()[0], -178);
});

test('airport candidates preserve feed order, IATA/no-plan handling and category membership', () => {
    const pilots = [
        { cid: 3, departure: 'AAA', arrival: 'OTHER' },
        { cid: 1, departure: 'AAAA', arrival: 'AAAA' },
        { cid: 2 },
        { cid: 4, departure: 'OTHER', arrival: 'OTHER' },
        { cid: 5, departure: 'AAAA', arrival: 'OTHER' },
    ];
    const airport = { icao: 'AAAA', iata: 'AAA', lon: 30, lat: 60, aircraft: { groundDep: [2, 4], departures: [1, 3], arrivals: [1], prefiles: [8, 9] } };
    const data = {
        airportsList: { value: { AAAA: airport } },
        vatsim: { data: { pilots: vue.shallowRef(pilots), prefiles: vue.shallowRef([{ cid: 9, departure: 'AAAA' }, { cid: 8, departure: 'OTHER' }]) } },
        navigraphWaypoints: vue.shallowRef({}),
        vatspy: { value: { data: { keyAirports: { realIcao: {}, realIata: { AAA: airport } } } } },
    };
    const module = loadModule('app/composables/vatsim/airport.ts', {
        ...vue, inject: () => null, getCurrentInstance: () => null, debounce: fn => fn,
        useDataStore: () => data, getAirportByIcao: () => airport,
        calculateDistanceInNauticalMiles: () => 0, isValidDate: () => true,
    });
    const scope = vue.effectScope();
    const result = scope.run(() => module.getAircraftForAirport(vue.ref({ icao: 'AAAA' })));
    assert.deepEqual(Array.from(result.value.departures, pilot => pilot.cid), [3, 1]);
    assert.deepEqual(Array.from(result.value.arrivals, pilot => pilot.cid), [1]);
    assert.deepEqual(Array.from(result.value.groundDep, pilot => pilot.cid), [2]);
    assert.deepEqual(Array.from(result.value.prefiles, pilot => pilot.cid), [9]);
    scope.stop();
});

test('airport layout disposal releases retained geometry even after source.clear', () => {
    const source = new VectorSource(); let feature;
    const module = loadModule('app/composables/render/airports/layers/layout.ts', {
        supportedNavigraphLayouts: ['apronelement'], getKeyedValueFromSettings: () => false,
        geoJson: { readFeatures: () => { feature = new Feature(new Point([30, 60])); return [feature]; } },
    });
    module.setMapNavigraphLayout({ source, airports: [], navigraphData: { AAAA: { layout: { apronelement: {} } } } });
    assert.equal(source.getFeatures().length, 1);
    source.clear(); module.disposeAirportLayouts(source);
    assert.equal(feature.disposed, true);
    module.setMapNavigraphLayout({ source, airports: [], navigraphData: { AAAA: { layout: { apronelement: {} } } } });
    assert.equal(source.getFeatures().length, 1);
    module.disposeAirportLayouts(source);
    assert.equal(source.getFeatures().length, 0);
});

test('virtual chunks mount a bounded subset and release browser observers', async () => {
    const scope = vue.effectScope(); const mounted = []; const cleanup = [];
    let intersection; let resize; let disconnected = 0;
    class Element { constructor(index) { this.dataset = { chunk: String(index) }; } }
    class Observer {
        constructor(callback) { this.callback = callback; }
        observe() {} unobserve() {} disconnect() { disconnected++; }
    }
    const module = loadModule('app/composables/virtual-chunks.ts', {
        ...vue, HTMLElement: Element,
        onMounted: fn => mounted.push(fn), onBeforeUnmount: fn => cleanup.push(fn),
        IntersectionObserver: class extends Observer { constructor(fn) { super(fn); intersection = this; } },
        ResizeObserver: class extends Observer { constructor(fn) { super(fn); resize = this; } },
    });
    const items = vue.ref(Array.from({ length: 1000 }, (_, index) => index));
    const key = vue.ref('ground');
    const result = scope.run(() => module.useVirtualChunks(items, key));
    assert.equal(result.chunks.value.filter(chunk => chunk.mounted).flatMap(chunk => chunk.items).length, 20);
    const first = new Element(0); result.setElement(0, first); mounted.forEach(fn => fn());
    resize.callback([{ target: first, borderBoxSize: [{ blockSize: 320 }], contentRect: { height: 320 } }]);
    intersection.callback([{ target: first, isIntersecting: false }, { target: new Element(12), isIntersecting: true }]);
    assert.equal(result.chunks.value[0].height, 320);
    assert.equal(result.chunks.value[12].mounted, true);
    items.value = items.value.slice(0, 10); await vue.nextTick();
    assert.equal(result.chunks.value[0].items.length, 10);
    assert.equal(result.chunks.value[0].mounted, true);
    cleanup.forEach(fn => fn()); scope.stop(); assert.equal(disconnected, 2);
});
