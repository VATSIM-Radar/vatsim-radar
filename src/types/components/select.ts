export type SelectItemValueType = string | number | null;

export interface SelectItem<T extends SelectItemValueType = SelectItemValueType> {
    value: T;
    text?: string;
}
