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
    'DEPARTING',
    'DEPTG',
    'DEPG',
    'DPTG',
    'DEPARTURES',
    'FOR DEPARTURE',
    'DEPART RWY',
    'SIMUL DEPS',
    'TAKE OFF RUNWAY',
    'TAKE OFF RWY',
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
    'APCHS RWY',
    'APCHS IN USE',
    'LNDG RWY',
    'FOR ARRIVALS',
    'EXPECT ILS APPROACH',
    'FOR ARRS',
    'FOR ARRS.',
    'ARRIVALS',
    'FOR ARRIVAL',
    'LANDING RWY',
    'LANDING RWYS',
    'LANDING RUNWAY',
    'LND RWY',
    'LNDG RWYS',
    'ILSRWY',
];

const breakTentative = ['TLS', 'TRL', 'TRANSITION LEVEL', 'ARRS.', 'FOR ARRS. RWY'];

// Runway number with an optional RWY prefix, L/R/C suffix and trailing punctuation.
// The suffix is captured once, before the repeated group: a capture inside a repeated group only keeps its last iteration,
// so "06 LEFT.." (second iteration matches just ".") used to lose the "LEFT" and return "06"
const runwayRegex = /^(?<prefix>RWY)?(?<runway>\d{1,2}) ?(?<postfix>R|L|C|RIGHT|LEFT|CENTER)?((R|L|C|RIGHT|LEFT|CENTER)?(,|\.)?)*$/;
const auRegex = /\[RWY] (\d{2} ?(R|L|C|RIGHT|LEFT|CENTER)?)+$/;
const auRegexCommon = /\[RWY] (\d{2} ?(R|L|C|RIGHT|LEFT|CENTER)?) ([\[+])/;

/** Words that introduce or continue a runway list */
const runwayKeywords = new Set(['RWY', 'RWYS', 'RUNWAY', 'RUNWAYS']);

// "<landing> AND <departing> [RWY]" in its many spellings: "LNDG AND DEPG RWYS", "ARVNG AND DEPTG RWY", "LANDING AND DEPARTING RUNWAY"
const landingAndDepartingRegex = /\b(LDG|LNDG|LND|LANDING|ARVNG|ARRIVING|ARR|ARRS|ARRIVALS) AND (DEP|DEPS|DEPG|DEPTG|DPTG|DEPARTING|DEPARTURES)( RWYS?| RUNWAYS?)?$/;

// Word right after a runway number that rules it out: a closed runway ("RWY 31 CLSD", "CLOSED,AVAILABLE ON REQUEST") is
// never in use, and a number followed by a unit ("TURN LEFT 15 DEGREES", "05 KNOTS") is not a runway
const notInUseRegex = /^(CLSD|CLOSED|DEGREES?|DEG|KNOTS?|KTS?|FT|FEET|NM|MILES?|MINS?|MINUTES?|PERCENT|METRES?|METERS?)\b/;

const stripPunctuation = (word: string | undefined) => word?.replace(/[,.]+$/, '') ?? '';

function hasMarker(str: string, depMarkers: string[]) {
    const last = str.at(-1);
    const base = last === ',' || last === '.'
        ? str.slice(0, -1)
        : str;

    for (const marker of common) {
        if (base.endsWith(marker)) return 'common';
    }

    if (landingAndDepartingRegex.test(base)) return 'common';

    for (const marker of depMarkers) {
        if (base.endsWith(marker)) return true;
    }

    return false;
}

export function getActiveRunways(atis: string | string[]): { departure: string[]; arrival: string[] } {
    // FAA ATIS abbreviate runway as "RY": read it as "RWY", so every RWY marker also matches it
    const words = (Array.isArray(atis) ? atis.join(' ') : atis).split(' ').map(word => (word === 'RY' ? 'RWY' : word === 'RYS' ? 'RWYS' : word));
    const depRunways = new Set<string>();
    const arrRunways = new Set<string>();
    const tentativeRunways = new Set<string>();
    // Tentative runways listed back to back right before the current word, see the TRL rule below
    const tentativeList = new Set<string>();
    let tentativeChance = 0;

    let depMarker = false;
    let arrMarker = false;
    let common = false;
    // The previous word was a runway followed by a comma, e.g. "36R," in "RWY 36L, 36R, 9"
    let runwayListContinues = false;
    // The previous word set a departure/arrival marker, e.g. "DEP" in "ARR 6, DEP 1"
    let markerWordBefore = false;
    let lastWord = '';

    for (let i = 0; i < words.length; i++) {
        const word = words[i];
        // Suffix can be a separate word: "06 LEFT"
        const pairRunway = words[i + 1] ? runwayRegex.exec(`${ word } ${ words[i + 1] }`) : null;
        const runway = pairRunway ?? runwayRegex.exec(word);
        lastWord += ` ${ word }`;

        // The NOTAM section closes most ATIS: runways mentioned there are closures, lighting or ILS outages, never runways in use
        if (/^NOTAMS?\b/.test(word) || stripPunctuation(lastWord).endsWith('NOTICE TO AIR MEN')) break;

        if (runway?.groups) {
            const { prefix, runway: number, postfix } = runway.groups;
            const num = parseInt(number);

            // FAA ATIS write runways 1-9 without the leading zero ("RWY 4R", "RWYS 1, 33, 4", "ARR 6, DEP 1"). A single digit is
            // only trusted with a suffix or a RWY prefix, right after a runway keyword or a departure/arrival marker, or inside
            // a comma-separated runway list, so "CAT 2 AND 3" or "RUNWAY 24. 5 1 TO 100 PERCENT WET" do not add runways
            const isTrusted = number.length === 2 || !!postfix || !!prefix || runwayListContinues || markerWordBefore ||
                runwayKeywords.has(stripPunctuation(words[i - 1]));
            const isNotInUse = notInUseRegex.test(words[pairRunway ? i + 2 : i + 1] ?? '');
            runwayListContinues = false;
            markerWordBefore = false;

            if (!isNaN(num) && num >= 1 && num <= 36 && isTrusted && !isNotInUse) {
                runwayListContinues = !pairRunway && word.endsWith(',');

                let runwayName = number.padStart(2, '0');
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
                    tentativeList.clear();
                }
                else {
                    tentativeRunways.add(runwayName);
                    tentativeList.add(runwayName);
                    tentativeChance = 0;
                }
            }
        }
        else {
            runwayListContinues = false;
            const bareWord = stripPunctuation(word);

            const isDep = hasMarker(lastWord, depMarkers);
            const isArr = isDep ? false : hasMarker(lastWord, arrMarkers);
            markerWordBefore = !!(isDep || isArr);

            if (isDep || isArr) {
                common = isArr === 'common' || isDep === 'common';

                tentativeRunways.forEach(x => {
                    (isDep ? depRunways : arrRunways).add(x);
                    if (common) (isDep ? arrRunways : depRunways).add(x);
                });
                // hadTenativeRunways = !!tentativeRunways.size;
                tentativeRunways.clear();
                tentativeList.clear();
                depMarker = !!isDep || isArr === 'common';
                arrMarker = !!isArr || isDep === 'common';
                tentativeChance = 0;
            }
            else {
                if (hasMarker(lastWord, breakTentative)) {
                    // German and Indian ATIS give the runways in use right before the transition level, without any other
                    // marker ("RWY 09R 09L TRL 60", "RWY27 TRL FL70"): runways listed directly before "TRL" are in use for both
                    if (bareWord === 'TRL') {
                        tentativeList.forEach(x => {
                            depRunways.add(x);
                            arrRunways.add(x);
                        });
                    }

                    depMarker = false;
                    arrMarker = false;
                    tentativeRunways.clear();
                    tentativeList.clear();
                    tentativeChance = 0;
                    continue;
                }

                // "RWY 07R RWY 07L" or "RWY 09R AND 09L" are still one list
                if (!runwayKeywords.has(bareWord) && bareWord !== 'AND') tentativeList.clear();

                tentativeChance++;
                if (tentativeChance >= 5) {
                    depMarker = false;
                    arrMarker = false;
                    tentativeRunways.clear();
                    tentativeList.clear();
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

// @ts-expect-error no types for this properity
if (typeof window !== 'undefined') window.getActiveRunways = getActiveRunways;
