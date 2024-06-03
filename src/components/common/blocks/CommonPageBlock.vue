<template>
    <div class="page-block">
        <div
            v-if="$slots.title"
            class="page-block_title"
        >
            <slot name="title"/>
        </div>
        <slot/>
    </div>
</template>

<style scoped lang="scss">
.page-block {
    flex: 1 0 auto;

    width: 100%;
    padding: 24px;

    background: $neutral950;
    border-radius: 16px;

    &_title {
        margin-bottom: 16px;
        padding-bottom: 8px;

        font-size: 32px;
        font-weight: 600;
        color: $primary500;

        border-bottom: 1px solid varToRgba('neutral150', 0.2);
    }
}
</style>
