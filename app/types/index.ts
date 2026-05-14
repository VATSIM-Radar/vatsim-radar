export type PartialRecord<K extends keyof any, T> = {
    [P in K]?: T;
};

export type RecursivePartial<T> = {
    [P in keyof T]?:
    T[P] extends (infer U)[] ? RecursivePartial<U>[]
        : T[P] extends object | undefined ? RecursivePartial<T[P]>
            : T[P];
};

export interface NuxtError {
    url: string;
    statusCode: number;
    statusMessage: string;
    message: string;
    description: string;
    data?: any;
}

export type INuxtError = NuxtError | Error;
