import withNuxt from './.nuxt/eslint.config.mjs';

export default withNuxt([
    {
        files: ['**/*.js', '**/*.ts', '**/*.vue'],
        rules: {
            semi: [
                'warn',
                'always',
            ],
            curly: [
                'error',
                'multi-line',
            ],
            'template-curly-spacing': [
                'warn',
                'always',
            ],
            'no-console': 'off',
            'no-debugger': 'off',
            quotes: [
                'error',
                'single',
                {
                    allowTemplateLiterals: true,
                    avoidEscape: true,
                },
            ],
            'space-before-function-paren': 'off',
            'brace-style': [
                'error',
                'stroustrup',
            ],
            'no-multi-spaces': [
                'error',
                {
                    exceptions: {
                        ImportDeclaration: true,
                    },
                },
            ],
            'no-unused-vars': 'off',
            '@typescript-eslint/no-unused-vars': [
                'error',
                {
                    args: 'none',
                    caughtErrorsIgnorePattern: '^ignore',
                    vars: 'local',
                },
            ],
            'no-new': 'off',
            'spaced-comment': 'off',
            'comma-dangle': [
                'error',
                'always-multiline',
            ],
            'max-len': 'off',
            indent: [
                'error',
                4,
                {
                    SwitchCase: 1,
                },
            ],
            '@typescript-eslint/no-var-requires': 'off',
            '@typescript-eslint/no-explicit-any': 'off',
            'no-useless-constructor': 'off',
            'no-use-before-define': 'off',
            '@typescript-eslint/no-use-before-define': 'off',
            '@typescript-eslint/no-useless-constructor': [
                'error',
            ],
            'import/order': 'off',
            'import/named': 'off',
            'import/no-mutable-exports': 'off',
            'prefer-const': ['error', { destructuring: 'all' }],
            camelcase: ['off'],
            'func-call-spacing': 'off',
            '@typescript-eslint/func-call-spacing': 'error',
            '@typescript-eslint/naming-convention': [
                'error',
                {
                    selector: 'variableLike',
                    format: ['camelCase', 'PascalCase', 'UPPER_CASE'],
                    leadingUnderscore: 'allow',
                    trailingUnderscore: 'allow',
                },
                {
                    selector: 'variable',
                    modifiers: ['destructured'],
                    format: null,
                },
                {
                    selector: 'parameter',
                    modifiers: ['destructured'],
                    format: null,
                },
                {
                    selector: 'class',
                    format: ['PascalCase'],
                },
                {
                    selector: 'variable',
                    modifiers: ['destructured'],
                    format: null,
                },
                {
                    selector: 'typeParameter',
                    format: null,
                },
                {
                    selector: 'enumMember',
                    format: null,
                },
                {
                    selector: 'interface',
                    format: null,
                },
                {
                    selector: 'property',
                    format: null,
                },
            ],
            'no-redeclare': 'off',
            '@typescript-eslint/no-redeclare': ['error'],
            'no-dupe-class-members': 'off',
            '@typescript-eslint/no-dupe-class-members': ['error'],
            'no-cond-assign': 'off',
            '@typescript-eslint/no-import-type-side-effects': 'error',
            '@typescript-eslint/consistent-type-imports': 'error',
            'import/consistent-type-specifier-style': ['error', 'prefer-top-level'],
            'vue/component-name-in-template-casing': [
                'error', 'kebab-case',
            ],
            'vue/script-indent': [
                'warn', 4, {
                    baseIndent: 0,
                    switchCase: 1,
                    ignores: [],
                },
            ],
            'vue/html-indent': [
                'warn', 4,
            ],
            'vue/html-closing-bracket-newline': [
                'error', {
                    singleline: 'never',
                    multiline: 'always',
                },
            ],
            'vue/no-unused-components': 'warn',
            'vue/no-unused-vars': 'warn',
            'vue/no-unused-properties': [
                'error', {
                    groups: ['setup', 'data', 'computed', 'methods'],
                },
            ],
            'vue/no-unused-refs': 'error',
            'vue/no-v-html': 'off',
            'vue/require-default-prop': 'off',
            'vue/html-closing-bracket-spacing': 'off',
            'vue/attributes-order': 'off',
            'vue/valid-v-slot': [
                'error', {
                    allowModifiers: true,
                },
            ],
            'vue/html-self-closing': 'error',
            'vue/component-options-name-casing': 'error',
            'vue/custom-event-name-casing': 'error',
            'vue/match-component-import-name': 'error',
            'vue/next-tick-style': 'error',
            'vue/no-duplicate-attr-inheritance': 'error',
            'vue/no-potential-component-option-typo': [
                'error', {
                    presets: ['all'],
                },
            ],
            'vue/no-empty-component-block': 'error',
            'vue/no-ref-object-reactivity-loss': 'error',
            'vue/no-setup-props-reactivity-loss': 'error',
            'vue/no-multiple-objects-in-class': 'error',
            'vue/no-static-inline-styles': 'error',
            'vue/no-useless-mustaches': 'error',
            'vue/no-useless-v-bind': 'error',
            'vue/prefer-define-options': 'error',
            'vue/require-direct-export': 'off',
            'vue/no-this-in-before-route-enter': 'error',
            'vue/no-v-text': 'error',
            'vue/padding-line-between-blocks': 'error',
            'vue/no-required-prop-with-default': 'error',
            'vue/prefer-true-attribute-shorthand': 'error',
            'vue/v-for-delimiter-style': 'error',
            'vue/block-lang': [
                'error', {
                    'script': {
                        'lang': 'ts',
                    },
                },
            ],
            'vue/block-order': [
                'error', {
                    'order': ['template', 'script', 'style'],
                },
            ],
            'vue/block-tag-newline': 'error',
            'vue/require-emit-validator': 'error',
            'vue/require-name-property': 'error',
            'vue/require-explicit-emits': 'error',
            'vue/v-on-event-hyphenation': [
                'error', 'never', {
                    autofix: true,
                    ignore: ['map-was-initialized'],
                },
            ],
            'vue/no-mutating-props': [
                'error', {
                    'shallowOnly': true,
                },
            ],
            'vue/require-macro-variable-name': [
                'error', {
                    'defineProps': 'props',
                    'defineEmits': 'emit',
                    'defineSlots': 'slots',
                    'useSlots': 'slots',
                    'useAttrs': 'attrs',
                },
            ],
            'vue/require-typed-ref': 'error',
            'vue/no-use-v-else-with-v-for': 'error',
            'vue/require-typed-object-prop': 'error',
            'vue/no-deprecated-model-definition': 'error',
            'vue/match-component-file-name': [
                'error', {
                    extensions: ['vue'],
                    shouldMatchCase: true,
                },
            ],
            'vue/define-emits-declaration': ['error', 'runtime'],
            'vue/define-macros-order': [
                'error', {
                    order: ['defineOptions', 'defineProps', 'defineEmits', 'defineSlots'],
                },
            ],
            'vue/define-props-declaration': ['off'],
            'vue/valid-define-options': ['error'],
            'vue/no-deprecated-dollar-scopedslots-api': 'off',
            '@typescript-eslint/ban-ts-comment': 'off',
            'no-async-promise-executor': 'off',
        },
    },
    {
        files: [
            '**/pages/**/*.vue', '**/layouts/**/*.vue', '**/app.vue', '**/error.vue',
        ],
        rules: {
            'vue/match-component-file-name': 'off',
        },
    },
])
