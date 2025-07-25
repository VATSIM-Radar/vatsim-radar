import { readFileSync, renameSync, writeFileSync } from 'node:fs';
import { parseArgs } from 'node:util';

const { values: { icon, coefficient } } = parseArgs({
    args: process.argv,
    allowPositionals: true,
    options: {
        icon: {
            type: 'string',
        },
        coefficient: {
            type: 'string',
        },
    },
});

const iconsFile = readFileSync('./app/utils/icons.ts', 'utf-8').split('\n');
let invalidIcon;

try {
    invalidIcon = readFileSync(`./app/assets/icons/aircraft/${ icon.toUpperCase() }.svg`);
}
catch { /* empty */ }

if (invalidIcon) renameSync(`./app/assets/icons/aircraft/${ icon.toUpperCase() }.svg`, `./app/assets/icons/aircraft/${ icon.toLowerCase() }.svg`);

readFileSync(`./app/assets/icons/aircraft/${ icon.toLowerCase() }.svg`);

const toAddType = iconsFile.findIndex(x => x.includes(`type AircraftIcon =`));
iconsFile.splice(toAddType + 1, 0, `    | '${ icon }'`);

const toAddDefinition = iconsFile.findIndex(x => x.includes(`export const aircraftIcons`));
iconsFile.splice(toAddDefinition + 1, 0, `    ${ icon }: {
        icon: '${ icon }',
        width: getAircraftSizeByCoef(${ coefficient }),
    },`);

const toAddMatching = iconsFile.findIndex(x => x.includes(`return aircraftIcons[faa`));
iconsFile.splice(toAddMatching, 0, `        case '${ icon.toUpperCase() }':`);

writeFileSync('./app/utils/icons.ts', iconsFile.join('\n'));
