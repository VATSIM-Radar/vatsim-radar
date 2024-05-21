<template>
    <div class="error-404">
        <div class="error-404_content">
            <div class="error-404_content_title">
                HDG
            </div>
            <div class="error-404_content_text">
                PAGE NOT AVAIL
            </div>
        </div>
        <div class="error-404_gps">
            GPS Primary Lost
        </div>
        <div class="error-404_image">
            <gps-lost/>
        </div>
    </div>
</template>

<script setup lang="ts">
import GpsLost from 'assets/icons/errors/gps-lost.svg?component';
</script>

<style scoped lang="scss">
.error-404 {
    position: relative;

    overflow: hidden;
    display: flex;
    flex: 1 0 auto;
    flex-direction: column;
    align-items: center;
    justify-content: space-between;

    padding: 23.5dvh 0 10dvh;

    font-family: $openSansFont;
    color: $error500;
    text-align: center;

    &_image {
        position: absolute;
        top: 0;
        left: 0;

        width: 100%;
        height: 100%;

        :deep(path) {
            fill: $neutral1000;
        }
    }

    &::before {
        content: '404';

        position: absolute;
        top: 10dvh;

        font-size: 15vw;
        font-weight: 700;

        opacity: 0.2;
        background: linear-gradient(180deg, rgba(203, 66, 28, 0) 0%, #{$error500} 100%);
        background-clip: text;

        -webkit-text-fill-color: transparent;
        text-fill-color: transparent;
    }

    &_content {
        font-size: 2vw;

        &_title {
            font-weight: 700;
        }
    }

    &_gps {
        padding: 4px 104px;

        font-size: 24px;
        text-transform: uppercase;

        border: 1px solid $warning500;
        border-radius: 1px;
    }
}
</style>
