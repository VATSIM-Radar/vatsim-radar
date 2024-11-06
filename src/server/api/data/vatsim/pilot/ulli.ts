import { getFlightRows, getInfluxFlightsForCid } from '~/utils/backend/influx/queries';
import { getGeojsonForData } from '~/utils/backend/influx/converters';
import { fromServerLonLat, toServerLonLat } from '~/utils/backend/vatsim';
import type { GeoJSON } from 'geojson';

export default defineEventHandler(async event => {
    const fluxQuery =
        `from(bucket: "${ process.env.INFLUX_BUCKET_PLANS }")
  |> range(start: ${ Math.round(new Date(2024, 10, 5, 10).getTime() / 1000) }, stop: ${ Math.round(new Date(2024, 10, 5, 23).getTime() / 1000) })
  |> filter(fn: (r) => r["_measurement"] == "data")`;

    const rows = await getFlightRows(fluxQuery);

    const cids = rows.filter(x => x.fpl_arrival === 'ULLI' || x.fpl_departure === 'ULLI');

    const tracks = await Promise.all(cids.map(async flight => {
        const fluxQuery =
            `from(bucket: "${ process.env.INFLUX_BUCKET_MAIN }")
  |> range(start: ${ Math.round(new Date(2024, 10, 5, 10).getTime() / 1000) }, stop: ${ Math.round(new Date(2024, 10, 5, 23).getTime() / 1000) })
  |> filter(fn: (r) => r["_measurement"] == "data")
  |> filter(fn: (r) => r["cid"] == "${ flight.cid }")`;

        const rows = await getFlightRows(fluxQuery);

        return getGeojsonForData(rows, '');
    }));

    setResponseHeader(event, 'Content-Disposition', 'attachment; filename=ulli.json');

    return {
        type: 'FeatureCollection',
        features: tracks,
    };
});
