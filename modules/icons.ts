import { addImports, addTemplate, createResolver, defineNuxtModule } from '@nuxt/kit';
import type { AircraftIcon } from '~/utils/icons';
import { aircraftIcons } from '~/utils/icons';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'path';
import sharp from 'sharp';
import type { PartialRecord } from '~/types';
import { optimize } from 'svgo';
import { colorsList } from '~/utils/backend/styles';

export default defineNuxtModule(async (_, nuxt) => {
    const resolver = createResolver(import.meta.url);

    const aircraftIconsPath = resolver.resolve('../app/assets/icons/aircraft');
    const publicPath = resolver.resolve('../public/aircraft');
    const iconsPath = resolver.resolve('../public/icons');
    const waypointsPath = resolver.resolve('../public/icons/waypoints');
    const compressedPath = resolver.resolve('../public/icons/compressed');
    const scaleCoefficient = 10;

    const waypoints = ['compulsory-fly-by', 'compulsory-rep', 'final-approach-fix', 'fly-by', 'fly-over', 'on-request'];
    const regular = ['ndb', 'vordme'];

    for (const waypoint of waypoints) {
        const sharpIcon = sharp(join(waypointsPath, `${ waypoint }.png`));
        sharpIcon.resize({
            width: 12,
        });
        await sharpIcon.png().toFile(join(compressedPath, `${ waypoint }.png`));
    }

    for (const icon of regular) {
        const sharpIcon = sharp(join(iconsPath, `${ icon }.png`));
        sharpIcon.resize({
            width: 16,
        });
        await sharpIcon.png().toFile(join(compressedPath, `${ icon }.png`));
    }

    const fullList: PartialRecord<AircraftIcon, { icon: AircraftIcon; width: number; height: number }> = {};

    for (const [icon, { width }] of Object.entries(aircraftIcons)) {
        const iconContents = readFileSync(join(aircraftIconsPath, `${ icon }.svg`), 'utf-8');

        for (let i = 0; i < 2; i++) {
            let iconContent = iconContents
                .replaceAll('white', colorsList.primary500)
                .replaceAll('#F8F8FA', colorsList.primary500)
                .replaceAll('#FFFFFF', colorsList.primary500)
                .replaceAll('#FFF', colorsList.primary500);
            const iconKey = i === 1 ? '-light' : '';
            if (i === 1) {
                iconContent = iconContent
                    .replaceAll('black', 'white')
                    .replaceAll('#231F20', 'white')
                    .replaceAll('#000000', 'white')
                    .replaceAll('#000', 'white');
            }

            const sharpIcon = sharp(Buffer.from(iconContent));

            if (icon === 'a20n') console.log(width, width * scaleCoefficient);

            sharpIcon.resize({
                width: width * scaleCoefficient,
            });

            const info = await sharpIcon.withMetadata().webp().toFile(join(publicPath, `${ icon }${ iconKey }.webp`));

            fullList[icon as AircraftIcon] = {
                icon: icon as AircraftIcon,
                width: width,
                height: info.height / scaleCoefficient,
            };
        }

        for (let i = 0; i < 2; i++) {
            let iconContent = iconContents.replaceAll('#F8F8FA', 'white');
            const iconKey = i === 1 ? '-light' : '';
            if (i === 1) iconContent = iconContent.replaceAll('black', 'white').replaceAll('#231F20', 'white');

            const sharpIcon = sharp(Buffer.from(iconContent));
            sharpIcon.resize({
                width: width * scaleCoefficient,
            });

            await sharpIcon.withMetadata().webp().toFile(join(publicPath, `${ icon }-white${ iconKey }.webp`));
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

    const path = resolver.resolve('../.nuxt/radar/icons.ts');
    addImports([
        {
            name: 'radarIcons',
            from: path,
        },
    ]);
});
