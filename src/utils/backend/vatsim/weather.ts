const caches: {
    icao: string;
    metar?: string;
    taf?: string;
    date: number;
}[] = [];

export async function getAirportWeather(icao: string): Promise<{ metar: string | null; taf: string | null } | null> {
    const cachedMetar = caches.find(x => x.icao === icao);

    const data = {
        metar: '',
        taf: '',
    };

    if (cachedMetar?.metar && cachedMetar.taf && cachedMetar.date > Date.now() - (1000 * 60 * 5)) {
        data.metar = cachedMetar.metar;
        data.taf = cachedMetar.taf;
    }
    else {
        try {
            const [metar, taf] = await Promise.all([
                $fetch<string>(`https://metar.vatsim.net/${ icao }`, { responseType: 'text' }),
                $fetch<string>(`https://tgftp.nws.noaa.gov/data/forecasts/taf/stations/${ icao }.TXT`, { responseType: 'text' }),
            ]);

            data.metar = metar;
            const splitTaf = taf.split('\n');
            data.taf = splitTaf.slice(1, splitTaf.length).join('\n');

            if (cachedMetar) {
                cachedMetar.date = Date.now();
                cachedMetar.metar = data.metar;
                cachedMetar.taf = data.taf;
            }
            else {
                caches.push({
                    icao,
                    metar: data.metar,
                    taf: data.taf,
                    date: Date.now(),
                });
            }
        }
        catch (e) {
            console.error(e);

            if (cachedMetar?.metar) {
                data.metar = cachedMetar.metar;
            }

            if (cachedMetar?.taf) {
                data.taf = cachedMetar.taf;
            }

            if (!data.metar && !data.taf) return null;
        }
    }

    return data;
}
