import { handleH3Error } from '~/utils/backend/h3';
import { getLocalText, isDebug, saveLocalFile } from '~/utils/backend/debug';
import { getDiffPolygons, getSimAwareData, getVatSpyCompiledData, getVatSpyData } from '~/utils/backend/debug/data-get';
import type { VatsimController } from '~/types/data/vatsim';
import { compileVatSpy, vatspyDataToGeojson } from '~/utils/backend/vatsim/vatspy';

export default defineEventHandler(async event => {
    const { type, id } = getRouterParams(event);
    if (!type || !id || (type !== 'simaware' && type !== 'vatspy') || isNaN(+id)) {
        return handleH3Error({
            event,
            statusCode: 400,
        });
    }

    if (!isDebug()) {
        return handleH3Error({
            event,
            statusCode: 418,
        });
    }

    if (type === 'simaware') {
        const data = await getSimAwareData(+id);
        saveLocalFile(JSON.stringify(data), 'simaware.geojson');
        const changedData = getDiffPolygons(data, 'simaware');

        const changedControllers = (await changedData).features.filter(x => x.properties!.fill === 'success500' || x.properties!.fill === 'primary500').flatMap(x => {
            const properties = x.properties!;

            const controllers: VatsimController[] = [];

            properties.prefix.forEach((prefix: string) => {
                const callsign = `${ prefix }_${ properties.suffix ?? 'APP' }`;
                controllers.push({
                    callsign,
                    cid: Date.now() + Number(Math.random().toFixed(6).toString().replace('.', '')),
                    facility: 2,
                    frequency: '122.122',
                    last_updated: '',
                    logon_time: '',
                    name: Date.now().toString() + Number(Math.random().toFixed(6).toString().replace('.', '')),
                    rating: 3,
                    server: '',
                    text_atis: ['test'],
                    visual_range: 0,
                });
            });

            return controllers;
        });

        const existingControllers: VatsimController[] = JSON.parse(getLocalText('controllers.json') ?? '[]');

        saveLocalFile(JSON.stringify([...existingControllers, ...changedControllers.filter(x => !existingControllers.some(y => y.callsign === x.callsign))]), 'controllers.json');
    }
    else {
        const data = await getVatSpyData(+id, true);
        const [version, dat, geo] = getVatSpyCompiledData(data, true);
        const compiled = compileVatSpy(version, dat, geo, true);
        saveLocalFile(geo, 'vatspy.geojson');
        saveLocalFile(dat, 'vatspy.dat');
        const changedData = getDiffPolygons(vatspyDataToGeojson(compiled), 'vatspy');

        let changedControllers: VatsimController[] = (await changedData).features.filter(x => x.properties!.fill === 'success500' || x.properties!.fill === 'primary500').flatMap(x => {
            const properties = x.properties!;
            const neededFir = compiled.firs.find(x => x.feature.properties!.id === properties!.id);
            if (!neededFir?.callsign) return [] as VatsimController[];

            return {
                callsign: `${ neededFir.callsign.replace('-', '_') }_CTR`,
                cid: Date.now() + Number(Math.random().toFixed(6).toString().replace('.', '')),
                facility: 2,
                frequency: '122.122',
                last_updated: '',
                logon_time: '',
                name: Date.now().toString() + Number(Math.random().toFixed(6).toString().replace('.', '')),
                rating: 3,
                server: '',
                text_atis: ['test'],
                visual_range: 0,
            } satisfies VatsimController as VatsimController;
        });

        changedControllers = changedControllers.filter((x, xIndex) => !changedControllers.find((y, yIndex) => x.callsign === y.callsign && xIndex > yIndex));

        const existingControllers: VatsimController[] = JSON.parse(getLocalText('controllers.json') ?? '[]');

        saveLocalFile(JSON.stringify([...existingControllers, ...changedControllers.filter(x => !existingControllers.some(y => y.callsign === x.callsign))]), 'controllers.json');
    }
});
