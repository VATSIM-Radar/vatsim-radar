import svgLoader from 'vite-svg-loader';

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
    app: {
        buildAssetsDir: '/static/',
        rootId: '__app',
        head: {
            link: [
                {
                    rel: 'apple-touch-icon',
                    sizes: '180x180',
                    href: '/apple-touch-icon.png',
                },
                {
                    rel: 'icon',
                    type: 'image/png',
                    sizes: '32x32',
                    href: '/favicon-32x32.png',
                },
                {
                    rel: 'icon',
                    type: 'image/png',
                    sizes: '16x16',
                    href: '/favicon-16x16.png',
                },
                {
                    rel: 'manifest',
                    href: '/site.webmanifest',
                },
                {
                    rel: 'mask-icon',
                    href: '/safari-pinned-tab.svg',
                    color: '#3b6cec',
                },
            ],
            meta: [
                {
                    name: 'msapplication-TileColor',
                    content: '#3b6cec',
                },
                {
                    name: 'theme-color',
                    content: '#3b6cec',
                },
            ],
        },
    },
    build: {
        transpile: process.env.NODE_ENV === 'development'
            ? []
            : [
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

        DISCORD_CLIENT_ID: process.env.DISCORD_CLIENT_ID,
        DISCORD_TOKEN: process.env.DISCORD_TOKEN,
        DISCORD_SERVER_ID: process.env.DISCORD_SERVER_ID,
        DISCORD_RELEASES_CHANNEL_ID: process.env.DISCORD_RELEASES_CHANNEL_ID,
        DISCORD_ROLE_ID: process.env.DISCORD_ROLE_ID,
        ACCESS_BY_DISCORD_ROLES: process.env.ACCESS_BY_DISCORD_ROLES,

        INFLUX_URL: process.env.INFLUX_URL,
        INFLUX_TOKEN: process.env.INFLUX_TOKEN,
        INFLUX_ORG: process.env.INFLUX_ORG,
        INFLUX_BUCKET_MAIN: process.env.INFLUX_BUCKET_MAIN,
        INFLUX_BUCKET_ONLINE: process.env.INFLUX_BUCKET_ONLINE,

        public: {
            DOMAIN: process.env.DOMAIN,
            IS_DOWN: process.env.IS_DOWN,
        },
    },
    modules: [
        '@nuxt/devtools',
        '@pinia/nuxt',
        '@nuxt/eslint',
        '@nuxtjs/stylelint-module',
    ],
    eslint: {
        checker: {
            configType: 'flat',
        },
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
        routeRules: {
            '/discord': {
                redirect: 'https://discord.gg/MtFKhMPePe',
            },
            '/layers/carto/**': {
                proxy: 'https://cartodb-basemaps-a.global.ssl.fastly.net/**',
            },
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
        build: {
            rollupOptions: {
                external: [
                    'sharp',
                ],
            },
        },
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
                                    cleanupIds: false,
                                    mergePaths: false,
                                },
                            },
                        },
                        'convertStyleToAttrs',
                        'reusePaths',
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
