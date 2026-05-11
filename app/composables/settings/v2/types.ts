import type { Component } from '@vue/runtime-core';
import type { MaybeRefOrGetter } from '@vue/reactivity';
import type { UserMapSettingsColor } from '~/utils/server/handlers/map-settings';
import type { SelectItem } from '~/types/components/select';
import type { RadioItemGroup } from '~/components/ui/inputs/UiRadioGroup.vue';

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
    value: MaybeRefOrGetter<boolean>;
    onChange: (val: boolean) => any;
}

export interface SettingsItemInputText extends SettingsItemDefault {
    type: 'text';
    value: MaybeRefOrGetter<string>;
    max?: number;
    placeholder?: string;
    onChange: (val: string | null) => any;
}

export interface SettingsItemInputNumber extends SettingsItemDefault {
    type: 'number';
    value: MaybeRefOrGetter<number>;
    min?: number;
    max?: number;
    placeholder?: string;
    onChange: (val: number | null) => any;
}

export interface SettingsItemInputColor extends SettingsItemDefault {
    type: 'color';
    value: MaybeRefOrGetter<Partial<UserMapSettingsColor> | null>;
    /**
     * @default all
     */
    mode?: 'transparency' | 'color' | 'all';
    defaultColor?: Partial<UserMapSettingsColor> | null;
    onChange: (val: Partial<UserMapSettingsColor> | null) => any;
}

export type SelectItemValue = string | number | boolean | null;

export interface SettingsItemSelect extends SettingsItemDefault {
    type: 'select';
    value: MaybeRefOrGetter<SelectItemValue>;
    items: SelectItem[];
    placeholder?: string;
    onChange: (val: SelectItemValue) => any;
}

export interface SettingsItemMultiSelect extends Omit<SettingsItemSelect, 'value' | 'onChange' | 'type'> {
    type: 'multi-select';
    value: MaybeRefOrGetter<Array<SelectItemValue>>;
    onChange: (val: Array<SelectItemValue>) => any;
}

export interface SettingsItemRadio extends SettingsItemDefault {
    type: 'radio';
    value: MaybeRefOrGetter<SelectItemValue>;
    items: RadioItemGroup[];
    onChange: (val: SelectItemValue) => any;
}

export type SettingsItem =
    | SettingsItemComponent
    | SettingsItemInlineComponent
    | SettingsItemToggle
    | SettingsItemInputText
    | SettingsItemInputColor
    | SettingsItemInputNumber
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
