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
    flex: 1 0 auto;
    color: $error500;
    font-family: $openSansFont;
    position: relative;
    overflow: hidden;
    text-align: center;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: space-between;
    padding: 23.5dvh 0 10dvh;

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
        background: linear-gradient(180deg, rgba(203, 66, 28, 0) 0%, #{$error500} 100%);
        background-clip: text;
        -webkit-text-fill-color: transparent;
        text-fill-color: transparent;
        opacity: 0.2;
    }

    &_content {
        font-size: 2vw;

        &_title {
            font-weight: 700;
        }
    }

    &_gps {
        border: 1px solid $warning500;
        padding: 4px 104px;
        border-radius: 1px;
        text-transform: uppercase;
        font-size: 24px;
    }
}
</style>
