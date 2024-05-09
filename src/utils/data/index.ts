import { analyse } from 'chardet';

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

export function parseEncoding(text: string) {
    const encoded = new Uint8Array([...text].map(char => char.charCodeAt(0)));

    const analyseResult = analyse(encoded);

    const encoding = analyseResult.find(result => {
        return supportedEncodings.includes(result.name);
    });

    return new TextDecoder(encoding?.name.toLowerCase() ?? 'utf-8').decode(encoded);
}
