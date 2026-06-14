type CombinationTaskType = 'splitSectors' | 'combineSectors' | 'combineSectorsByBands';

interface PendingTask {
    type: CombinationTaskType;
    payload: unknown;
    resolve: (value: any) => void;
    reject: (reason: any) => void;
}

interface PoolWorker {
    worker: Worker;
    busy: boolean;
    current: PendingTask | null;
}

// Mirror the dynamic-import shape used elsewhere for the `?worker` constructor.
type WorkerConstructor = new () => Worker;

const MAX_POOL_SIZE = 8;

function resolvePoolSize(): number {
    const cores = (typeof navigator !== 'undefined' && navigator.hardwareConcurrency) || 4;
    return Math.max(1, Math.min(cores, MAX_POOL_SIZE));
}

class CombinationPool {
    private readonly size: number;

    private readonly workers: PoolWorker[] = [];

    private readonly queue: PendingTask[] = [];

    private ctor: WorkerConstructor | null = null;

    private ctorPromise: Promise<WorkerConstructor> | null = null;

    constructor(size: number) {
        this.size = size;
    }

    /** Run a single geometry task on the next free worker. */
    async run<T = any>(type: CombinationTaskType, payload: unknown): Promise<T> {
        await this.ensureCtor();
        return new Promise<T>((resolve, reject) => {
            this.queue.push({ type, payload, resolve, reject });
            this.pump();
        });
    }

    private ensureCtor(): Promise<WorkerConstructor> {
        if (this.ctor) return Promise.resolve(this.ctor);

        let ctorPromise = this.ctorPromise;
        if (!ctorPromise) {
            ctorPromise = import('~/composables/render/combination-worker.ts?worker').then(m => {
                const ctor = m.default as WorkerConstructor;
                this.ctor = ctor;
                return ctor;
            });
            this.ctorPromise = ctorPromise;
        }
        return ctorPromise;
    }

    private bind(entry: PoolWorker) {
        entry.worker.onmessage = (event: MessageEvent) => {
            const task = entry.current;
            entry.current = null;
            entry.busy = false;
            task?.resolve(event.data);
            this.pump();
        };
        entry.worker.onerror = (error: ErrorEvent) => {
            const task = entry.current;
            entry.current = null;
            entry.busy = false;
            // Recreate the worker so one bad job doesn't poison the pool.
            try {
                entry.worker.terminate();
            }
            catch { /* ignore */ }
            if (this.ctor) {
                entry.worker = new this.ctor();
                this.bind(entry);
            }
            task?.reject(error);
            this.pump();
        };
    }

    private spawn(): PoolWorker | undefined {
        if (!this.ctor) return undefined;
        const entry: PoolWorker = { worker: new this.ctor(), busy: false, current: null };
        this.bind(entry);
        this.workers.push(entry);
        return entry;
    }

    private pump() {
        while (this.queue.length) {
            let entry = this.workers.find(w => !w.busy);
            if (!entry && this.workers.length < this.size) entry = this.spawn();
            if (!entry) break; // every worker busy and at capacity — wait for a free one

            const task = this.queue.shift()!;
            entry.busy = true;
            entry.current = task;
            entry.worker.postMessage([task.type, task.payload]);
        }
    }
}

let pool: CombinationPool | null = null;

export function getCombinationPool(): CombinationPool {
    pool ??= new CombinationPool(resolvePoolSize());
    return pool;
}
