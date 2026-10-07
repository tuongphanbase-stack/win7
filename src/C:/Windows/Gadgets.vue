<template>
  <div :class="$style.gallery">
    <div class="top">
      <span class="hint">Double-click a gadget or click Add to put it on your desktop.</span>
      <input
        v-model="search"
        class="search"
        type="search"
        placeholder="Search gadgets"
        aria-label="Search gadgets"
        spellcheck="false"
      >
    </div>
    <div
      class="items"
      role="listbox"
      aria-label="Available gadgets"
    >
      <div
        v-for="item in items"
        :key="item.type"
        class="item"
        :class="{ selected: selected === item.type }"
        role="option"
        tabindex="0"
        :aria-selected="selected === item.type"
        :data-gadget-type="item.type"
        @click="selected = item.type"
        @dblclick="add(item.type)"
        @keydown.enter="add(item.type)"
        @contextmenu.stop.prevent="openMenu($event, item.type)"
      >
        <div class="thumb">
          <div
            class="thumb-box"
            :style="item.boxStyle"
          >
            <div
              class="thumb-inner"
              :style="item.innerStyle"
            >
              <component
                :is="item.component"
                preview
              />
            </div>
          </div>
        </div>
        <div class="name">
          {{ item.name }}
        </div>
        <button
          type="button"
          class="add"
          :aria-label="`Add ${item.name}`"
          @click.stop="add(item.type)"
        >
          Add
        </button>
      </div>
      <p
        v-if="!items.length"
        class="empty"
      >
        No gadgets match your search.
      </p>
    </div>
    <div class="details">
      <template v-if="selectedInfo">
        <div class="text">
          <strong>{{ selectedInfo.name }}</strong>
          <span class="count">{{ countText }}</span>
          <p>{{ selectedInfo.description }}</p>
        </div>
        <button
          type="button"
          class="button"
          @click="add(selected)"
        >
          Add to desktop
        </button>
      </template>
      <p
        v-else
        class="text"
      >
        Select a gadget to see its details.
      </p>
    </div>
  </div>
</template>

<script>
import { props } from '@/utils/vue';
import { resolveFileByPath } from '@/services/fs';
import { openContextMenu } from '@/services/wm';
import {
  GADGET_TYPES, gadgets, addGadget, initGadgets,
} from '@/services/gadgets';
import { GADGET_COMPONENTS } from '@/components/Gadgets/registry';

const THUMB_WIDTH = 92;
const THUMB_HEIGHT = 84;

export default {
  name: 'Gadgets',
  canHandle: (file) => !file,
  metaData: () => ({
    title: 'Gadgets',
    icon: resolveFileByPath('C:/Windows/system/icons/gadgets.png'),
    width: Math.min(580, window.innerWidth),
    height: 400,
    maximizable: false,
  }),
  ...props({
    file: props.obj(null),
    wmId: props.any(),
  }),
  data() {
    return {
      search: '',
      selected: 'clock',
    };
  },
  computed: {
    items() {
      const query = this.search.trim().toLowerCase();
      return Object.keys(GADGET_TYPES)
        .filter((type) => !query || GADGET_TYPES[type].name.toLowerCase().includes(query)
          || GADGET_TYPES[type].description.toLowerCase().includes(query))
        .map((type) => {
          const { name, width, height } = GADGET_TYPES[type];
          const scale = Math.min(THUMB_WIDTH / width, THUMB_HEIGHT / height);
          return {
            type,
            name,
            component: GADGET_COMPONENTS[type],
            boxStyle: { width: `${width * scale}px`, height: `${height * scale}px` },
            innerStyle: { width: `${width}px`, height: `${height}px`, transform: `scale(${scale})` },
          };
        });
    },
    selectedInfo() {
      return GADGET_TYPES[this.selected] || null;
    },
    countText() {
      const n = gadgets.list.filter((g) => g.type === this.selected).length;
      if (!n) return 'Not on your desktop';
      return n === 1 ? '1 on your desktop' : `${n} on your desktop`;
    },
  },
  created() {
    initGadgets();
  },
  methods: {
    add(type) {
      if (!GADGET_TYPES[type]) return;
      this.selected = type;
      addGadget(type);
    },
    openMenu(e, type) {
      this.selected = type;
      openContextMenu(e, ['Add'], (item) => {
        if (item === 'Add') this.add(type);
      });
    },
  },
  style({ className, mediaQuery }) {
    return [
      className('gallery', {
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        background: '#fff',
        color: '#1e395b',
        fontSize: '13px',
        '& > .top': {
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '7px 10px',
          background: 'linear-gradient(180deg, #fdfeff, #e8eff8)',
          borderBottom: 'solid 1px #c5d3e5',
        },
        '& .hint': {
          flexGrow: 1,
          minWidth: 0,
          color: '#4d6185',
          fontSize: '12px',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        },
        '& .search': {
          width: '170px',
          flexShrink: 0,
          height: '24px',
          padding: '0 7px',
          fontSize: '12px',
          color: '#1e1e1e',
          background: '#fff',
          border: 'solid 1px #abadb3',
          borderRadius: '2px',
          userSelect: 'text',
          '&:focus': { borderColor: '#3c7fb1' },
        },
        '& > .items': {
          flexGrow: 1,
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, 116px)',
          gridAutoRows: '132px',
          alignContent: 'start',
          justifyContent: 'center',
          gap: '10px 8px',
          padding: '14px 10px',
          overflowY: 'auto',
          background: 'radial-gradient(ellipse at 50% 0%, #ffffff 0%, #eef4fb 55%, #dde8f5 100%)',
        },
        '& .item': {
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          padding: '8px 4px 6px',
          border: 'solid 1px transparent',
          borderRadius: '3px',
          cursor: 'default',
          '&:hover': {
            background: 'linear-gradient(180deg, rgba(250, 253, 255, 0.9), rgba(219, 238, 252, 0.9))',
            borderColor: '#b8d6fb',
          },
          '&.selected': {
            background: 'linear-gradient(180deg, rgba(235, 245, 255, 0.95), rgba(196, 225, 250, 0.95))',
            borderColor: '#7eb4ea',
          },
          '&:focus-visible': { outline: 'dotted 1px #1e395b' },
        },
        '& .thumb': {
          width: '100%',
          height: '88px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          pointerEvents: 'none',
        },
        '& .thumb-box': {
          position: 'relative',
        },
        '& .thumb-inner': {
          position: 'absolute',
          left: 0,
          top: 0,
          transformOrigin: '0 0',
        },
        '& .name': {
          marginTop: '6px',
          textAlign: 'center',
          fontSize: '12px',
          color: '#1e1e1e',
        },
        '& .add': {
          position: 'absolute',
          top: '4px',
          right: '4px',
          padding: '1px 8px',
          fontSize: '11px',
          color: '#1e395b',
          border: 'solid 1px #8eb1d8',
          borderRadius: '3px',
          background: 'linear-gradient(180deg, #ffffff, #dcebfb)',
          cursor: 'pointer',
          opacity: 0,
          transition: 'opacity 0.12s',
          '&:hover': { background: 'linear-gradient(180deg, #ffffff, #c7e0fa)' },
        },
        '& .item:hover .add, & .item.selected .add, & .add:focus-visible': {
          opacity: 1,
        },
        '& .empty': {
          gridColumn: '1 / -1',
          textAlign: 'center',
          color: '#4d6185',
          paddingTop: '30px',
        },
        '& > .details': {
          flexShrink: 0,
          minHeight: '78px',
          display: 'flex',
          alignItems: 'center',
          gap: '14px',
          padding: '10px 14px',
          borderTop: 'solid 1px #c5d3e5',
          background: 'linear-gradient(180deg, #f7fafd, #e9f0f8)',
        },
        '& .details .text': {
          flexGrow: 1,
          minWidth: 0,
          lineHeight: 1.45,
          color: '#4d6185',
          fontSize: '12px',
          '& strong': { fontSize: '14px', color: '#1e395b', marginRight: '8px' },
          '& p': { marginTop: '3px' },
        },
        '& .details .count': {
          fontSize: '11px',
          color: '#6d7f99',
        },
        '& .button': {
          flexShrink: 0,
          padding: '6px 14px',
          fontSize: '13px',
          color: '#1e1e1e',
          border: 'solid 1px #707070',
          borderRadius: '3px',
          background: 'linear-gradient(180deg, #f2f2f2 0%, #ebebeb 45%, #dddddd 50%, #cfcfcf 100%)',
          cursor: 'pointer',
          '&:hover': {
            borderColor: '#3c7fb1',
            background: 'linear-gradient(180deg, #eaf6fd 0%, #d9f0fc 45%, #bee6fd 50%, #a7d9f5 100%)',
          },
        },
      }),
      // Phones: no room for the hint next to the search box.
      mediaQuery({ maxWidth: '599px' }, [
        className('gallery', {
          '& .hint': { display: 'none' },
          '& .search': { flexGrow: 1, width: 'auto' },
        }),
      ]),
    ];
  },
};
</script>
