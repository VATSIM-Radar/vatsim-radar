import Vue3TouchEvents from 'vue3-touch-events';

export default defineNuxtPlugin(nuxtApp => {
    nuxtApp.vueApp.use(Vue3TouchEvents as any, {
        swipeTolerance: 15,
    });
});
