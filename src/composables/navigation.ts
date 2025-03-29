import PatreonIcon from 'assets/icons/basic/patreon.svg?component';
import MapIcon from 'assets/icons/kit/map.svg?component';
import DataIcon from 'assets/icons/kit/data.svg?component';
import EventsIcon from 'assets/icons/kit/event.svg?component';
import CalendarIcon from 'assets/icons/kit/calendar.svg?component';
import BookingsIcon from 'assets/icons/kit/bookings.svg?component';
import PathIcon from 'assets/icons/kit/path.svg?component';
import { useStore } from '~/store';
import { useError } from '~/composables/errors';

export interface HeaderItem {
    text: string;
    active?: boolean;
    action?: () => any;
    path?: string;
    disabled?: boolean;
    hide?: boolean;
    width?: string;
    icon?: Component;
    children?: Omit<HeaderItem, 'children' | 'minWidth'>[];
}

export const useHeaderMenu = () => computed<HeaderItem[]>(() => {
    const app = useNuxtApp();
    const route = useRoute();
    const store = useStore();
    const isMobile = useIsMobile();

    const menu: HeaderItem[] = [
        {
            text: 'Map',
            path: '/',
            icon: MapIcon,
            children: [
                {
                    text: 'Map',
                    path: '/',
                },
                {
                    text: 'SIGMETs',
                    path: '/sigmets',
                },
            ],
        },
        {
            text: 'Calendar',
            icon: CalendarIcon,
            children: [
                {
                    text: 'Bookings',
                    path: '/bookings',
                    icon: BookingsIcon,
                },
                {
                    text: 'Events',
                    path: '/events',
                    icon: EventsIcon,
                },
            ],
        },
        {
            text: 'Stats',
            icon: DataIcon,
            children: [
                {
                    text: 'Airports',
                    path: '/stats/airports',
                },
                {
                    text: 'Airlines',
                    path: '/stats/airlines',
                },
                {
                    text: 'Aircraft',
                    path: '/stats/aircraft',
                },
                {
                    text: 'Routes',
                    path: '/stats/routes',
                },
                {
                    text: 'Pilots',
                    path: '/stats/pilots',
                },
                {
                    text: 'ATC',
                    path: '/stats/atc',
                },
            ],
        },
        {
            text: 'Featured Airports',
            active: !!store.featuredAirportsOpen,
            hide: !isMobile.value || route.path !== '/',
            action: () => store.featuredAirportsOpen = !store.featuredAirportsOpen,
        },
        {
            text: 'About',
            width: '150px',
            children: [
                {
                    text: 'Roadmap',
                    path: '/roadmap',
                    icon: PathIcon,
                },
                {
                    text: 'Support us',
                    path: '/support-us',
                    icon: PatreonIcon,
                },
                {
                    text: 'Privacy Policy',
                    path: '/privacy-policy',
                },
                {
                    text: 'About Us',
                    path: 'https://docs.vatsim-radar.com',
                },
                {
                    text: 'Customize Data Policy',
                    action: () => {
                        return store.cookieCustomize = true;
                    },
                },
                {
                    text: 'Install App',
                    active: false,
                    hide: app.$pwa?.isPWAInstalled || !app.$pwa?.showInstallPrompt,
                    action: () => {
                        return app.$pwa?.install().then(console.log).catch(useError);
                    },
                },
            ].filter(x => !x.hide),
        },
    ];

    return menu.filter(x => !x.hide).map(x => {
        return {
            ...x,
            active: x.active ?? (x.path === route.path || !!x.children?.some(x => x.path === route.path)),
            children: x.children && x.children.map(x => ({
                ...x,
                active: x.active ?? x.path === route.path,
            })),
        } satisfies HeaderItem as HeaderItem;
    });
});

const datetime = new Intl.DateTimeFormat(['en-GB'], {
    timeZone: 'UTC',
    localeMatcher: 'best fit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
});

export const useOnlineCounters = () => computed(() => {
    const dataStore = useDataStore();

    const [atc, atis] = dataStore.vatsim.data.locals.value.reduce((acc, atc) => {
        if (atc.isATIS) acc[0]++;
        else acc[1]++;
        return acc;
    }, [0, 0]);

    const updateTimestamp = dataStore.vatsim.updateTime.value;

    const date = updateTimestamp ? new Date(updateTimestamp) : null;

    return {
        inRadar: dataStore.vatsim.data.general?.value?.onlineWSUsers,
        total: dataStore.vatsim.data.general.value?.unique_users,
        firs: dataStore.vatsim.data.firs.value.length,
        atc,
        atis,
        pilots: dataStore.vatsim.data.pilots.value.length,
        sups: dataStore.vatsim.data.general.value?.supsCount,
        adm: dataStore.vatsim.data.general.value?.admCount,
        lastUpdated: date && `${ datetime.format(date) } Z`,
    };
});
