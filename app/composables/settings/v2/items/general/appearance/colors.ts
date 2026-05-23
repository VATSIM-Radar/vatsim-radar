import { getColorByKey, setColorByKey, makeSettingsItems } from '~/composables/settings/v2/utils';
import type { UserMapSettingsColor } from '~/utils/server/handlers/map-settings';

export const settingsItemAppearanceColors = () => makeSettingsItems(({ settingsStore }) => ({
    firs: {
        type: 'color',
        title: 'FIR (ARTCC) color',
        value: getColorByKey('map.preferences.colors.default.firs'),
        onChange: value => setColorByKey('map.preferences.colors.default.firs', value as UserMapSettingsColor),
    },
}));
