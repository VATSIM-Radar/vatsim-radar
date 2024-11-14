import PatreonIcon from 'assets/icons/basic/patreon.svg?component';
import MapIcon from 'assets/icons/kit/map.svg?component';
import DataIcon from 'assets/icons/kit/data.svg?component';
import EventsIcon from 'assets/icons/kit/event.svg?component';
import PathIcon from 'assets/icons/kit/path.svg?component';

export interface HeaderItem {
    text: string;
    active: boolean;
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

    return [
        {
            text: 'Map',
            path: '/',
            icon: MapIcon,
        },
        {
            text: 'Events',
            path: '/events',
            icon: EventsIcon,
        },
        {
            text: 'Stats',
            disabled: true,
            icon: DataIcon,
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
                    path: '/about',
                },
                {
                    text: 'Install App',
                    hide: app.$pwa?.isPWAInstalled || !app.$pwa?.showInstallPrompt,
                    action: () => {
                        return app.$pwa?.install().then(console.log).catch(console.error);
                    },
                },
            ].filter(x => !x.hide),
        },
    ].map(x => {
        return {
            ...x,
            active: (x.path === route.path || !!x.children?.some(x => x.path === route.path)),
            children: x.children && x.children.map(x => ({
                ...x,
                active: x.path === route.path,
            })),
        } satisfies HeaderItem as HeaderItem;
    });
});

export const useOnlineCounters = () => computed(() => {
    const dataStore = useDataStore();

    const [atc, atis] = dataStore.vatsim.data.locals.value.reduce((acc, atc) => {
        if (atc.isATIS) acc[0]++;
        else acc[1]++;
        return acc;
    }, [0, 0]);

    return {
        inRadar: dataStore.vatsim.data.general?.value?.onlineWSUsers,
        total: dataStore.vatsim.data.general.value?.unique_users,
        firs: dataStore.vatsim.data.firs.value.length,
        atc,
        atis,
        pilots: dataStore.vatsim.data.pilots.value.length,
        sups: dataStore.vatsim.data.general.value?.supsCount,
        adm: dataStore.vatsim.data.general.value?.admCount,
    };
});
