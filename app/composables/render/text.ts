import type { UiTextTypes } from '~/components/ui/text/UiText.vue';
import type { PartialRecord } from '~/types';

const textTypes = {
    h1: '500 32px/100% LibreFranklin, Arial, sans-serif',
    h2: '500 28px/100% LibreFranklin, Arial, sans-serif',
    h3: '500 24px/100% LibreFranklin, Arial, sans-serif',
    h4: '500 20px/100% LibreFranklin, Arial, sans-serif',
    h5: '500 16px/100% LibreFranklin, Arial, sans-serif',

    '1b': '500 16px/130% LibreFranklin, Arial, sans-serif',
    '2b': '500 14px/130% LibreFranklin, Arial, sans-serif',
    '2b-medium': '600 14px/130% LibreFranklin, Arial, sans-serif',
    '3b': '500 12px/130% LibreFranklin, Arial, sans-serif',
    '3b-medium': '600 12px/130% LibreFranklin, Arial, sans-serif',
    '3b-medium-alt': '600 12px/100% Jura, Arial, sans-serif',

    caption: '500 11px/100% LibreFranklin, Arial, sans-serif',
    'caption-light': 'normal 11px/100% Jura, Arial, sans-serif',
    'caption-medium': '600 11px/100% LibreFranklin, Arial, sans-serif',
    'caption-medium-alt': '600 11px/100% Jura, Arial, sans-serif',
} satisfies PartialRecord<UiTextTypes, string>;

export function getTextFont(type: keyof typeof textTypes) {
    return textTypes[type];
}
