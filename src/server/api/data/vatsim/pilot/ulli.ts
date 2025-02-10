import { getFlightRows } from '~/utils/backend/influx/queries';
import type { InfluxGeojson } from '~/utils/backend/influx/converters';
import { getGeojsonForData } from '~/utils/backend/influx/converters';

export default defineEventHandler(async event => {
    const fluxQuery =
        `from(bucket: "${ process.env.INFLUX_BUCKET_PLANS }")
  |> range(start: ${ Math.round(new Date(2025, 1, 9, 14).getTime() / 1000) }, stop: ${ Math.round(new Date(2025, 1, 9, 17).getTime() / 1000) })
  |> filter(fn: (r) => r["_measurement"] == "data")`;

    const rows = await getFlightRows(fluxQuery);

    console.log(rows.length);

    const cids = rows.filter(x => x.fpl_departure === 'UUDD' || x.fpl_departure === 'UUEE' || x.fpl_departure === 'UUWW');

    const tracks: InfluxGeojson[] = [];

    for (const cid of cids) {
        const fluxQuery =
            `from(bucket: "${ process.env.INFLUX_BUCKET_MAIN }")
  |> range(start: ${ Math.round(new Date(2025, 1, 9, 14).getTime() / 1000) }, stop: ${ Math.round(new Date(2025, 1, 9, 20).getTime() / 1000) })
  |> filter(fn: (r) => r["_measurement"] == "data")
  |> filter(fn: (r) => r["cid"] == "${ cid.cid }")`;

        const rows = await getFlightRows(fluxQuery);

        tracks.push(getGeojsonForData(rows, ''));
    }

    setResponseHeader(event, 'Content-Disposition', 'attachment; filename=ulli.json');

    return {
        type: 'FeatureCollection',
        features: tracks.flatMap(x => x.features.features),
    };
});
