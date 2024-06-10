import { addImports, addTemplate, createResolver, defineNuxtModule } from '@nuxt/kit';
import type { PartialRecord } from '~/types';

export const colorsList = {
    mapSectorBorder: '#2d2d30',

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

function colorToRgb(hex: string): [r: number, g: number, b: number] {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex.replace(/^#?([a-f\d])([a-f\d])([a-f\d])$/i, function(m, r, g, b) {
        return r + r + g + g + b + b;
    }));
    if (!result) throw new Error(`Failed to convert color ${ hex } from hex to rgb`);

    return [
        parseInt(result[1], 16),
        parseInt(result[2], 16),
        parseInt(result[3], 16),
    ];
}

export default defineNuxtModule((_, nuxt) => {
    let scss = `@function toRawRGB($color) {
    @return unquote(red($color) + ', ' + green($color) + ', ' + blue($color));
}`;

    const variables = {} as Record<ColorsList | `${ ColorsList }Hex`, string> & Record<`${ ColorsList }Rgb`, number[]>;
    const themes = {} as Record<ThemesList, PartialRecord<ColorsList | `${ ColorsList }Hex`, string> & PartialRecord<`${ ColorsList }Rgb`, number[]>>;

    for (let i = 0; i < 3; i++) {
        if (i === 1) {
            scss += '\n\n$colorsMap: (';
        }

        for (const [color, value] of Object.entries(colorsList) as [ColorsList, string][]) {
            const rgb = colorToRgb(value);
            const rgbString = rgb.join(', ');

            if (i === 0) {
                variables[color] = `rgb(var(--${ color }, ${ rgbString }))`;
                variables[`${ color }Rgb`] = rgb;
                variables[`${ color }Hex`] = value;

                for (const [theme, colors] of Object.entries(themesList) as [ThemesList, PartialRecord<ColorsList, string>][]) {
                    if (!themes[theme]) themes[theme] = {};
                    if (!themes[theme][color] && colors[color]) {
                        const rgb = colorToRgb(colors[color]!);
                        const rgbString = rgb.join(', ');
                        themes[theme][color] = `rgb(var(--${ color }, ${ rgbString }))`;
                        themes[theme][`${ color }Rgb`] = rgb;
                        themes[theme][`${ color }Hex`] = colors[color]!;
                    }
                }

                scss += `\n$${ color }Raw: toRawRGB(${ value });`;
                scss += `\n$${ color }Orig: ${ value };`;
            }
            else if (i === 1) {
                scss += `\ni${ color }: var(--${ color }, $${ color }Raw),`;
            }
            else if (i === 2) {
                const mapGet = `map-get($colorsMap, i${ color })`;
                const value = `rgb(${ mapGet })`;
                scss += `\n$${ color }: ${ value };`;
            }
        }

        if (i === 1) {
            scss += `\n);@function varToRgba($colorName, $opacity) {
    @if (map-has-key($colorsMap, 'i#{$colorName}')) {
        @return rgba(map-get($colorsMap, 'i#{$colorName}'), $opacity)
    } 
    @else {
        @return rgba(var(--#{$colorName}), $opacity)
    }
}\n`;
        }
    }

    addTemplate({
        filename: '../src/scss/colors.scss',
        getContents: () => scss,
        write: true,
    });

    addTemplate({
        filename: 'radar/colors.ts',
        getContents: () => `export const radarColors = ${ JSON.stringify(variables) };\nexport const radarThemes = ${ JSON.stringify(themes) };`,
        write: true,
    });

    const resolver = createResolver(import.meta.url);
    const path = resolver.resolve('../../.nuxt/radar/colors.ts');
    addImports([
        {
            name: 'radarColors',
            from: path,
        },
        {
            name: 'radarThemes',
            from: path,
        },
    ]);
});
