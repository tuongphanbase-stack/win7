<template>
  <div
    :class="$style.filesContainer"
    @contextmenu="openContextMenu"
  >
    <File
      v-for="file in dirFiles"
      :ref="addFileToRefs"
      :key="file.path"
      :file="file"
      v-bind="fileProps"
    />
    <div
      v-if="selecting"
      ref="selection"
      :class="$style.selection"
    />
  </div>
</template>

<script>
import {
  getDirectoryFiles,
  createNewFolder,
  createNewFile,
  fileObject,
  getPathName,
  isPathExists,
  copyFileByPath,
  moveFileByPath,
  RECYCLE_BIN,
  isInRecycleBin,
  recycleFileByPath,
  restoreFileByPath,
  deleteForeverByPath,
  emptyRecycleBin,
  isRecycleBinEmpty,
} from '@/services/fs';
import {
  markedFiles,
  openContextMenu,
  markFileForCut,
  markFileForCopy,
  unmarkFiles,
  openDialog,
} from '@/services/wm';
import { rgba, px } from '@/styles/utils';
import { props, provideAs } from '@/utils/vue';
import { offsetTo, asyncEach } from '@/utils/utils';
import swipe from '@/utils/swipe';
import { drag, drop } from '@/utils/dragndrop';
import File from '@/components/File.vue';

const fixSelectionPosition = (selection) => {
  if (!selection) {
    return null;
  }
  const ret = {};
  if (selection.width < 0) {
    ret.left = selection.left + selection.width;
    ret.width = Math.abs(selection.width);
  } else {
    ret.left = selection.left;
    ret.width = selection.width;
  }
  if (selection.height < 0) {
    ret.top = selection.top + selection.height;
    ret.height = Math.abs(selection.height);
  } else {
    ret.top = selection.top;
    ret.height = selection.height;
  }
  return ret;
};

export default {
  components: {
    File,
  },
  ...props({
    files: props.arr([]),
    path: props.str(null),
    fileProps: props.obj(),
    direction: props.oneOf(['row', 'column'], 'row'),
    contextMenuExtras: props.obj(
      {},
      (obj) => typeof obj === 'object' && !Object.keys(obj).find((it) => typeof obj[it] !== 'function'),
    ),
  }),
  ...provideAs('$filesContainer'),
  data() {
    return {
      selecting: false,
      fileRefs: [],
      selectionRectangle: null,
    };
  },
  computed: {
    staticPath() {
      return this.path !== null;
    },
    dirFiles() {
      let files;
      if (this.staticPath) {
        files = getDirectoryFiles(this.path);
        if (this.path === '') {
          files.splice(files.findIndex((file) => file.path === 'main.js'), 1);
        }
      } else {
        files = this.files;
      }
      return files.sort((a, b) => {
        if (a.type === 'directory' && b.type !== 'directory') {
          return -1;
        }
        return 1;
      });
    },
  },
  mounted() {
    this.mover = swipe(
      this.$el,
      this.selectStart,
      this.whileSelect,
      this.selectEnd,
    );
    this.droper = drop(this.$el, this.onDrop);
    this.dragger = drag(this.$el, this.onDrag);
  },
  beforeUnmount() {
    if (this.mover) {
      this.mover.stop();
    }
    if (this.droper) {
      this.droper.stop();
    }
    if (this.dragger) {
      this.dragger.stop();
    }
  },
  beforeUpdate() {
    this.fileRefs = [];
  },
  methods: {
    onDrag(e) {
      const isOnFile = this.isEventOnFile(e);
      if (isOnFile) {
        if (this.mover) {
          this.mover.cancelMove();
        }
        this.$nextTick(() => {
          this.selecting = false;
          this.$el.style.overflow = null;
        });
        return this.getSelectedFiles()
          .map((file) => file.file.path);
      }
      return false;
    },
    onDrop(data) {
      this.copyOrMoveFilesHere('move', data);
    },
    getSelectedFiles() {
      return this.fileRefs.filter((file) => file.selected);
    },
    isEventOnFile(e) {
      const selectedFiles = this.getSelectedFiles();
      return selectedFiles.some((file) => file.$el.contains(e.target));
    },
    recycle(paths) {
      paths.forEach((path) => {
        try {
          recycleFileByPath(path);
        } catch (error) {
          openDialog({ type: 'error', title: 'Delete File', content: error.message || String(error) });
        }
      });
    },
    openContextMenu(e) {
      const selectedFiles = this.getSelectedFiles();
      const isOnFile = this.isEventOnFile(e);
      let contextMenuItems = [];
      if (!isOnFile) {
        this.unselectAll();
        contextMenuItems = [
          ...contextMenuItems,
          'Refresh',
          ...(this.staticPath && this.path !== RECYCLE_BIN ? ['Create New Folder', 'Create New Text File'] : []),
          ...(this.staticPath && this.path !== RECYCLE_BIN
            && (markedFiles.copyList.length || markedFiles.cutList.length) ? ['Paste'] : []),
          ...(this.path === RECYCLE_BIN && !isRecycleBinEmpty() ? ['Empty Recycle Bin'] : []),
          ...Object.keys(this.contextMenuExtras),
        ];
      } else {
        const inBin = selectedFiles.some((file) => isInRecycleBin(file.file.path));
        contextMenuItems = inBin ? [
          'Restore',
          'Delete permanently',
        ] : [
          ...contextMenuItems,
          'Open',
          'Delete',
          'Cut',
          'Copy',
        ];
        if (selectedFiles.length === 1 && !inBin) {
          contextMenuItems = [
            ...contextMenuItems,
            'Rename',
          ];
        }
      }

      openContextMenu(e, contextMenuItems, (item) => {
        if (item === 'Open') {
          selectedFiles.forEach((file) => file.click(null));
        } else if (item === 'Delete') {
          this.recycle(selectedFiles.map((file) => file.file.path));
        } else if (item === 'Restore') {
          selectedFiles.forEach((file) => restoreFileByPath(file.file.path));
        } else if (item === 'Delete permanently') {
          const paths = selectedFiles.map((file) => file.file.path);
          openDialog({
            type: 'warning',
            title: 'Delete File',
            content: paths.length === 1
              ? `Are you sure you want to permanently delete "${getPathName(paths[0])}"?`
              : `Are you sure you want to permanently delete these ${paths.length} items?`,
            buttons: ['Yes', 'No'],
          }).then((btn) => {
            if (btn === 'Yes') paths.forEach((path) => deleteForeverByPath(path));
          });
        } else if (item === 'Empty Recycle Bin') {
          openDialog({
            type: 'warning',
            title: 'Empty Recycle Bin',
            content: 'Are you sure you want to permanently delete all items in the Recycle Bin?',
            buttons: ['Yes', 'No'],
          }).then((btn) => {
            if (btn === 'Yes') emptyRecycleBin();
          });
        } else if (item === 'Refresh') {
          this.$el.classList.add('refreshing');
          this.$nextTick(() => {
            setTimeout(() => {
              this.$el.classList.remove('refreshing');
            }, 100);
          });
        } else if (item === 'Create New Folder') {
          createNewFolder(this.path);
        } else if (item === 'Create New Text File') {
          const dst = `${this.path}/Text File ${Date.now()}.txt`;
          createNewFile(fileObject(dst, 'text'));
        } else if (item === 'Rename') {
          selectedFiles.forEach((file) => file.startRename());
        } else if (item === 'Cut') {
          selectedFiles.forEach((file) => markFileForCut(file.file));
        } else if (item === 'Copy') {
          selectedFiles.forEach((file) => markFileForCopy(file.file));
        } else if (item === 'Paste') {
          Promise.all([
            this.copyOrMoveFilesHere('copy', markedFiles.copyList),
            this.copyOrMoveFilesHere('move', markedFiles.cutList),
          ])
            .then(() => {
              unmarkFiles();
            });
        } else if (this.contextMenuExtras[item]) {
          if (typeof this.contextMenuExtras[item] === 'function') {
            this.contextMenuExtras[item]();
          } else {
            throw new Error('bad value for extra menu item');
          }
        }
      });
    },
    selectStart(pos) {
      const elRect = offsetTo(this.$el, document.body);
      this.selectionRectangle = {
        left: pos.left - elRect.left,
        top: pos.top - elRect.top,
        width: 0,
        height: 0,
      };
      this.selecting = true;
    },
    whileSelect(pos) {
      this.$el.style.overflow = 'hidden';
      const selection = fixSelectionPosition({
        ...this.selectionRectangle,
        width: pos.left,
        height: pos.top,
      });
      Object.keys(selection || {})
        .forEach((key) => {
          this.$refs.selection.style[key] = px(selection[key]);
        });
    },
    selectEnd(pos) {
      this.$el.style.overflow = null;
      const selectionPos = fixSelectionPosition({
        ...this.selectionRectangle,
        width: pos.left,
        height: pos.top,
      });

      const inRange = (fp, sp) => (
        (
          (fp.left > sp.left && fp.left + fp.width < sp.left + sp.width)
          || (fp.left + fp.width > sp.left && fp.left < sp.left + sp.width)
        )
        && (
          (fp.top > sp.top && fp.top + fp.height < sp.top + sp.height)
          || (fp.top + fp.height > sp.top && fp.top < sp.top + sp.height)
        )
      );
      this.fileRefs.forEach((file) => {
        const el = file.$el;
        const filePos = {
          width: el.offsetWidth,
          height: el.offsetHeight,
          left: el.offsetLeft,
          top: el.offsetTop,
        };
        // eslint-disable-next-line no-param-reassign
        file.selected = inRange(filePos, selectionPos);
      });
      this.selecting = false;
    },
    unselectAll() {
      this.fileRefs.forEach((file) => {
        // eslint-disable-next-line no-param-reassign
        file.selected = false;
      });
    },
    async copyOrMoveFilesHere(action, listOfFiles) {
      if (!listOfFiles.length) return;
      const doActionOnSingleFile = async (filePath) => {
        const newPath = `${this.path}/${getPathName(filePath)}`;
        if (filePath === newPath) {
          return;
        }
        if (isPathExists(newPath)) {
          const userAnswer = await openDialog({
            type: 'warning',
            title: 'File Already Exists',
            content: `The '${newPath}' is already exists. Do you want to override?`,
            buttons: ['Cancel All', 'No', 'Yes'],
            autoClose: true,
          });
          if (userAnswer === 'Cancel All') {
            throw new Error('canceled');
          }
          if (userAnswer === 'No') {
            return;
          }
        }
        const actions = {
          copy: copyFileByPath,
          move: moveFileByPath,
        };
        actions[action](filePath, newPath, true);
      };
      try {
        asyncEach(listOfFiles, doActionOnSingleFile);
      } catch (_e) {
        //
      }
    },
    addFileToRefs(el) {
      if (el) {
        this.fileRefs.push(el);
      }
    },
  },
  style({ className }) {
    return [
      className('filesContainer', {
        position: 'relative',
        flexGrow: 1,
        display: 'flex',
        flexDirection: this.direction,
        flexWrap: 'wrap',
        alignItems: 'flex-start',
        justifyContent: 'flex-start',
        alignContent: 'flex-start',
        width: '100%',
        height: '100%',
        overflow: 'auto',
        '&.refreshing': {
          '& > *': {
            display: 'none',
          },
        },
      }),
      className('selection', {
        // zIndex: 999999,
        background: rgba([26, 86, 148], 0.4),
        border: `solid 1px ${rgba([26, 86, 148], 0.6)}`,
        position: 'absolute',
      }),
    ];
  },
};
</script>
