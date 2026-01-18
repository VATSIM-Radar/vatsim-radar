<script lang="ts">
import { Fragment } from 'vue';

export default defineComponent({
    name: 'UiButtonGroup',
    setup(_, { slots }) {
        return () => {
            const list = slots.default?.();

            if (!list) return h(Fragment);

            return h('div', {
                class: 'button-group',
            }, list.map(slot => {
                if (!slot.props) slot.props = {};

                if (!slot.props.type) {
                    slot.props.type = 'transparent';
                }

                if (!slot.props.orientation) {
                    slot.props.orientation = 'vertical';
                }

                if (!slot.props.width) {
                    slot.props.width = '100%';
                }

                return h('div', {
                    class: 'button-group_button',
                }, slot);
            }));
        };
    },
});
</script>

<style scoped lang="scss">
.button-group {
    overflow: hidden;
    display: flex;
    border-radius: 8px;
    background: $darkgray950;

    @include mobileOnly {
        flex-wrap: wrap;
        gap: 8px;
        background: transparent;
    }

    &_button {
        position: relative;
        display: flex;
        flex: 1 1 0;
        width: 0;

        @include mobileOnly {
            flex: auto;
            width: auto;
            background: $darkgray950;
        }

        :deep(> .button) {
            width: 100%;
        }

        @include fromTablet {
            &:not(:last-child) {
                margin-right: 8px;
                padding-right: 9px;

                &::after {
                    content: '';

                    position: absolute;
                    left: 100%;

                    align-self: center;

                    height: 24px;
                    border-right: 1px solid varToRgba('lightgray150', 0.2);
                }
            }
        }
    }
}
</style>
