import { addImports, addTemplate, createResolver, defineNuxtModule } from '@nuxt/kit';
import type { AircraftIcon } from '../utils/icons';
import { aircraftIcons } from '../utils/icons';
import { colorsList } from '../modules/styles';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'path';
import sharp from 'sharp';
import type { PartialRecord } from '~/types';
import { optimize } from 'svgo';

export default defineNuxtModule(async (_, nuxt) => {
    const resolver = createResolver(import.meta.url);

    const iconsPath = resolver.resolve('../assets/icons/aircraft');
    const publicPath = resolver.resolve('../public/aircraft');

    const colors = [colorsList.primary500, colorsList.warning500, colorsList.warning700, colorsList.success500, colorsList.primary500];

    const fullList: PartialRecord<AircraftIcon, { icon: AircraftIcon; width: number; height: number }> = {};

    for (const [icon, { width }] of Object.entries(aircraftIcons)) {
        const iconContents = readFileSync(join(iconsPath, `${ icon }.svg`), 'utf-8');

        let svg = optimize(iconContents, {
            plugins: [
                'removeDimensions',
                'reusePaths',
            ],
        }).data;

        svg = svg.replace('<svg', `<svg width="${ width }"`);

        writeFileSync(join(publicPath, `${ icon }.svg`), svg);

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
