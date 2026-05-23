import type { Component } from '@vue/runtime-core';
import type { MaybeRefOrGetter } from '@vue/reactivity';
import type { UserMapSettingsColor } from '~/utils/server/handlers/map-settings';
import type { SelectItem } from '~/types/components/select';
import type { RadioItemGroup } from '~/components/ui/inputs/UiRadioGroup.vue';
import type { SettingValueType } from '~/composables/settings/v2/utils';

export interface SettingsItemMandatory {
    searchKeywords?: string[];
    disabled?: MaybeRefOrGetter<boolean>;

    /**
     * Used in search
     * @internal
     */
    fullPath?: string;
}

export interface SettingsItemDefault extends SettingsItemMandatory {
    title: string;
    description?: string;
    hint?: string;
    appendComponent?: Component;
}

// Whole setting is a component
export interface SettingsItemComponent extends SettingsItemMandatory {
    type: 'component';
    component: Component;
}

// Data of setting is a component
export interface SettingsItemInlineComponent extends SettingsItemDefault {
    type: 'inline-component';
    component: Component;
}

export interface SettingsItemToggle extends SettingsItemDefault {
    type: 'toggle';
    value: SettingValueType<boolean>;
    onChange: (val: boolean | undefined) => any;
}

export interface SettingsItemInputText extends SettingsItemDefault {
    type: 'text';
    value: SettingValueType<string>;
    max?: number;
    placeholder?: string;
    onChange: (val: string | null | undefined) => any;
}

export interface SettingsItemInputNumber extends SettingsItemDefault {
    type: 'number';
    value: SettingValueType<number>;
    min?: number;
    max?: number;
    allowedAfterDot?: number;
    placeholder?: string;
    onChange: (val: number | null | undefined) => any;
}

export interface SettingsItemRange extends SettingsItemDefault {
    type: 'range';
    value: SettingValueType<number>;
    min: number;
    max: number;
    minLabel?: string;
    maxLabel?: string;
    showLabels?: boolean;
    showInput?: boolean;
    label?: string;
    step?: number;
    onChange: (val: number | undefined) => any;
}

export interface SettingsItemInputColor extends SettingsItemDefault {
    type: 'color';
    value: SettingValueType<Partial<UserMapSettingsColor> | null>;
    /**
     * @default all
     */
    mode?: 'transparency' | 'color' | 'all';
    onChange: (val: Partial<UserMapSettingsColor> | null | undefined) => any;
}

export type SelectItemValue = string | number | boolean | null;

export interface SettingsItemSelect extends SettingsItemDefault {
    type: 'select';
    value: SettingValueType<SelectItemValue>;
    items: SelectItem[];
    placeholder?: string;
    showPlaceholder?: MaybeRefOrGetter<boolean>;
    onChange: (val: SelectItemValue | undefined) => any;
}

export interface SettingsItemMultiSelect extends Omit<SettingsItemSelect, 'value' | 'onChange' | 'type'> {
    type: 'multi-select';
    value: SettingValueType<Array<SelectItemValue>>;
    onChange: (val: Array<SelectItemValue> | undefined) => any;
}

export interface SettingsItemRadio extends SettingsItemDefault {
    type: 'radio';
    value: SettingValueType<SelectItemValue>;
    items: RadioItemGroup[];
    onChange: (val: SelectItemValue | undefined) => any;
}

export type SettingsItem =
    | SettingsItemComponent
    | SettingsItemInlineComponent
    | SettingsItemToggle
    | SettingsItemInputText
    | SettingsItemInputColor
    | SettingsItemInputNumber
    | SettingsItemRange
    | SettingsItemSelect
    | SettingsItemMultiSelect
    | SettingsItemRadio;

export type SettingsItemSearch = SettingsItem & {
    foundSection?: string;
};

export interface SettingsSectionBlock {
    title?: string;
    description?: string;
    key: string;
    items: SettingsItem[];
    hide?: MaybeRefOrGetter<boolean>;
}

export interface SettingsSection {
    title: string;
    url: string;
    items: SettingsSectionBlock[];
}

export interface SettingsMenuGroup {
    title: string;
    url: string;
    icon?: Component;
    sections: SettingsSection[];
}
