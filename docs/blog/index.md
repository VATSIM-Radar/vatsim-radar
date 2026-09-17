---
layout: doc
editLink: false
---

# News & Blog

<script setup>
import { VPFeatures } from 'vitepress/theme'
</script>

<VPFeatures class="features" :features="[{title: 'VATSIM Radar v2 Feedback', details: 'Learn more about what we are doing after V2 release', link: '/blog/v2-post-release' }]" />
<VPFeatures class="features" :features="[{title: 'VATSIM Radar v2 Changelog', details: 'Read v2.0 changelog', link: '/changelog.html#_2-0-0' }]" />
<VPFeatures class="features" :features="[{title: 'Year 2 of VATSIM Radar', link: '/blog/year-2-of-radar' }]" />
<VPFeatures class="features" :features="[{title: 'State of Radar 2025', link: '/blog/state-of-radar-2025' }]" />

<style>
h2.title {
border-top: none !important;
margin-top: 0 !important;
font-size: 32px !important;
}

p.details {
margin: 0 !important;
}

.VPLink.VPFeature {
text-decoration: none !important;
}

.features {
margin-top: 16px;
}
</style>