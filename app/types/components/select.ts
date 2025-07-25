export type SelectItemValueType = boolean | string | number | null;

export interface SelectItem<T extends SelectItemValueType = SelectItemValueType> {
    value: T;
    text?: string;
}
