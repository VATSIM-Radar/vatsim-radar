// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
    app: {
        buildAssetsDir: '/static/',
        rootId: '__app',
    },
    srcDir: 'src/',
    devtools: {
        enabled: true,
    },
    sourcemap: {
        client: process.env.NODE_ENV === 'development',
        server: true,
    },
    experimental: {
        asyncContext: false,
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
        'vue-yandex-maps/nuxt',
    ],
    yandexMaps: {
        apikey: '9fa90fbc-ce5f-4dc9-ae6d-433e0ec7338b',
        lang: 'en_US',
    },
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
});
