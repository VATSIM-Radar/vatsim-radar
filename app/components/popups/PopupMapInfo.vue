<template>
    <div class="popup-block">
        <div
            v-if="$slots.title"
            class="popup-block_title"
        >
            <div class="popup-block_title_text">
                <slot name="title"/>
            </div>
            <div
                v-if="$slots.additionalTitle"
                class="popup-block_title_sub"
            >
                <slot name="additionalTitle"/>
            </div>
            <template v-if="$slots.titleAppend">
                <div class="__spacer"/>
                <div class="popup-block_title_append">
                    <slot name="titleAppend"/>
                </div>
            </template>
        </div>
        <div class="popup-block_content">
            <slot/>
        </div>
    </div>
</template>

<style scoped lang="scss">
.popup-block {
    padding: 8px;
    border-radius: 8px;
    background: $darkgray1000;

    &_title {
        display: flex;
        flex-wrap: wrap;
        gap: 4px 16px;
        align-items: center;

        padding-bottom: 8px;
        border-bottom: 1px solid varToRgba('lightgray150', 0.2);

        &_text {
            font-family: $openSansFont;
            font-size: 17px;
            font-weight: 700;
            line-height: 100%;
            color: $primary500;
            letter-spacing: -1%;
        }

        &_sub {
            padding-left: 16px;
            border-left: 1px solid varToRgba('lightgray150', 0.2);
            font-size: 13px;
            color: $lightgray150;
        }

        .__spacer {
            margin: 0 -16px;
        }
    }

    &, &_content {
        display: flex;
        flex-direction: column;
        gap: 8px;
    }
}
</style>
