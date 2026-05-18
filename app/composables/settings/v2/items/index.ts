import BrandingLogo from '~/components/ui/BrandingLogo.vue';

const onChange = (event: any) => alert(typeof event === 'object' && event ? JSON.stringify(event) : event);

/* eslint-disable vue/require-typed-ref */

const range = ref<number>(0);

export const settingsItemDebug = {
    component: {
        type: 'component',
        component: BrandingLogo,
        searchKeywords: ['Logo'],
    },
    inlineComponent: {
        type: 'inline-component',
        component: BrandingLogo,
        title: 'Inline Component',
        description: 'This is inline component',
        hint: 'Inline component!',
    },
    toggle: {
        type: 'toggle',
        title: 'Toggle',
        value: ref(false),
        onChange,
        appendComponent: BrandingLogo,
    },
    input: {
        type: 'text',
        title: 'Input',
        value: ref(''),
        onChange,
    },
    number: {
        type: 'number',
        title: 'Number',
        value: ref(0),
        onChange,
        placeholder: 'Number',
    },
    color: {
        type: 'color',
        title: 'Color',
        value: ref(null),
        defaultColor: { color: 'blue500' },
        onChange: onChange,
    },
    select: {
        type: 'select',
        title: 'Select',
        items: [
            {
                text: 'Test',
                value: 0,
            },
            {
                text: 'test 2',
                value: 1,
            },
        ],
        value: ref(null),
        placeholder: 'Placeholder',
        onChange,
    },
    multiSelect: {
        type: 'multi-select',
        title: 'Multi Select',
        items: [
            {
                text: 'Test',
                value: 0,
            },
            {
                text: 'test 2',
                value: 1,
            },
            {
                text: 'test 3',
                value: 2,
            },
        ],
        value: ref([0, 1]),
        onChange,
    },
    radio: {
        type: 'radio',
        title: 'Radio',
        items: [
            {
                text: 'Test',
                value: 0,
                hint: 'test',
            },
            {
                text: 'Test 2',
                value: 1,
            },
        ],
        value: ref(0),
        onChange,
    },
    range: {
        type: 'range',
        min: 0,
        max: 100,
        minLabel: '0x',
        maxLabel: '100x',
        showInput: true,
        label: 'test',
        value: range,
        onChange: (value) => range.value = value,
        title: 'Range',
    },
} satisfies Record<string, SettingsItem>;
