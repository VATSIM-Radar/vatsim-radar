import { getSettingValue, makeSettingsItems } from '~/composables/settings/v2/utils';
import { setPrivateMode } from '~/composables/fetchers/lists';

export const settingsItemAppearance = () => makeSettingsItems(({ settingsStore }) => ({
    autoFollow: {
        title: 'Auto-follow me',
        description: 'Enabling this will auto-follow your flight and enable tracking of it (on map load or when spawned on ground)',
        type: 'toggle',
        value: getSettingValue(() => settingsStore.settings.map?.preferences?.autoFollow, false),
        onChange: value => settingsStore.save({ map: { preferences: { autoFollow: value } } }),
    },
}));
