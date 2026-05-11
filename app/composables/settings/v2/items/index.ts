import BrandingLogo from '~/components/ui/BrandingLogo.vue';

const onChange = (event: any) => alert(event);

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
        defaultColor: { color: 'blue500Hex' },
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
        ],
        value: ref([]),
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
} satisfies Record<string, SettingsItem>;
