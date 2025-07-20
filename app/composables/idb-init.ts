export function initIDBData<T>(getFunction: () => Promise<T>): () => Promise<T> {
    let previousRequest = 0;
    let interval: NodeJS.Timeout | null = null;
    let data: T | null = null;
    let gettingData = false;

    return async function() {
        if (gettingData) {
            return new Promise<T>((resolve, reject) => {
                const interval = setInterval(() => {
                    if (gettingData) return;
                    resolve(data!);
                    clearInterval(interval);
                }, 1000);
            });
        }

        previousRequest = Date.now();

        if (!interval) {
            interval = setInterval(() => {
                // For GC
                if (data && Date.now() - previousRequest > 1000 * 15) {
                    data = null;
                }
            }, 1000);
        }

        if (data) return data;

        gettingData = true;

        try {
            data = await getFunction();

            gettingData = false;

            return data;
        }
        catch (e) {
            gettingData = false;

            throw e;
        }
    };
}
