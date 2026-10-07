<template>
  <div
    :class="$style.terminal"
    class="no-border"
    @click="resetFocus"
  >
    <div
      ref="scroller"
      class="screen"
    >
      <div
        v-for="(line, i) in lines"
        :key="i"
        class="line"
        :class="line.kind"
        v-text="line.text"
      />
      <div class="new-line">
        <span
          class="prompt"
          v-text="promptText"
        />
        <input
          ref="input"
          v-model="current"
          class="input"
          spellcheck="false"
          autocomplete="off"
          aria-label="Command"
          @keydown.enter.prevent="enter"
          @keydown.up.prevent="historyMove(-1)"
          @keydown.down.prevent="historyMove(1)"
          @keydown.ctrl.l.prevent="clear"
          @keydown.tab.prevent="complete"
        >
      </div>
    </div>
  </div>
</template>

<script>
import {
  resolveFileByPath,
  getDirectoryFiles,
  getPathName,
  resolveFileSource,
  files,
} from '@/services/fs';
import { openFile } from '@/services/wm';
import { drop } from '@/utils/dragndrop';

const VERSION = 'Microsoft Windows [Version 6.1.7601]';
const HOME = 'C:/User';

// Internal paths use "/", the prompt shows Windows-style "\".
const toWin = (path) => (path.endsWith(':') ? `${path}\\` : path.replace(/\//g, '\\'));

const HELP = [
  'For more information on a specific command, type HELP command-name',
  'CD       Displays the name of or changes the current directory.',
  'CLS      Clears the screen.',
  'DATE     Displays the date.',
  'DIR      Displays a list of files and subdirectories in a directory.',
  'ECHO     Displays messages.',
  'HELP     Provides Help information for Windows commands.',
  'START    Opens a file, folder or program in its own window.',
  'TIME     Displays the time.',
  'TREE     Graphically displays the folder structure of a path.',
  'TYPE     Displays the contents of a text file.',
  'VER      Displays the Windows version.',
  '',
  'Keys: Up/Down = previous commands, Tab = complete a name, Ctrl+L = clear.',
];

const HELP_DETAIL = {
  cd: 'CD [path]\n  CD ..   goes up one folder\n  CD \\    goes to the root of the drive\n  D:      switches drive',
  dir: 'DIR [path]\n  Lists the files and folders in the current folder, or in [path].',
  type: 'TYPE file\n  Shows the text inside a file, e.g. TYPE Desktop\\Creator.txt',
  start: 'START name\n  Opens a file, folder or program, e.g. START Desktop\\Notepad.link',
  echo: 'ECHO [message]\n  Prints the message.',
  tree: 'TREE [path]\n  Shows the folders and files under [path] as a tree.',
};

export default {
  canHandle: (file) => !file,
  metaData: () => ({
    icon: resolveFileByPath('C:/Windows/system/icons/terminal.png'),
    width: 640,
    height: 400,
    resizable: true,
    maximizable: true,
    title: 'Command Prompt',
  }),
  data() {
    return {
      cwd: HOME,
      current: '',
      lines: [
        { text: VERSION, kind: 'out' },
        { text: 'Copyright (c) 2009 Microsoft Corporation. All rights reserved.', kind: 'out' },
        { text: 'Type HELP for a list of commands.', kind: 'out' },
        { text: '', kind: 'out' },
      ],
      history: [],
      historyIndex: 0,
    };
  },
  computed: {
    promptText() {
      return `${toWin(this.cwd)}>`;
    },
  },
  mounted() {
    this.resetFocus();
    this.droper = drop(this.$el, this.onDrop);
  },
  beforeUnmount() {
    if (this.droper) {
      this.droper.stop();
    }
  },
  methods: {
    resetFocus() {
      if (window.getSelection().toString()) return; // let people select and copy text
      this.$refs.input.focus();
    },
    print(text, kind = 'out') {
      String(text).split('\n').forEach((line) => this.lines.push({ text: line, kind }));
    },
    clear() {
      this.lines = [];
    },
    // Resolves a typed path (relative or absolute, "\" or "/", any letter case).
    resolve(input) {
      let raw = (input || '').trim().replace(/^"|"$/g, '').replace(/\\/g, '/');
      if (!raw) return this.cwd;
      if (/^[a-z]:$/i.test(raw)) raw = raw.toUpperCase();
      let parts;
      if (/^[a-z]:(\/|$)/i.test(raw)) {
        parts = raw.split('/');
        parts[0] = parts[0].toUpperCase();
      } else if (raw.startsWith('/')) {
        parts = [this.cwd.split('/')[0], ...raw.split('/')];
      } else {
        parts = [...this.cwd.split('/'), ...raw.split('/')];
      }
      const out = [];
      parts.filter((p) => p && p !== '.').forEach((p) => {
        if (p === '..') {
          if (out.length > 1) out.pop();
        } else {
          out.push(p);
        }
      });
      const path = out.join('/');
      const lower = path.toLowerCase();
      const match = files.list.find((f) => f.path.toLowerCase() === lower);
      return match ? match.path : path;
    },
    isDir(path) {
      if (/^[A-Z]:$/.test(path)) return files.list.some((f) => f.path === path || f.path.startsWith(`${path}/`));
      const f = resolveFileByPath(path);
      return !!f && f.type === 'directory';
    },
    listing(path) {
      return getDirectoryFiles(path)
        .filter((f) => !getPathName(f.path).startsWith('.'))
        .sort((a, b) => (b.type === 'directory') - (a.type === 'directory')
          || getPathName(a.path).localeCompare(getPathName(b.path)));
    },
    run(line) {
      const trimmed = line.trim();
      if (!trimmed) return;
      const [rawCmd, ...rest] = trimmed.split(/\s+/);
      const cmd = rawCmd.toLowerCase();
      const arg = trimmed.slice(rawCmd.length).trim();

      if (/^[a-z]:$/i.test(cmd)) {
        const drive = cmd.toUpperCase();
        if (this.isDir(drive)) this.cwd = drive;
        else this.print('The system cannot find the drive specified.', 'err');
        return;
      }
      switch (cmd) {
        case 'help':
          this.print(rest[0] ? (HELP_DETAIL[rest[0].toLowerCase()] || 'This command is not supported by the help utility.') : HELP.join('\n'));
          break;
        case 'ver':
          this.print(`\n${VERSION}`);
          break;
        case 'cls':
          this.clear();
          break;
        case 'echo':
          this.print(arg || 'ECHO is on.');
          break;
        case 'date':
          this.print(`The current date is: ${new Date().toLocaleDateString()}`);
          break;
        case 'time':
          this.print(`The current time is: ${new Date().toLocaleTimeString()}`);
          break;
        case 'cd':
        case 'chdir': {
          if (!arg) { this.print(toWin(this.cwd)); break; }
          const target = this.resolve(arg);
          if (this.isDir(target)) this.cwd = target;
          else this.print('The system cannot find the path specified.', 'err');
          break;
        }
        case 'dir': {
          const target = this.resolve(arg);
          if (!this.isDir(target)) { this.print('File Not Found', 'err'); break; }
          const items = this.listing(target);
          this.print(`\n Directory of ${toWin(target)}\n`);
          let fileCount = 0;
          let dirCount = 0;
          items.forEach((f) => {
            const isDir = f.type === 'directory';
            if (isDir) dirCount += 1; else fileCount += 1;
            const isText = !isDir && typeof f.data === 'string' && !/^(data:|\/|blob:|https?:)/.test(f.data);
            const size = isText ? `${f.data.length.toLocaleString()} bytes` : '';
            this.print(`${isDir ? '<DIR>' : '     '}  ${size.padStart(14)}  ${getPathName(f.path)}`);
          });
          this.print(`        ${fileCount} File(s)\n        ${dirCount} Dir(s)`);
          break;
        }
        case 'tree': {
          const target = this.resolve(arg);
          if (!this.isDir(target)) { this.print('Invalid path', 'err'); break; }
          this.print(toWin(target));
          const walk = (path, prefix, depth) => {
            const items = this.listing(path);
            items.forEach((f, i) => {
              const last = i === items.length - 1;
              this.print(`${prefix}${last ? '└───' : '├───'}${getPathName(f.path)}`);
              if (f.type === 'directory' && depth < 6) walk(f.path, `${prefix}${last ? '    ' : '│   '}`, depth + 1);
            });
          };
          walk(target, '', 0);
          break;
        }
        case 'type': {
          if (!arg) { this.print('The syntax of the command is incorrect.', 'err'); break; }
          const f = resolveFileByPath(this.resolve(arg));
          if (!f) { this.print('The system cannot find the file specified.', 'err'); break; }
          if (f.type === 'directory') { this.print('Access is denied.', 'err'); break; }
          const data = typeof f.data === 'string' ? f.data : '';
          if (/^(data:|\/|blob:|https?:)/.test(data) || /\.(png|jpe?g|gif|mp3|mp4|webm|vue)$/i.test(f.path)) {
            this.print(`"${getPathName(f.path)}" is not a text file.`, 'err');
          } else {
            this.print(data);
          }
          break;
        }
        case 'start': {
          try {
            if (!arg) {
              openFile(resolveFileByPath('C:/Windows/Terminal.vue'));
            } else {
              const f = resolveFileByPath(this.resolve(arg));
              if (!f) throw new Error('The system cannot find the file specified.');
              openFile(resolveFileSource(f));
            }
          } catch (e) {
            this.print(e.message || String(e), 'err');
          }
          break;
        }
        case 'exit':
          this.print('Close the window with the X button to exit.');
          break;
        default:
          this.print(`'${rawCmd}' is not recognized as an internal or external command,\noperable program or batch file.`, 'err');
      }
    },
    enter() {
      const line = this.current;
      this.print(`${this.promptText}${line}`, 'cmd');
      if (line.trim()) this.history.push(line);
      this.historyIndex = this.history.length;
      this.current = '';
      this.run(line);
      if (line.trim() && line.trim().toLowerCase() !== 'cls') this.print('');
      this.$nextTick(() => {
        this.$refs.scroller.scrollTop = this.$refs.scroller.scrollHeight;
      });
    },
    historyMove(step) {
      if (!this.history.length) return;
      this.historyIndex = Math.min(Math.max(this.historyIndex + step, 0), this.history.length);
      this.current = this.history[this.historyIndex] || '';
    },
    complete() {
      const m = this.current.match(/^(\S+\s+)(.*)$/);
      if (!m) return;
      const partial = m[2].replace(/^"/, '');
      const slash = Math.max(partial.lastIndexOf('\\'), partial.lastIndexOf('/'));
      const dirPart = slash >= 0 ? partial.slice(0, slash + 1) : '';
      const namePart = partial.slice(slash + 1).toLowerCase();
      const base = this.resolve(dirPart || '.');
      const hit = this.listing(base)
        .map((f) => getPathName(f.path))
        .find((n) => n.toLowerCase().startsWith(namePart));
      if (hit) {
        const full = `${dirPart}${hit}`;
        this.current = `${m[1]}${/\s/.test(full) ? `"${full}"` : full}`;
      }
    },
    onDrop(data) {
      if (data && Array.isArray(data) && data.length === 1) {
        const p = toWin(data[0]);
        this.current += /\s/.test(p) ? `"${p}"` : p;
      }
      this.resetFocus();
    },
  },
  style({ className }) {
    return [
      className('terminal', {
        background: '#0c0c0c',
        color: '#cccccc',
        fontFamily: 'Consolas, "Lucida Console", monospace',
        width: '100%',
        height: '100%',
        fontSize: '13px',
        lineHeight: '1.35',
        '& .screen': {
          height: '100%',
          overflowY: 'auto',
          padding: '8px 10px',
        },
        '& .line': {
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
          minHeight: '1.35em',
        },
        '& .line.err': {
          color: '#f48771',
        },
        '& .new-line': {
          display: 'flex',
          whiteSpace: 'pre',
        },
        '& .input': {
          flex: 1,
          minWidth: 0,
          background: 'transparent',
          border: 0,
          outline: 'none',
          color: 'inherit',
          font: 'inherit',
          padding: 0,
          caretColor: '#cccccc',
        },
      }),
    ];
  },
};
</script>
