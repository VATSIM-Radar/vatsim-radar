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
                        text: 'Next Changelog',
                        link: 'https://github.com/VATSIM-Radar/vatsim-radar/blob/next/CHANGELOG.md',
                    },
                    {
                        text: 'Production Changelog',
                        link: 'https://github.com/VATSIM-Radar/vatsim-radar/blob/main/CHANGELOG.md',
                    },
                ],
            },
        ],

        sidebar: [
            {
                text: 'Introduction',
                items: [
                    {
                        text: 'About us & FAQ',
                        link: '/introduction/about',
                    },
                    {
                        text: 'Features',
                        link: '/introduction/features/',
                    },
                ],
            },
            {
                text: 'Contributing',
                link: '/contributing/',
                items: [
                    {
                        text: 'Report an issue/request',
                        link: 'https://github.com/VATSIM-Radar/vatsim-radar/issues/new/choose',
                    },
                    {
                        text: 'Developing VR',
                        link: '/contributing/setting-up',
                    },
                    {
                        text: 'ATC/Airports Data',
                        link: '/contributing/data',
                    },
                    {
                        text: 'Display your VA badge',
                        link: '/contributing/va',
                    },
                    {
                        text: 'Airlines data',
                        link: '/contributing/airlines',
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
