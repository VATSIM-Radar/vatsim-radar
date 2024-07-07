import type { PartialRecord } from '~/types';

export const colorsList = {
    mapSectorBorder: '#2d2d30',
    airportPopularRing: '#DA5225',

    lightgray0: '#F7F7FA',
    lightgray50: '#F2F2F7',
    lightgray100: '#EDEDF2',
    lightgray125: '#E6E6EB',
    lightgray150: '#DEDEE7',
    lightgray200: '#D5D5E4',

    darkgray1000: '#131316',
    darkgray950: '#18181B',
    darkgray900: '#202024',
    darkgray875: '#26262C',
    darkgray850: '#2B2B33',
    darkgray800: '#30303C',

    primary300: '#5ca2fd',
    primary400: '#5987FF',
    primary500: '#3B6CEC',
    primary600: '#2052D4',
    primary700: '#174ACF',

    success300: '#05AD5C',
    success400: '#029C59',
    success500: '#008856',
    success600: '#00754E',
    success700: '#006649',

    warning300: '#ECD15B',
    warning400: '#EAC453',
    warning500: '#ECB549',
    warning600: '#E5A23E',
    warning700: '#E49335',

    error300: '#DA5525',
    error400: '#D54A20',
    error500: '#CB421C',
    error600: '#BF3318',
    error700: '#B82A14',

    info300: '#A667F9',
    info400: '#984EF9',
    info500: '#8837FB',
    info600: '#7C21FD',
    info700: '#6C0AFF',
};
export type ColorsList = keyof typeof colorsList;
export const themesList = {
    light: {
        mapSectorBorder: '#D3D3E5',

        darkgray1000: '#F7F7FA',
        darkgray950: '#F2F2F7',
        darkgray900: '#EDEDF2',
        darkgray875: '#E6E6EB',
        darkgray850: '#DEDEE7',
        darkgray800: '#D5D5E4',

        lightgray0: '#131316',
        lightgray50: '#18181B',
        lightgray100: '#202024',
        lightgray125: '#26262C',
        lightgray150: '#2B2B33',
        lightgray200: '#30303C',
    },
    sa: {
        primary300: '#008856',
        primary400: '#008856',
        primary500: '#008856',
        primary600: '#008856',
        primary700: '#008856',

        warning500: '#F2BA49',

        error500: '#E39539',
    },
} satisfies Record<string, PartialRecord<ColorsList, string>>;
export type ThemesList = keyof typeof themesList | 'default';
