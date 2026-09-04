import type { Feature as TurfFeature, Polygon as TurfPolygon } from 'geojson';
import type { VatglassesSectorProperties } from '~/utils/data/vatglasses';

type CombinationSectors = TurfFeature<TurfPolygon, VatglassesSectorProperties>[];

/** A complete position calculation waiting for an available worker. */
interface PendingTask {
    sectors: CombinationSectors;
    resolve: (value: CombinationSectors) => void;
    reject: (reason: unknown) => void;
}

/**
 * One worker owns at most one task, so its response can be matched without request IDs.
 * The worker is returned to the pool only after that task resolves or fails.
 */
interface PoolWorker {
    worker: Worker;
    current: PendingTask | null;
}

type WorkerConstructor = new () => Worker;

const MAX_POOL_SIZE = 4;
// Turf and polygon clipping retain large temporary graphs; release their worker heaps after a short idle period.
const IDLE_TERMINATION_DELAY = 30_000;

/**
 * Leave one logical core for the main thread and cap low-memory devices at two geometry workers.
 * `deviceMemory` is Chromium-only, so other browsers fall back to the conservative hard cap.
 */
function resolvePoolSize() {
    const cores = navigator.hardwareConcurrency || 2;
    const deviceMemory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
    const memoryLimit = deviceMemory !== undefined && deviceMemory <= 4 ? 2 : MAX_POOL_SIZE;

    return Math.max(1, Math.min(cores - 1, memoryLimit, MAX_POOL_SIZE));
}

/**
 * Runs one complete split-and-combine pipeline per worker job. Positions are independent, which makes
 * them safe to calculate concurrently while avoiding the old main -> worker -> main intermediate round trip.
 */
class CombinationPool {
    /** Live workers, including busy workers and workers waiting for another queued position. */
    private readonly workers: PoolWorker[] = [];

    /** FIFO keeps position scheduling deterministic when more positions exist than available workers. */
    private readonly queue: PendingTask[] = [];

    private readonly size = resolvePoolSize();

    private constructorType: WorkerConstructor | null = null;

    private constructorPromise: Promise<WorkerConstructor> | null = null;

    private idleTimer: ReturnType<typeof setTimeout> | null = null;

    /** Queue one position and resolve with its final combined sector features. */
    async run(sectors: CombinationSectors) {
        await this.ensureConstructor();
        this.clearIdleTimer();

        return new Promise<CombinationSectors>((resolve, reject) => {
            this.queue.push({ sectors, resolve, reject });
            this.pump();
        });
    }

    /** Import the Vite worker constructor once, including when several positions arrive simultaneously. */
    private async ensureConstructor() {
        if (this.constructorType) return this.constructorType;

        this.constructorPromise ??= import('~/composables/render/combination-worker.ts?worker')
            .then(module => {
                this.constructorType = module.default;
                return module.default;
            })
            .catch(error => {
                this.constructorPromise = null;
                throw error;
            });

        return this.constructorPromise;
    }

    /** Create and bind a worker lazily; unused pool capacity does not allocate worker heaps. */
    private createWorker() {
        if (!this.constructorType) return null;

        const entry: PoolWorker = {
            worker: new this.constructorType(),
            current: null,
        };

        entry.worker.onmessage = (event: MessageEvent<CombinationSectors>) => {
            const task = entry.current;
            entry.current = null;
            task?.resolve(event.data);
            this.pump();
        };

        entry.worker.onerror = error => {
            const task = entry.current;
            entry.current = null;
            entry.worker.terminate();
            // A worker that threw may have invalid internal state, so remove it instead of reusing it.
            const workerIndex = this.workers.indexOf(entry);
            if (workerIndex !== -1) this.workers.splice(workerIndex, 1);
            task?.reject(error);
            this.pump();
        };

        this.workers.push(entry);
        return entry;
    }

    /** Fill every free worker until the queue is empty or the configured capacity is busy. */
    private pump() {
        while (this.queue.length) {
            let entry = this.workers.find(worker => !worker.current);
            if (!entry && this.workers.length < this.size) entry = this.createWorker() ?? undefined;
            if (!entry) return;

            const task = this.queue.shift()!;
            entry.current = task;
            entry.worker.postMessage({
                type: 'splitAndCombineSectors',
                sectors: task.sectors,
            });
        }

        if (this.workers.every(worker => !worker.current)) this.scheduleIdleTermination();
    }

    /** Terminate the complete idle pool together so Turf/polyclip temporary memory can be reclaimed. */
    private scheduleIdleTermination() {
        if (this.idleTimer) return;

        this.idleTimer = setTimeout(() => {
            this.workers.forEach(worker => worker.worker.terminate());
            this.workers.length = 0;
            this.idleTimer = null;
        }, IDLE_TERMINATION_DELAY);
    }

    /** New work keeps the existing warm workers alive. */
    private clearIdleTimer() {
        if (!this.idleTimer) return;
        clearTimeout(this.idleTimer);
        this.idleTimer = null;
    }
}

let pool: CombinationPool | null = null;

/** The pool is shared by every VATGlasses update in the current browser tab. */
export function getCombinationPool() {
    pool ??= new CombinationPool();
    return pool;
}
