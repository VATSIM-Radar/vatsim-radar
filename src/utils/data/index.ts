import { analyse } from 'chardet';
import type { Match } from 'chardet/lib/match';

export const useFacilitiesNames = () => {
    const dataStore = useDataStore();

    return {
        OBS: dataStore.vatsim.data.facilities.value.find(x => x.short === 'OBS')?.long ?? '',
        FSS: dataStore.vatsim.data.facilities.value.find(x => x.short === 'FSS')?.long ?? '',
        DEL: dataStore.vatsim.data.facilities.value.find(x => x.short === 'DEL')?.long ?? '',
        GND: dataStore.vatsim.data.facilities.value.find(x => x.short === 'GND')?.long ?? '',
        TWR: dataStore.vatsim.data.facilities.value.find(x => x.short === 'TWR')?.long ?? '',
        APP: dataStore.vatsim.data.facilities.value.find(x => x.short === 'APP')?.long ?? '',
        CTR: dataStore.vatsim.data.facilities.value.find(x => x.short === 'CTR')?.long ?? '',
    };
};

const supportedEncodings = [
    'UTF-8',
    'UTF-16LE',
    'UTF-16BE',
    'ISO-2022-JP',
    'Big5',
    'EUC-JP',
    'EUC-KR',
    'GB18030',
    'ISO-8859-2',
    'ISO-8859-5',
    'ISO-8859-6',
    'ISO-8859-7',
    'ISO-8859-8',
    'ISO-8859-9',
    'windows-1250',
    'windows-1251',
    'windows-1252',
    'windows-1253',
    'windows-1254',
    'windows-1255',
    'windows-1256',
    'KOI8-R',
];

function decode(text: Uint8Array, match: string) {
    return new TextDecoder(match.toLowerCase() ?? 'utf-8').decode(text);
}

const encoder = new TextEncoder();
const decoder1251 = new TextDecoder('windows-1251');
let slugs1251: string[] = [];

export function parseEncoding(text: string, callsignOrAirport?: string) {
    try {
        return decodeURIComponent(escape(text));
    }
    catch { /* empty */ }

    if (!slugs1251.length) slugs1251 = useDataStore().vatspy.value?.data.countries.filter(x => x.country === 'Russia' || x.country === 'Belarus' || x.country === 'Armenia' || x.country === 'Ukraine').map(x => x.code) ?? [];

    const toAnalyse = encoder.encode(text);

    if (callsignOrAirport && slugs1251.includes(callsignOrAirport.slice(0, 2))) {
        const result = decoder1251.decode(toAnalyse);

        if (result.includes('Ћ') || result.includes('¤') || result.includes('ґ') || result.includes('®') || result.includes('©') || result.includes('Є') || result.includes('þ') || result.includes('ð')) {
            return decoder1251.decode(new Uint8Array([...text].map(char => char.charCodeAt(0))));
        }
    }

    const analyseResult = analyse(toAnalyse);

    let encoding: Match | undefined;
    let confidence = 0;

    analyseResult.forEach((result, index) => {
        if (!supportedEncodings.includes(result.name) || (encoding && confidence > result.confidence)) return;

        encoding = result;
        confidence = result.confidence;
        text = decode(toAnalyse, result.name);
    });

    return text;
}
