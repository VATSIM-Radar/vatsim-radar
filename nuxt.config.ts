import svgLoader from 'vite-svg-loader';

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
    app: {
        buildAssetsDir: '/static/',
        rootId: '__app',
    },
    build: {
        transpile: [
            'ol',
        ],
    },
    srcDir: 'src/',
    devtools: {
        enabled: false,
    },
    sourcemap: {
        client: process.env.NODE_ENV === 'development',
        server: true,
    },
    experimental: {
        asyncContext: true,
        clientFallback: false,
        defaults: {
            useAsyncData: {
                deep: false,
            },
        },
        headNext: true,
        inlineRouteRules: true,
    },
    runtimeConfig: {
        NAVIGRAPH_CLIENT_ID: process.env.NAVIGRAPH_CLIENT_ID,
        NAVIGRAPH_CLIENT_SECRET: process.env.NAVIGRAPH_CLIENT_SECRET,

        NAVIGRAPH_SERVER_ID: process.env.NAVIGRAPH_SERVER_ID,
        NAVIGRAPH_SERVER_SECRET: process.env.NAVIGRAPH_SERVER_SECRET,

        VATSIM_CLIENT_ID: process.env.VATSIM_CLIENT_ID,
        VATSIM_CLIENT_SECRET: process.env.VATSIM_CLIENT_SECRET,
        VATSIM_ENDPOINT: process.env.VATSIM_ENDPOINT,

        DOMAIN: process.env.DOMAIN,
    },
    modules: [
        '@nuxt/devtools',
        '@pinia/nuxt',
        '@nuxtjs/eslint-module',
        '@nuxtjs/stylelint-module',
    ],
    eslint: {
        emitError: true,
        emitWarning: true,
        failOnWarning: false,
        failOnError: false,
        lintOnStart: false,
        cache: false,
    },
    stylelint: {
        files: ['src/**/*.scss', 'src/**/*.css', 'src/**/*.vue'],
        emitError: true,
        emitWarning: true,
        failOnWarning: false,
        failOnError: false,
        lintOnStart: false,
        cache: false,
    },
    nitro: {
        devProxy: {
            host: '127.0.0.1',
        },
    },
    devServer: {
        port: 8080,
        https: {
            key: '.config/certs/server.key',
            cert: '.config/certs/server.crt',
        },
    },
    typescript: {
        typeCheck: true,
    },
    vite: {
        css: {
            preprocessorOptions: {
                scss: {
                    additionalData: `@use "~/scss/colors.scss" as *;@use "~/scss/variables.scss" as *;`,
                },
            },
        },
        plugins: [
            svgLoader({
                defaultImport: 'url',
                svgoConfig: {
                    plugins: [
                        {
                            name: 'preset-default',
                            params: {
                                overrides: {
                                    removeViewBox: false,
                                },
                            },
                        },
                        'removeDimensions',
                        {
                            name: 'convertColors',
                            params: {
                                currentColor: true,
                            },
                        },
                    ],
                },
            }),
        ],
    },
});
