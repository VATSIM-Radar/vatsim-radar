<template>
    <common-container class="page-block">
        <div class="page-block_title" v-if="$slots.title">
            <slot name="title"/>
        </div>
        <slot/>
    </common-container>
</template>

<style scoped lang="scss">
.page-block {
    background: $neutral950;
    padding: 16px;
    border-radius: 8px;
    width: 100%;
    flex: 1 0 auto;

    &_title {
        font-size: 32px;
        color: $primary500;
        padding-bottom: 8px;
        border-bottom: 1px solid varToRgba('neutral150', 0.2);
        margin-bottom: 16px;
        font-weight: 600;
    }
}
</style>
