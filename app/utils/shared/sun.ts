import { toRadians, toDegrees } from 'ol/math.js';

export interface SunTimes {
    sunrise: Date | null;
    sunset: Date | null;
    // Sun stays above (day) or below (night) the horizon for the whole day, so sunrise/sunset are null
    polar: 'day' | 'night' | null;
}

const julianDayUnixEpoch = 2440587.5;
const julianDayJ2000 = 2451545;
const msInDay = 1000 * 60 * 60 * 24;

const toJulianDay = (date: Date) => (date.getTime() / msInDay) + julianDayUnixEpoch;
const fromJulianDay = (julianDay: number) => new Date((julianDay - julianDayUnixEpoch) * msInDay);
const sinDeg = (deg: number) => Math.sin(toRadians(deg));

/**
 * Calculates sunrise and sunset for the solar day closest to the given date, using the standard sunrise equation.
 * Accuracy is within a couple of minutes, which is enough for display purposes.
 * @see https://en.wikipedia.org/wiki/Sunrise_equation
 */
export function getSunTimes(date: Date, lat: number, lon: number): SunTimes {
    // Mean solar time (days since J2000) for the solar noon at this longitude
    const days = Math.round(toJulianDay(date) - julianDayJ2000 + 0.0008 + (lon / 360));
    const meanSolarTime = days - (lon / 360);

    const meanAnomaly = (357.5291 + (0.98560028 * meanSolarTime)) % 360;
    const center = (1.9148 * sinDeg(meanAnomaly)) + (0.02 * sinDeg(2 * meanAnomaly)) + (0.0003 * sinDeg(3 * meanAnomaly));
    const eclipticLongitude = (meanAnomaly + center + 180 + 102.9372) % 360;

    const solarTransit = julianDayJ2000 + meanSolarTime + (0.0053 * sinDeg(meanAnomaly)) - (0.0069 * sinDeg(2 * eclipticLongitude));
    const sinDeclination = sinDeg(eclipticLongitude) * sinDeg(23.4397);
    const cosDeclination = Math.cos(Math.asin(sinDeclination));

    // -0.833 degrees accounts for atmospheric refraction and the solar disc size
    const cosHourAngle = (sinDeg(-0.833) - (sinDeg(lat) * sinDeclination)) / (Math.cos(toRadians(lat)) * cosDeclination);

    if (cosHourAngle > 1) return { sunrise: null, sunset: null, polar: 'night' };
    if (cosHourAngle < -1) return { sunrise: null, sunset: null, polar: 'day' };

    const hourAngle = toDegrees(Math.acos(cosHourAngle));

    return {
        sunrise: fromJulianDay(solarTransit - (hourAngle / 360)),
        sunset: fromJulianDay(solarTransit + (hourAngle / 360)),
        polar: null,
    };
}
