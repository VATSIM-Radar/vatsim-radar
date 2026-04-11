const common = [
    'FOR ARRIVALS AND DEPARTURES',
    'FOR ARRIVALS, AND DEPARTURES',
    'LANDING AND DEPARTING RUNWAY',
    'LANDING AND DEPARTING RWYS',
    'ACTIVE RWY',
    'ARR AND DEPTG',
    'RUNWAY IN USE',
    'RUNWAYS IN USE',
    'RWY IN USE',
    'ARR AND DEPTG',
    'LDG AND DEPTG',
    'LDG AND DEPTG RWYS',
];

const depMarkers = [
    'DEPARTURE RUNWAY',
    'DEPARTURE RWY',
    'DEP RWY',
    'DEP RWYS',
    'DPTG RWY',
    'DEPTG RWY',
    'DEPG RWY',
    'DEPG RWYS',
    'DEPTG RWYS',
    'DEP RUNWAY',
    'DEPARTING RUNWAY',
    'DEPARTURES IN PROG RWYS',
    'DEPARTURES RUNWAY',
    'DEP',
];

const arrMarkers = [
    'APCH RWY IN USE',
    'ARRIVAL RWY',
    'ARRIVAL RUNWAY',
    'APCH RWY',
    'ARR',
    'APPROACH RUNWAY',
    'ILS RWY',
    'ILS RWYS',
    'APPROACH IN USE',
    'APPROACH RWY',
    'APCH .. RUNWAY',
    'LDG',
    'APCHS RY',
    'APCHS IN USE',
    'LNDG RWY',
];

const breakTentative = ['TLS', 'TRANSITION LEVEL']

const runwayRegex = /^(RWY)?(?<runway>\d{2}) ?(?<postfix>R|L|C|RIGHT|LEFT|CENTER)?(,|\.)?$/;

function hasMarker(str, depMarkers) {
    const last = str.at(-1);
    const base = last === ',' || last === '.'
        ? str.slice(0, -1)
        : str;

    for (const marker of common) {
        if (base.endsWith(marker)) return 'common';
    }

    for (const marker of depMarkers) {
        if (base.endsWith(marker)) return true;
    }

    return false;
}

function getActiveRunways(atis) {
    const words = Array.isArray(atis) ? atis.join(' ').split(' ') : atis.split(' ');
    const depRunways = new Set();
    const arrRunways = new Set();
    const tentativeRunways = new Set();
    let hadTenativeRunways = false;
    let tentativeChance = 0;

    let depMarker = false;
    let arrMarker = false;
    let common = false;
    let lastWord = '';

    for (const word of words) {
        const runway = runwayRegex.exec(word);

        if (runway?.groups) {
            const { runway: number, postfix } = runway.groups;
            const num = parseInt(number);
            if (!isNaN(num) && num >= 1 && num <= 36) {
                let runwayName = number;
                if (postfix) {
                    runwayName += postfix[0];
                }

                if (depMarker || arrMarker) {
                    const targetSet = depMarker ? depRunways : arrRunways;
                    const otherSet = depMarker ? arrRunways : depRunways;

                    if (hadTenativeRunways) {
                        targetSet.clear();
                        if (common) otherSet.clear();
                        hadTenativeRunways = false;
                    }

                    targetSet.add(runwayName);
                    if (common) otherSet.add(runwayName);
                }
                else {
                    tentativeRunways.add(runwayName);
                    tentativeChance = 0;
                }
            }
        }
        else {
            lastWord += ` ${ word }`;

            const isDep = hasMarker(lastWord, depMarkers);
            const isArr = isDep ? false : hasMarker(lastWord, arrMarkers);

            if (isDep || isArr) {
                common = isArr === 'common' || isDep === 'common';

                tentativeRunways.forEach(x => {
                    (isDep ? depRunways : arrRunways).add(x);
                    if (common) (isDep ? arrRunways : depRunways).add(x);
                });
                hadTenativeRunways = !!tentativeRunways.size;
                tentativeRunways.clear();
                depMarker = isDep || isArr === 'common';
                arrMarker = isArr || isDep === 'common';
                tentativeChance = 0;
            }
            else {
                if(hasMarker(lastWord, breakTentative)) {
                    depMarker = false;
                    arrMarker = false;
                    tentativeRunways.clear();
                    tentativeChance = 0;
                    continue;
                }

                tentativeChance++;
                if (tentativeChance >= 5) {
                    depMarker = false;
                    arrMarker = false;
                    tentativeRunways.clear();
                    tentativeChance = 0;
                }
            }
        }
    }

    return {
        departure: Array.from(depRunways),
        arrival: Array.from(arrRunways),
    };
}

const data = await fetch('https://data.vatsim.net/v3/vatsim-data.json');
const json = await data.json();

for (const atis of json.atis) {
    if (!atis.text_atis?.length) continue;
    const runways = getActiveRunways(atis.text_atis);
    if (!runways.departure.length && !runways.arrival.length) console.log(atis.callsign);
    else console.log(atis.callsign, 'dep', runways.departure.join(','), 'arr', runways.arrival.join(','));
}
