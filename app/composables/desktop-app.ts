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
    appAsVatsimRadar: boolean;
    pilotCallsign?: string;
    atcCallsign?: string;
    startTimestamp?: string;
}

let data: VatsimLiveDataShort | undefined;

function getFlightPresence(flight: VatsimShortenedAircraft) {
    const presence: DiscordPresenceBody = {
        details: '',
        state: '',
        appAsVatsimRadar: useStore().localSettings.app?.presence?.appAsVATSIMRadar !== false,
    };

    if (flight.departure || flight.arrival) {
        presence.details = `${ flight?.departure ?? 'ZZZZ' } - ${ flight?.arrival ?? 'ZZZZ' } as ${ flight.callsign }`;
    }
    else presence.details = flight.callsign;

    presence.pilotCallsign = flight.callsign;
    presence.startTimestamp = flight.logon_time;

    switch (flight?.status) {
        case 'cruising':
        case 'enroute':
            presence.state = `Enroute - ${ flight.toGoDist }NM remains`;
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
            presence.state = `Descending - ${ flight.toGoDist }NM remains`;
            break;
        case 'arriving':
            presence.state = `Arriving`;
            break;
        default:
            presence.state = 'Unknown';
    }

    return presence;
}

export function getDiscordPresence() {
    const store = useStore();
    const { pilot, atc, observer } = store.localSettings.app?.presence?.modes ?? {};
    const cid = store.user?.cid && Number(store.user.cid);

    if ((!pilot && !atc && !observer) || !cid || !data) return;

    const presence: DiscordPresenceBody = {
        details: '',
        state: '',
        appAsVatsimRadar: store.localSettings.app?.presence?.appAsVATSIMRadar !== false,
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
        if (inProgress) return;

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
