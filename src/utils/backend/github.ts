import type { FetchRequest, FetchOptions, MappedResponseType, ResponseType } from 'ofetch';
import { $fetch } from 'ofetch';

export default function githubRequest<T = any, R extends ResponseType = 'json'>(request: FetchRequest, options?: FetchOptions<R>): Promise<MappedResponseType<R, T>> {
    const token = process.env.GITHUB_ACCESS_TOKEN || useRuntimeConfig().GITHUB_ACCESS_TOKEN;

    if (!token) return $fetch<T, R>(request, options);

    return $fetch<T, R>(request, {
        ...options,
        headers: {
            ...options?.headers,
            authorization: `Bearer ${ token }`,
        },
    });
}
