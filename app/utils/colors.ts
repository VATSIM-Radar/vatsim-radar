import type { PartialRecord } from '~/types';

export const legacyColorsList = {
    // darkGray500
    mapSectorBorder: '#2d2d30',
    // red500
    divertedBackground: '#de5656',
    // lightGray900
    divertedTextColor: '#97979d',

    // lightGray100
    lightgray0: '#F7F7FA',
    // lightGray200
    lightgray50: '#F2F2F7',
    // lightGray300
    lightgray100: '#EDEDF2',
    // lightGray400
    lightgray125: '#E6E6EB',
    // lightGray500
    lightgray150: '#DEDEE7',
    // lightGray600
    lightgray200: '#D5D5E4',

    // darkGray900
    darkgray1000: '#131316',
    // darkGray800
    darkgray950: '#18181B',
    // darkGray700
    darkgray900: '#202024',
    // darkGray600
    darkgray875: '#26262C',
    // darkGray500
    darkgray850: '#2B2B33',
    // darkGray400
    darkgray800: '#30303C',

    // blue300
    primary300: '#5ca2fd',
    // blue400
    primary400: '#5987FF',
    // blue500
    primary500: '#3B6CEC',
    // blue600
    primary600: '#2052D4',
    // blue700
    primary700: '#174ACF',

    // green700
    success300: '#05AD5C',
    // green700
    success400: '#029C59',
    // green700
    success500: '#008856',
    // green800
    success600: '#00754E',
    // green800
    success700: '#006649',

    // orange400
    warning300: '#ECD15B',
    // orange400
    warning400: '#EAC453',
    // orange500
    warning500: '#ECB549',
    // orange500
    warning600: '#E5A23E',
    // orange600
    warning700: '#E49335',

    // citrus600
    error300: '#DA5525',
    // citrus600
    error400: '#D54A20',
    // citrus700
    error500: '#CB421C',
    // citrus700
    error600: '#BF3318',
    // citrus700
    error700: '#B82A14',

    // purple400
    info300: '#A667F9',
    // purple500
    info400: '#984EF9',
    // purple500
    info500: '#8837FB',
    // purple600
    info600: '#7C21FD',
    // purple700
    info700: '#6C0AFF',
};

export const colorsList = {
    mapSectorBorder: '#2d2d30',

    //#region neutrals
    white: '#FAFAFA',
    black: '#151515',
    blackAlpha2: '#15151505',
    blackAlpha4: '#1515150a',
    blackAlpha8: '#15151514',
    blackAlpha12: '#1515151f',
    blackAlpha24: '#1515153d',
    blackAlpha36: '#1515155c',
    blackAlpha64: '#151515a3',
    whiteAlpha2: '#FAFAFA05',
    whiteAlpha4: '#FAFAFA0a',
    whiteAlpha8: '#FAFAFA14',
    whiteAlpha12: '#FAFAFA1f',
    whiteAlpha24: '#FAFAFA3d',
    whiteAlpha36: '#FAFAFA5c',
    whiteAlpha64: '#FAFAFAa3',
    //#endregion

    //#region lightGray
    lightGray100: '#FDFDFD',
    lightGray200: '#F6F6F6',
    lightGray300: '#EEEEEE',
    lightGray400: '#E7E7E7',
    lightGray500: '#E0E0E0',
    lightGray600: '#D9D9D9',
    lightGray700: '#D2D2D2',
    lightGray800: '#CBCBCB',
    lightGray900: '#C4C4C4',
    //#endregion

    //#region darkGray
    darkGray100: '#4A4A4A',
    darkGray200: '#3A3A3A',
    darkGray300: '#353535',
    darkGray400: '#313131',
    darkGray500: '#2C2C2C',
    darkGray600: '#272727',
    darkGray700: '#232323',
    darkGray800: '#1E1E1E',
    darkGray900: '#1A1A1A',
    //#endregion

    //#region red
    red50: '#FFE9E4',
    red100: '#FFC1B3',
    red200: '#FF967F',
    red300: '#FF6040',
    red400: '#E93201',
    red500: '#D32C00',
    red500Alpha8: '#FF4D4F14',
    red500Alpha12: '#FF4D4F1f',
    red600: '#BD2600',
    red700: '#931B00',
    red800: '#6A1100',
    red900: '#440800',

    //#endregion

    //#region citrus
    citrus50: '#FFEADD',
    citrus100: '#FFD6BC',
    citrus200: '#FFC199',
    citrus300: '#FFAB72',
    citrus400: '#FF9344',
    citrus500: '#FF861D',
    citrus500Alpha8: '#FF861D14',
    citrus500Alpha12: '#FF861D1f',
    citrus600: '#EE7901',
    citrus700: '#C66300',
    citrus800: '#A14F00',
    citrus900: '#7C3C01',

    //#endregion

    //#region orange
    orange50: '#FFEDC7',
    orange100: '#FFE0AB',
    orange200: '#FFD390',
    orange300: '#FFC677',
    orange400: '#FFB85D',
    orange500: '#FFA940',
    orange500Alpha8: '#FFA94014',
    orange500Alpha12: '#FF98001f',
    orange600: '#D88500',
    orange700: '#AE6500',
    orange800: '#854600',
    orange900: '#5C2B00',

    //#endregion

    //#region yellow
    yellow50: '#FFEDC2',
    yellow100: '#FFE6A8',
    yellow200: '#FFDE8E',
    yellow300: '#FFD66F',
    yellow400: '#FFD549',
    yellow500: '#FFCA2B',
    yellow600: '#F0BC01',
    yellow600Alpha8: '#FFC53D14',
    yellow600Alpha12: '#EEB11F1f',
    yellow700: '#CEA000',
    yellow800: '#AD8600',
    yellow900: '#8D6D00',

    //#endregion

    //#region green
    green50: '#D2FDC3',
    green100: '#80FC49',
    green200: '#70E53A',
    green300: '#64CD33',
    green400: '#58B62D',
    green500: '#52AB29',
    green600: '#4A9C25',
    green700: '#3B7E1C',
    green800: '#2B6113',
    green900: '#1D460B',
    green500Alpha8: '#329D3F14',
    green500Alpha12: '#73D13D1f',

    //#endregion

    //#region teal
    teal50: '#C2FDED',
    teal100: '#4FFCD9',
    teal200: '#43E8C7',
    teal300: '#3ED4B6',
    teal400: '#36C0A4',
    teal500: '#33B69C',
    teal500Alpha8: '#00968814',
    teal500Alpha12: '#0096881f',
    teal600: '#2EA78F',
    teal700: '#248975',
    teal800: '#1B6C5B',
    teal900: '#125044',

    //#endregion

    //#region blue
    blue50: '#F0F8FF',
    blue100: '#BFE1FF',
    blue200: '#92C7FF',
    blue300: '#68ABFF',
    blue400: '#458CFF',
    blue500: '#3B6CEC',
    blue500Alpha8: '#3B6CEC14',
    blue500Alpha12: '#3B6CEC1f',
    blue500Alpha32: '#3B6CEC52',
    blue500Alpha64: '#3B6CECa3',
    blue600: '#2C5AD9',
    blue700: '#2D45C6',
    blue800: '#2D2FB2',
    blue900: '#2B139F',

    //#endregion

    //#region purple

    purple50: '#F7F3FF',
    purple100: '#E2D3FF',
    purple200: '#CFB2FF',
    purple300: '#BC90FF',
    purple400: '#A96DF9',
    purple500: '#9254DE',
    purple500Alpha8: '#9254DE14',
    purple500Alpha12: '#673AB71f',
    purple600: '#8141CA',
    purple700: '#6830BB',
    purple800: '#511EAC',
    purple900: '#3B029C',

    //#endregion

    //#region pink
    pink50: '#FFF1F6',
    pink100: '#FFD6E5',
    pink200: '#FFBAD5',
    pink300: '#FF9CC6',
    pink400: '#FF79B9',
    pink500: '#F759AB',
    pink500Alpha8: '#F759AB14',
    pink500Alpha12: '#F759AB1f',
    pink600: '#D83A90',
    pink700: '#B8157A',
    pink800: '#920062',
    pink900: '#6B0049',

    //#endregion
};

export type ColorsList = keyof typeof colorsList;
export type ColorsListRgb = Exclude<ColorsList, `${ string }Alpha${ string }`>;

export const themesList = {
    light: {
        mapSectorBorder: '#D3D3E5',

        black: '#FAFAFA',
        blackAlpha2: '#FAFAFA05',
        blackAlpha4: '#FAFAFA0a',
        blackAlpha8: '#FAFAFA14',
        blackAlpha12: '#FAFAFA1f',
        blackAlpha24: '#FAFAFA3d',
        blackAlpha36: '#FAFAFA5c',
        blackAlpha64: '#FAFAFAa3',

        white: '#151515',
        whiteAlpha2: '#15151505',
        whiteAlpha4: '#1515150a',
        whiteAlpha8: '#15151514',
        whiteAlpha12: '#1515151f',
        whiteAlpha24: '#1515153d',
        whiteAlpha36: '#1515155c',
        whiteAlpha64: '#151515a3',

        darkGray900: '#FDFDFD',
        darkGray800: '#F6F6F6',
        darkGray700: '#EEEEEE',
        darkGray600: '#E7E7E7',
        darkGray500: '#E0E0E0',
        darkGray400: '#D9D9D9',
        darkGray300: '#D2D2D2',
        darkGray200: '#CBCBCB',
        darkGray100: '#C4C4C4',

        lightGray900: '#4A4A4A',
        lightGray800: '#3A3A3A',
        lightGray700: '#353535',
        lightGray600: '#313131',
        lightGray500: '#2C2C2C',
        lightGray400: '#272727',
        lightGray300: '#232323',
        lightGray200: '#1E1E1E',
        lightGray100: '#1A1A1A',
    },
} satisfies Record<string, PartialRecord<ColorsList, string>>;

export type ThemesList = keyof typeof themesList | 'default';
