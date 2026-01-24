import type { PartialRecord } from '~/types';

export const colorsList = {
    //#region legacy
    mapSectorBorder: '#2d2d30',
    divertedBackground: '#de5656',
    divertedTextColor: '#97979d',

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
    //#endregion

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
    red50: '#FFE9E5',
    red100: '#FFCFC8',
    red200: '#FFB5AA',
    red300: '#FF988D',
    red400: '#FF776F',
    red500: '#FF4D4F',
    red500Alpha8: '#FF4D4F14',
    red500Alpha12: '#FF4D4F1f',
    red600: '#E12C36',
    red700: '#C10025',
    red800: '#99001F',
    red900: '#720017',

    //#endregion

    //#region citrus
    citrus50: '#FFEADE',
    citrus100: '#FFD6C1',
    citrus200: '#FFC1A4',
    citrus300: '#FFAC87',
    citrus400: '#FF9468',
    citrus500: '#FF7A45',
    citrus500Alpha8: '#FF7A4514',
    citrus500Alpha12: '#FF7A451f',
    citrus600: '#DE5C23',
    citrus700: '#BC3D00',
    citrus800: '#942800',
    citrus900: '#6D1500',

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
    yellow50: '#FFF1CC',
    yellow100: '#FFE9B2',
    yellow200: '#FFE198',
    yellow300: '#FFD87E',
    yellow400: '#FFCF61',
    yellow500: '#FFC53D',
    yellow600: '#FAAD14',
    yellow600Alpha8: '#FFC53D14',
    yellow600Alpha12: '#EEB11F1f',
    yellow700: '#A77700',
    yellow800: '#7B5400',
    yellow900: '#513300',

    //#endregion

    //#region green
    green50: '#F3FFF5',
    green100: '#BCFFC5',
    green200: '#6EFF82',
    green300: '#68ED6A',
    green400: '#63DC52',
    green500: '#5ECB36',
    green600: '#3FAA00',
    green700: '#008A09',
    green800: '#006822',
    green900: '#00481F',
    green500Alpha8: '#73D13D14',
    green500Alpha12: '#73D13D1f',

    //#endregion

    //#region teal
    teal50: '#E6F5F3',
    teal100: '#CCEAE7',
    teal200: '#99D5CF',
    teal300: '#66C0B8',
    teal400: '#33ABA0',
    teal500: '#009688',
    teal500Alpha8: '#00968814',
    teal500Alpha12: '#0096881f',
    teal600: '#007D71',
    teal700: '#00645A',
    teal800: '#004D44',
    teal900: '#00362F',

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
