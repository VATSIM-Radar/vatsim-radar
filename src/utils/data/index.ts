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

const decoderUtf8 = new TextDecoder('utf-8');
const decoderWindows1251 = new TextDecoder('windows-1251');

export function parseEncoding(text: string) {
    const encoded = new Uint8Array([...text].map(char => char.charCodeAt(0)));
    const decoded = decoderUtf8.decode(encoded);
    if (decoded.includes('�')) return decoderWindows1251.decode(encoded);
    return decoded;
}
