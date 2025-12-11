import { addImports, defineNuxtModule } from '@nuxt/kit';

export default defineNuxtModule(() => {
    addImports({
        name: 'useStorage',
        as: 'useStorageLocal',
        from: '@vueuse/core',
        priority: 100,
    });
});
