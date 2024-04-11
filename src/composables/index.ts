import type { Coordinate } from 'ol/coordinate';
import { containsCoordinate  } from 'ol/extent';
import { useStore } from '~/store';
import type { ShallowRef } from 'vue';
import type { Map } from 'ol';
import { sleep } from '~/utils';

export function isPointInExtent(point: Coordinate, extent = useStore().extent) {
    return containsCoordinate(extent, point);
}

export function attachMoveEnd(callback: (event: any) => unknown) {
    if (!getCurrentInstance()) throw new Error('Only can attach moveEnd on setup');
    let moveStarted = false;
    let registered = false;
    const map = inject<ShallowRef<Map | null>>('map')!;

    const startHandler = () => {
        moveStarted = true;
    };

    const endHandler = async (e: any) => {
        if (!moveStarted) return;
        moveStarted = false;
        await sleep(300);
        if (moveStarted) return;
        callback(e);
    };

    onBeforeUnmount(() => {
        map.value?.un('movestart', startHandler);
        map.value?.un('moveend', endHandler);
    });

    watch(map, (val) => {
        if (!map.value || registered) return;
        registered = true;

        map.value.on('movestart', startHandler);
        map.value.on('moveend', endHandler);
    }, {
        immediate: true,
    });
}
