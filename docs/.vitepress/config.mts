import { defineConfig } from 'vitepress';
import packageJson from '../../package.json' with { type: 'json' };

// https://vitepress.dev/reference/site-config
export default defineConfig({
    title: 'VATSIM Radar',
    description: 'Documentation describing VATSIM Radar features and more',
    lang: 'en-US',
    head: [
        ['link', { rel: 'icon', type: 'image/png', sizes: '32x32', href: '/favicon-32x32.png' }],
        ['link', { rel: 'icon', type: 'image/png', sizes: '16x16', href: '/favicon-16x16.png' }],
    ],
    themeConfig: {
        outline: {
            level: [2, 3],
        },
        docFooter: {
            prev: false,
            next: false,
        },
        // https://vitepress.dev/reference/default-theme-config
        nav: [
            {
                text: 'Home',
                link: '/',
            },
            {
                text: 'FAQ',
                link: '/introduction/faq',
            },
            {
                text: 'Contributing',
                link: '/contributing/',
            },
            {
                text: packageJson.version,
                items: [
                    {
                        text: 'Report an issue / request a feature',
                        link: 'https://github.com/VATSIM-Radar/vatsim-radar/issues/new/choose',
                    },
                    {
                        text: 'Changelog',
                        link: '/changelog',
                    },
                    {
                        text: 'Next Changelog',
                        link: 'https://github.com/VATSIM-Radar/vatsim-radar/blob/next/CHANGELOG.md',
                    },
                ],
            },
        ],

        sidebar: [
            {
                text: 'Introduction',
                items: [
                    {
                        text: 'About Us',
                        link: '/introduction/about',
                    },
                    {
                        text: 'FAQ',
                        link: '/introduction/faq',
                    },
                    {
                        text: 'Features',
                        link: '/introduction/features/',
                    },
                    {
                        text: 'Changelog',
                        link: '/changelog',
                    },
                ],
            },
            {
                text: 'Contributing',
                link: '/contributing/',
                items: [
                    {
                        text: 'Developing VR',
                        link: '/contributing/setting-up',
                    },
                    {
                        text: 'ATC/Airports Data',
                        link: '/contributing/data',
                        items: [
                            {
                                text: 'Data debugging',
                                link: '/contributing/debug',
                            },
                            {
                                text: 'Extending ATC sectors',
                                link: '/guide/duplicating',
                            },
                        ]
                    },
                    {
                        text: 'Display your VA badge',
                        link: '/contributing/va',
                    },
                    {
                        text: 'Airlines data',
                        link: '/contributing/airlines',
                    },
                    {
                        text: 'Report an issue/request',
                        link: 'https://github.com/VATSIM-Radar/vatsim-radar/issues/new/choose',
                    },
                ],
            },
        ],

        socialLinks: [
            {
                icon: 'discord',
                link: 'https://vatsim-radar.com/discord',
            },
            {
                icon: 'github',
                link: 'https://github.com/VATSIM-Radar/vatsim-radar',
            },
        ],
        externalLinkIcon: true,
        editLink: {
            pattern: 'https://github.com/VATSIM-Radar/vatsim-radar/tree/next/docs/:path',
        },
        sidebarMenuLabel: packageJson.version,
        logo: {
            src: '/logo.svg',
        },
    },
});
