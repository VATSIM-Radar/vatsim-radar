import { addImports, addTemplate, createResolver, defineNuxtModule } from '@nuxt/kit';
import type { AircraftIcon } from '../utils/icons';
import { aircraftIcons } from '../utils/icons';
import { colorsList } from '../modules/styles';
import { readFileSync } from 'node:fs';
import { join } from 'path';
import sharp from 'sharp';
import type { PartialRecord } from '~/types';

export default defineNuxtModule(async (_, nuxt) => {
    const resolver = createResolver(import.meta.url);

    const iconsPath = resolver.resolve('../assets/icons/aircrafts');
    const publicPath = resolver.resolve('../public/aircrafts');

    const colors = [colorsList.primary500, colorsList.neutral150, colorsList.warning600, colorsList.success500, colorsList.primary500];

    const fullList: PartialRecord<AircraftIcon, { icon: AircraftIcon, width: number, height: number }> = {};

    for (const [icon, { width }] of Object.entries(aircraftIcons)) {
        const iconContents = readFileSync(join(iconsPath, `${ icon }.svg`), 'utf-8');

        await Promise.all(colors.map(async (color, index) => {
            let iconContent = iconContents
                .replaceAll('white', color)
                .replaceAll('#F8F8FA', color);
            let iconKey = '';
            switch (index) {
                case 1:
                    iconKey = '-hover';
                    break;
                case 2:
                    iconKey = '-active';
                    break;
                case 3:
                    iconKey = '-green';
                    break;
                case 4:
                    iconKey = '-light';
                    break;
            }

            if (index === 4) iconContent = iconContent.replaceAll('black', 'white');

            const sharpIcon = sharp(Buffer.from(iconContent));
            sharpIcon.resize({
                width,
            });

            const info = await sharpIcon.withMetadata().png().toFile(join(publicPath, `${ icon }${ iconKey }.png`));

            fullList[icon as AircraftIcon] = {
                icon: icon as AircraftIcon,
                width,
                height: info.height,
            };
        }));
    }

    addTemplate({
        filename: 'radar/icons.ts',
        getContents: () => `export const radarIcons = ${ JSON.stringify(fullList) };`,
        write: true,
    });

    const path = resolver.resolve('../../.nuxt/radar/icons.ts');
    addImports([
        {
            name: 'radarIcons',
            from: path,
        },
    ]);
});
