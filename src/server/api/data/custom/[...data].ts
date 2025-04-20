import { handleH3Error } from '~/utils/backend/h3';
import { getLocalText, isDebug, removeLocalFile, removeLocalFolder, saveLocalFile } from '~/utils/backend/debug';

export default defineEventHandler(async event => {
    if (!isDebug()) {
        return handleH3Error({
            event,
            statusCode: 418,
        });
    }

    const key = getRouterParam(event, 'data');
    if (key !== 'vatspy' && key !== 'simaware' && key !== 'vatglasses' && key !== 'controllers' && key !== 'all') {
        return handleH3Error({
            event,
            statusCode: 400,
        });
    }

    const method = event.method;

    if (method === 'GET' && key === 'controllers') return JSON.parse(getLocalText('controllers.json') ?? '[]');

    if (method === 'DELETE') {
        if (key === 'vatspy') {
            removeLocalFile('vatspy.geojson');
            removeLocalFile('vatspy.dat');
        }

        if (key === 'simaware') {
            removeLocalFile('simaware.geojson');
        }

        if (key === 'vatglasses') {
            removeLocalFile('vatglasses.zip');
        }

        if (key === 'controllers') {
            removeLocalFile('controllers.json');
        }

        if (key === 'all') {
            removeLocalFolder();
        }

        return;
    }
    else if (key === 'all') {
        return handleH3Error({
            event,
            statusCode: 400,
        });
    }

    const formdata = key !== 'controllers' ? await readMultipartFormData(event) : null;

    if (formdata) {
        if (key === 'vatspy') {
            const boundaries = formdata.find(x => x.name === 'boundaries')?.data;
            const datfile = formdata.find(x => x.name === 'dat')?.data;

            saveLocalFile(boundaries!, 'vatspy.geojson');
            saveLocalFile(datfile!, 'vatspy.dat');
        }

        if (key === 'simaware') {
            const geojson = await formdata.find(x => x.name === 'file')?.data;

            saveLocalFile(geojson!, 'simaware.geojson');
        }

        if (key === 'vatglasses') {
            const zip = await formdata.find(x => x.name === 'file')?.data;

            saveLocalFile(zip!, 'vatglasses.zip');
        }
    }
    else saveLocalFile(JSON.stringify(await readBody(event)), 'controllers.json');
});
