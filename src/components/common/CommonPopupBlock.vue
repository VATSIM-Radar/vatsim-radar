<template>
    <div class="popup-block">
        <div class="popup-block_title" v-if="$slots.title">
            <div class="popup-block_title_text">
                <slot name="title"/>
            </div>
            <div class="popup-block_title_sub" v-if="$slots.additionalTitle">
                <slot name="additionalTitle"/>
            </div>
        </div>
        <div class="popup-block_content">
            <slot/>
        </div>
    </div>
</template>

<style scoped lang="scss">
.popup-block {
    background: $neutral1000;
    border-radius: 8px;
    padding: 8px;

    &_title {
        display: flex;
        gap: 16px;
        padding-bottom: 8px;
        border-bottom: 1px solid varToRgba('neutral150', 0.2);

        &_text {
            color: $primary500;
            font-size: 17px;
            font-weight: 700;
            font-family: $openSansFont;
            letter-spacing: -1%;
            line-height: 100%;
        }

        &_sub {
            padding-left: 16px;
            border-left: 1px solid varToRgba('neutral150', 0.2);
            color: $neutral150;
            font-size: 13px;
        }
    }

    &, &_content {
        display: flex;
        flex-direction: column;
        gap: 8px;
    }
}
</style>
