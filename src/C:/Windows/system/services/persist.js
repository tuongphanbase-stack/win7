// Remembers the user's files between visits (new folders and text files,
// renames, moves, deletions, the Recycle Bin) in this browser's localStorage.
// System files under C:/Windows are never saved: they always come from the
// current build. Built-in files are saved as a reference to their original
// path instead of copying their (possibly large) data.
import { watch } from 'vue';
import { files, fileObject, recycleOrigins } from '@/services/fs';

const KEY = 'win7-files-v1';
const MAX_INLINE = 400 * 1024; // don't try to store huge text blobs

const isSystemPath = (path) => path === 'main.js' || path === 'C:/Windows' || path.startsWith('C:/Windows/');
const storage = () => {
  try { return window.localStorage; } catch (_e) { return null; }
};

let savingDisabled = false;
let builtinByData = new Map(); // data value -> original built-in path
let builtinByPath = new Map(); // original built-in path -> data value

const snapshot = () => files.list
  .filter((f) => !isSystemPath(f.path))
  .map((f) => {
    if (f.type === 'directory') return { p: f.path, t: f.type };
    const ref = f.data !== undefined && builtinByData.get(f.data);
    if (ref) return { p: f.path, t: f.type, r: ref };
    if (f.data === undefined || f.data === null) return { p: f.path, t: f.type };
    if (typeof f.data === 'string' && f.data.length <= MAX_INLINE) return { p: f.path, t: f.type, d: f.data };
    return null; // unknown or too large to keep
  })
  .filter(Boolean);

export const hasSavedFiles = () => !!(storage() && storage().getItem(KEY));

export const clearSavedFiles = () => {
  savingDisabled = true; // a pending autosave must not write the files back
  const s = storage();
  if (s) s.removeItem(KEY);
};

// Call once, after the built-in files are loaded and before the UI mounts.
export const restoreAndWatch = () => {
  builtinByData = new Map();
  builtinByPath = new Map();
  files.list.forEach((f) => {
    if (f.type !== 'directory' && f.data !== undefined && f.data !== null && !builtinByData.has(f.data)) {
      builtinByData.set(f.data, f.path);
    }
    builtinByPath.set(f.path, f.data);
  });

  const s = storage();
  let saved = null;
  try { saved = s && JSON.parse(s.getItem(KEY) || 'null'); } catch (_e) { saved = null; }
  if (saved && Array.isArray(saved.files)) {
    const restored = [];
    saved.files.forEach((e) => {
      if (!e || typeof e.p !== 'string' || isSystemPath(e.p)) return;
      if (e.r !== undefined) {
        if (!builtinByPath.has(e.r)) return; // that built-in file no longer exists
        restored.push(fileObject(e.p, e.t, builtinByPath.get(e.r)));
      } else {
        restored.push(fileObject(e.p, e.t, e.d));
      }
    });
    for (let i = files.list.length - 1; i >= 0; i -= 1) {
      if (!isSystemPath(files.list[i].path)) files.list.splice(i, 1);
    }
    restored.forEach((f) => files.list.push(f));
    Object.assign(recycleOrigins, saved.recycleOrigins || {});
  }

  let timer = null;
  const save = () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      if (savingDisabled) return;
      try {
        const st = storage();
        const data = { v: 1, files: snapshot(), recycleOrigins: { ...recycleOrigins } };
        if (st) st.setItem(KEY, JSON.stringify(data));
      } catch (_e) {
        // storage full or blocked: keep working without saving
      }
    }, 400);
  };
  // Re-save when any user file is added, removed, renamed, moved or edited.
  const fingerprint = (f) => {
    if (isSystemPath(f.path)) return '';
    if (builtinByData.has(f.data)) return `${f.path}\u0000ref`;
    return `${f.path}\u0000${typeof f.data === 'string' && f.data.length <= MAX_INLINE ? f.data : ''}`;
  };
  watch(() => files.list.map(fingerprint).join('\n'), save);
  watch(() => ({ ...recycleOrigins }), save, { deep: true });
};
