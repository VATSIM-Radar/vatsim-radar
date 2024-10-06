import type { PartialRecord } from '~/types/index';
import type { VatsimShortenedAircraft, VatsimShortenedPrefile } from '~/types/data/vatsim';
import type { Coordinate } from 'ol/coordinate';

export interface MapAirport {
    icao: string;
    iata?: string;
    isPseudo: boolean;
    isSimAware: boolean;
    aircraft: Partial<{
        groundDep: number[];
        groundArr: number[];
        prefiles: number[];
        departures: number[];
        arrivals: number[];
    }>;
}

export type MapAircraftKeys = keyof MapAirport['aircraft'];
export type MapAircraftList = MapAirport['aircraft'];
export type MapAircraftMode = 'all' | 'ground' | MapAircraftKeys;

export type MapAircraft = PartialRecord<Exclude<keyof MapAirport['aircraft'], 'prefiles'>, VatsimShortenedAircraft[]> & {
    prefiles?: VatsimShortenedPrefile[];
};

export type MapWeatherLayer = 'PR0' | 'WND' | 'CL' | 'rainViewer';
export type MapLayoutLayerCarto = 'carto';
export type MapLayoutLayerCartoVariants = `${ MapLayoutLayerCarto }${ 'Vector' | 'Static' }`;
export type MapLayoutLayerExternal = 'OSM' | 'Satellite' | `${ MapLayoutLayerCartoVariants }Labels` | `${ MapLayoutLayerCartoVariants }NoLabels`;
export type MapLayoutLayer = MapLayoutLayerExternal | MapLayoutLayerCarto;
export type MapLayoutLayerExternalOptions = MapLayoutLayerExternal | MapLayoutLayerCarto;
export type MapLayoutLayerWithOptions = MapLayoutLayerExternalOptions;

export interface UserLayersTransparencySettings {
    satellite?: number;
    osm?: number;
    weatherDark?: number;
    weatherLight?: number;
}

export type NotamsSortBy = 'startDesc' | 'startAsc' | 'endAsc' | 'endDesc';

interface IUserLocalSettings {
    location: Coordinate;
    zoom: number;

    filters: {
        opened?: boolean;
        layers?: {
            weather2?: MapWeatherLayer | false;
            layer?: MapLayoutLayerWithOptions;
            layerLabels?: boolean;
            layerVector?: boolean;
            transparencySettings?: UserLayersTransparencySettings;
        };
        notamsSortBy?: NotamsSortBy;
    };

    traffic: {
        disableFastUpdate?: boolean;
        showTotalDeparturesInFeaturedAirports?: boolean;
    };

    tutorial: {
        mapAirportPopupDepartureCount: boolean;
    };
}

export type UserLocalSettings = Partial<IUserLocalSettings>;
