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
            expectRunways('DEPTG 4.', { departure: ['04'] });
            expectRunways('RWY IN USE FOR DEPARTURES 6.', { departure: ['06'] });
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

        it('distinguishes Celsius from a separate center-runway suffix', () => {
            expectRunways('TEMPERATURE 4 C DEWPOINT 1 C QNH 1013 ILS RWY 27L', { arrival: ['27L'] });
            expectRunways('DEP RWY 4 C', { departure: ['04C'] });
        });
    });

    describe('closed runways', () => {
        it('ignores a runway followed by CLSD or CLOSED', () => {
            expectRunways('RWY IN USE 27. RWY 09 CLSD', { departure: ['27'], arrival: ['27'] });
            expectRunways('RWY IN USE FOR DEPARTURES 06 LEFT.. RWY 06 RIGHT CLOSED,AVAILABLE ON REQUEST', { departure: ['06L'] });
        });

        it('excludes an opening runway or list explicitly reported closed', () => {
            expectRunways('RWY 09 IS CLOSED DUE TO WORK IN PROGRESS. ILS RWY 27.', { arrival: ['27'] });
            expectRunways('RWYS 09L AND 09R ARE CLOSED. DEP RWY 27.', { departure: ['27'] });
        });

        it('ignores touchdown-zone reports', () => {
            expectRunways('LDG RWY 25R AND DEP RWY 25L.. 1300Z. WIND RWY 25R TDZ 210/04KT', { departure: ['25L'], arrival: ['25R'] });
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

        it('keeps reading after an inline NOTAM reference (OTHH)', () => {
            expectRunways([
                'DEPARTURES RWY 34 R , EXP YAMEEN 1, AS PER NOTAM A 1077 / 26.',
                'DEPARTURES RWY 34 L , EXP LUSAIL 1, AS PER NOTAM A 1080 / 26.',
            ], { departure: ['34R', '34L'] });
        });

        it('continues after a reference and still stops at the NOTAM section', () => {
            expectRunways('SEE NOTAM A1234/26. DEPTG RWY 22.', { departure: ['22'] });
            expectRunways('REFER TO THE NOTAM A1234/26. DEPTG RWY 22. NOTAM: ILS RWY 27 OTS.', { departure: ['22'] });
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

    describe('broad departure/arrival words', () => {
        it('do not pick up earlier numbers that were not written like runways', () => {
            expectRunways('TEMPERATURE 15 DEWPOINT 12. ARRIVALS EXPECT ILS Z APPROACH RWY 27.', { arrival: ['27'] });
        });

        it('do not take later numbers that are not written like runways', () => {
            expectRunways('ALL DEPARTURES CONTACT TOWER. TEMPERATURE 15', {});
        });

        it('only connect runways within their own sentence', () => {
            expectRunways('ILS VICTOR APPROACH 35L.. DPTG RWY 35R..', { departure: ['35R'] });
            expectRunways('RWY 13 FOR DEPARTURE. RWY 13 FOR ARRIVAL.', { departure: ['13'], arrival: ['13'] });
            expectRunways('ALL DEPARTURES CONTACT TOWER. FL 80. RWY 27', {});
        });

        it('still read runways before and after them', () => {
            expectRunways('RWY 16 RIGHT FOR DEPARTURE.', { departure: ['16R'] });
            expectRunways('RWY IN USE FOR DEPARTURES 13.. CDP VOR INOPERATIVE', { departure: ['13'] });
            expectRunways('EXPECT RWY 12 OR RWY 30 FOR DEPARTURES. EXPECT ILS APPROACH RWY 30.', { departure: ['12', '30'], arrival: ['30'] });
        });
    });

    describe('5-word window', () => {
        it('counts numbers that are not runways like any other word', () => {
            expectRunways('TEMPERATURE 15 DEWPOINT 5 QNH 1013 ILS RWY 27', { arrival: ['27'] });
        });

        it('keeps tentative runways for a specific marker within the original window', () => {
            expectRunways('27 IS THE DEPARTING RUNWAY', { departure: ['27'] });
            expectRunways('27 IS CURRENTLY THE DEPARTING RUNWAY', { departure: ['27'] });
            expectRunways('27 IS CURRENTLY STILL THE DEPARTING RUNWAY', {});
            expectRunways('27 FOR LNDG AND DEPG RWY', { departure: ['27'], arrival: ['27'] });
        });

        it('excludes connectors between runway designators from the window', () => {
            expectRunways('ARRIVALS EXPECT ILS Z RWY 25L/25R. DEP RWY 25C.', { departure: ['25C'], arrival: ['25L', '25R'] });
            expectRunways('ARRIVALS EXPECT ILS Z RWY 25L AND 25R. DEP RWY 25C.', { departure: ['25C'], arrival: ['25L', '25R'] });
            expectRunways('ARRIVALS EXPECT Z RWY 25L AND REPORT 25R.', { arrival: ['25L'] });
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

    describe('runway announcements in the VATSIM feed', () => {
        it('reads the ILS variant before the runway (LFLB)', () => {
            expectRunways('BONJOUR THIS IS CHAMBERY INFORMATION E RECORDED AT 1330Z. EXPECT ILS Z RWY 18. TRANSITION LEVEL 80.', { arrival: ['18'] });
        });

        it('uses the same runway for landing and departure in the abbreviated format (OOMS and OOSA)', () => {
            expectRunways(['EXP ILS APP. LDG', 'DEP RWY 08L. RNP 08R AVAILABLE ON REQUEST.'], { departure: ['08L'], arrival: ['08L'] });
            expectRunways(['EXP ILS APP. LDG', 'DEP RWY 25. 15005KT 100V200 VIS 10KM'], { departure: ['25'], arrival: ['25'] });
        });

        it('excludes procedure numbers and runway condition percentages (UWKE)', () => {
            expectRunways([
                'EXPECT ILS ZULU APPROACH RUNWAY 21. LESS THAN 10 PERCENT WET.',
                'DEPARTURE RUNWAY 21. TRANSITION LEVEL 40. NO SIGNIFICANT CHANGES.',
                '2 FOXTROT DEPARTURES, 2 MIKE ARRIVALS. NON RNAV DEPARTURES AND ARRIVALS BY REQUEST.',
            ], { departure: ['21'], arrival: ['21'] });
        });

        it('keeps circuit direction separate from runway suffixes (LLHA)', () => {
            expectRunways('RUNWAY IN USE 33 RIGHT HAND CIRCUIT. WIND TOUCHDOWN ZONE 26006KT', { departure: ['33'], arrival: ['33'] });
            expectRunways('RUNWAY IN USE 33 RIGHT. LEFT HAND CIRCUIT.', { departure: ['33R'], arrival: ['33R'] });
        });

        it('switches from approaches in use to the subsequent departure list (KORD)', () => {
            expectRunways([
                'ARR EXP VECTORS ILS RWY 28C APCH, VISUAL APCH RWY 27R. SIMUL APCHS IN USE.',
                'DEPS EXP RWYS 22L 28R FROM NOVEMBER 5 9750 FT AVL. NOTAMS... RWY 4L, RWY 22R CLSD.',
            ], { departure: ['22L', '28R'], arrival: ['28C', '27R'] });
        });

        it('keeps approach and turn-off runways out of the departure list (KTEB and KBOS)', () => {
            expectRunways('ILS Z RWY 6 APCH IN USE. ARR 6, DEP 1.. NOTAMS... TEB DEPS MUST COMPLY', { departure: ['01'], arrival: ['06'] });
            expectRunways('ILS RWY 4R APCH IN USE, DEPTG RWY 9. RWY 33R IS APPROVED FOR TURN OFF AFTER LDG.', { departure: ['09'], arrival: ['04R'] });
        });

        it('reads approach and landing lists with slashes (RJTT)', () => {
            expectRunways('RJTT ATIS E 1230 (APCH)ILS X RWY34L/HIGHWAY VSL RWY34R LDG RWY 34L/34R DEP RWY 05/34R DEP FREQ 122.8.', {
                departure: ['05', '34R'],
                arrival: ['34L', '34R'],
            });
            expectRunways('TEMP 16/15. LDG RWY 34L/05/06.', { arrival: ['34L', '05', '06'] });
        });

        it('expands an omitted runway number and applies the label to the list (YSSY)', () => {
            expectRunways('[RWY] 34L AND R FOR ARRS AND DEPS +[WIND] 030/20', { departure: ['34L', '34R'], arrival: ['34L', '34R'] });
            expectRunways('RWY 09L 09R FOR ARRIVAL AND DEPARTURE', { departure: ['09L', '09R'], arrival: ['09L', '09R'] });
            expectRunways('RWY 09L FOR ARRIVAL. AND DEPARTURE INFORMATION FOLLOWS', { arrival: ['09L'] });
        });

        it('uses the trailing label for its own list (YMML, YPPH and EBBR)', () => {
            expectRunways('[RWY] 16 FOR ARR. RWY 27 FOR DEP +[WIND] CALM', { departure: ['27'], arrival: ['16'] });
            expectRunways('[APCH] EXP ILS APCH RWY 21. EXP RNP APCH RWY 24. [RWY] 21 AND 24 FOR ARR. RWY 21 FOR DEP.', {
                departure: ['21'],
                arrival: ['21', '24'],
            });
            expectRunways('EXPECT ILS APPROACH RUNWAY 25L FOR ARRIVALS CLEAR AND DRY RUNWAY 25R FOR DEPARTURES TRANSITION LEVEL 60', {
                departure: ['25R'],
                arrival: ['25L'],
            });
        });

        it('keeps the runway roles distinct in separate departure and arrival broadcasts (ESSA)', () => {
            expectRunways('ESSA ARR ATIS U 1220Z ILS. RWY 01R. DEP RWY 01L. 01R SURFACE CONDITION CODE 5 5 5.', {
                departure: ['01L'],
                arrival: ['01R'],
            });
            expectRunways('ESSA DEP ATIS E 1220Z RWY 01L. ARR RWY 01R. 01L SURFACE CONDITION CODE 5 5 5.', {
                departure: ['01L'],
                arrival: ['01R'],
            });
        });

        it('uses both roles for an unqualified opening runway announcement (EDXW)', () => {
            expectRunways('ATIS EDXW A METAR 221220 RWY 32 WHEN AIRBORNE MONITOR ADVISORY 122.800 TRL 60', { departure: ['32'], arrival: ['32'] });
            expectRunways('RWY 32', { departure: ['32'], arrival: ['32'] });
            expectRunways('ATIS EDDV L METAR 221220 RWY 27R 27L DEPENDENT PARALLEL APPROACHES IN PROGRESS TRL 70', { arrival: ['27R', '27L'] });
        });

        it('excludes split times and weather values (USUU and LTFM)', () => {
            expectRunways('KURGAN ATIS INFORMATION H AT TIME 12 30 EXPECT ILS APPROACH RUNWAY 20', { arrival: ['20'] });
            expectRunways('DEP RWYS 35L AND 36 WIND 190 DEG 06KT VRB BTN 160 DEG AND 230 DEG TRL 130 VIS 9999 T 16 DP 07 QNH 1017 NOSIG RECIEVE DEP CLNC', {
                departure: ['35L', '36'],
            });
        });

        it('excludes runways in separate closure announcements (UWWW and LGAV)', () => {
            expectRunways('RUNWAY 05, 23. OUT OF OPERATION. EXPECT ILS XRAY APPROACH RUNWAY 15. DEPARTURE RUNWAY 15.', {
                departure: ['15'],
                arrival: ['15'],
            });
            expectRunways('LDG RWY 03R. TAKE OFF RWY 03R. ATTENTION. DUE TO WIP, RWY 03L 21R AND TWYS A B H K AND Z CLOSED.', {
                departure: ['03R'],
                arrival: ['03R'],
            });
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
