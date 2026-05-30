import { Fill, Stroke, Style, Text } from 'ol/style.js';
import type { PartialRecord } from '~/types';
import { toRadians } from 'ol/math.js';
import { useStore } from '~/store';
import type { Options as StyleOptions } from 'ol/style/Style.js';
import type { AmdbLayerName } from '@navigraph/amdb';
import type { FeatureAirportNavigraph } from '~/utils/map/entities';

const taxiwayNameRegex = new RegExp('^((Main TWY)|Main|Route) ', 'i');

const dataStore = useDataStore();

function getIntersectionStatus(airport: string, label: string) {
    const bars = dataStore.vatsim.data.bars.value[airport];
    if (!bars) return null;

    return bars.find(x => x.bars.find(x => x[0].split('--')[0] === label))?.bars.find(x => x[0].split('--')[0] === label)?.[1] ?? null;
}

export const airportLayoutStyles = (): PartialRecord<AmdbLayerName, Style | Style[] | ((feature: FeatureAirportNavigraph) => Style | Style[] | undefined)> => {
    const theme = useStore().getCurrentTheme;

    const themeStyles = {
        deicing: {
            default: getCurrentThemeRgbColor('blue400').join(','),
            light: getCurrentThemeRgbColor('blue300').join(','),
        },
        taxiway: {
            default: hexToRgb('#494952'),
            light: hexToRgb('#C3C3C9'),
        },
        taxiwayText: {
            default: getCurrentThemeRgbColor('lightGray600').join(','),
            light: getCurrentThemeRgbColor('lightGray600').join(','),
        },
        taxiwayBlue: {
            default: getCurrentThemeRgbColor('blue500').join(','),
            light: getCurrentThemeRgbColor('blue300').join(','),
        },
        taxiwayBlueText: {
            default: getCurrentThemeRgbColor('blue300').join(','),
            light: getCurrentThemeRgbColor('blue500').join(','),
        },
        taxiwayOrange: {
            default: getCurrentThemeRgbColor('citrus500').join(','),
            light: getCurrentThemeRgbColor('citrus300').join(','),
        },
        taxiwayOrangeText: {
            default: getCurrentThemeRgbColor('citrus300').join(','),
            light: getCurrentThemeRgbColor('citrus500').join(','),
        },
        taxiwayWhite: {
            default: getCurrentThemeRgbColor('lightGray600').join(','),
            light: getCurrentThemeRgbColor('lightGray600').join(','),
        },
        taxiwayWhiteText: {
            default: getCurrentThemeRgbColor('lightGray600').join(','),
            light: getCurrentThemeRgbColor('lightGray600').join(','),
        },
        taxiwayElement: {
            default: getCurrentThemeRgbColor('darkGray700').join(','),
            light: getCurrentThemeRgbColor('darkGray500').join(','),
        },
        terminal: {
            default: getCurrentThemeRgbColor('darkGray600').join(','),
            light: getCurrentThemeRgbColor('darkGray400').join(','),
        },
        apron850: {
            default: getCurrentThemeRgbColor('darkGray500').join(','),
            light: getCurrentThemeRgbColor('darkGray800').join(','),
        },
        apron875: {
            default: getCurrentThemeRgbColor('darkGray600').join(','),
            light: getCurrentThemeRgbColor('darkGray800').join(','),
        },
        apron950: {
            default: getCurrentThemeRgbColor('darkGray800').join(','),
            light: getCurrentThemeRgbColor('darkGray600').join(','),
        },
        apron1000: {
            default: getCurrentThemeRgbColor('darkGray900').join(','),
            light: getCurrentThemeRgbColor('darkGray400').join(','),
        },
        runway1000: {
            default: getCurrentThemeRgbColor('darkGray900').join(','),
            light: getCurrentThemeRgbColor('darkGray400').join(','),
        },
        runway950: {
            default: `rgba(${ getCurrentThemeRgbColor('darkGray800').join(',') }, 1)`,
            light: `rgba(${ getCurrentThemeRgbColor('darkGray600').join(',') }, 1)`,
        },
        runwayMarking: {
            default: `rgba(${ getCurrentThemeRgbColor('lightGray400').join(',') }, 0.3)`,
            light: `rgba(${ getCurrentThemeRgbColor('lightGray400').join(',') }, 0.5)`,
        },
        parking: {
            default: getCurrentThemeRgbColor('darkGray400').join(','),
            light: getCurrentThemeRgbColor('darkGray600').join(','),
        },
    } satisfies Record<string, Record<'default' | 'light', string>>;

    const heliDefaultStyle = new Style({
        fill: new Fill({
            color: `rgba(${ getCurrentThemeRgbColor('green500').join(',') }, 0.1)`,
        }),
        stroke: new Stroke({
            color: `rgba(${ getCurrentThemeRgbColor('green500').join(',') }, 0.1)`,
        }),
        text: new Text({
            text: 'H',
            font: 'bold 14px LibreFranklin',
            fill: new Fill({
                color: `rgba(${ getCurrentThemeRgbColor('green500').join(',') }, 1)`,
            }),
        }),
        zIndex: 2,
    });

    const apronElementDefaultStyle = new Style({
        fill: new Fill({
            color: `rgba(${ themeStyles.apron850[theme] }, 1)`,
        }),
        zIndex: -1,
    });

    return {
        parkingstandarea: new Style({
            fill: new Fill({
                color: `rgba(${ themeStyles.parking[theme] }, 1)`,
            }),
            stroke: new Stroke({
                color: `rgba(${ getCurrentThemeRgbColor('lightGray600').join(',') }, 0.1)`,
            }),
            zIndex: 2,
        }),
        apronelement: feature => {
            if (!feature.getProperties().idapron) return apronElementDefaultStyle;

            return new Style({
                fill: apronElementDefaultStyle.getFill()!,
                zIndex: 2,
                text: new Text({
                    text: feature.getProperties().idapron,
                    font: '10px LibreFranklin',
                    placement: 'point',
                    fill: new Fill({
                        color: `rgba(${ themeStyles.taxiwayWhiteText[theme] }, 0.6)`,
                    }),
                    padding: [4, 4, 4, 4],
                }),
            });
        },
        frequencyarea: new Style({
            fill: new Fill({
                color: `rgba(${ themeStyles.apron875[theme] }, 1)`,
            }),
            zIndex: 0,
        }),
        arrestinggearlocation: new Style({
            stroke: new Stroke({
                color: `rgba(${ themeStyles.taxiway[theme] }, 1)`,
            }),
        }),
        constructionarea: new Style({
            fill: new Fill({
                color: `rgba(${ getCurrentThemeRgbColor('citrus500').join(',') }, 0.1)`,
            }),
            zIndex: 4,
        }),
        deicingarea: feature => {
            const options: StyleOptions = {
                fill: new Fill({
                    color: `rgba(${ themeStyles.deicing[theme] }, 0.1)`,
                }),
                zIndex: 3,
            };

            if (feature.getProperties().ident) {
                options.text = new Text({
                    text: feature.getProperties().ident,
                    placement: 'line',
                    textBaseline: 'bottom',
                    font: 'bold 12px LibreFranklin',
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
            zIndex: 2,
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
            zIndex: 3,
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
                    text: feature.getProperties().idlin!.replace(taxiwayNameRegex, ''),
                    font: 'bold 10px LibreFranklin',
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
                zIndex: 3,
            })];

            if (feature.getProperties().idlin) {
                styles.push(new Style({
                    text: new Text({
                        text: feature.getProperties().idlin!.replace(taxiwayNameRegex, ''),
                        font: 'bold 12px LibreFranklin',
                        // placement: 'line',
                        fill: new Fill({
                            color: `rgba(${ textColor }, 0.6)`,
                        }),
                        textBaseline: 'middle',
                        padding: [14, 14, 14, 14],
                    }),
                    zIndex: 4,
                }));
            }

            return styles;
        },
        taxiwayholdingposition: feature => {
            const properties = feature.getProperties();

            const options: StyleOptions = {
                stroke: new Stroke({
                    color: `rgba(${ getCurrentThemeRgbColor('orange700').join(',') }, 0.5)`,
                }),
                zIndex: 5,
            };

            if (properties.idlin) {
                options.text = new Text({
                    text: properties.idlin.replace(taxiwayNameRegex, ''),
                    font: 'bold 12px LibreFranklin',
                    placement: 'line',
                    fill: new Fill({
                        color: `rgba(${ getCurrentThemeRgbColor('orange700').join(',') }, 0.6)`,
                    }),
                    textBaseline: 'bottom',
                    textAlign: 'left',
                });
            }

            if (properties.catstop === 2) {
                options.stroke?.setColor(`rgba(${ getCurrentThemeRgbColor('citrus500').join(',') }, 0.5)`);
                options.text?.getFill()!.setColor(`rgba(${ getCurrentThemeRgbColor('citrus500').join(',') }, 0.6)`);
            }

            const barsStatus = getIntersectionStatus(properties.airport, properties.idlin!);

            if (properties.idlin && typeof barsStatus === 'boolean') {
                options.stroke?.setWidth(2);
                options.stroke?.setLineDash([1, 4]);
                options.stroke?.setColor(`rgba(${ getCurrentThemeRgbColor(!barsStatus ? 'green500' : 'citrus700').join(',') }, 0.8)`);
                options.text?.getFill()!.setColor(`rgba(${ getCurrentThemeRgbColor(!barsStatus ? 'green500' : 'citrus700').join(',') }, 0.8)`);
            }

            return new Style(options);
        },
        verticallinestructure: new Style({
            stroke: new Stroke({
                color: `rgba(${ getCurrentThemeRgbColor('darkGray800').join(',') }, 1)`,
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
                font: 'bold 12px LibreFranklin',
                fill: new Fill({
                    color: getSelectedColorFromSettings('runways') || `rgba(${ getCurrentThemeRgbColor('citrus600').join(',') }, 0.7)`,
                }),
                rotation: toRadians(feature.getProperties().brngtrue!),
                rotateWithView: true,
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
            zIndex: 1,
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
                    color: `rgba(${ getCurrentThemeRgbColor('green500').join(',') }, 0.1)`,
                }),
                stroke: new Stroke({
                    color: `rgba(${ getCurrentThemeRgbColor('green500').join(',') }, 0.1)`,
                }),
                text: new Text({
                    text: feature.getProperties().idrwy,
                    font: '14px LibreFranklin',
                    fill: new Fill({
                        color: `rgba(${ getCurrentThemeRgbColor('green500').join(',') }, 1)`,
                    }),
                    rotateWithView: true,
                }),
                zIndex: 2,
            });
        },

        verticalpolygonalstructure: feature => {
            const plysttyp = feature.getProperties().plysttyp;

            if (typeof plysttyp === 'number' && plysttyp > 4) return;

            if (typeof plysttyp === 'number' && plysttyp === 1) {
                return new Style({
                    fill: new Fill({
                        color: `rgba(${ themeStyles.terminal[theme] }, 1)`,
                    }),
                    stroke: new Stroke({
                        color: `rgba(${ getCurrentThemeRgbColor('lightGray600').join(',') }, 0.1)`,
                        width: 2,
                    }),
                    text: new Text({
                        text: feature.getProperties().ident,
                        font: 'bold 10px LibreFranklin',
                        textAlign: 'center',
                        justify: 'center',
                        textBaseline: 'middle',
                        fill: new Fill({
                            color: `rgba(${ getCurrentThemeRgbColor('lightGray400').join(',') }, 0.5)`,
                        }),
                        rotateWithView: true,
                    }),
                });
            }

            return new Style({
                fill: new Fill({
                    color: `rgba(${ getCurrentThemeRgbColor('darkGray400').join(',') }, 0.4)`,
                }),
                text: new Text({
                    text: feature.getProperties().ident,
                    font: '10px LibreFranklin',
                    textAlign: 'center',
                    justify: 'center',
                    textBaseline: 'middle',
                    fill: new Fill({
                        color: `rgba(${ getCurrentThemeRgbColor('lightGray400').join(',') }, 0.5)`,
                    }),
                    rotateWithView: true,
                }),
            });
        },
    };
};
