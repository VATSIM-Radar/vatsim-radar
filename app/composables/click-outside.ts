import type { MaybeRef } from 'vue';
import { serializeClass } from '~/utils';

type ClickOutsideCallback = (ev: Event) => any;

export interface ClickOutsideOptions {
    element: MaybeRef<Element | null> | (() => Element | null | undefined);
    callback: ClickOutsideCallback;

    /**
     * @default Document
     */
    root?: Element;

    /**
     * @description if strict it will check 100% DOM match instead of trying to guess by using classes
     */
    strict?: boolean;

    /**
     * @description Will not trigger on selected elements or classes
     */
    ignoreElements?: Array<string | Element | Element[] | NodeListOf<Element>>;
}

function validateClickOutsideTarget(element: Element, target: Element, strict: boolean) {
    const targetClass = serializeClass(target.getAttribute('class')) || '';

    if (strict) {
        if (element?.contains(target) || element === target) {
            return false;
        }
    }
    else if (
        element?.contains(target) ||
        element === target ||
        element?.querySelector(`[class="${ targetClass }"]`) ||
        (targetClass && element?.querySelector(`.${ targetClass.split(' ').filter(x => !!x).join('.') }`)) ||
        element?.getAttribute('class') === targetClass
    ) {
        return false;
    }

    return true;
}

function handleClickOutside(options: ClickOutsideOptions, event: Event) {
    const element = toValue(options.element);
    if (!element) return;
    const target = event.target as HTMLDivElement;
    if (!target) throw new Error('Target is undefined in handleClickOutside');

    let ignoreElements: Element[] = [];

    for (const elements of options.ignoreElements || []) {
        if (typeof elements === 'string') {
            ignoreElements = [
                ...ignoreElements,
                ...Array.from(document.querySelectorAll(serializeClass(elements))),
            ];
        }
        else if ('length' in elements) {
            ignoreElements = [
                ...ignoreElements,
                ...Array.from(elements),
            ];
        }
        else if (element && typeof element === 'object') {
            ignoreElements = [
                ...ignoreElements,
                elements,
            ];
        }
    }

    if (!validateClickOutsideTarget(element, target, !!options.strict)) return;
    if (ignoreElements.length && ignoreElements.some(x => !validateClickOutsideTarget(x, target, true))) return;

    options.callback(event);
}

export function useClickOutside(_options: MaybeRef<ClickOutsideOptions>) {
    if (!getCurrentInstance()) throw new Error('You can only setup setupClickOutside on runtime');

    let listener = false;

    const options = computed(() => toValue(_options));
    const element = computed(() => options.value.root || document);

    function _handleClickOutside(e: Event) {
        handleClickOutside(options.value, e);
    }

    function setupClickOutside() {
        if (listener) {
            element.value.removeEventListener('click', _handleClickOutside, {
                capture: true,
            });
            listener = false;
        }

        element.value.addEventListener('click', _handleClickOutside, {
            capture: true,
        });
        listener = true;
    }

    onMounted(() => {
        setupClickOutside();
    });
    onBeforeUnmount(() => {
        if (listener) {
            element.value.removeEventListener('click', _handleClickOutside, {
                capture: true,
            });
            listener = false;
        }
    });

    if (isRef(_options)) watch(_options, setupClickOutside);
}
