import { useRouter } from '#imports';

export function useGoBack(fallback = '/') {
    const router = useRouter();

    function goBack() {
        if (typeof window === 'undefined') {
            void router.push(fallback);
            return;
        }

        const len = window.history.length ?? 0;

        if (len !== 0 && len !== 1) {
            window.history.back();
        }
        else {
            void router.push(fallback);
        }
    }

    return { goBack };
}
