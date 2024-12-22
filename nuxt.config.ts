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
                    rel: 'mask-icon',
                    href: '/safari-pinned-tab.svg',
                    color: '#3b6cec',
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
    compatibilityDate: '2024-12-12',
    experimental: {
        appManifest: true,
        asyncContext: true,
        clientFallback: false,
        defaults: {
            useAsyncData: {
                deep: false,
            },
            nuxtLink: {
                prefetchOn: {
                    visibility: false,
                    interaction: true,
                },
            },
        },
        headNext: true,
        inlineRouteRules: true,
        checkOutdatedBuildInterval: 1000 * 60 * 5,
    },
    runtimeConfig: {
        NAVIGRAPH_CLIENT_ID: process.env.NAVIGRAPH_CLIENT_ID,
        NAVIGRAPH_CLIENT_SECRET: process.env.NAVIGRAPH_CLIENT_SECRET,

        NAVIGRAPH_SERVER_ID: process.env.NAVIGRAPH_SERVER_ID,
        NAVIGRAPH_SERVER_SECRET: process.env.NAVIGRAPH_SERVER_SECRET,

        VATSIM_CLIENT_ID: process.env.VATSIM_CLIENT_ID,
        VATSIM_CLIENT_SECRET: process.env.VATSIM_CLIENT_SECRET,
        VATSIM_ENDPOINT: process.env.VATSIM_ENDPOINT,

        DATABASE_URL: process.env.DATABASE_URL,
        DISCORD_CLIENT_ID: process.env.DISCORD_CLIENT_ID,
        DISCORD_TOKEN: process.env.DISCORD_TOKEN,
        DISCORD_SERVER_ID: process.env.DISCORD_SERVER_ID,
        DISCORD_INTERNAL_SERVER_ID: process.env.DISCORD_INTERNAL_SERVER_ID,
        DISCORD_RELEASES_CHANNEL_ID: process.env.DISCORD_RELEASES_CHANNEL_ID,
        DISCORD_ROLE_ID: process.env.DISCORD_ROLE_ID,
        ACCESS_BY_DISCORD_ROLES: process.env.ACCESS_BY_DISCORD_ROLES,

        VATSIM_KAFKA_BROKER: process.env.VATSIM_KAFKA_BROKER,
        VATSIM_KAFKA_USER: process.env.VATSIM_KAFKA_USER,
        VATSIM_KAFKA_PASSWORD: process.env.VATSIM_KAFKA_PASSWORD,
        VATSIM_KAFKA_GROUP: process.env.VATSIM_KAFKA_GROUP,

        INFLUX_URL: process.env.INFLUX_URL,
        INFLUX_TOKEN: process.env.INFLUX_TOKEN,
        INFLUX_ORG: process.env.INFLUX_ORG,
        INFLUX_BUCKET_MAIN: process.env.INFLUX_BUCKET_MAIN,
        INFLUX_BUCKET_PLANS: process.env.INFLUX_BUCKET_PLANS,
        INFLUX_ENABLE_WRITE: process.env.INFLUX_ENABLE_WRITE,
        INFLUX_BUCKET_ONLINE: process.env.INFLUX_BUCKET_ONLINE,
        PATREON_ACCESS_TOKEN: process.env.PATREON_ACCESS_TOKEN,

        FAA_NOTAMS_CLIENT_ID: process.env.FAA_NOTAMS_CLIENT_ID,
        FAA_NOTAMS_CLIENT_SECRET: process.env.FAA_NOTAMS_CLIENT_SECRET,

        public: {
            DOMAIN: process.env.DOMAIN,
            IS_DOWN: process.env.IS_DOWN,
            DISABLE_WEBSOCKETS: process.env.DISABLE_WEBSOCKETS,
        },
    },
    modules: [
        '@nuxt/devtools',
        '@pinia/nuxt',
        '@nuxt/eslint',
        '@nuxtjs/stylelint-module',
        '@vite-pwa/nuxt',
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
                proxy: 'https://a.basemaps.cartocdn.com/**',
            },
            '/layers/jawg/**': {
                proxy: 'https://tile.jawg.io/**',
            },
            '/layers/mapbox/**': {
                proxy: `https://api.mapbox.com/styles/v1/daniluk4000/**`,
            },
        },
    },
    devServer: {
        port: 8080,
    },
    typescript: {
        typeCheck: true,
    },
    pwa: {
        registerType: 'autoUpdate',
        client: {
            periodicSyncForUpdates: 1000 * 60 * 5,
            installPrompt: true,
        },
        manifest: {
            name: 'VATSIM Radar',
            short_name: 'VATSIM Radar',
            description: 'VATSIM Traffic Monitoring Service',
            theme_color: '???',
            display: 'standalone',
            // @ts-expect-error tabbed not supported here
            display_override: ['window-controls-overlay', 'tabbed', 'standalone'],
            start_url: '/',
            dir: 'ltr',
            lang: 'en',
            handle_links: 'not-preferred',
            icons: [
                {
                    src: 'android-chrome-192x192.png',
                    sizes: '192x192',
                    type: 'image/png',
                },
                {
                    src: 'android-chrome-512x512.png',
                    sizes: '512x512',
                    type: 'image/png',
                },
            ],
        },
        devOptions: {
            enabled: false,
        },
    },
    vite: {
        build: {
            cssMinify: 'esbuild',
            rollupOptions: {
                external: [
                    'sharp',
                ],
            },
        },
        css: {
            preprocessorMaxWorkers: true,
            preprocessorOptions: {
                scss: {
                    api: 'modern-compiler',
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
