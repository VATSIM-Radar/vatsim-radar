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
    border-radius: 16px;

    background: $darkgray950;

    @include mobileOnly {
        padding: 8px;
    }

    &_title {
        margin-bottom: 16px;
        padding-bottom: 8px;
        border-bottom: 1px solid varToRgba('lightgray150', 0.2);

        font-size: 32px;
        font-weight: 600;
        color: $primary500;

        @include mobileOnly {
            font-size: 24px;
        }
    }
}
</style>
