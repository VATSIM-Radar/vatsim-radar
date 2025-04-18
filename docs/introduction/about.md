# About Us

## What is VATSIM Radar?

VATSIM Radar is the go-to VATSIM Flight Tracker. It is a feature-rich tool that supports your flying or controlling experience!

## When was it created?

VATSIM Radar Beta was opened to the public on `17 April 2024`. That is the same day that Sean Bean turned 66. Coincidence? We think not.

## How is VATSIM Radar powered?

VATSIM Radar is built using Vue and Nuxt.
Our map is powered by OpenLayers, while our backend is Nitro, Prisma and MySQL. 

## How to support VATSIM Radar?
VATSIM Radar is funded by generous members of the community!
In order to keep VATSIM Radar running and support future development, we have set up a Patreon page. 

Funds will be used to pay for map layers, Cloudflare and Server traffic.

Donators get access to Early-Access branches, dedicated Discord channels to discuss and engage in the development, and their name showcased on our Patreon Appreciation page.

:point_right: **Visit our [Patreon page](https://vatsim-radar.com/support-us) for more details!** :point_left:

## How to contact the development team?

Don't be a stranger; [Email us!](mailto:dan@vatsim-radar.com)

## How to contribute to VATSIM Radar?

Visit [Contributing](/contributing/) to learn more.

## How to change VATSIM Radar displayed ATC data?

Visit [Data](/contributing/data) to learn more.

## Who is behind VATSIM Radar?

<script setup>
import { VPTeamMembers } from 'vitepress/theme'

const members = [
  {
    avatar: 'https://avatars.githubusercontent.com/u/10450717?v=4',
    name: 'Danila Rodichkin',
    title: 'Founder',
    links: [
      { icon: 'github', link: 'https://github.com/daniluk4000' }
    ]
  },
    {
    avatar: '/people/xenia.jpg',
    name: 'Xenia',
    title: 'Lead Designer',
    links: [
      { icon: 'behance', link: 'https://www.behance.net/renelvah' }
    ]
  },
];

const contributors = [
  {
    avatar: '/people/serega.jpg',
    name: 'Sergey Lukashenko',
    title: 'DevOps',
    desc: 'Set up and hosted whole infrastructure of VATSIM Radar for a long time',
    },
    {
    avatar: '/logo.svg',
    name: 'Ivan Buev',
    title: 'Developer',
    desc: 'Created basis for tracks system',
  },
{
    avatar: 'https://avatars.githubusercontent.com/u/79384776?v=4',
    name: 'Mats Edvin Aarø',
    title: 'VATSIM Asst. VP Supervisors. Nurse and programming novice. An *extremely* cool guy.',
    desc: 'Made most of aircraft icons',
links: [
      { icon: 'github', link: 'https://github.com/DotWallop' }
    ]
  },
{
    avatar: '/logo.svg',
    name: 'Felix',
    title: 'Developer',
    desc: 'Developed VATGlasses integration and other things',
links: [
      { icon: 'github', link: 'https://github.com/FX5F' }
    ]
  },
{
    avatar: '/logo.svg',
    name: 'Noah Elijah Till',
    title: 'Developer',
    desc: 'Developed ATC Bookings and other things',
links: [
      { icon: 'github', link: 'https://github.com/MindCollaps' }
    ]
  },
]
</script>

### Main team

<VPTeamMembers size="medium" :members="members" />

### Major Contributors

<VPTeamMembers size="small" :members="contributors" />
