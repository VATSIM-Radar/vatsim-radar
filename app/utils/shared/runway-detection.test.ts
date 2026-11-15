import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { getActiveRunways } from './runway-detection.ts';

/** Asserts the detected runways, ignoring the order they were found in */
function expectRunways(atis: string | string[], expected: { departure?: string[]; arrival?: string[] }) {
    const result = getActiveRunways(atis);

    assert.deepEqual(
        { departure: [...result.departure].sort(), arrival: [...result.arrival].sort() },
        { departure: [...expected.departure ?? []].sort(), arrival: [...expected.arrival ?? []].sort() },
    );
}

describe('getActiveRunways', () => {
    describe('runway numbers', () => {
        it('keeps the suffix with repeated punctuation', () => {
            expectRunways('RWY IN USE FOR DEPARTURES 06 LEFT.. CDP VOR INOPERATIVE', { departure: ['06L'] });
        });

        it('reads FAA single-digit runways as two-digit designators', () => {
            expectRunways('ILS RWY 4R APCH IN USE. DEPTG RWY 4L..', { departure: ['04L'], arrival: ['04R'] });
            expectRunways('ILS RY 4 APCH IN USE LND RY 4. DEPART RY 13..', { departure: ['13'], arrival: ['04'] });
        });

        it('reads single digits inside comma-separated lists', () => {
            expectRunways('LNDG RWYS 1, 33, DEPG RWYS 1, 33, 4 MULTIPLE APPROACHES IN EFFECT', {
                departure: ['01', '33', '04'],
                arrival: ['01', '33'],
            });
        });

        it('reads single digits right after a departure or arrival word', () => {
            expectRunways('ARR 6, DEP 1..', { departure: ['01'], arrival: ['06'] });
        });

        it('reads RY with punctuation like RWY', () => {
            expectRunways('APCHS RY, 27L', { arrival: ['27L'] });
        });

        it('ignores counts, condition codes and numbers followed by a unit', () => {
            expectRunways('ILS RWY 27 CAT 2 AND 3 AVBL', { arrival: ['27'] });
            expectRunways('RWY IN USE 22L. RWYCC 6, 6, 6', { departure: ['22L'], arrival: ['22L'] });
            expectRunways('APPROACH RUNWAY 24. 5 1 TO 100 PERCENT WET', { arrival: ['24'] });
            expectRunways('DEP RWY 22R. WIND 250 DEG 04 KT.', { departure: ['22R'] });
            expectRunways('RWY 20L DEPTS TURN LEFT 15 DEGREES AT DEP END', {});
        });
    });

    describe('closed runways', () => {
        it('ignores a runway followed by CLSD or CLOSED', () => {
            expectRunways('RWY IN USE 27. RWY 09 CLSD', { departure: ['27'], arrival: ['27'] });
            expectRunways('RWY IN USE FOR DEPARTURES 06 LEFT.. RWY 06 RIGHT CLOSED,AVAILABLE ON REQUEST', { departure: ['06L'] });
        });

        it('keeps a runway when the closure starts a new sentence', () => {
            expectRunways('DEP RWY 27. CLOSED TWY A.', { departure: ['27'] });
        });
    });

    describe('NOTAM section', () => {
        it('stops reading at the NOTAM section', () => {
            expectRunways('DEPG RY 1L. NOTAMS... RY 7R, 25L, 1R, 19L CLSD.', { departure: ['01L'] });
            expectRunways('ARRIVALS EXPECT ILS RWY 12. NOTICE TO AIR MEN. ILS RWY 8R, 9, 27 OTS', { arrival: ['12'] });
        });

        it('keeps reading after "NO NOTAMS" or "NOTAMS NIL"', () => {
            expectRunways('NO NOTAMS. DEP RWY 27', { departure: ['27'] });
            expectRunways('NOTAMS NIL. DEP RWY 27', { departure: ['27'] });
        });
    });

    describe('phrasings', () => {
        it('reads landing runways', () => {
            expectRunways('EGLL ARR ATIS A 1650Z LANDING RWY 27L TRANSITION-LEVEL FL 70', { arrival: ['27L'] });
            expectRunways('THIS IS SCHIPHOL ARRIVAL INFORMATION E .. MAIN LANDING RUNWAY 06 .. TRANSITION LEVEL 40', { arrival: ['06'] });
            expectRunways('VHHH ARR ATIS L 1700Z. ARRIVALS, RWY 07C.', { arrival: ['07C'] });
        });

        it('reads departure runways', () => {
            expectRunways('DEP-ATIS EDDF D METAR 061650 RWY 07C 18 ACFT DEPARTING RWY18 EXPECT POSSIBLE DEPARTURE', { departure: ['07C', '18'] });
            expectRunways('VHHH DEP ATIS S 1700Z. DEPARTURES, RWY 07R.', { departure: ['07R'] });
            expectRunways('DEPG RY 19R, RY 19L.', { departure: ['19R', '19L'] });
            expectRunways('ARRIVALS EXPECT ILS APCH RWY 27R. DEPTG 27L..', { departure: ['27L'], arrival: ['27R'] });
        });

        it('reads landing and departing runways together', () => {
            expectRunways('LNDG AND DEPG RWYS 5L, 5R.', { departure: ['05L', '05R'], arrival: ['05L', '05R'] });
            expectRunways('ARVNG AND DEPTG RWY 8 AND RWY 15.', { departure: ['08', '15'], arrival: ['08', '15'] });
            expectRunways('LANDING RUNWAY 34. TAKE OFF RUNWAY 16 34 TRANSITION LEVEL 60', { departure: ['16', '34'], arrival: ['34'] });
        });
    });

    describe('runways right before TRL', () => {
        it('takes a runway list before TRL as in use', () => {
            expectRunways('ATIS EDDV U METAR 061650 RWY 09R 09L TRL 60', { departure: ['09R', '09L'], arrival: ['09R', '09L'] });
            expectRunways('VABB ATIS B 1700Z RWY27 TRL FL70', { departure: ['27'], arrival: ['27'] });
        });

        it('needs a runway keyword before the list', () => {
            expectRunways('TEMPERATURE 15 DEWPOINT 12 TRL 60', {});
        });

        it('ignores closed runways before TRL', () => {
            expectRunways('RWY 28R CLSD TRL 50', {});
        });
    });

    describe('unchanged behaviour', () => {
        it('reads a runway in use for both', () => {
            expectRunways('RWY IN USE 27', { departure: ['27'], arrival: ['27'] });
        });

        it('joins ATIS lines', () => {
            expectRunways(['THIS IS LEPA ATIS INFORMATION O. RWY IN USE FOR', 'ARRIVALS 06 LEFT. EXPECT ILS Z APPROACH'], { arrival: ['06L'] });
        });

        it('reads the Australian [RWY] format', () => {
            expectRunways('[ATIS] YSSY INFO A [RWY] 34L [WIND] 180/10', { departure: ['34L'], arrival: ['34L'] });
        });
    });
});
