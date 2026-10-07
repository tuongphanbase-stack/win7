<template>
  <div
    :class="[$style.frame, dragging && 'dragging', toolbarOnLeft && 'toolbar-left']"
    :style="frameStyle"
    :data-gadget="gadget.type"
    :data-gadget-id="gadget.id"
    tabindex="-1"
    @pointerdown="onPointerDown"
    @click.capture="onClickCapture"
    @contextmenu.stop.prevent="onContextMenu"
  >
    <div
      class="body"
      :style="bodyStyle"
    >
      <component
        :is="component"
        :options="gadget.options"
      />
    </div>
    <div
      class="toolbar"
      role="toolbar"
      :aria-label="`${info.name} gadget`"
    >
      <button
        type="button"
        class="tool close"
        data-gadget-control
        title="Close"
        aria-label="Close gadget"
        @click="close"
      >
        <svg
          viewBox="0 0 10 10"
          width="10"
          height="10"
        ><path
          d="M2 2 L8 8 M8 2 L2 8"
          stroke="currentColor"
          stroke-width="1.6"
          stroke-linecap="round"
        /></svg>
      </button>
      <button
        v-if="info.hasOptions"
        type="button"
        class="tool options"
        data-gadget-control
        title="Options"
        aria-label="Gadget options"
        @click="openOptions"
      >
        <svg
          viewBox="0 0 12 12"
          width="11"
          height="11"
        ><path
          d="M10.6 2.7 L8.9 4.4 L7.6 4.4 L7.6 3.1 L9.3 1.4 A3 3 0 0 0 5.6 5.3
             L1.6 9.3 A1 1 0 0 0 2.7 10.4 L6.7 6.4 A3 3 0 0 0 10.6 2.7 Z"
          fill="currentColor"
        /></svg>
      </button>
      <div
        class="tool grip"
        title="Drag gadget"
      >
        <svg
          viewBox="0 0 8 12"
          width="8"
          height="12"
        ><g fill="currentColor"><circle
          cx="2"
          cy="2"
          r="1"
        /><circle
          cx="6"
          cy="2"
          r="1"
        /><circle
          cx="2"
          cy="6"
          r="1"
        /><circle
          cx="6"
          cy="6"
          r="1"
        /><circle
          cx="2"
          cy="10"
          r="1"
        /><circle
          cx="6"
          cy="10"
          r="1"
        /></g></svg>
      </div>
    </div>
  </div>
</template>

<script>
import { props } from '@/utils/vue';
import { openContextMenu } from '@/services/wm';
import {
  GADGET_TYPES,
  gadgetScale,
  clampPosition,
  moveGadget,
  removeGadget,
  bringGadgetToFront,
  openGadgetGallery,
  openGadgetOptions,
} from '@/services/gadgets';
import { GADGET_COMPONENTS } from '@/components/Gadgets/registry';

const DRAG_THRESHOLD = 4;
const TOOLBAR_WIDTH = 19;

export default {
  name: 'GadgetFrame',
  ...props({
    gadget: props.obj(),
  }),
  data() {
    return {
      dragging: false,
    };
  },
  computed: {
    info() {
      return GADGET_TYPES[this.gadget.type];
    },
    component() {
      return GADGET_COMPONENTS[this.gadget.type];
    },
    scale() {
      return gadgetScale();
    },
    // Where the gadget is drawn: its saved place, kept on the desktop (this
    // follows desktopArea, so gadgets come back on screen when it shrinks).
    position() {
      return clampPosition(this.gadget.type, this.gadget.right, this.gadget.top);
    },
    toolbarOnLeft() {
      return this.position.right * this.scale < TOOLBAR_WIDTH + 4;
    },
    frameStyle() {
      const { scale } = this;
      return {
        right: `${this.position.right * scale}px`,
        top: `${this.position.top * scale}px`,
        width: `${this.info.width * scale}px`,
        height: `${this.info.height * scale}px`,
        zIndex: this.gadget.z || 1,
      };
    },
    bodyStyle() {
      return {
        width: `${this.info.width}px`,
        height: `${this.info.height}px`,
        transform: this.scale === 1 ? 'none' : `scale(${this.scale})`,
      };
    },
  },
  beforeUnmount() {
    this.stopListening();
  },
  methods: {
    onPointerDown(e) {
      if (e.button !== 0 || this.drag) return;
      bringGadgetToFront(this.gadget.id);
      if (e.target.closest('[data-gadget-control]')) return;
      this.drag = {
        pointerId: e.pointerId,
        x: e.clientX,
        y: e.clientY,
        right: this.position.right,
        top: this.position.top,
        moved: false,
      };
      window.addEventListener('pointermove', this.onPointerMove, true);
      window.addEventListener('pointerup', this.onPointerUp, true);
      window.addEventListener('pointercancel', this.onPointerUp, true);
    },
    onPointerMove(e) {
      const { drag } = this;
      if (!drag || e.pointerId !== drag.pointerId) return;
      const dx = e.clientX - drag.x;
      const dy = e.clientY - drag.y;
      if (!drag.moved && Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
      drag.moved = true;
      this.dragging = true;
      moveGadget(this.gadget.id, drag.right - dx / this.scale, drag.top + dy / this.scale, false);
    },
    onPointerUp(e) {
      const { drag } = this;
      if (!drag || e.pointerId !== drag.pointerId) return;
      this.stopListening();
      this.drag = null;
      this.dragging = false;
      if (drag.moved) {
        // the click that ends a drag must not also click the gadget
        this.suppressClick = true;
        setTimeout(() => { this.suppressClick = false; });
        moveGadget(this.gadget.id, this.gadget.right, this.gadget.top, true);
      }
    },
    stopListening() {
      window.removeEventListener('pointermove', this.onPointerMove, true);
      window.removeEventListener('pointerup', this.onPointerUp, true);
      window.removeEventListener('pointercancel', this.onPointerUp, true);
    },
    onClickCapture(e) {
      if (this.suppressClick) {
        e.stopPropagation();
        e.preventDefault();
      }
    },
    onContextMenu(e) {
      const items = [
        'Add gadgets...',
        ...(this.info.hasOptions ? ['Options'] : []),
        'Close gadget',
      ];
      openContextMenu(e, items, (item) => {
        if (item === 'Add gadgets...') openGadgetGallery();
        else if (item === 'Options') this.openOptions();
        else if (item === 'Close gadget') this.close();
      });
    },
    close() {
      removeGadget(this.gadget.id);
    },
    openOptions() {
      openGadgetOptions(this.gadget.id);
    },
  },
  style({ className, mediaQuery }) {
    return [
      className('frame', {
        position: 'absolute',
        pointerEvents: 'auto',
        touchAction: 'none',
        cursor: 'default',
        '& > .body': {
          transformOrigin: '0 0',
        },
        '&.dragging': {
          cursor: 'move',
          opacity: 0.85,
        },
        '& > .toolbar': {
          position: 'absolute',
          top: 0,
          left: 'calc(100% + 4px)',
          width: `${TOOLBAR_WIDTH}px`,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          padding: '2px 0',
          gap: '1px',
          borderRadius: '4px',
          background: 'linear-gradient(90deg, rgba(255, 255, 255, 0.82), rgba(225, 232, 240, 0.72))',
          boxShadow: '0 0 0 1px rgba(0, 0, 0, 0.28), 0 2px 5px rgba(0, 0, 0, 0.3), inset 0 0 0 1px rgba(255, 255, 255, 0.6)',
          backdropFilter: 'blur(4px)',
          opacity: 0,
          visibility: 'hidden',
          transition: 'opacity 0.15s, visibility 0.15s',
        },
        '&.toolbar-left > .toolbar': {
          left: 'auto',
          right: 'calc(100% + 4px)',
        },
        '&:hover > .toolbar, &.dragging > .toolbar': {
          opacity: 1,
          visibility: 'visible',
        },
        '& .tool': {
          width: '15px',
          height: '15px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '3px',
          color: '#3d4652',
          cursor: 'pointer',
          '&:hover': {
            background: 'linear-gradient(180deg, #fdfeff, #cfe3f8)',
            boxShadow: '0 0 0 1px rgba(60, 127, 177, 0.6)',
          },
          '& svg': { display: 'block' },
        },
        '& .tool.close:hover': {
          color: '#fff',
          background: 'linear-gradient(180deg, #e9906f, #c42b1c)',
          boxShadow: '0 0 0 1px rgba(110, 20, 10, 0.7)',
        },
        '& .tool.grip': {
          cursor: 'move',
          height: '18px',
          color: '#6b7480',
        },
      }),
      // Touch screens have no hover: show the toolbar on the tapped gadget.
      mediaQuery({ hover: 'none' }, [
        className('frame', {
          '&:focus > .toolbar, &:focus-within > .toolbar': {
            opacity: 1,
            visibility: 'visible',
          },
        }),
      ]),
    ];
  },
};
</script>
