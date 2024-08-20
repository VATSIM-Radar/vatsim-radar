export function getCFWorkerDomain() {
    return process.env.NODE_ENV === 'development' ? 'http://host.docker.internal:8787' : `${ process.env.DOMAIN }/cf`;
}
