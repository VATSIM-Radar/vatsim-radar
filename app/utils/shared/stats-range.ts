export function isStatsRangeWithin31Days(from: Date, to: Date): boolean {
    return to > from && to.getTime() - from.getTime() <= 31 * 24 * 60 * 60 * 1000;
}
