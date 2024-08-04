import { readFileSync, renameSync, writeFileSync } from 'node:fs';
import { parseArgs } from 'node:util';

const { values: { icon, width } } = parseArgs({
    args: process.argv,
    allowPositionals: true,
    options: {
        icon: {
            type: 'string',
        },
        width: {
            type: 'string',
        },
    },
});

const iconsFile = readFileSync('./src/utils/icons.ts', 'utf-8').split('\n');
let invalidIcon;

try {
    invalidIcon = readFileSync(`./src/assets/icons/aircraft/${ icon.toUpperCase() }.svg`);
}
catch { /* empty */ }

if (invalidIcon) renameSync(`./src/assets/icons/aircraft/${ icon.toUpperCase() }.svg`, `./src/assets/icons/aircraft/${ icon.toLowerCase() }.svg`);

const toAddType = iconsFile.findIndex(x => x.includes(`type AircraftIcon =`));
iconsFile.splice(toAddType + 1, 0, `    | '${ icon }'`);

const toAddDefinition = iconsFile.findIndex(x => x.includes(`export const aircraftIcons`));
iconsFile.splice(toAddDefinition + 1, 0, `    ${ icon }: {
        icon: '${ icon }',
        width: getAircraftSizeByCoef(${ width }),
    },`);

const toAddMatching = iconsFile.findIndex(x => x.includes(`return aircraftIcons[faa`));
iconsFile.splice(toAddMatching, 0, `        case '${ icon.toUpperCase() }':`);

writeFileSync('./src/utils/icons.ts', iconsFile.join('\n'));
