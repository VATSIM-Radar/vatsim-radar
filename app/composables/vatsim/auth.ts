import { isIframe } from '~/composables';

export function vatsimAuth() {
    useCookie<string>('redirect', {
        sameSite: 'none',
        path: '/',
        secure: true,
    }).value = document.location.href;

    if (isIframe.value) {
        nextTick().then(() => {
            document.location.href = 'efbx://auth/vatsim';
        });
        return;
    }

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

    window.parent.postMessage({ type: 'external-auth' }, '*');

    nextTick().then(() => {
        document.location.href = `/api/auth/navigraph/redirect?iframe=${ Number(isIframe.value) }`;
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
