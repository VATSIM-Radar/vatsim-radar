import svgLoader from 'vite-svg-loader';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const _dirname = dirname(fileURLToPath(import.meta.url));
const appDataIgnorePatterns = [
    'app/data',
    'app/data/**',
    '**/app/data',
    '**/app/data/**',
    resolve(_dirname, 'app/data'),
    resolve(_dirname, 'app/data/**'),
];

function isDebug() {
    return process.env.VR_DEBUG === '1' || import.meta.dev || process.env.NODE_ENV === 'development';
}

let appName = 'VATSIM Radar';

if (process.env.NODE_ENV === 'development') appName = 'VATSIM Radar Dev';
if (process.env.DOMAIN?.includes('next')) appName = 'VATSIM Radar Next';

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
    ignore: appDataIgnorePatterns,

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
                    rel: 'shortcut icon',
                    href: '/favicon.ico',
                },
                {
                    rel: 'icon',
                    type: 'image/png',
                    sizes: '96x96',
                    href: '/favicon-96x96.png',
                },
                {
                    rel: 'icon',
                    type: 'image/png',
                    sizes: '32x32',
                    href: '/favicon-32x32.png',
                },
            ],
            meta: [
                {
                    name: 'viewport',
                    content: 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no',
                },
                {
                    name: 'apple-mobile-web-app-title',
                    content: 'VATSIM Radar',
                },
            ],
        },
    },

    alias: {
        '#prisma': resolve(_dirname, '.nuxt/prisma/client'),
    },

    hooks: {
        'components:dirs': dirs => {
            dirs.length = 0;
        },
    },

    srcDir: 'app/',

    imports: {
        dirs: ['composables/**'],
    },

    sourcemap: {
        client: process.env.NODE_ENV === 'development',
        server: true,
    },

    pinia: {
        storesDirs: ['**/store/**'],
    },

    compatibilityDate: '2024-12-12',

    experimental: {
        asyncContext: false,
        clientFallback: false,
        ssrStreaming: false,
        writeEarlyHints: true,
        prefetchPreloadTags: true,
        typescriptPlugin: true,
        watcher: 'builder',
        defaults: {
            nuxtLink: {
                prefetchOn: {
                    visibility: false,
                    interaction: true,
                },
            },
        },
        inlineRouteRules: true,
        checkOutdatedBuildInterval: 1000 * 60 * 5,
    },

    runtimeConfig: {
        NAVIGRAPH_CLIENT_ID: process.env.NAVIGRAPH_CLIENT_ID,
        NAVIGRAPH_CLIENT_SECRET: process.env.NAVIGRAPH_CLIENT_SECRET,

        VATSIM_VOICE_USERNAME: process.env.VATSIM_VOICE_USERNAME,
        VATSIM_VOICE_PASSWORD: process.env.VATSIM_VOICE_PASSWORD,

        NAVIGRAPH_SERVER_ID: process.env.NAVIGRAPH_SERVER_ID,
        NAVIGRAPH_SERVER_SECRET: process.env.NAVIGRAPH_SERVER_SECRET,
        NAVIGRAPH_HOST: process.env.NAVIGRAPH_HOST,

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

        QUESTDB_HOST: process.env.QUESTDB_HOST,
        QUESTDB_HTTP_URL: process.env.QUESTDB_HTTP_URL,
        QUESTDB_HTTP_PORT: process.env.QUESTDB_HTTP_PORT,
        QUESTDB_CLIENT_CONF: process.env.QUESTDB_CLIENT_CONF,
        QUESTDB_TABLE_MAIN: process.env.QUESTDB_TABLE_MAIN,
        QUESTDB_TABLE_PLANS: process.env.QUESTDB_TABLE_PLANS,
        QUESTDB_TIMESTAMP_COLUMN: process.env.QUESTDB_TIMESTAMP_COLUMN,
        QUESTDB_ENABLE_WRITE: process.env.QUESTDB_ENABLE_WRITE,
        PATREON_ACCESS_TOKEN: process.env.PATREON_ACCESS_TOKEN,
        IFRAME_TOKEN: process.env.IFRAME_TOKEN,

        FAA_NOTAMS_CLIENT_ID: process.env.FAA_NOTAMS_CLIENT_ID,
        FAA_NOTAMS_CLIENT_SECRET: process.env.FAA_NOTAMS_CLIENT_SECRET,

        VIFF_API_TOKEN: process.env.VIFF_API_TOKEN,
        AERONAV_API_TOKEN: process.env.AERONAV_API_TOKEN,

        public: {
            DOMAIN: process.env.DOMAIN,
            IS_DOWN: process.env.IS_DOWN,
            DISABLE_WEBSOCKETS: process.env.DISABLE_WEBSOCKETS,
            VR_DEBUG: process.env.VR_DEBUG,
        },
    },

    modules: [
        '@nuxt/devtools',
        '@pinia/nuxt',
        '@nuxt/eslint',
        '@nuxtjs/stylelint-module',
        '@vite-pwa/nuxt',
        '@vueuse/nuxt',
        '@nuxt/image',
    ],

    eslint: {
        checker: {
            eslintPath: 'eslint',
            configType: 'flat',
        },
    },

    stylelint: {
        files: ['app/**/*.scss', 'app/**/*.css', 'app/**/*.vue'],
        emitError: true,
        emitWarning: true,
        failOnWarning: false,
        failOnError: false,
        lintOnStart: false,
        cache: false,
    },

    nitro: {
        ignore: appDataIgnorePatterns,
        watchOptions: {
            ignored: appDataIgnorePatterns,
        },
        devProxy: {
            host: '127.0.0.1',
        },
        routeRules: {
            '/discord': {
                redirect: 'https://discord.gg/MtFKhMPePe',
            },
            '/vg': {
                redirect: `${ process.env.DOMAIN }/?vg=1`,
            },
            '/layers/esri/**': {
                proxy: 'https://ibasemaps-api.arcgis.com/**',
            },
        },
    },

    devServer: {
        port: 8080,
    },

    typescript: {
        // TODO restore
        typeCheck: false,
        tsConfig: {
            compilerOptions: {
                noUncheckedIndexedAccess: false,
                types: ['vite-svg-loader'],
            },
        },
    },

    pwa: {
        registerType: 'prompt',
        client: {
            periodicSyncForUpdates: 1000 * 60 * 5,
            installPrompt: true,
        },
        injectRegister: isDebug() ? false : 'auto',
        selfDestroying: isDebug(),
        workbox: {
            cleanupOutdatedCaches: true,
            globPatterns: [
                '**/*.{js,css,woff,woff2,ttf,otf,svg,webmanifest}',
            ],
            navigateFallback: null,
            runtimeCaching: [
                {
                    urlPattern: ({ request, url }) => {
                        return request.method === 'GET' &&
                            url.origin === self.location.origin &&
                            /\.(?:js|css|woff2?|ttf|otf|ico|png|svg|webp|avif)$/i.test(url.pathname);
                    },
                    handler: 'CacheFirst',
                    options: {
                        cacheName: 'static-assets-v2',
                        expiration: {
                            maxEntries: 500,
                            maxAgeSeconds: 60 * 60 * 24 * 30,
                        },
                        cacheableResponse: {
                            statuses: [200],
                        },
                    },
                },
            ],
        },
        manifest: {
            name: appName,
            short_name: appName,
            description: 'VATSIM Traffic Monitoring Service',
            theme_color: '???',
            display: 'standalone',
            // @ts-expect-error tabbed not supported here
            display_override: ['window-controls-overlay', 'tabbed', 'standalone'],
            start_url: '/',
            dir: 'ltr',
            lang: 'en',
            handle_links: 'not-preferred',
            edge_side_panel: {
                preferred_width: 400,
            },
            icons: [
                {
                    src: 'web-app-manifest-192x192.png',
                    sizes: '192x192',
                    type: 'image/png',
                },
                {
                    src: 'web-app-manifest-512x512.png',
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
        optimizeDeps: {
            include: [
                'deep-equal',
                'vue-draggable-plus',
                'ua-parser-js',
                '@turf/distance',
                'fast-xml-parser',
                'merge-ranges',
                '@turf/meta',
                '@turf/union',
                '@turf/difference',
                '@turf/intersect',
                '@turf/kinks',
                '@turf/line-intersect',
                'ol/control.js',
                'ol/interaction.js',
                'ol/interaction/Pointer.js',
                'ol/layer/Group.js',
                'ol/style.js',
                'ol/source/Vector.js',
                'ol/sphere.js',
                'ol/Observable.js',
                'ol/layer/Vector.js',
                'ol/layer/VectorImage.js',
                'ol-ext/source/DayNight',
                'ol/layer/Tile.js',
                'ol/source.js',
                'ol/TileState.js',
                'ol-mapbox-style',
                'ol/layer/VectorTile.js',
                'ol/source/Vector.js',
                'ol/layer/VectorImage.js',
                '@protomaps/basemaps',
                'ol/layer.js',
                'ol/interaction/Select.js',
                'ol/events/condition.js',
                '@turf/great-circle',
                'magvar',
                '@turf/bearing',
                'ol/style/Style.js',
                'ol/style.js',
                'ol/math.js',
                'ol/geom.js',
                'ol/style/Circle.js',
                'dexie',
            ],
        },
        build: {
            cssMinify: 'esbuild',
            rollupOptions: {
                external: [
                    'sharp',
                ],
            },
        },
        server: {
            allowedHosts: ['localhost', 'frontend', 'nuxt', 'bs-local'],
            watch: {
                ignored: appDataIgnorePatterns,
            },
        },
        css: {
            preprocessorMaxWorkers: true,
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

    devtools: {
        enabled: false,
    },
});
