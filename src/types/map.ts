import type { PartialRecord } from '~/types/index';
import type { VatsimShortenedPrefile } from '~/types/data/vatsim';
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
export type MapAircraftMode = 'all' | 'ground' | MapAircraftKeys;

export type MapAircraft =
    PartialRecord<keyof Pick<MapAirport['aircraft'], 'groundDep' | 'groundArr' | 'prefiles'>, VatsimShortenedPrefile[]>
    & PartialRecord<keyof Pick<MapAirport['aircraft'], 'departures' | 'arrivals'>, boolean>;

export type MapWeatherLayer = 'PR0' | 'WND' | 'CL' | 'rainViewer';
export type MapLayoutLayerExternal = 'OSM' | 'Satellite' | 'Jawg' | 'CartoDB' | 'CartoDBLabels';
export type MapLayoutLayerRadar = 'RadarLabels' | 'RadarNoLabels' | 'RadarSatelliteLabels' | 'RadarSatelliteNoLabels';
export type MapLayoutLayer = MapLayoutLayerExternal | MapLayoutLayerRadar;
export type MapLayoutLayerExternalOptions = MapLayoutLayerExternal | 'JawgOrOSM';
export type MapLayoutLayerWithOptions = MapLayoutLayerExternalOptions | MapLayoutLayerRadar;

export interface UserLayersTransparencySettings {
    satellite?: number;
    osm?: number;
    weatherDark?: number;
    weatherLight?: number;
}

interface IUserLocalSettings {
    location: Coordinate;
    zoom: number;

    filters: {
        opened?: boolean;
        layers?: {
            weather2?: MapWeatherLayer | false;
            layer?: MapLayoutLayerWithOptions;
            transparencySettings?: UserLayersTransparencySettings;
        };
    };

    traffic: {
        disableFastUpdate?: boolean;
    };

    tutorial: {
        mapAirportPopupDepartureCount: boolean;
    };
}

export type UserLocalSettings = Partial<IUserLocalSettings>;
