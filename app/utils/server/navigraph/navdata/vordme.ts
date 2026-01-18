import { dbPartialRequest } from '~/utils/server/navigraph/db';
import type { NavdataProcessFunction } from '~/utils/server/navigraph/navdata/types';

export const processNavdataVHF: NavdataProcessFunction = async ({ fullData, shortData, db }) => {
    fullData.vhf = {};
    shortData.vhf = {};

    const vhf = await dbPartialRequest<{
        airport_identifier: string;
        area_code: string;
        continent: string;
        country: string;
        datum_code: string;
        dme_elevation: number;
        dme_ident: string;
        dme_latitude: number;
        dme_longitude: number;
        icao_code: string;
        ilsdme_bias: number;
        magnetic_variation: number;
        navaid_class: string;
        navaid_frequency: number;
        navaid_identifier: string;
        navaid_latitude: number;
        navaid_longitude: number;
        navaid_name: string;
        range: number;
        station_declination: number;
    }>({
        db,
        sql: 'SELECT * FROM tbl_d_vhfnavaids WHERE airport_identifier IS NULL',
        table: 'tbl_d_vhfnavaids',
    });

    for (const item of vhf) {
        const key = `${ item.icao_code }-${ item.navaid_frequency }-${ item.navaid_identifier }`;

        fullData.vhf[key] = {
            magneticVariation: item.magnetic_variation,
            frequency: item.navaid_frequency,
            navaid: {
                ident: item.navaid_identifier,
                name: item.navaid_name,
            },
            range: item.range,
            elevation: item.dme_elevation,
            ident: item.dme_ident,
            coordinates: [item.navaid_longitude, item.navaid_latitude],
        };

        shortData.vhf[key] = [item.navaid_identifier, item.navaid_name, item.dme_ident, item.navaid_frequency, item.navaid_longitude ?? item.dme_longitude, item.navaid_latitude ?? item.dme_latitude];
    }
};

export const processNavdataNDB: NavdataProcessFunction = async ({ fullData, shortData, db }) => {
    const ndb = await dbPartialRequest<{
        area_code: string;
        continent: string;
        country: string;
        datum_code: string;
        icao_code: string;
        magnetic_variation: number;
        navaid_class: string;
        navaid_frequency: number;
        navaid_identifier: string;
        navaid_latitude: number;
        navaid_longitude: number;
        navaid_name: string;
        range: number;
    }>({
        db,
        sql: 'SELECT * FROM tbl_db_enroute_ndbnavaids',
        table: 'tbl_db_enroute_ndbnavaids',
    });

    fullData.ndb = {};
    shortData.ndb = {};

    for (const item of ndb) {
        const key = `${ item.icao_code }-${ item.navaid_frequency }-${ item.navaid_identifier }`;

        fullData.ndb[key] = {
            magneticVariation: item.magnetic_variation,
            frequency: item.navaid_frequency,
            navaid: {
                ident: item.navaid_identifier,
                name: item.navaid_name,
            },
            range: item.range,
            coordinates: [item.navaid_longitude, item.navaid_latitude],
        };

        shortData.ndb[key] = [item.navaid_identifier, item.navaid_name, item.navaid_frequency, item.navaid_longitude, item.navaid_latitude];
    }
};
