export function vatsimAuth() {
    useCookie<string>('redirect', {
        sameSite: 'none',
        path: '/',
        secure: true,
    }).value = document.location.href;

    nextTick().then(() => {
        document.location.href = '/api/auth/vatsim/redirect';
    });
}

export function navigraphAuth() {
    useCookie<string>('redirect', {
        sameSite: 'none',
        path: '/',
        secure: true,
    }).value = document.location.href;

    nextTick().then(() => {
        document.location.href = '/api/auth/navigraph/redirect';
    });
}

export function logout() {
    useCookie<string>('redirect', {
        sameSite: 'none',
        path: '/',
        secure: true,
    }).value = document.location.href;

    nextTick().then(() => {
        document.location.href = '/api/user/logout';
    });
}
