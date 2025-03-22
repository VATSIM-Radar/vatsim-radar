# About Us

## What is VATSIM Radar?

VATSIM Radar is an online map to show VATSIM traffic and all possible VATSIM-related data.

## When was it created?

VATSIM Radar beta was opened to public on 17 April 2024. 

##\ What are VATSIM Radar technologies?

We are built on Vue and Nuxt. Map is powered by OpenLayers, our backend is Nitro, Prisma and MySQL. 

## How to support VATSIM Radar?

Visit https://vatsim-radar.com/support-us for more details. Money go to Map Layers, Cloudflare and Servers. In exchange, you will get your name on mentioned page and access to early builds. 

## How to contact development team?

Email us on dan@vatsim-radar.com.

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
    title: 'VATSIM Assistant to the Vice President - Supervisors. MSFS Discord Moderator. Cardiac Nurse. ICT-advisor and Python novice. VR Discord moderator. A cool guy',
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
