export type PartialRecord<K extends keyof any, T> = {
    [P in K]?: T;
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
