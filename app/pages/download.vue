<template>
    <ui-page-container container>
        <template #title>
            Download App
        </template>

        <div class="download">
            <div v-if="$pwa?.showInstallPrompt" class="download_section">
                <div class="download_left">
                    <ui-text class="download_title" type="1b">
                        <ui-icon
                            class="download_icon"
                            color="lightGray200"
                            :icon-offset="4"
                            :size="32"
                        >
                            <display-settings-icon/>
                        </ui-icon>

                        PWA
                    </ui-text>
                    <ui-text class="download_description" type="3b-medium">
                        You can install Progressive Web App as a basic app on your device.
                    </ui-text>
                </div>
                <div class="download_actions">
                    <ui-button
                        size="S"
                        type="secondary"
                        @click="$pwa?.install()"
                    >
                        Install PWA
                    </ui-button>
                </div>
            </div>
            <div
                v-for="item in desktopAppGroups"
                :key="`${ item.type }-${ item.architecture }`"
                class="download_section"
                :class="{ download_section_recommended: isRecommended(item) }"
            >
                <div class="download_left">
                    <ui-text class="download_title" type="1b">
                        <ui-icon
                            class="download_icon"
                            color="lightGray200"
                            :size="32"
                        >
                            <apple-icon v-if="item.type === 'mac'"/>
                            <linux-icon v-else-if="item.type === 'linux'"/>
                            <windows-icon v-else/>
                        </ui-icon>
                        {{ getTypeName(item.type) }} <template v-if="getArchitectureName(item)">
                            {{ getArchitectureName(item) }}
                        </template>
                    </ui-text>
                    <ui-text
                        v-if="item.type === 'mac'"
                        class="download_description"
                        type="3b-medium"
                    >
                        You'll have to remove Quarantine mode for app on MacOS using xattr
                    </ui-text>
                </div>
                <div class="download_actions">
                    <ui-button
                        v-for="file in item.files"
                        :key="file.name"
                        :href="file.downloadUrl"
                        size="S"
                        type="secondary"
                        width="220px"
                    >
                        {{ getDownloadText(file) }}
                    </ui-button>
                </div>
            </div>
        </div>
    </ui-page-container>
</template>

<script setup lang="ts">
import { UAParser } from 'ua-parser-js';
import UiPageContainer from '~/components/ui/UiPageContainer.vue';
import UiText from '~/components/ui/text/UiText.vue';
import UiButton from '~/components/ui/buttons/UiButton.vue';
import type { DesktopAppFile } from '~/utils/server/github';
import DisplaySettingsIcon from '~/assets/icons/kit/display-settings.svg?component';
import AppleIcon from '~/assets/icons/social/apple.svg?component';
import LinuxIcon from '~/assets/icons/social/linux.svg?component';
import WindowsIcon from '~/assets/icons/social/windows.svg?component';
import UiIcon from '~/components/ui/data/UiIcon.vue';

const store = useStore();
const { $pwa } = useNuxtApp();
const headers = useRequestHeaders(['user-agent']);

type DesktopAppType = DesktopAppFile['type'];
type DesktopAppArchitecture = DesktopAppFile['architecture'];

interface DesktopAppGroup {
    type: DesktopAppType;
    architecture: DesktopAppArchitecture;
    files: DesktopAppFile[];
}

const typeOrder: Record<DesktopAppType, number> = {
    windows: 0,
    linux: 1,
    mac: 2,
};

const recommendedApp = ref<Pick<DesktopAppGroup, 'type' | 'architecture'> | null>(getRecommendedApp(import.meta.server ? headers['user-agent'] : ''));

const desktopAppGroups = computed<DesktopAppGroup[]>(() => {
    const groups = new Map<string, DesktopAppGroup>();

    for (const file of store.desktopRelease?.files ?? []) {
        const key = `${ file.type }-${ file.architecture }`;

        if (!groups.has(key)) {
            groups.set(key, {
                type: file.type,
                architecture: file.architecture,
                files: [],
            });
        }

        groups.get(key)!.files.push(file);
    }

    return [...groups.values()]
        .map(group => ({
            ...group,
            files: group.files.toSorted((a, b) => Number(b.portable) - Number(a.portable)),
        }))
        .sort((a, b) => typeOrder[a.type] - typeOrder[b.type] || a.architecture.localeCompare(b.architecture));
});

useHead(() => ({
    title: 'Download',
}));

onMounted(async () => {
    recommendedApp.value = await getRecommendedAppWithFeatureCheck(navigator.userAgent) ?? getRecommendedApp(navigator.userAgent);
});

function getRecommendedApp(userAgent: string | undefined, architecture?: string): Pick<DesktopAppGroup, 'type' | 'architecture'> | null {
    if (!userAgent) return null;

    const parser = new UAParser(userAgent);
    const deviceType = parser.getDevice().type;
    if (deviceType === 'mobile' || deviceType === 'tablet' || deviceType === 'wearable') return null;

    const os = parser.getOS().name?.toLowerCase() ?? '';
    const normalizedArchitecture = getRecommendedArchitecture(architecture ?? parser.getCPU().architecture?.toLowerCase(), userAgent);
    const type = getRecommendedType(os);

    if (!type) return null;

    return {
        type,
        architecture: normalizedArchitecture ?? 'x64',
    };
}

async function getRecommendedAppWithFeatureCheck(userAgent: string) {
    const parser = new UAParser(userAgent);
    const cpu = await parser.getCPU().withFeatureCheck();

    return getRecommendedApp(userAgent, cpu.architecture?.toLowerCase());
}

function getRecommendedType(os: string): DesktopAppType | null {
    if (os.includes('windows')) return 'windows';
    if (os.includes('linux')) return 'linux';
    if (os.includes('mac')) return 'mac';

    return null;
}

function getRecommendedArchitecture(architecture: string | undefined, userAgent: string): DesktopAppArchitecture | null {
    const lowerUserAgent = userAgent.toLowerCase();

    if (architecture?.includes('arm') || lowerUserAgent.includes(' arm ') || lowerUserAgent.includes(' arm64') || lowerUserAgent.includes(' aarch64')) return 'arm64';
    if (architecture?.includes('64') || lowerUserAgent.includes('x86_64') || lowerUserAgent.includes('x64') || lowerUserAgent.includes('intel')) return 'x64';

    return null;
}

function getTypeName(type: DesktopAppType) {
    switch (type) {
        case 'windows':
            return 'Windows';
        case 'linux':
            return 'Linux';
        case 'mac':
            return 'MacOS';
    }
}

function getArchitectureName(item: Pick<DesktopAppGroup, 'type' | 'architecture'>) {
    if (item.type === 'mac') return item.architecture === 'x64' ? 'Intel' : '';
    if (item.type === 'windows') return '';

    return item.architecture;
}

function getFileExtension(name: string) {
    return `.${ name.split('.').at(-1) ?? name }`;
}

function getDownloadText(file: DesktopAppFile) {
    return `Download ${ getFileExtension(file.name) } (${ formatFileSize(file.size) })`;
}

function formatFileSize(size: number) {
    return `${ Math.round(size / 1024 / 1024) } Mb`;
}

function isRecommended(item: Pick<DesktopAppGroup, 'type' | 'architecture'>) {
    return recommendedApp.value?.type === item.type && recommendedApp.value.architecture === item.architecture;
}
</script>

<style scoped lang="scss">
.download {
    display: flex;
    flex-direction: column;
    gap: 8px;
    color: $typographyPrimary;

    &_section {
        display: flex;
        gap: 8px;
        align-items: center;
        justify-content: space-between;

        padding: 8px 16px;
        border: 1px solid $strokeDefault;
        border-radius: 4px;

        background: $darkGray800;

        &_recommended {
            border-color: $blue500;
        }

        @include mobileOnly {
            flex-direction: column;
            align-items: center;
            justify-content: flex-start;
            text-align: center;
        }
    }

    &_title {
        display: flex;
        gap: 16px;
        align-items: center;
    }

    &_left {
        display: flex;
        flex-direction: column;
        gap: 8px;

        @include mobileOnly {
            align-items: center;
        }
    }

    &_icon {
        :deep(svg) {
            fill: $typographyPrimary;
        }
    }

    &_actions {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        justify-content: flex-end;

        white-space: nowrap;

        @include mobileOnly {
            justify-content: center;
        }
    }
}
</style>
