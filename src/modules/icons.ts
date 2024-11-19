import { addImports, addTemplate, createResolver, defineNuxtModule } from '@nuxt/kit';
import type { AircraftIcon } from '../utils/icons';
import { aircraftIcons } from '../utils/icons';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'path';
import sharp from 'sharp';
import type { PartialRecord } from '~/types';
import { optimize } from 'svgo';
import { colorsList } from '../utils/backend/styles';

export default defineNuxtModule(async (_, nuxt) => {
    const resolver = createResolver(import.meta.url);

    const iconsPath = resolver.resolve('../assets/icons/aircraft');
    const publicPath = resolver.resolve('../public/aircraft');

    const fullList: PartialRecord<AircraftIcon, { icon: AircraftIcon; width: number; height: number }> = {};

    for (const [icon, { width }] of Object.entries(aircraftIcons)) {
        const iconContents = readFileSync(join(iconsPath, `${ icon }.svg`), 'utf-8');

        for (let i = 0; i < 2; i++) {
            let iconContent = iconContents
                .replaceAll('white', colorsList.primary500)
                .replaceAll('#F8F8FA', colorsList.primary500);
            const iconKey = i === 1 ? '-light' : '';
            if (i === 1) iconContent = iconContent.replaceAll('black', 'white').replaceAll('#231F20', 'white');

            const sharpIcon = sharp(Buffer.from(iconContent));
            sharpIcon.resize({
                width: width * 2,
            });

            const info = await sharpIcon.withMetadata().png().toFile(join(publicPath, `${ icon }${ iconKey }.png`));

            fullList[icon as AircraftIcon] = {
                icon: icon as AircraftIcon,
                width: width,
                height: info.height / 2,
            };
        }

        for (let i = 0; i < 2; i++) {
            let iconContent = iconContents.replaceAll('#F8F8FA', 'white');
            const iconKey = i === 1 ? '-light' : '';
            if (i === 1) iconContent = iconContent.replaceAll('black', 'white').replaceAll('#231F20', 'white');

            const sharpIcon = sharp(Buffer.from(iconContent));
            sharpIcon.resize({
                width: width * 2,
            });

            await sharpIcon.withMetadata().png().toFile(join(publicPath, `${ icon }-white${ iconKey }.png`));
        }

        let svg = optimize(iconContents, {
            plugins: [
                'removeDimensions',
                'reusePaths',
            ],
        }).data;

        svg = svg.replace('<svg', `<svg width="${ width }" height="${ fullList[icon as AircraftIcon]!.height }"`);

        writeFileSync(join(publicPath, `${ icon }.svg`), svg);
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
