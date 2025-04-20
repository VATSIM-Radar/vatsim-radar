import type { PartialRecord } from '~/types/index';
import type { VatsimShortenedAircraft, VatsimShortenedController, VatsimShortenedPrefile } from '~/types/data/vatsim';
import type { Coordinate } from 'ol/coordinate';
import type { VatSpyAirport } from '~/types/data/vatspy';
import type { Units } from 'ol/control/ScaleLine';

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
export type MapLayoutLayerProto = 'protoData' | 'protoDataGray' | 'protoGeneral';
export type MapLayoutLayerExternal = 'OSM' | 'Satellite' | 'SatelliteEsri' | 'basic' | `${ MapLayoutLayerProto }Labels` | `${ MapLayoutLayerProto }NoLabels`;
export type MapLayoutLayer = MapLayoutLayerExternal | MapLayoutLayerProto;
export type MapLayoutLayerExternalOptions = MapLayoutLayerExternal | MapLayoutLayerProto;
export type MapLayoutLayerWithOptions = MapLayoutLayerExternalOptions;

export interface UserLayersTransparencySettings {
    satellite?: number;
    osm?: number;
    weatherDark?: number;
    weatherLight?: number;
    sigmets?: number;
}

export type NotamsSortBy = 'startDesc' | 'startAsc' | 'endAsc' | 'endDesc';

export interface SearchResults {
    flights: (VatsimShortenedAircraft | VatsimShortenedPrefile)[];
    airports: VatSpyAirport[];
    atc: VatsimShortenedController[];
}

export type SearchFilter = keyof SearchResults;

export type SigmetType = 'TS' | 'VA' | 'FZLVL' | 'WS' | 'WIND' | 'ICE' | 'TURB' | 'MTW' | 'IFR' | 'OBSC';

interface IUserLocalSettings {
    location: Coordinate;
    zoom: number;
    vatglassesLevel: number;
    featuredDefaultBookmarks: boolean;
    skipBookmarkAnimation: boolean;
    eventsLocalTimezone: boolean;

    filters: {
        opened?: boolean;
        layers?: {
            weather2?: MapWeatherLayer | false;
            layer?: MapLayoutLayerWithOptions;
            layerLabels?: boolean;
            layerVector?: boolean;
            relativeIndicator?: boolean | Units;
            sigmets?: {
                enabled?: boolean;
                activeDate?: string;
                disabled?: SigmetType[];
                showAirmets?: boolean;
                showGAirmets?: boolean;
            };
            transparencySettings?: UserLayersTransparencySettings;
        };
        notamsSortBy?: NotamsSortBy;
    };

    traffic: {
        disableFastUpdate?: boolean;
        showTotalDeparturesInFeaturedAirports?: boolean;
        searchBy?: SearchFilter[];
        searchLimit?: number;
    };

    tutorial: {
        mapAirportPopupDepartureCount: boolean;
    };
}

export type UserLocalSettings = Partial<IUserLocalSettings>;
