// ARINC 596 SELCAL tone frequencies (Hz). I, N and O are never assigned to avoid
// confusion with the digits 1 and 0.
export const SELCAL_FREQUENCIES: Record<string, number> = {
    A: 312.6,
    B: 346.7,
    C: 384.6,
    D: 426.6,
    E: 473.2,
    F: 524.8,
    G: 582.1,
    H: 645.7,
    J: 716.1,
    K: 794.3,
    L: 881.0,
    M: 977.2,
    P: 1083.9,
    Q: 1202.3,
    R: 1333.5,
    S: 1479.1,
};

export function parseSelcalCode(raw: string): string[] | null {
    const letters = raw.toUpperCase().replace(/[^A-Z]/g, '').split('');

    if (letters.length !== 4 || letters.some(letter => !SELCAL_FREQUENCIES[letter])) return null;

    return letters;
}
