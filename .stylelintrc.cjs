module.exports = {
    defaultSeverity: 'warning',
    plugins: [
        '@stylistic/stylelint-plugin',
    ],
    extends: [
        'stylelint-config-standard',
        'stylelint-config-recommended-scss',
        'stylelint-config-recommended-vue/scss',
        'stylelint-config-clean-order',
    ],
    rules: {
        'no-descending-specificity': null,
        'selector-pseudo-class-no-unknown': [
            true,
            {
                ignorePseudoClasses: [
                    'export',
                    'deep',
                    'global',
                    'slotted',
                ],
            },
        ],
        '@stylistic/indentation': [
            4,
            {
                ignore: [
                    'inside-parens',
                ],
            },
        ],
        'property-no-unknown': null,
        'selector-class-pattern': null,
        'selector-id-pattern': null,
        'declaration-empty-line-before': null,
        'function-name-case': null,
        'alpha-value-notation': null,
        'value-keyword-case': null,
        'color-function-notation': null,
        'declaration-block-no-redundant-longhand-properties': [true, { ignoreShorthands: ['flex-flow'] }],
        'custom-property-pattern': null,
        'keyframes-name-pattern': null,
        'import-notation': null,
        'media-feature-range-notation': null,
        'at-rule-empty-line-before': null,
        'scss/no-global-function-names': null,
        'order/order': [
            [
                { type: 'at-rule', name: 'import' },
                { type: 'at-rule', name: 'forward' },
                { type: 'at-rule', name: 'use' },
                'dollar-variables',
                'at-variables',
                'custom-properties',
                { type: 'at-rule', name: 'mixin' },
                'declarations',
                {
                    type: 'rule',
                    selector: /^&::[\w-]+/,
                    hasBlock: true,
                },
            ],
            {
                severity: 'warning',
            },
        ],
    },
};
