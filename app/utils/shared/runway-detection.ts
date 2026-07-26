const common = [
    'FOR ARRIVALS AND DEPARTURES',
    'FOR ARRIVALS, AND DEPARTURES',
    'LANDING AND DEPARTING RUNWAY',
    'LANDING AND DEPARTING RWYS',
    'ACTIVE RWY',
    'ACTIVE RUNWAY',
    'ARR AND DEPTG',
    'IN USE',
    'ARR AND DEPTG',
    'LDG AND DEPTG',
    'LDG AND DEPTG RWYS',
    'ARRS AND DEPS',
    'RUNWAY IN USE',
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
    'TKOF',
    'FOR DEPS',
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
    'FOR ARRIVALS',
    'EXPECT ILS APPROACH',
    'FOR ARRS',
    'FOR ARRS.',
];

const breakTentative = ['TLS', 'TRL', 'TRANSITION LEVEL', 'ARRS.', 'FOR ARRS. RWY'];

const runwayRegex = /^(RWY)?(?<runway>\d{2}) ?((?<postfix>R|L|C|RIGHT|LEFT|CENTER)?(,|\.)?)+$/;
const auRegex = /\[RWY] (\d{2} ?(R|L|C|RIGHT|LEFT|CENTER)?)+$/;
const auRegexCommon = /\[RWY] (\d{2} ?(R|L|C|RIGHT|LEFT|CENTER)?) ([\[+])/;

function hasMarker(str: string, depMarkers: string[]) {
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

export function getActiveRunways(atis: string | string[]): { departure: string[]; arrival: string[] } {
    const words = Array.isArray(atis) ? atis.join(' ').split(' ') : atis.split(' ');
    const depRunways = new Set<string>();
    const arrRunways = new Set<string>();
    const tentativeRunways = new Set<string>();
    let tentativeChance = 0;

    let depMarker = false;
    let arrMarker = false;
    let common = false;
    let lastWord = '';

    for (let i = 0; i < words.length; i++) {
        const word = words[i];
        const runway = runwayRegex.exec(word + (words[i + 1] ? ` ${ words[i + 1] }` : '')) ?? runwayRegex.exec(word);
        lastWord += ` ${ word }`;

        if (runway?.groups) {
            const { runway: number, postfix } = runway.groups;
            const num = parseInt(number);
            if (!isNaN(num) && num >= 1 && num <= 36) {
                let runwayName = number;
                if (postfix) {
                    runwayName += postfix[0];
                }

                const isAuMarker = auRegex.test(lastWord) && auRegexCommon.test(words.join(' '));

                if (depMarker || arrMarker || isAuMarker) {
                    if (isAuMarker) common = true;

                    const targetSet = depMarker ? depRunways : arrRunways;
                    const otherSet = depMarker ? arrRunways : depRunways;

                    /* if (hadTenativeRunways) {
                        targetSet.clear();
                        if (common) otherSet.clear();
                        hadTenativeRunways = false;
                    }*/

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
            const isDep = hasMarker(lastWord, depMarkers);
            const isArr = isDep ? false : hasMarker(lastWord, arrMarkers);

            if (isDep || isArr) {
                common = isArr === 'common' || isDep === 'common';

                tentativeRunways.forEach(x => {
                    (isDep ? depRunways : arrRunways).add(x);
                    if (common) (isDep ? arrRunways : depRunways).add(x);
                });
                // hadTenativeRunways = !!tentativeRunways.size;
                tentativeRunways.clear();
                depMarker = !!isDep || isArr === 'common';
                arrMarker = !!isArr || isDep === 'common';
                tentativeChance = 0;
            }
            else {
                if (hasMarker(lastWord, breakTentative)) {
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

// @ts-expect-error no types for this properity
if (typeof window !== 'undefined') window.getActiveRunways = getActiveRunways;
