import type { ComponentPublicInstance, Ref } from 'vue';

// Keep variable-height rows and wrapped dashboard cards in their existing layout.
// Only nearby chunks mount their expensive Vue subtrees; measured placeholders keep
// the surrounding scroll container stable when a chunk leaves the viewport.
export function useVirtualChunks<T>(items: Ref<T[]>, resetKey: Ref<string>) {
    const chunkSize = 20;
    const enabled = computed(() => items.value.length > 100);
    const visible = shallowRef(new Set([0]));
    const heights = shallowRef(new Map<number, number>());
    const elements = new Map<number, HTMLElement>();
    let intersection: IntersectionObserver | undefined;
    let resize: ResizeObserver | undefined;

    const chunks = computed(() => {
        const size = enabled.value ? chunkSize : Math.max(items.value.length, 1);
        return Array.from({ length: Math.ceil(items.value.length / size) }, (_, index) => ({
            index,
            items: items.value.slice(index * size, (index + 1) * size),
            mounted: !enabled.value || visible.value.has(index),
            height: heights.value.get(index) ?? Math.min(size, items.value.length - index * size) * 88,
        }));
    });

    function setElement(index: number, element: Element | ComponentPublicInstance | null) {
        const previous = elements.get(index);
        if (previous === element) return;
        if (previous) {
            intersection?.unobserve(previous);
            resize?.unobserve(previous);
            elements.delete(index);
        }
        if (!(element instanceof HTMLElement)) return;
        elements.set(index, element);
        intersection?.observe(element);
        resize?.observe(element);
    }

    onMounted(() => {
        intersection = new IntersectionObserver(entries => {
            const next = new Set(visible.value);
            for (const entry of entries) {
                const index = Number((entry.target as HTMLElement).dataset.chunk);
                if (entry.isIntersecting) next.add(index);
                else next.delete(index);
            }
            visible.value = next;
        }, { rootMargin: '600px 0px' });
        resize = new ResizeObserver(entries => {
            const next = new Map(heights.value);
            let changed = false;
            for (const entry of entries) {
                const index = Number((entry.target as HTMLElement).dataset.chunk);
                if (enabled.value && !visible.value.has(index)) continue;
                const height = entry.borderBoxSize?.[0]?.blockSize ?? entry.contentRect.height;
                if (height > 0 && next.get(index) !== height) {
                    next.set(index, height);
                    changed = true;
                }
            }
            if (changed) heights.value = next;
        });
        for (const element of elements.values()) {
            intersection.observe(element);
            resize.observe(element);
        }
    });

    watch(resetKey, () => {
        heights.value = new Map();
        visible.value = new Set([0]);
        // Reobserve reused wrappers as well as wrappers replaced by a keyed view.
        for (const element of elements.values()) {
            intersection?.unobserve(element);
            intersection?.observe(element);
        }
    });
    watch(() => chunks.value.length, length => {
        heights.value = new Map([...heights.value].filter(([index]) => index < length));
    });
    onBeforeUnmount(() => {
        intersection?.disconnect();
        resize?.disconnect();
        elements.clear();
    });

    return { chunks, setElement };
}
