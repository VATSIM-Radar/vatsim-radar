import { readFileSync, writeFileSync } from 'node:fs';

function shortHexToLong(hex) {
    return hex.replace(/^#?([a-f\d])([a-f\d])([a-f\d])$/i, function(m, r, g, b) {
        return r + r + g + g + b + b;
    });
}

function hexToHexa(hex, alpha) {
    hex = shortHexToLong(hex);

    if (alpha === 1) return hex;

    const alphaHex = Math.round(alpha * 255)
        .toString(16)
        .padStart(2, '0');

    return `${ hex }${ alphaHex }`;
}

const colors = JSON.parse(readFileSync('./figma-colors.json', 'utf-8'));
const obj = colors[Object.keys(colors)[0]];

const categories = {};

const nameRegex = /(?<color>.*) @ {1,2}(?<transparency>[0-9]{1,2})/;

/**
 * @param category {string}
 * @param color {string}
 * @param obj {Object}
 */
function parseColor(category, color, obj) {
    if (typeof obj.$value !== 'object') return;
    const regexResult = nameRegex.exec(color);
    color = regexResult?.groups?.transparency ? `${ regexResult.groups.color }Alpha${ regexResult.groups.transparency }` : color;

    categories[category] ||= {};
    categories[category][color] = hexToHexa(obj.$value.hex, +obj.$value.alpha.toFixed(2));
}

for (const key in obj) {
    for (const color in obj[key]) {
        if (typeof obj[key][color] !== 'object') continue;
        if ('$type' in obj[key][color]) {
            parseColor(key, color, obj[key][color]);
            continue;
        }

        for (const color2 in obj[key][color]) {
            let _color = color;
            if (color === '_opacity') _color = key;
            parseColor(_color, color2, obj[key][color][color2]);
        }
    }
}

let result = 'const colors = {';

for (const category in categories) {
    result += `\n\n// ${ category }`;
    for (const color in categories[category]) {
        const name = !isNaN(parseInt(color)) ? `${ category }${ color }` : color;

        result += `\n${ name }: '${ categories[category][color] }',`;
    }
}

result += `\n}`;

writeFileSync('./figma-result.js', result);
