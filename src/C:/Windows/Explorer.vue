<template>
  <div
    :class="$style.myComputer"
    class="no-border"
  >
    <div :class="$style.pathBar">
      <button
        type="button"
        class="nav back"
        title="Back"
        aria-label="Back"
        :disabled="!backStack.length"
        @click="goBack"
      />
      <button
        type="button"
        class="nav forward"
        title="Forward"
        aria-label="Forward"
        :disabled="!forwardStack.length"
        @click="goForward"
      />
      <button
        type="button"
        class="nav up"
        title="Up one level"
        aria-label="Up one level"
        :disabled="path === ''"
        @click="goUp"
      />
      <input
        v-model="addressText"
        class="path"
        aria-label="Address"
        spellcheck="false"
        @keydown.enter.prevent="goToAddress"
        @keydown.esc="addressText = displayPath"
        @focus="$event.target.select()"
        @blur="addressText = displayPath"
      >
      <input
        v-model="search"
        class="search"
        :placeholder="searchPlaceholder"
        aria-label="Search"
      >
    </div>
    <div
      v-if="inRecycleBin"
      :class="$style.binBar"
    >
      <span>{{ binCount }} item{{ binCount === 1 ? '' : 's' }} in the Recycle Bin</span>
      <button
        type="button"
        :disabled="!binCount"
        @click="restoreAll"
      >
        Restore all items
      </button>
      <button
        type="button"
        :disabled="!binCount"
        @click="emptyBin"
      >
        Empty the Recycle Bin
      </button>
    </div>
    <FilesContainer
      :class="$style.content"
      v-bind="filesContainerProps"
      :file-props="{ darkText: true, onClick: click }"
    />
    <div :class="$style.status">
      {{ statusText }}
    </div>
  </div>
</template>

<script>
import { rgba } from '@/styles/utils';
import FilesContainer from '@/components/FilesContainer.vue';
import { props } from '@/utils/vue';
import {
  resolveFileByPath,
  getPathName,
  getPathDir,
  searchFiles,
  getDirectoryFiles,
  resolveFileSource,
  files,
  RECYCLE_BIN,
  isRecycleBinEmpty,
  restoreFileByPath,
  emptyRecycleBin,
} from '@/services/fs';
import { openFile, openDialog } from '@/services/wm';
import { playBackgroundSound } from '@/services/snd';

const calcIcon = (file) => {
  if (!file) {
    return resolveFileByPath('C:/Windows/system/icons/my-computer.png');
  }
  if (file.path === RECYCLE_BIN) {
    return resolveFileByPath(`C:/Windows/system/icons/recycle-bin-${isRecycleBinEmpty() ? 'empty' : 'full'}.png`);
  }
  return resolveFileByPath(`C:/Windows/system/icons/${file.path.endsWith(':') ? 'drive' : 'folder'}.png`);
};

// Internal paths use "/", the address bar shows Windows-style "\".
const toWin = (path) => (path.endsWith(':') ? `${path}\\` : path.replace(/\//g, '\\'));

export default {
  canHandle: (file) => !file || file.type === 'directory',
  metaData: (file) => ({
    icon: calcIcon(file),
    width: 640,
    height: 500,
    title: !file ? 'Computer' : getPathName(file.path) || file.path,
  }),
  ...props({
    file: props.obj(null),
  }),
  components: {
    FilesContainer,
  },
  data() {
    const hasFile = this.file && this.file.path;
    const path = hasFile ? this.file.path : '';
    return {
      path,
      addressText: path ? toWin(path) : 'Computer',
      search: hasFile ? this.file.extraData?.search : '',
      backStack: [],
      forwardStack: [],
    };
  },
  computed: {
    displayPath() {
      return this.path ? toWin(this.path) : 'Computer';
    },
    searchPlaceholder() {
      return `Search ${getPathName(this.path) || 'Computer'}`;
    },
    navigateSound() {
      return resolveFileByPath('C:/Windows/system/sounds/navigate.mp3');
    },
    inRecycleBin() {
      return this.path === RECYCLE_BIN;
    },
    binCount() {
      return getDirectoryFiles(RECYCLE_BIN).filter((f) => !getPathName(f.path).startsWith('.')).length;
    },
    visibleCount() {
      if (this.search) return this.filesContainerProps.files.length;
      return getDirectoryFiles(this.path).filter((f) => !getPathName(f.path).startsWith('.') && f.path !== 'main.js').length;
    },
    statusText() {
      const n = this.visibleCount;
      return this.search ? `${n} result${n === 1 ? '' : 's'}` : `${n} item${n === 1 ? '' : 's'}`;
    },
    filesContainerProps() {
      if (this.search) {
        return {
          files: searchFiles(
            this.path,
            (file) => getPathName(file.path).toLowerCase().includes(this.search.toLowerCase()),
            true,
          ),
        };
      }
      return {
        path: this.path,
      };
    },
  },
  watch: {
    displayPath(value) {
      this.addressText = value;
    },
  },
  methods: {
    navigate(newPath, { record = true } = {}) {
      if (newPath === this.path) return;
      playBackgroundSound(this.navigateSound);
      if (record) {
        this.backStack.push(this.path);
        this.forwardStack = [];
      }
      this.path = newPath;
      this.search = '';
    },
    click(file) {
      const theFile = resolveFileSource(file);
      if (theFile.type === 'directory') {
        this.navigate(theFile.path);
        return true;
      }
      return false;
    },
    goBack() {
      if (!this.backStack.length) return;
      this.forwardStack.push(this.path);
      this.navigate(this.backStack.pop(), { record: false });
    },
    goForward() {
      if (!this.forwardStack.length) return;
      this.backStack.push(this.path);
      this.navigate(this.forwardStack.pop(), { record: false });
    },
    goUp() {
      this.navigate(this.path.includes('/') ? getPathDir(this.path) : '');
    },
    goToAddress(e) {
      const typed = this.addressText.trim().replace(/\\/g, '/').replace(/\/+$/, '');
      if (!typed || typed.toLowerCase() === 'computer') {
        this.navigate('');
        e.target.blur();
        return;
      }
      const lower = typed.toLowerCase();
      const isDrive = /^[a-z]:$/i.test(typed);
      const match = isDrive
        ? { path: typed.toUpperCase(), type: 'directory' }
        : files.list.find((f) => f.path.toLowerCase() === lower);
      if (!match || (isDrive && !files.list.some((f) => f.path.startsWith(`${typed.toUpperCase()}/`)))) {
        openDialog({
          type: 'error',
          title: 'Windows Explorer',
          content: `Windows can't find '${this.addressText}'. Check the spelling and try again.`,
        });
        return;
      }
      if (match.type === 'directory') {
        this.navigate(match.path);
      } else {
        try {
          openFile(resolveFileSource(match));
        } catch (err) {
          openDialog({ type: 'error', title: 'Windows Explorer', content: err.message || String(err) });
        }
      }
      e.target.blur();
    },
    restoreAll() {
      getDirectoryFiles(RECYCLE_BIN)
        .filter((f) => !getPathName(f.path).startsWith('.'))
        .forEach((f) => restoreFileByPath(f.path));
    },
    emptyBin() {
      openDialog({
        type: 'warning',
        title: 'Empty Recycle Bin',
        content: 'Are you sure you want to permanently delete all items in the Recycle Bin?',
        buttons: ['Yes', 'No'],
      }).then((btn) => {
        if (btn === 'Yes') emptyRecycleBin();
      });
    },
  },
  style({ className }) {
    const back = resolveFileByPath('C:/Windows/system/icons/back.png').data;
    return [
      className('myComputer', {
        display: 'flex',
        flexDirection: 'column',
      }),
      className('pathBar', {
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        flexWrap: 'nowrap',
        marginBottom: '6px',
        gap: '3px',
        '& > .nav': {
          backgroundImage: `url("${back}")`,
          width: '30px',
          height: '30px',
          flexShrink: 0,
          border: 0,
          padding: 0,
          backgroundColor: 'transparent',
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'center',
          backgroundSize: 'contain',
          cursor: 'pointer',
          transition: 'filter 0.1s',
          '&:not(:disabled):hover, &:not(:disabled):focus-visible': {
            filter: 'brightness(1.2)',
          },
          '&:not(:disabled):active': {
            filter: 'brightness(0.8)',
          },
          '&:disabled': {
            filter: 'grayscale(1) opacity(0.6)',
            cursor: 'default',
          },
        },
        '& > .forward': {
          transform: 'scaleX(-1)',
        },
        '& > .up': {
          transform: 'rotate(90deg)',
          width: '24px',
          height: '24px',
          marginRight: '4px',
        },
        '& > .path, & > .search': {
          height: '24px',
          lineHeight: '24px',
          padding: '0 5px',
          fontSize: '14px',
          border: `solid 1px ${rgba(0, 0.5)}`,
          background: rgba(255, 1),
          color: rgba(0, 1),
          borderRadius: '2px',
          minWidth: 0,
          font: 'inherit',
        },
        '& > .path': {
          flexGrow: 1,
          marginRight: '5px',
        },
        '& > .search': {
          width: '160px',
        },
      }),
      className('binBar', {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '4px 8px',
        marginBottom: '6px',
        background: 'linear-gradient(#fafcfe, #e8eef6)',
        border: `solid 1px ${rgba(0, 0.2)}`,
        color: rgba(0, 0.85),
        fontSize: '12px',
        '& > span': { flexGrow: 1 },
        '& > button': {
          font: 'inherit',
          padding: '3px 10px',
          border: `solid 1px ${rgba(0, 0.3)}`,
          borderRadius: '3px',
          background: 'linear-gradient(#ffffff, #e5e5e5)',
          cursor: 'pointer',
          '&:disabled': { opacity: 0.5, cursor: 'default' },
        },
      }),
      className('content', {
        background: rgba(255, 1),
        flexGrow: 1,
        position: 'relative',
      }),
      className('status', {
        padding: '3px 8px 0',
        fontSize: '12px',
        color: rgba(0, 0.75),
      }),
    ];
  },
};
</script>
