import type { SettingsItem } from '~/composables/settings/v2/types';

type SettingChangeValue<T> =
    T extends { onChange: (value: infer V) => unknown }
        ? V
        : never;

export async function handleSettingChange<T extends SettingsItem>(item: T, value: SettingChangeValue<T>): Promise<unknown> {
    if (!('onChange' in item)) throw new Error(`Invalid setting type: received ${ item.type }, mutable expected`);

    const result = await item.onChange(value as never);
    // TODO
    console.log('save action executed');
    return result;
}
