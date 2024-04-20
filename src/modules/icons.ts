import { createResolver, defineNuxtModule } from '@nuxt/kit';
import { aircraftIcons } from '../utils/icons';
import { colorsList } from '../modules/styles';
import { readFileSync } from 'node:fs';
import { join } from 'path';
import sharp from 'sharp';

export default defineNuxtModule(async (_, nuxt) => {
    const resolver = createResolver(import.meta.url);

    const iconsPath = resolver.resolve('../assets/icons/aircrafts');
    const publicPath = resolver.resolve('../public/aircrafts');

    const colors = [colorsList.primary500, colorsList.neutral150, colorsList.warning600];

    for (const [icon, { width }] of Object.entries(aircraftIcons)) {
        const iconContents = readFileSync(join(iconsPath, `${ icon }.svg`), 'utf-8');

        await Promise.all(colors.map((color, index) => {
            const iconContent = iconContents
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
            }

            const sharpIcon = sharp(Buffer.from(iconContent));
            sharpIcon.resize({
                width,
            });

            return sharpIcon.png().toFile(join(publicPath, `${ icon }${ iconKey }.png`));
        }));
    }
});
