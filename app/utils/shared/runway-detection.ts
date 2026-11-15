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
    'DEPART RWY',
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
    'LANDING RWY',
    'LANDING RWYS',
    'LANDING RUNWAY',
    'LND RWY',
    'LNDG RWYS',
    'ILSRWY',
];

/*
 * Broad departure/arrival words without a runway keyword. They also appear in sentences about other things
 * ("ALL DEPARTURES CONTACT TOWER", "TEMPERATURE 15 DEWPOINT 12. ARRIVALS EXPECT ..."), so they only connect runways in
 * their own sentence ("RWY 13 FOR DEPARTURE. RWY 13 FOR ARRIVAL."), and only numbers written like runways (see isRunwayLike)
 */
const broadDepMarkers = ['DEPARTING', 'DEPTG', 'DEPG', 'DPTG', 'DEPARTURES', 'FOR DEPARTURE', 'SIMUL DEPS'];
const broadArrMarkers = ['ARRIVALS', 'FOR ARRIVAL'];

const allDepMarkers = [...depMarkers, ...broadDepMarkers];
const allArrMarkers = [...arrMarkers, ...broadArrMarkers];
const specificMarkers = [...common, ...depMarkers, ...arrMarkers];
const broadMarkers = [...broadDepMarkers, ...broadArrMarkers];

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
const endsWithRunwayKeywordRegex = / (RWYS?|RUNWAYS?)$/;

// Word right after a runway number that rules it out: a closed runway ("RWY 31 CLSD", "CLOSED,AVAILABLE ON REQUEST") is
// never in use, a touchdown-zone report ("WIND RWY 25R TDZ 210/04KT") is not a runway declaration, and a number followed
// by a unit ("TURN LEFT 15 DEGREES", "05 KNOTS") is not a runway
const notInUseRegex = /^(CLSD|CLOSED|TDZ|DEGREES?|DEG|KNOTS?|KTS?|FT|FEET|NM|MILES?|MINS?|MINUTES?|PERCENT|METRES?|METERS?)\b/;

// FAA ATIS abbreviate runway as "RY"/"RYS", also with punctuation: "APCHS RY, 27L"
const faaRunwayRegex = /^RY(S?)([,.]*)$/;

const notamRegex = /^NOTAMS?\b/;
const nilRegex = /^(NIL|NONE)\b/;

const stripPunctuation = (word: string | undefined) => word?.replace(/[,.]+$/, '') ?? '';

/** Text that markers are compared with: everything read so far, without one trailing comma or dot */
function getMarkerBase(str: string) {
    const last = str.at(-1);
    return last === ',' || last === '.' ? str.slice(0, -1) : str;
}

/**
 * The NOTAM section closes most ATIS: runways mentioned there are closures, lighting or ILS outages, never runways in use.
 * "NO NOTAMS" or "NOTAMS NIL" only say there is nothing to report, so they do not start that section.
 */
function isNotamSectionStart(words: string[], index: number) {
    return notamRegex.test(words[index]) &&
        !['NO', 'NIL'].includes(stripPunctuation(words[index - 1])) &&
        !nilRegex.test(words[index + 1] ?? '');
}

function hasMarker(str: string, depMarkers: string[]) {
    const base = getMarkerBase(str);

    for (const marker of common) {
        if (base.endsWith(marker)) return 'common';
    }

    if (landingAndDepartingRegex.test(base)) return 'common';

    for (const marker of depMarkers) {
        if (base.endsWith(marker)) return true;
    }

    return false;
}

/** The marker ending str is a broad word (or a "<landing> AND <departing>" pair without a runway keyword) */
function isBroadMarker(str: string) {
    const base = getMarkerBase(str);
    if (specificMarkers.some(marker => base.endsWith(marker))) return false;
    if (landingAndDepartingRegex.test(base)) return !endsWithRunwayKeywordRegex.test(base);
    return broadMarkers.some(marker => base.endsWith(marker));
}

export function getActiveRunways(atis: string | string[]): { departure: string[]; arrival: string[] } {
    // Read FAA "RY" as "RWY", keeping punctuation ("RY," -> "RWY,"), so every RWY marker also matches it
    const words = (Array.isArray(atis) ? atis.join(' ') : atis).split(' ').map(word => word.replace(faaRunwayRegex, 'RWY$1$2'));
    const depRunways = new Set<string>();
    const arrRunways = new Set<string>();
    // Runways seen before any marker, waiting for one. Broad words only pick up the ones written like runways in their own sentence
    const tentativeRunways = new Map<string, { runwayLike: boolean; sentenceEnded: boolean }>();
    // Tentative runways listed back to back right before the current word, see the TRL rule below
    const tentativeList = new Set<string>();
    // The tentative list was introduced by a runway keyword ("RWY 09R 09L", "RWY27"), not just numbers ("DEWPOINT 12")
    let tentativeListFromKeyword = false;
    let tentativeChance = 0;

    let depMarker = false;
    let arrMarker = false;
    let common = false;
    // The active marker is a broad word, see broadDepMarkers
    let broadMarker = false;
    // The previous word was a runway followed by a comma, e.g. "36R," in "RWY 36L, 36R, 9"
    let runwayListContinues = false;
    // The previous word set a departure/arrival marker, e.g. "DEP" in "ARR 6, DEP 1"
    let markerWordBefore = false;
    // The previous word was a runway written like one, e.g. "07C" in "RWY 07C 18"
    let previousRunwayLike = false;
    let lastWord = '';

    /** A broad word only connects runways within its own sentence, so a sentence end closes it and the tentative runways */
    function endSentence() {
        tentativeRunways.forEach(tentative => tentative.sentenceEnded = true);

        if (broadMarker) {
            depMarker = false;
            arrMarker = false;
            broadMarker = false;
        }
    }

    for (let i = 0; i < words.length; i++) {
        const word = words[i];
        // Suffix can be a separate word: "06 LEFT"
        const pairRunway = words[i + 1] ? runwayRegex.exec(`${ word } ${ words[i + 1] }`) : null;
        const runway = pairRunway ?? runwayRegex.exec(word);
        lastWord += ` ${ word }`;

        if (isNotamSectionStart(words, i) || stripPunctuation(lastWord).endsWith('NOTICE TO AIR MEN')) break;

        let runwayName: string | null = null;
        let afterKeyword = false;
        let isRunwayLike = false;
        // Numbers outside 01-36 ("TRL 70") are skipped without counting as a word, like before
        let isOutOfRange = false;
        // The word (or "06 LEFT." pair) ends a sentence
        let endsSentence = word.endsWith('.');

        if (runway?.groups) {
            const { prefix, runway: number, postfix } = runway.groups;
            const num = parseInt(number);

            afterKeyword = !!prefix || runwayKeywords.has(stripPunctuation(words[i - 1]));
            // Written like a runway: after RWY/RUNWAY, with an L/R/C suffix, right after a departure/arrival word,
            // or continuing a list that was written like runways
            isRunwayLike = afterKeyword || !!postfix || markerWordBefore || runwayListContinues || previousRunwayLike;
            // FAA ATIS write runways 1-9 without the leading zero ("RWY 4R", "RWYS 1, 33, 4", "ARR 6, DEP 1"). A single digit is
            // only trusted with a suffix or a RWY prefix, right after a runway keyword or a departure/arrival marker, or inside
            // a comma-separated runway list, so "CAT 2 AND 3" or "RUNWAY 24. 5 1 TO 100 PERCENT WET" do not add runways
            const isTrusted = number.length === 2 || !!postfix || afterKeyword || runwayListContinues || markerWordBefore;
            // The next word only describes the runway inside the same sentence: "DEP RWY 27. CLOSED TWY A." keeps 27
            endsSentence = (pairRunway ? words[i + 1] : word).endsWith('.');
            const isNotInUse = !endsSentence && notInUseRegex.test(words[pairRunway ? i + 2 : i + 1] ?? '');
            // While a broad word is the active marker, only numbers written like runways count ("DEPARTURES ... TEMPERATURE 15")
            const isAllowed = !broadMarker || !(depMarker || arrMarker) || isRunwayLike;
            isOutOfRange = isNaN(num) || num < 1 || num > 36;

            if (!isOutOfRange && isTrusted && !isNotInUse && isAllowed) {
                runwayName = `${ number.padStart(2, '0') }${ postfix?.[0] ?? '' }`;
            }
        }

        runwayListContinues = false;
        markerWordBefore = false;
        previousRunwayLike = !!runwayName && isRunwayLike;

        if (runwayName) {
            runwayListContinues = !pairRunway && word.endsWith(',') && isRunwayLike;

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
                if (!tentativeList.size) tentativeListFromKeyword = afterKeyword;
                tentativeRunways.set(runwayName, { runwayLike: isRunwayLike, sentenceEnded: false });
                tentativeList.add(runwayName);
                tentativeChance = 0;
            }

            if (endsSentence) endSentence();
            continue;
        }

        if (isOutOfRange) {
            if (endsSentence) endSentence();
            continue;
        }

        // An ordinary word, or a number that is not a runway here ("DEWPOINT 5", "RWY 31 CLSD"): it counts toward the window
        const bareWord = stripPunctuation(word);

        const isDep = hasMarker(lastWord, allDepMarkers);
        const isArr = isDep ? false : hasMarker(lastWord, allArrMarkers);
        markerWordBefore = !!(isDep || isArr);

        if (isDep || isArr) {
            common = isArr === 'common' || isDep === 'common';
            broadMarker = isBroadMarker(lastWord);

            tentativeRunways.forEach((tentative, x) => {
                // A broad word only picks up earlier numbers written like runways in its own sentence
                if (broadMarker && (!tentative.runwayLike || tentative.sentenceEnded)) return;

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
                // marker ("RWY 09R 09L TRL 60", "RWY27 TRL FL70"): a runway list directly before "TRL" is in use for both.
                // The list must start with a runway keyword, so weather numbers ("DEWPOINT 12 TRL 60") are not promoted
                if (bareWord === 'TRL' && tentativeListFromKeyword) {
                    tentativeList.forEach(x => {
                        depRunways.add(x);
                        arrRunways.add(x);
                    });
                }

                depMarker = false;
                arrMarker = false;
                broadMarker = false;
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
                broadMarker = false;
                tentativeRunways.clear();
                tentativeList.clear();
                tentativeChance = 0;
            }
        }

        if (endsSentence) endSentence();
    }

    return {
        departure: Array.from(depRunways),
        arrival: Array.from(arrRunways),
    };
}

// @ts-expect-error no types for this properity
if (typeof window !== 'undefined') window.getActiveRunways = getActiveRunways;
