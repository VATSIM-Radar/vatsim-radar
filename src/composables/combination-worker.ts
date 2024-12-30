import { combineSectors, splitSectors } from '~/utils/data/vatglasses-helper';

self.onmessage = function(event) {
    const [type, sectors] = event.data;
    if (type === 'splitSectors') {
        const result = splitSectors(sectors);
        self.postMessage(result);
    }
    else if (type === 'combineSectors') {
        const result = combineSectors(sectors);
        self.postMessage(result);
    }
};
