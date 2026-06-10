import type { BottomSheetTheme } from 'vue-bottom-sheets';

export const mapBottomSheetTheme: BottomSheetTheme = {
    maxWidth: 640,
    radius: 16,
    background: radarColors.black,
    color: radarColors.lightGray200,
    backdrop: radarColors.blackAlpha64,
    handle: radarColors.whiteAlpha24,
    shadow: `0 -8px 40px ${ radarColors.blackAlpha64 }`,
    transitionDuration: 320,
    transitionEasing: 'cubic-bezier(0.22, 1, 0.36, 1)',
};

const { height: windowHeight } = useWindowSize();

export const useSheetMaxHeight = globalComputed(() => {
    const headerOffset = useStore().config.hideHeader ? 8 : 56 + 8;
    return Math.max(0, windowHeight.value - headerOffset);
});
