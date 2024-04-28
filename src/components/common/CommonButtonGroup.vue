<script lang="ts">
import { Fragment } from 'vue';

export default defineComponent({
    name: 'CommonButtonGroup',
    setup(_, { slots }) {
        return () => {
            const list = slots.default?.();

            if (!list) return h(Fragment);

            return h('div', {
                class: 'button-group',
            }, list.map((slot) => {
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
    background: $neutral950;
    display: flex;
    border-radius: 8px;
    overflow: hidden;

    &_button {
        width: 100%;
        position: relative;
        display: flex;

        :deep(> .button) {
            width: 100%;
        }

        &:not(:last-child) {
            padding-right: 9px;
            margin-right: 8px;

            &::after {
                content: '';
                position: absolute;
                align-self: center;
                left: 100%;
                height: 24px;
                border-right: 1px solid varToRgba('neutral150', 0.2);
            }
        }
    }
}
</style>
