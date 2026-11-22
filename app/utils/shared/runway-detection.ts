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
    'LDG DEP RWY',
    'LDG DEP RWYS',
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
    'DEPS EXP RWY',
    'DEPS EXP RWYS',
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
    'APP RWY',
    'RNP RWY',
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
    'ILS. RWY',
    'APPROACH. RWY',
    'PARALLEL APPROACHES IN PROGRESS',
    'ILS APCH FOR',
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
const runwayRegex = /^(?<prefix>RWY)?(?<runway>\d{1,2}) ?(?<postfix>R|L|C|RIGHT|LEFT|CENTER)?[,.]*$/;
const auRegex = /\[RWY] (\d{2} ?(R|L|C|RIGHT|LEFT|CENTER)?)+$/;
const auRegexCommon = /\[RWY] (\d{2} ?(R|L|C|RIGHT|LEFT|CENTER)?) ([\[+])/;

/** Words that introduce or continue a runway list */
const runwayKeywords = new Set(['RWY', 'RWYS', 'RUNWAY', 'RUNWAYS', '[RWY]']);
const listConnectors = new Set(['AND', 'OR', '&']);

// "<landing> AND <departing> [RWY]" in its many spellings: "LNDG AND DEPG RWYS", "ARVNG AND DEPTG RWY", "LANDING AND DEPARTING RUNWAY"
const landingAndDepartingRegex = /\b(LDG|LNDG|LND|LANDING|ARVNG|ARRIVING|ARR|ARRS|ARRIVALS) AND (DEP|DEPS|DEPG|DEPTG|DPTG|DEPARTING|DEPARTURES)( RWYS?| RUNWAYS?)?$/;
const endsWithRunwayKeywordRegex = / (RWYS?|RUNWAYS?)$/;
const instrumentApproachRegex = / (?:ILS [XYZ] (?:APCH|RWYS?)|ARRIVAL ILS [A-Z]+ RUNWAY)$/;
const openingRunwayRegex = /^(?: ATIS [A-Z]{4} [A-Z] METAR \d{6}| [A-Z]{4} ATIS (?:INFORMATION )?[A-Z] \d{4}Z)?(?: RWYS?| RUNWAYS?)?$/;
const closedListRegex = /^(?:OUT OF OPERATION\b|AND (?:TWYS?|TAXIWAYS?) [^.]+ \b(?:CLOSED|CLSD)\b)/;
const weatherValueBeforeRegex = / (?:T|TMP|DP|TEMPERATURE|DEW ?POINT|QNH)$/;
const departingInstructionRegex = /^(?:DEPS|DEPTS|DEPARTURES) (?:TURN|CONTACT|MONITOR)\b/;

// Word right after a runway number that rules it out: a closed runway ("RWY 31 CLSD", "CLOSED,AVAILABLE ON REQUEST") is
// never in use, a touchdown-zone report ("WIND RWY 25R TDZ 210/04KT") is not a runway declaration, and a number followed
// by a unit ("TURN LEFT 15 DEGREES", "05 KNOTS") is not a runway
const notInUseRegex = /^(CLSD|CLOSED|TDZ|DEGREES?|DEG|KNOTS?|KTS?|FT|FEET|NM|MILES?|MINS?|MINUTES?|PERCENT|METRES?|METERS?)\b/;

// FAA ATIS abbreviate runway as "RY"/"RYS", also with punctuation: "APCHS RY, 27L"
const faaRunwayRegex = /^RY(S?)([,.]*)$/;

const notamRegex = /^NOTAMS?\b/;
const nilRegex = /^(NIL|NONE)\b/;
const notamReferenceBeforeRegex = /(?:^| )(?:NO|NIL|(?:SEE|PER|CHECK|CONSULT|REFER TO)(?: THE)?)$/;

const stripPunctuation = (word: string | undefined) => word?.replace(/[,.]+$/, '') ?? '';

/** Text that markers are compared with: everything read so far, without one trailing comma or dot */
function getMarkerBase(str: string) {
    const last = str.at(-1);
    return last === ',' || last === '.' ? str.slice(0, -1) : str;
}

/**
 * The NOTAM section closes most ATIS: runways mentioned there are closures, lighting or ILS outages, never runways in use.
 * Empty reports ("NO NOTAMS", "NOTAMS NIL") and references ("SEE NOTAM A1234/26") keep the current section open.
 */
function isNotamSectionStart(words: string[], index: number) {
    return notamRegex.test(words[index]) &&
        !notamReferenceBeforeRegex.test(words.slice(Math.max(0, index - 3), index).join(' ')) &&
        !nilRegex.test(words[index + 1] ?? '');
}

/** Normalize list separators and expand an omitted duplicate number, as in RJTT's "05/34R" and YSSY's "34L AND R". */
function getAtisWords(atis: string | string[]) {
    return (Array.isArray(atis) ? atis.join(' ') : atis)
        .trim()
        .replace(/\s+/g, ' ')
        .replace(/\b((?:RWY *)?(\d{1,2})[LRC])(?:\/| AND )([LRC])\b/g, '$1 AND $2$3')
        .replace(/\b(?:RWY *)?\d{1,2}[LRC]?(?:\/\d{1,2}[LRC]?)+\b/g, list => {
            // Unlabelled numbers in weather reports also use slashes ("16/15").
            return list.startsWith('RWY') || /[LRC](?:\/|$)/.test(list) ? list.replaceAll('/', ' AND ') : list;
        })
        .split(' ')
        .map(word => word.replace(faaRunwayRegex, 'RWY$1$2'));
}

function getPairedRunway(words: string[], index: number) {
    const suffix = words[index + 1];
    // "33 RIGHT HAND CIRCUIT" describes the circuit for runway 33.
    if (!suffix || ((suffix === 'RIGHT' || suffix === 'LEFT') && stripPunctuation(words[index + 2]) === 'HAND')) return null;
    return runwayRegex.exec(`${ words[index] } ${ suffix }`);
}

/** Find the first word after a runway list so a direction or closure can apply to the whole list. */
function getRunwayListEnd(words: string[], index: number) {
    let last = words[index - 1];
    while (!last.endsWith('.')) {
        const hasConnector = listConnectors.has(stripPunctuation(words[index]));
        let next = hasConnector ? index + 1 : index;
        const hasKeyword = runwayKeywords.has(stripPunctuation(words[next]));
        if (hasKeyword) next++;
        const number = words[next];
        const match = number && runwayRegex.exec(number)?.groups;
        if (!match || Number(match.runway) < 1 || Number(match.runway) > 36) break;
        if (!hasConnector && !hasKeyword && !last.endsWith(',') && !match.prefix && !match.postfix && match.runway.length === 1) break;

        last = number;
        index = next + 1;
        if (getPairedRunway(words, next)) {
            last = words[index];
            index++;
        }
    }
    return index;
}

function getTrailingUse(words: string[], index: number) {
    if (words[index - 1].endsWith('.')) return null;
    const after = words.slice(index, index + 4).join(' ');
    if (/^FOR (ARR|ARRS|ARRIVAL|ARRIVALS),? AND (DEP|DEPS|DEPARTURE|DEPARTURES)\b/.test(after)) return 'common';
    if (/^(?:FOR (?:ARR|ARRS|ARRIVAL|ARRIVALS)|(?:APCH|APPROACH) IN USE)\b/.test(after)) return 'arrival';
    if (/^FOR (?:DEP|DEPS|DEPARTURE|DEPARTURES)\b/.test(after)) return 'departure';
    return null;
}

function hasMarker(str: string, depMarkers: string[]) {
    const base = getMarkerBase(str);

    for (const marker of common) {
        if (base.endsWith(marker)) return 'common';
    }

    if (landingAndDepartingRegex.test(base)) return 'common';

    if (depMarkers === allArrMarkers && instrumentApproachRegex.test(base)) return true;

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
    const words = getAtisWords(atis);
    const depRunways = new Set<string>();
    const arrRunways = new Set<string>();
    // Runways seen before any marker, waiting for one. Broad words only pick up the ones written like runways in their own sentence
    const tentativeRunways = new Map<string, { runwayLike: boolean; sentenceEnded: boolean }>();
    // Tentative runways listed back to back right before the current word, see the TRL rule below
    const tentativeList = new Set<string>();
    // An opening runway list can declare active runways without a role, e.g. EDXW "RWY 32 WHEN AIRBORNE ...".
    const openingRunways = new Set<string>();
    let readingOpeningList = false;
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
        const bareWord = stripPunctuation(word);
        const prefixText = lastWord;
        // Suffix can be a separate word: "06 LEFT"
        const pairRunway = getPairedRunway(words, i);
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
        let opensRunwayList = false;
        let trailingUse: ReturnType<typeof getTrailingUse> = null;

        if (runway?.groups) {
            const { prefix, runway: number, postfix } = runway.groups;
            const num = parseInt(number);

            afterKeyword = !!prefix || runwayKeywords.has(stripPunctuation(words[i - 1]));
            // Written like a runway: after RWY/RUNWAY, with an L/R/C suffix, right after a departure/arrival word,
            // or continuing a list that was written like runways
            isRunwayLike = afterKeyword || !!postfix || markerWordBefore || runwayListContinues || previousRunwayLike;
            // Bare traffic labels also occur between procedure names ("2 FOXTROT DEPARTURES, 2 MIKE ARRIVALS").
            const afterTrafficLabel = broadMarker && ['ARRIVALS', 'DEPARTURES'].includes(stripPunctuation(words[i - 1])) && words[i - 2] !== 'FOR';
            const isTrusted = number.length === 2 || !!postfix || afterKeyword || runwayListContinues || (markerWordBefore && !afterTrafficLabel);
            // The next word only describes the runway inside the same sentence: "DEP RWY 27. CLOSED TWY A." keeps 27
            endsSentence = (pairRunway ? words[i + 1] : word).endsWith('.');
            const nextIndex = pairRunway ? i + 2 : i + 1;
            const listEnd = getRunwayListEnd(words, nextIndex);
            const next = words.slice(nextIndex, nextIndex + 16).join(' ');
            const afterList = words.slice(listEnd, listEnd + 16).join(' ');
            const listIsClosed = closedListRegex.test(afterList) ||
                (!words[listEnd - 1].endsWith('.') && /^(?:(?:IS|ARE) )?(?:CLSD|CLOSED)\b/.test(afterList));
            const isNotInUse = (!endsSentence && notInUseRegex.test(words[nextIndex] ?? '')) ||
                listIsClosed || (!endsSentence && /^IS APPROVED FOR TURN OFF\b/.test(next)) ||
                (!markerWordBefore && /^SURFACE CONDITION\b/.test(next)) || weatherValueBeforeRegex.test(prefixText);
            // While a broad word is the active marker, only numbers written like runways count ("DEPARTURES ... TEMPERATURE 15")
            const isAllowed = !broadMarker || !(depMarker || arrMarker) || isRunwayLike;
            isOutOfRange = isNaN(num) || num < 1 || num > 36;

            if (!isOutOfRange && isTrusted && !isNotInUse && isAllowed) {
                trailingUse = getTrailingUse(words, listEnd);
                opensRunwayList = afterKeyword && openingRunwayRegex.test(prefixText) && !departingInstructionRegex.test(next);
                runwayName = `${ number.padStart(2, '0') }${ postfix?.[0] ?? '' }`;
            }
        }

        const isListConnector = previousRunwayLike && !endsSentence && listConnectors.has(bareWord) && getRunwayListEnd(words, i) > i;
        runwayListContinues = isListConnector;
        markerWordBefore = false;
        previousRunwayLike = !!runwayName && isRunwayLike;

        if (runwayName) {
            runwayListContinues = (pairRunway ? words[i + 1] : word).endsWith(',') && isRunwayLike;

            const isAuMarker = auRegex.test(lastWord) && auRegexCommon.test(words.join(' '));

            if (trailingUse || depMarker || arrMarker || isAuMarker) {
                if (trailingUse ? trailingUse !== 'arrival' : depMarker || common || isAuMarker) depRunways.add(runwayName);
                if (trailingUse ? trailingUse !== 'departure' : arrMarker || common || isAuMarker) arrRunways.add(runwayName);
                tentativeList.clear();
            }
            else {
                readingOpeningList ||= opensRunwayList;
                if (readingOpeningList) openingRunways.add(runwayName);
                if (!tentativeList.size) tentativeListFromKeyword = afterKeyword;
                tentativeRunways.set(runwayName, { runwayLike: isRunwayLike, sentenceEnded: false });
                tentativeList.add(runwayName);
                tentativeChance = 0;
            }

            if (endsSentence) {
                endSentence();
                depMarker = false;
                arrMarker = false;
                common = false;
                readingOpeningList = false;
            }
            if (pairRunway) {
                i++;
                lastWord += ' ' + words[i];
            }
            continue;
        }

        if (isOutOfRange) {
            if (endsSentence) endSentence();
            continue;
        }

        // An ordinary word, or a number that is not a runway here ("DEWPOINT 5", "RWY 31 CLSD"): it counts toward the window
        if (!runwayKeywords.has(bareWord) && !listConnectors.has(bareWord)) readingOpeningList = false;
        if (bareWord === 'EXPECT' || bareWord === 'EXP') {
            tentativeRunways.forEach((tentative, name) => {
                if (!tentative.runwayLike || openingRunways.has(name)) tentativeRunways.delete(name);
            });
        }

        const isDep = hasMarker(lastWord, allDepMarkers);
        const isArr = isDep ? false : hasMarker(lastWord, allArrMarkers);
        const isBroad = !!(isDep || isArr) && isBroadMarker(lastWord);
        // "DEPARTING" is part of "DEPARTING RUNWAY" here. Let the full marker resolve the tentative list within the same window.
        const nextWord = words[i + 1];
        const awaitsSpecificMarker = isBroad && !endsSentence && runwayKeywords.has(stripPunctuation(nextWord)) &&
            !!hasMarker(`${ lastWord } ${ nextWord }`, specificMarkers);
        markerWordBefore = !!(isDep || isArr) && !awaitsSpecificMarker;

        if (markerWordBefore) {
            common = isArr === 'common' || isDep === 'common';
            broadMarker = isBroad;

            const startsRunwayList = endsWithRunwayKeywordRegex.test(getMarkerBase(lastWord));
            tentativeRunways.forEach((tentative, x) => {
                // A broad word only picks up earlier numbers written like runways in its own sentence
                if (broadMarker && (!tentative.runwayLike || tentative.sentenceEnded)) return;
                if (startsRunwayList && tentative.sentenceEnded) return;

                (isDep ? depRunways : arrRunways).add(x);
                if (common) (isDep ? arrRunways : depRunways).add(x);
            });
            tentativeRunways.clear();
            tentativeList.clear();
            depMarker = !!isDep || isArr === 'common';
            arrMarker = !!isArr || isDep === 'common';
            tentativeChance = 0;
        }
        else {
            if (!awaitsSpecificMarker && hasMarker(lastWord, breakTentative)) {
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
            if (!runwayKeywords.has(bareWord) && !listConnectors.has(bareWord)) tentativeList.clear();

            // A connector between runways is part of the list, including "AND" inserted for "25L/25R".
            if (!isListConnector) tentativeChance++;
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

    for (const name of openingRunways) {
        if (depRunways.has(name) || arrRunways.has(name)) continue;
        depRunways.add(name);
        arrRunways.add(name);
    }

    return {
        departure: Array.from(depRunways),
        arrival: Array.from(arrRunways),
    };
}

// @ts-expect-error no types for this properity
if (typeof window !== 'undefined') window.getActiveRunways = getActiveRunways;
