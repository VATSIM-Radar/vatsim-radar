import { useStore } from '~/store';

export function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

export function getHoursAndMinutes(date: number) {
    const diff = Math.abs(useStore().datetime - date) / (1000 * 60);

    return `${ (`0${ Math.floor(diff / 60) }`).slice(-2) }:${ (`0${ Math.floor(diff % 60) }`).slice(-2) }`;
}

export async function copyText(text: string): Promise<void> {
    if (typeof window === 'undefined') throw new Error('You are not allowed to call copyText on SSR');

    if (typeof navigator?.permissions?.query !== 'undefined' && typeof navigator?.clipboard?.writeText !== 'undefined') {
        try {
            const { state } = await navigator.permissions.query({ name: 'clipboard-write' as PermissionName });
            if (state === 'granted' || state === 'prompt') {
                await navigator.clipboard.writeText(text);
                alert('Text has been copied to your clipboard!');
                return;
            }
        }
        catch (e) {
            console.warn('copyText using navigator.permissions.query failed, falling back to legacy method', e);
        }
    }

    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.top = '0';
    textArea.style.left = '0';
    textArea.style.position = 'fixed';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();

    const success = document.execCommand('copy');
    if (!success) throw new Error('Was not able to copy text');

    document.body.removeChild(textArea);
    alert('Text has been copied to your clipboard!');
}
