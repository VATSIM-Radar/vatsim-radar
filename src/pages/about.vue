<template>
    <common-page-block>
        <template #title>
            About
        </template>

        Vatsim Radar is volunteer free project, that aims to do it's best in terms of collecting and showing data.<br><br>

        Project does not aim to replace VatGlasses or Volanta for example, or create it's own database of custom data (except for gates maybe).<br><br>

        Project would also be impossible without community libraries and data collections:

        <ul>
            <li>
                Simulation Data

                <ul>
                    <li>
                        <a
                            href="https://github.com/vatsimnetwork/simaware-tracon-project"
                            target="_blank"
                        >
                            SimAware TRACON Project
                        </a>
                    </li>
                    <li>
                        <a
                            href="https://github.com/vatsimnetwork/vatspy-data-project"
                            target="_blank"
                        >
                            VatSpy data
                        </a>
                    </li>
                    <li>
                        <a
                            href="https://navigraph.com/"
                            target="_blank"
                        >
                            Navigraph
                        </a>
                    </li>
                </ul>
            </li>
            <li>
                Libraries and Frameworks

                <ul>
                    <li>Vue</li>
                    <li>Nuxt</li>
                    <li>OpenLayers</li>
                    <li>Prisma</li>
                    <li>Much more cool OSS projects!</li>
                </ul>
            </li>
        </ul>
    </common-page-block>
</template>

<script setup lang="ts">
useHead({
    title: 'About',
});
</script>

<style lang="scss" scoped>
a {
    color: $primary500;
    transition: 0.3s;

    &:hover {
        color: $primary600;
    }
}
</style>
