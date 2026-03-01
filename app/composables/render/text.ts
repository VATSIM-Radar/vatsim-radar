import type { UiTextTypes } from '~/components/ui/text/UiText.vue';
import type { PartialRecord } from '~/types';

const textTypes = {
    h1: '500 32px LibreFranklin, Arial, sans-serif',
    h2: '500 28px LibreFranklin, Arial, sans-serif',
    h3: '500 24px LibreFranklin, Arial, sans-serif',
    h4: '500 20px LibreFranklin, Arial, sans-serif',
    h5: '500 16px LibreFranklin, Arial, sans-serif',

    '1b': '500 16px LibreFranklin, Arial, sans-serif',
    '2b': '500 14px LibreFranklin, Arial, sans-serif',
    '2b-medium': '600 14px LibreFranklin, Arial, sans-serif',
    '3b': '500 12px LibreFranklin, Arial, sans-serif',
    '3b-medium': '600 12px LibreFranklin, Arial, sans-serif',
    '3b-medium-alt': '600 12px Jura, Arial, sans-serif',

    caption: '500 11px LibreFranklin, Arial, sans-serif',
    'caption-light': 'normal 11px Jura, Arial, sans-serif',
    'caption-medium': '600 11px LibreFranklin, Arial, sans-serif',
    'caption-medium-alt': '600 11px Jura, Arial, sans-serif',
} satisfies PartialRecord<UiTextTypes, string>;

export function getTextFont(type: keyof typeof textTypes, { fontSize, robotoMono }: {
    fontSize?: number;
    robotoMono?: boolean;
} = {}) {
    let text = textTypes[type];

    if (fontSize || robotoMono) {
        const arr = text.split(' ');

        if (fontSize) {
            arr[1] = `${ fontSize }px`;
        }

        if (robotoMono) {
            arr[2] = `RobotoMono,`;
        }

        text = arr.join(' ');
    }

    return text;
}
