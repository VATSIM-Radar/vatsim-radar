import { Fill, Stroke, Style, Text } from 'ol/style';
import type { PartialRecord } from '~/types';
import type { FeatureLike } from 'ol/Feature';
import { toRadians } from 'ol/math';
import { useStore } from '~/store';
import type { Options as StyleOptions } from 'ol/style/Style';
import type { AmdbLayerName } from '@navigraph/amdb';

const taxiwayNameRegex = new RegExp('^((Main TWY)|Main|Route) ', 'i');

export const airportLayoutStyles = (): PartialRecord<AmdbLayerName, Style | Style[] | ((feature: FeatureLike) => Style | Style[] | undefined)> => {
    const theme = useStore().getCurrentTheme;

    const themeStyles = {
        deicing: {
            default: getCurrentThemeRgbColor('primary400').join(','),
            light: getCurrentThemeRgbColor('primary300').join(','),
        },
        taxiway: {
            default: hexToRgb('#494952'),
            light: hexToRgb('#C3C3C9'),
        },
        taxiwayText: {
            default: getCurrentThemeRgbColor('lightgray200').join(','),
            light: getCurrentThemeRgbColor('lightgray200').join(','),
        },
        taxiwayBlue: {
            default: getCurrentThemeRgbColor('primary500').join(','),
            light: getCurrentThemeRgbColor('primary300').join(','),
        },
        taxiwayBlueText: {
            default: getCurrentThemeRgbColor('primary300').join(','),
            light: getCurrentThemeRgbColor('primary500').join(','),
        },
        taxiwayOrange: {
            default: getCurrentThemeRgbColor('error500').join(','),
            light: getCurrentThemeRgbColor('error300').join(','),
        },
        taxiwayOrangeText: {
            default: getCurrentThemeRgbColor('error300').join(','),
            light: getCurrentThemeRgbColor('error500').join(','),
        },
        taxiwayWhite: {
            default: getCurrentThemeRgbColor('lightgray200').join(','),
            light: getCurrentThemeRgbColor('lightgray200').join(','),
        },
        taxiwayWhiteText: {
            default: getCurrentThemeRgbColor('lightgray200').join(','),
            light: getCurrentThemeRgbColor('lightgray200').join(','),
        },
        taxiwayElement: {
            default: getCurrentThemeRgbColor('darkgray900').join(','),
            light: getCurrentThemeRgbColor('darkgray850').join(','),
        },
        terminal: {
            default: getCurrentThemeRgbColor('darkgray875').join(','),
            light: getCurrentThemeRgbColor('darkgray800').join(','),
        },
        apron850: {
            default: getCurrentThemeRgbColor('darkgray850').join(','),
            light: getCurrentThemeRgbColor('darkgray950').join(','),
        },
        apron875: {
            default: getCurrentThemeRgbColor('darkgray875').join(','),
            light: getCurrentThemeRgbColor('darkgray950').join(','),
        },
        apron950: {
            default: getCurrentThemeRgbColor('darkgray950').join(','),
            light: getCurrentThemeRgbColor('darkgray875').join(','),
        },
        apron1000: {
            default: getCurrentThemeRgbColor('darkgray1000').join(','),
            light: getCurrentThemeRgbColor('darkgray800').join(','),
        },
        runway1000: {
            default: getCurrentThemeRgbColor('darkgray1000').join(','),
            light: getCurrentThemeRgbColor('darkgray800').join(','),
        },
        runway950: {
            default: `rgba(${ getCurrentThemeRgbColor('darkgray950').join(',') }, 1)`,
            light: `rgba(${ getCurrentThemeRgbColor('darkgray875').join(',') }, 1)`,
        },
        runwayMarking: {
            default: `rgba(${ getCurrentThemeRgbColor('lightgray125').join(',') }, 0.3)`,
            light: `rgba(${ getCurrentThemeRgbColor('lightgray125').join(',') }, 0.5)`,
        },
        parking: {
            default: getCurrentThemeRgbColor('darkgray800').join(','),
            light: getCurrentThemeRgbColor('darkgray875').join(','),
        },
    } satisfies Record<string, Record<'default' | 'light', string>>;

    const heliDefaultStyle = new Style({
        fill: new Fill({
            color: `rgba(${ getCurrentThemeRgbColor('success500').join(',') }, 0.1)`,
        }),
        stroke: new Stroke({
            color: `rgba(${ getCurrentThemeRgbColor('success500').join(',') }, 0.1)`,
        }),
        text: new Text({
            text: 'H',
            font: 'bold 14px Montserrat',
            fill: new Fill({
                color: `rgba(${ getCurrentThemeRgbColor('success500').join(',') }, 1)`,
            }),
        }),
        zIndex: 2,
    });

    return {
        parkingstandarea: new Style({
            fill: new Fill({
                color: `rgba(${ themeStyles.parking[theme] }, 1)`,
            }),
            stroke: new Stroke({
                color: `rgba(${ getCurrentThemeRgbColor('lightgray200').join(',') }, 0.1)`,
            }),
            zIndex: 2,
        }),
        apronelement: new Style({
            fill: new Fill({
                color: `rgba(${ themeStyles.apron850[theme] }, 1)`,
            }),
            zIndex: -1,
        }),
        frequencyarea: new Style({
            fill: new Fill({
                color: `rgba(${ themeStyles.apron875[theme] }, 1)`,
            }),
            zIndex: 0,
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
        deicingarea: feature => {
            const options: StyleOptions = {
                fill: new Fill({
                    color: `rgba(${ themeStyles.deicing[theme] }, 0.3)`,
                }),
                zIndex: 3,
            };

            if (feature.getProperties().ident) {
                options.text = new Text({
                    text: feature.getProperties().ident,
                    placement: 'line',
                    textBaseline: 'bottom',
                    font: 'bold 12px Montserrat',
                    fill: new Fill({
                        color: `rgba(${ themeStyles.deicing[theme] }, 1)`,
                    }),
                    maxAngle: 0,
                });
            }

            return new Style(options);
        },
        serviceroad: new Style({
            fill: new Fill({
                color: `rgba(${ themeStyles.apron1000 }, 0.2)`,
            }),
        }),
        standguidanceline: new Style({
            stroke: new Stroke({
                color: `rgba(${ themeStyles.taxiway[theme] }, 0.4)`,
            }),
            zIndex: 2,
        }),
        taxiwayelement: new Style({
            fill: new Fill({
                color: `rgba(${ themeStyles.taxiwayElement[theme] }, 1)`,
            }),
        }),
        taxiwayintersectionmarking: feature => {
            const style = new Style({
                stroke: new Stroke({
                    color: `rgba(${ themeStyles.taxiwayWhite[theme] }, 0.4)`,
                    lineDash: [4, 6],
                }),
                zIndex: 2,
            });

            if (feature.getProperties().idlin) {
                style.setText(new Text({
                    text: feature.getProperties().idlin.replace(taxiwayNameRegex, ''),
                    font: 'bold 10px Montserrat',
                    placement: 'line',
                    fill: new Fill({
                        color: `rgba(${ themeStyles.taxiwayWhiteText[theme] }, 0.6)`,
                    }),
                    textBaseline: 'bottom',
                    textAlign: 'left',
                }));
            }

            return style;
        },
        taxiwayguidanceline: feature => {
            const color = feature.getProperties().color;
            const style = feature.getProperties().style;
            let strokeColor = themeStyles.taxiway[theme];
            let textColor = themeStyles.taxiwayText[theme];

            if (color === 1) {
                strokeColor = themeStyles.taxiwayOrange[theme];
                textColor = themeStyles.taxiwayOrangeText[theme];
            }
            else if (color === 2) {
                strokeColor = themeStyles.taxiwayBlue[theme];
                textColor = themeStyles.taxiwayBlueText[theme];
            }
            else if (style === 1) {
                strokeColor = themeStyles.taxiwayWhite[theme];
                textColor = themeStyles.taxiwayWhiteText[theme];
            }

            const styles: Style[] = [new Style({
                stroke: new Stroke({
                    color: `rgba(${ strokeColor }, ${ strokeColor === themeStyles.taxiway[theme] ? 1 : 0.3 })`,
                    width: style === 1 ? 1 : 2,
                    lineDash: style === 1 ? [4, 4] : undefined,
                }),
                zIndex: 2,
            })];

            if (feature.getProperties().idlin) {
                styles.push(new Style({
                    text: new Text({
                        text: feature.getProperties().idlin.replace(taxiwayNameRegex, ''),
                        font: 'bold 12px Montserrat',
                        // placement: 'line',
                        fill: new Fill({
                            color: `rgba(${ textColor }, 0.6)`,
                        }),
                        textBaseline: 'middle',
                        padding: [25, 25, 25, 25],
                    }),
                    zIndex: 4,
                }));
            }

            return styles;
        },
        taxiwayholdingposition: feature => {
            const options: StyleOptions = {
                stroke: new Stroke({
                    color: `rgba(${ getCurrentThemeRgbColor('warning700').join(',') }, 0.5)`,
                }),
                zIndex: 5,
            };

            if (feature.getProperties().idlin) {
                options.text = new Text({
                    text: feature.getProperties().idlin.replace(taxiwayNameRegex, ''),
                    font: 'bold 12px Montserrat',
                    placement: 'line',
                    fill: new Fill({
                        color: `rgba(${ getCurrentThemeRgbColor('warning700').join(',') }, 0.6)`,
                    }),
                    textBaseline: 'bottom',
                    textAlign: 'left',
                });
            }

            if (feature.getProperties().catstop === 2) {
                options.stroke?.setColor(`rgba(${ getCurrentThemeRgbColor('error500').join(',') }, 0.5)`);
                options.text?.getFill()!.setColor(`rgba(${ getCurrentThemeRgbColor('error500').join(',') }, 0.6)`);
            }

            return new Style(options);
        },
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
            zIndex: 4,
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
            zIndex: 6,
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
                color: `rgba(${ themeStyles.apron950[theme] }, 1)`,
            }),
        }),
        taxiwayshoulder: new Style({
            fill: new Fill({
                color: `rgba(${ themeStyles.apron950[theme] }, 1)`,
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
                    stroke: new Stroke({
                        color: `rgba(${ getCurrentThemeRgbColor('lightgray200').join(',') }, 0.1)`,
                        width: 2,
                    }),
                    text: new Text({
                        text: feature.getProperties().ident,
                        font: 'bold 10px Montserrat',
                        textAlign: 'center',
                        justify: 'center',
                        textBaseline: 'middle',
                        fill: new Fill({
                            color: `rgba(${ getCurrentThemeRgbColor('lightgray125').join(',') }, 0.5)`,
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
