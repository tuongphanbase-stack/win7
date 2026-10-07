<template>
  <div :class="$style.panel">
    <aside class="side">
      <button
        v-for="item in sections"
        :key="item.id"
        type="button"
        class="side-link"
        :class="{ active: view === item.id }"
        @click="view = item.id"
      >
        {{ item.title }}
      </button>
    </aside>
    <main class="main">
      <template v-if="view === 'home'">
        <h2>Adjust your computer's settings</h2>
        <div class="grid">
          <button
            v-for="tile in tiles"
            :key="tile.title"
            type="button"
            class="tile"
            @click="tile.action"
          >
            <img
              :src="tile.icon"
              alt=""
              width="48"
              height="48"
            >
            <span>
              <strong>{{ tile.title }}</strong>
              <small>{{ tile.desc }}</small>
            </span>
          </button>
        </div>
      </template>

      <template v-else-if="view === 'system'">
        <h2>View basic information about your computer</h2>
        <table class="info">
          <tr
            v-for="row in systemRows"
            :key="row[0]"
          >
            <th>{{ row[0] }}</th>
            <td>{{ row[1] }}</td>
          </tr>
        </table>
      </template>

      <template v-else-if="view === 'reset'">
        <h2>Reset this PC</h2>
        <p class="text">
          Your files, folders, renames, the Recycle Bin and your desktop gadgets are saved
          in this browser so they are still here next time. Resetting removes everything you
          created or changed and brings back the original desktop and gadgets. The desktop
          background is kept.
        </p>
        <button
          type="button"
          class="danger"
          @click="reset"
        >
          Reset to the original files
        </button>
      </template>
    </main>
  </div>
</template>

<script>
import {
  resolveFileByPath, files, RECYCLE_BIN, isRecycleBinEmpty,
} from '@/services/fs';
import { openFile, openDialog } from '@/services/wm';
import { clearSavedFiles } from '@/services/persist';
import { clearSavedGadgets, openGadgetGallery } from '@/services/gadgets';

const icon = (name) => (resolveFileByPath(`C:/Windows/system/icons/${name}.png`) || {}).data;

export default {
  name: 'ControlPanel',
  canHandle: (file) => !file,
  metaData: () => ({
    title: 'Control Panel',
    icon: resolveFileByPath('C:/Windows/system/icons/control-panel.png'),
    width: 720,
    height: 460,
  }),
  data() {
    return {
      view: 'home',
      sections: [
        { id: 'home', title: 'Control Panel Home' },
        { id: 'system', title: 'System' },
        { id: 'reset', title: 'Reset this PC' },
      ],
    };
  },
  computed: {
    tiles() {
      return [
        {
          title: 'Appearance and Personalization',
          desc: 'Change desktop background',
          icon: icon('background-capplet'),
          action: () => this.open('C:/Windows/ChangeBackground.vue'),
        },
        {
          title: 'Desktop Gadgets',
          desc: 'Add the Clock, Calendar and CPU Meter to your desktop',
          icon: icon('gadgets'),
          action: () => openGadgetGallery(),
        },
        {
          title: 'System',
          desc: 'View basic information about your computer',
          icon: icon('my-computer'),
          action: () => { this.view = 'system'; },
        },
        {
          title: 'Programs',
          desc: 'Browse installed programs',
          icon: icon('folder'),
          action: () => this.open('C:/Program Files'),
        },
        {
          title: 'Recycle Bin',
          desc: 'Restore or permanently delete files',
          icon: icon(isRecycleBinEmpty() ? 'recycle-bin-empty' : 'recycle-bin-full'),
          action: () => this.open(RECYCLE_BIN),
        },
        {
          title: 'Command Prompt',
          desc: 'Type commands like DIR, CD and TYPE',
          icon: icon('terminal'),
          action: () => this.open('C:/Windows/Terminal.vue'),
        },
        {
          title: 'Reset this PC',
          desc: 'Remove your changes and start fresh',
          icon: icon('warning'),
          action: () => { this.view = 'reset'; },
        },
      ];
    },
    systemRows() {
      const userFiles = files.list.filter((f) => !f.path.startsWith('C:/Windows') && f.type !== 'directory').length;
      let saved = '0 KB';
      try {
        const bytes = Object.keys(localStorage).reduce((n, k) => n + k.length + (localStorage.getItem(k) || '').length, 0) * 2;
        saved = `${(bytes / 1024).toFixed(1)} KB`;
      } catch (_e) { /* storage blocked */ }
      return [
        ['Windows edition', 'Windows 7 Web Edition'],
        ['Based on', 'nainemom/win7 (Apache License 2.0)'],
        ['Screen', `${window.screen.width} × ${window.screen.height}`],
        ['Browser language', navigator.language],
        ['Your files', `${userFiles} files`],
        ['Saved in this browser', saved],
      ];
    },
  },
  methods: {
    open(path) {
      const file = resolveFileByPath(path);
      if (file) openFile(file);
    },
    reset() {
      openDialog({
        type: 'warning',
        title: 'Reset this PC',
        content: 'Remove all the files and changes you made and restart with the original desktop?',
        buttons: ['Reset', 'Cancel'],
      }).then((btn) => {
        if (btn === 'Reset') {
          clearSavedFiles();
          clearSavedGadgets();
          // Leave the page before the next autosave can write the files back.
          window.location.reload();
        }
      });
    },
  },
  style({ className }) {
    return [
      className('panel', {
        display: 'flex',
        height: '100%',
        background: '#fff',
        color: '#1e395b',
        fontSize: '13px',
        '& .side': {
          width: '180px',
          flexShrink: 0,
          padding: '14px 10px',
          background: 'linear-gradient(#e3eefa, #f6f9fd)',
          borderRight: 'solid 1px #d5e1f0',
        },
        '& .side-title': { margin: '0 0 8px 6px', fontWeight: 'bold' },
        '& .side-link': {
          display: 'block',
          width: '100%',
          textAlign: 'left',
          padding: '5px 6px',
          border: 0,
          background: 'transparent',
          color: '#0066cc',
          font: 'inherit',
          cursor: 'pointer',
          borderRadius: '3px',
          '&:hover': { textDecoration: 'underline' },
          '&.active': { fontWeight: 'bold', color: '#1e395b' },
        },
        '& .main': { flexGrow: 1, padding: '16px 22px', overflowY: 'auto' },
        '& h2': {
          fontSize: '17px', fontWeight: 'normal', color: '#1e395b', margin: '0 0 16px',
        },
        '& .grid': { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))', gap: '6px 14px' },
        '& .tile': {
          display: 'flex',
          alignItems: 'flex-start',
          gap: '10px',
          textAlign: 'left',
          padding: '8px',
          border: 'solid 1px transparent',
          borderRadius: '3px',
          background: 'transparent',
          font: 'inherit',
          cursor: 'pointer',
          '&:hover, &:focus-visible': { borderColor: '#b8d6fb', background: 'linear-gradient(#f2f8ff, #e2efff)' },
          '& strong': {
            display: 'block', color: '#0066cc', fontSize: '14px', fontWeight: 'normal', marginBottom: '2px',
          },
          '& small': { display: 'block', color: '#4d6185', fontSize: '12px' },
        },
        '& .info': { borderCollapse: 'collapse' },
        '& .info th': {
          textAlign: 'left', fontWeight: 'normal', color: '#4d6185', padding: '5px 24px 5px 0',
        },
        '& .info td': { padding: '5px 0' },
        '& .text': { lineHeight: 1.6, maxWidth: '520px' },
        '& .danger': {
          marginTop: '8px',
          padding: '6px 14px',
          font: 'inherit',
          border: 'solid 1px #a33',
          borderRadius: '3px',
          background: 'linear-gradient(#fff, #f3dede)',
          color: '#822',
          cursor: 'pointer',
        },
      }),
    ];
  },
};
</script>
