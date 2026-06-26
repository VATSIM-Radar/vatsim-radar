import { observerFlight } from '~/composables/vatsim/pilots';
import type {
    VatsimLiveDataShort,
    VatsimShortenedAircraft,
} from '~/types/data/vatsim';

export const trayValue = ref(false);

export function getTrayValue() {
    // @ts-expect-error Unknown object
    if (typeof window.vatsimRadar === 'undefined') return;

    // @ts-expect-error Unknown object
    window.vatsimRadar.getTrayValue().then(x => trayValue.value = x).catch(console.error);
}

if (typeof window !== 'undefined') getTrayValue();

interface DiscordPresenceBody {
    details: string;
    state: string;
    pilotCallsign?: string;
    atcCallsign?: string;
    startTimestamp?: string;
}

let data: VatsimLiveDataShort | undefined;

function getFlightPresence(flight: VatsimShortenedAircraft) {
    const dataStore = useDataStore();

    const presence: DiscordPresenceBody = {
        details: '',
        state: '',
    };

    if (flight.departure || flight.arrival) {
        presence.details = `${ flight?.departure ?? 'ZZZZ' } - ${ flight?.arrival ?? 'ZZZZ' } as ${ flight.callsign }`;
    }
    else presence.details = flight.callsign;

    presence.pilotCallsign = flight.callsign;
    presence.startTimestamp = flight.logon_time;

    const toGoLocal = dataStore.navigraphWaypoints.value[flight.cid]?.calculatedArrival;

    const toGoDist = toGoLocal?.toGoDist ?? flight.toGoDist;

    switch (flight?.status) {
        case 'cruising':
        case 'enroute':
            presence.state = `Enroute${ toGoDist ? ` - ${ Math.round(toGoDist) }NM remaining` : '' }`;
            break;
        case 'depGate':
        case 'depTaxi':
            presence.state = `Departing`;
            break;
        case 'arrTaxi':
        case 'arrGate':
            presence.state = `Landed`;
            break;
        case 'departed':
            presence.state = `Departed`;
            break;
        case 'climbing':
            presence.state = `Climbing`;
            break;
        case 'descending':
            presence.state = `Descending${ toGoDist ? ` - ${ Math.round(toGoDist) }NM remaining` : '' }`;
            break;
        case 'arriving':
            presence.state = `Arriving`;
            break;
        default:
            presence.state = 'Unknown';
    }

    return presence;
}

function getOfflinePresence() {
    const presence: DiscordPresenceBody = {
        details: 'Offline',
        state: '',
    };

    const mapStore = useMapStore();
    const route = useRoute();

    if (route.path.startsWith('/events')) {
        presence.state = 'Looking for event to attend';
        return presence;
    }

    if (route.path.startsWith('/bookings')) {
        presence.state = 'Browsing bookings';
        return presence;
    }

    if (route.path.startsWith('/stats')) {
        presence.state = 'Browsing network stats';
        return presence;
    }

    if (route.path.startsWith('/sigmets')) {
        presence.state = 'Checking SIGMETs';
        return presence;
    }

    if (route.path.startsWith('/dashboard')) {
        presence.state = 'Watching for traffic in Dashboard';
        return presence;
    }

    if (mapStore.overlays.some(x => x.type === 'pilot' || x.type === 'atc')) {
        presence.state = 'Spying on someone';
        return presence;
    }

    if (mapStore.overlays.some(x => x.type === 'airport')) {
        presence.state = 'Looking on airport traffic';
        return presence;
    }

    presence.state = 'Browsing across the map';
    return presence;
}

export function getDiscordPresence() {
    const store = useStore();
    const { pilot, atc, observer, offline } = store.localSettings.app?.presence?.modes ?? {};
    const cid = store.user?.cid && Number(store.user.cid);

    if ((!pilot && !atc && !observer) || !cid || !data) {
        if (offline) return getOfflinePresence();

        return;
    }

    const presence: DiscordPresenceBody = {
        details: '',
        state: '',
    };

    const ownFlight = pilot ? data.pilots.find(x => x.cid === cid) : undefined;

    if (ownFlight) {
        return getFlightPresence(ownFlight);
    }
    else if (pilot) {
        const prefile = data.prefiles.find(x => x.cid === cid);

        if (prefile) {
            presence.details = `${ prefile?.departure } - ${ prefile?.arrival } as ${ prefile.callsign }`;
            presence.state = 'Preparing for a flight';
            return presence;
        }
    }

    if (atc) {
        const atc = data.controllers.find(x => x.cid === cid);

        if (atc) {
            presence.details = atc.callsign;
            presence.state = 'Controlling';
            presence.atcCallsign = atc.callsign;
            presence.startTimestamp = atc.logon_time;
            return presence;
        }

        const sup = data.general.sups.find(x => x.cid === cid);

        if (sup) {
            presence.details = sup.callsign;
            presence.state = 'SUPing';
            presence.startTimestamp = sup.logon_time;
            return presence;
        }
    }

    if (observer) {
        if (observerFlight.value) {
            const presence = getFlightPresence(observerFlight.value);
            if (presence) return presence;
        }

        const observer = data.observers.find(x => x.cid === cid);
        if (observer) {
            presence.details = observer.callsign;
            presence.state = 'Observing...';
            presence.startTimestamp = observer.logon_time;
            return presence;
        }
    }

    if (offline) return getOfflinePresence();
}

let isSet = false;

export async function setDiscordPresence(set = true) {
    if (set) {
        const presence = getDiscordPresence();
        if (!presence) {
            if (isSet) return setDiscordPresence(false);
            else return;
        }

        await $fetch('http://localhost:8442/presence', {
            method: 'POST',
            body: presence,
        });

        isSet = true;
    }
    else {
        await $fetch('http://localhost:8442/presence', {
            method: 'DELETE',
        });
        isSet = false;
    }
}

let interval: NodeJS.Timeout | undefined;
let inProgress = false;

export async function initDiscordPresenceUpdate() {
    if (interval) return;

    const store = useStore();

    if (store.config.dashboardId) return;

    // Causing watch leak, intended
    nextTick(() => {
        const relevantSettings = computed(() => store.localSettings.app?.presence);

        watch(relevantSettings, () => {
            setDiscordPresence();
        });
    });

    try {
        data = await $fetch<VatsimLiveDataShort>(`/api/data/vatsim/data/short`, {
            timeout: 1000 * 60,
        });

        await setDiscordPresence();
    }
    catch (e) {
        console.error(e);
    }

    interval = setInterval(async () => {
        if (inProgress || (
            !store.localSettings?.app?.presence?.modes?.atc &&
            !store.localSettings?.app?.presence?.modes?.pilot &&
            !store.localSettings?.app?.presence?.modes?.observer
        )) {
            if (!inProgress) setDiscordPresence();
            return;
        }

        try {
            inProgress = true;
            data = await $fetch<VatsimLiveDataShort>(`/api/data/vatsim/data/short`, {
                timeout: 1000 * 60,
            });

            await setDiscordPresence();
        }
        catch (e) {
            console.error(e);
        }
        finally {
            inProgress = false;
        }
    }, 30000);
}
