<template>
  <div
    :class="$style.layer"
    data-gadget-layer
  >
    <GadgetFrame
      v-for="gadget in list"
      :key="gadget.id"
      :gadget="gadget"
    />
  </div>
</template>

<script>
import { panelSize } from '@/styles/constants';
import { gadgets, initGadgets } from '@/services/gadgets';
import GadgetFrame from '@/components/Gadgets/GadgetFrame.vue';

// Sits above the wallpaper and desktop icons and below every window. Only
// the gadgets themselves take clicks; the empty part lets them through.
export default {
  name: 'GadgetLayer',
  components: {
    GadgetFrame,
  },
  computed: {
    list() {
      return gadgets.list;
    },
  },
  created() {
    initGadgets();
  },
  style({ className }) {
    return [
      className('layer', {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: panelSize,
        zIndex: 5,
        overflow: 'hidden',
        pointerEvents: 'none',
      }),
    ];
  },
};
</script>
