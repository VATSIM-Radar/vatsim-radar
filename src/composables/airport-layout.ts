import { Fill, Stroke, Style, Text } from 'ol/style';
import type { PartialRecord } from '~/types';
import type { NavigraphLayoutType } from '~/types/data/navigraph';
import type { FeatureLike } from 'ol/Feature';
import { toRadians } from 'ol/math';
import { useStore } from '~/store';

export const airportLayoutStyles = (): PartialRecord<NavigraphLayoutType, Style | ((feature: FeatureLike) => Style | undefined)> => {
    const theme = useStore().getCurrentTheme;

    const themeStyles = {
        taxiway: {
            default: getCurrentThemeRgbColor('warning300').join(','),
            light: getCurrentThemeRgbColor('warning600').join(','),
        },
        taxiwayText: {
            default: getCurrentThemeRgbColor('warning500').join(','),
            light: getCurrentThemeRgbColor('warning700').join(','),
        },
        terminal: {
            default: getCurrentThemeRgbColor('info500').join(','),
            light: getCurrentThemeRgbColor('info300').join(','),
        },
        runway1000: {
            default: getCurrentThemeRgbColor('darkgray1000').join(','),
            light: getCurrentThemeRgbColor('darkgray800').join(','),
        },
        runway950: {
            default: `rgba(${ getCurrentThemeRgbColor('darkgray950').join(',') }, 1)`,
            light: `rgba(${ getCurrentThemeRgbColor('darkgray800').join(',') }, 1)`,
        },
        runwayMarking: {
            default: `rgba(${ getCurrentThemeRgbColor('lightgray125').join(',') }, 0.3)`,
            light: `rgba(${ getCurrentThemeRgbColor('lightgray125').join(',') }, 0.5)`,
        },
    } satisfies Record<string, Record<'default' | 'light', string>>;

    const taxiwayDefaultStyle = new Style({
        stroke: new Stroke({
            color: `rgba(${ themeStyles.taxiway[theme] }, 0.3)`,
            width: 2,
        }),
    });

    const heliDefaultStyle = new Style({
        fill: new Fill({
            color: `rgba(${ getCurrentThemeRgbColor('success500').join(',') }, 0.1)`,
        }),
        stroke: new Stroke({
            color: `rgba(${ getCurrentThemeRgbColor('success500').join(',') }, 0.1)`,
        }),
        text: new Text({
            text: 'Heli',
            font: '14px Montserrat',
            fill: new Fill({
                color: `rgba(${ getCurrentThemeRgbColor('success500').join(',') }, 1)`,
            }),
            rotateWithView: true,
        }),
    });

    return {
        parkingstandarea: new Style({
            fill: new Fill({
                color: `rgba(${ getCurrentThemeRgbColor('darkgray800').join(',') }, 1)`,
            }),
            stroke: new Stroke({
                color: `rgba(${ getCurrentThemeRgbColor('lightgray200').join(',') }, 0.1)`,
            }),
        }),
        apronelement: new Style({
            fill: new Fill({
                color: `rgba(${ getCurrentThemeRgbColor('darkgray850').join(',') }, 1)`,
            }),
            zIndex: -1,
        }),
        arrestinggearlocation: new Style({
            stroke: new Stroke({
                color: `rgba(${ getCurrentThemeRgbColor('info500').join(',') }, 1)`,
            }),
        }),
        constructionarea: new Style({
            fill: new Fill({
                color: `rgba(${ getCurrentThemeRgbColor('error500').join(',') }, 0.1)`,
            }),
        }),
        deicingarea: new Style({
            fill: new Fill({
                color: `rgba(${ getCurrentThemeRgbColor('primary700').join(',') }, 1)`,
            }),
        }),
        frequencyarea: new Style({
            fill: new Fill({
                color: `rgba(${ getCurrentThemeRgbColor('darkgray875').join(',') }, 1)`,
            }),
            zIndex: 0,
        }),
        serviceroad: new Style({
            fill: new Fill({
                color: `rgba(${ getCurrentThemeRgbColor('darkgray1000').join(',') }, 0.2)`,
            }),
        }),
        standguidanceline: new Style({
            stroke: new Stroke({
                color: `rgba(${ themeStyles.taxiway[theme] }, 0.4)`,
            }),
        }),
        taxiwayelement: new Style({
            fill: new Fill({
                color: `rgba(${ getCurrentThemeRgbColor('darkgray900').join(',') }, 1)`,
            }),
        }),
        // TODO: colored/dashed lines (ENGM example)
        taxiwayguidanceline: feature => {
            if (feature.getProperties().idlin) {
                return new Style({
                    stroke: new Stroke({
                        color: `rgba(${ themeStyles.taxiway[theme] }, 0.3)`,
                        width: 2,
                    }),
                    zIndex: 2,
                    text: new Text({
                        text: feature.getProperties().idlin,
                        font: 'bold 14px Montserrat',
                        placement: 'line',
                        fill: new Fill({
                            color: `rgba(${ themeStyles.taxiwayText[theme] }, 0.6)`,
                        }),
                        textBaseline: 'middle',
                    }),
                });
            }

            return taxiwayDefaultStyle;
        },
        taxiwayholdingposition: feature => new Style({
            stroke: new Stroke({
                color: `rgba(${ getCurrentThemeRgbColor('warning700').join(',') }, 1)`,
            }),
            text: new Text({
                text: feature.getProperties().idlin,
                font: 'bold 14px Montserrat',
                placement: 'line',
                fill: new Fill({
                    color: `rgba(${ getCurrentThemeRgbColor('warning700').join(',') }, 1)`,
                }),
                textBaseline: 'bottom',
                textAlign: 'left',
            }),
        }),
        verticallinestructure: new Style({
            stroke: new Stroke({
                color: `rgba(${ getCurrentThemeRgbColor('darkgray950').join(',') }, 1)`,
            }),
        }),


        // Runways
        blastpad: new Style({
            fill: new Fill({
                color: `rgba(${ themeStyles.runway1000[theme] }, 0.5)`,
            }),
        }),
        runwaydisplacedarea: new Style({
            fill: new Fill({
                color: `rgba(${ themeStyles.runway1000[theme] }, 1)`,
            }),
        }),
        runwayelement: new Style({
            fill: new Fill({
                color: themeStyles.runway950[theme],
            }),
        }),
        runwayexitline: new Style({
            stroke: new Stroke({
                color: `rgba(${ themeStyles.taxiway[theme] }, 0.5)`,
            }),
            zIndex: 2,
        }),
        runwaythreshold: feature => new Style({
            text: new Text({
                text: feature.getProperties().idthr,
                font: 'bold 12px Montserrat',
                fill: new Fill({
                    color: getSelectedColorFromSettings('runways') || `rgba(${ getCurrentThemeRgbColor('error300').join(',') }, 0.7)`,
                }),
                rotation: toRadians(feature.getProperties().brngtrue),
                rotateWithView: true,
                backgroundFill: new Fill({
                    color: `rgba(${ getCurrentThemeRgbColor('darkgray950').join(',') }, 1)`,
                }),
                backgroundStroke: new Stroke({
                    color: `rgba(${ getCurrentThemeRgbColor('lightgray125').join(',') }, 0.15)`,
                }),
                padding: [2, 0, 2, 2],
            }),
            zIndex: 5,
        }),
        runwayintersection: new Style({
            fill: new Fill({
                color: themeStyles.runway950[theme],
            }),
        }),
        runwaymarking: new Style({
            fill: new Fill({
                color: themeStyles.runwayMarking[theme],
            }),
        }),
        runwayshoulder: new Style({
            fill: new Fill({
                color: `rgba(${ getCurrentThemeRgbColor('darkgray950').join(',') }, 1)`,
            }),
        }),
        taxiwayshoulder: new Style({
            fill: new Fill({
                color: `rgba(${ getCurrentThemeRgbColor('darkgray950').join(',') }, 1)`,
            }),
        }),

        finalapproachandtakeoffarea: feature => {
            if (!feature.getProperties().idrwy) return heliDefaultStyle;

            return new Style({
                fill: new Fill({
                    color: `rgba(${ getCurrentThemeRgbColor('success500').join(',') }, 0.1)`,
                }),
                stroke: new Stroke({
                    color: `rgba(${ getCurrentThemeRgbColor('success500').join(',') }, 0.1)`,
                }),
                text: new Text({
                    text: feature.getProperties().idrwy,
                    font: '14px Montserrat',
                    fill: new Fill({
                        color: `rgba(${ getCurrentThemeRgbColor('success500').join(',') }, 1)`,
                    }),
                    rotateWithView: true,
                }),
            });
        },

        verticalpolygonalstructure: feature => {
            if (feature.getProperties().plysttyp > 4) return;

            if (feature.getProperties().plysttyp === 1) {
                return new Style({
                    fill: new Fill({
                        color: `rgba(${ themeStyles.terminal[theme] }, 1)`,
                    }),
                    text: new Text({
                        text: feature.getProperties().ident,
                        font: '10px Montserrat',
                        textAlign: 'center',
                        justify: 'center',
                        textBaseline: 'middle',
                        fill: new Fill({
                            color: `rgba(${ radarColors.lightgray125Rgb.join(',') }, 1)`,
                        }),
                        rotateWithView: true,
                    }),
                });
            }

            return new Style({
                fill: new Fill({
                    color: `rgba(${ getCurrentThemeRgbColor('darkgray800').join(',') }, 0.4)`,
                }),
                text: new Text({
                    text: feature.getProperties().ident,
                    font: '10px Montserrat',
                    textAlign: 'center',
                    justify: 'center',
                    textBaseline: 'middle',
                    fill: new Fill({
                        color: `rgba(${ getCurrentThemeRgbColor('lightgray125').join(',') }, 0.5)`,
                    }),
                    rotateWithView: true,
                }),
            });
        },
    };
};
