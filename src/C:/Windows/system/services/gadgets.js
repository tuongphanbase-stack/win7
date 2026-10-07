// Desktop gadgets (Clock, Calendar, CPU Meter) on the right side of the
// desktop, like Windows 7. Which gadgets are open, where they are and their
// options are remembered in this browser's localStorage under their own key.
//
// Positions are kept in "gadget pixels": the distance from the right edge
// and the top of the desktop at normal size. On small screens every gadget
// and its position are scaled down together (see gadgetScale).
import { reactive } from 'vue';
import { fileObject, resolveFileByPath } from '@/services/fs';
import {
  openFile, closeWindow, windows, focusWindow, minimizeWindow,
} from '@/services/wm';
import { panelSize } from '@/styles/constants';

const KEY = 'win7-gadgets-v1';
export const GALLERY_PATH = 'C:/Windows/Gadgets.vue';
const OPTIONS_PATH = '.gadget';
const isOptionsWindowOf = (w, id) => !!w.fsData.file && w.fsData.file.path === OPTIONS_PATH
  && w.fsData.file.data.id === id;

const MARGIN = 28; // room on the right for the gadget toolbar
const TOP = 16;
const GAP = 14;
const COLUMN = 160;

export const GADGET_TYPES = {
  clock: {
    name: 'Clock',
    width: 130,
    height: 130,
    hasOptions: true,
    defaultOptions: () => ({ name: '', timeZone: '', seconds: true }),
    description: 'See the time on your desktop. Give the clock a name, pick a time zone '
      + 'and turn the second hand on or off in its options.',
  },
  calendar: {
    name: 'Calendar',
    width: 144,
    height: 150,
    description: 'Shows today’s date. Click it to see the whole month, use the arrows '
      + 'to change month and click a day to see it.',
  },
  cpu: {
    name: 'CPU Meter',
    width: 160,
    height: 104,
    description: 'A look-alike of the Windows 7 CPU Meter: the left dial estimates how busy '
      + 'this page is, the right dial how much memory its scripts use.',
  },
};

const DEFAULT_LAYOUT = ['clock', 'calendar', 'cpu'];
const DEFAULT_LAYOUT_SMALL = ['clock', 'calendar'];

const storage = () => {
  try { return window.localStorage; } catch (_e) { return null; }
};

export const gadgets = reactive({
  list: [],
});

// The part of the screen gadgets can use: the desktop above the taskbar.
export const desktopArea = reactive({
  width: window.innerWidth,
  height: window.innerHeight - parseInt(panelSize, 10),
});

export const isSmallScreen = () => desktopArea.width < 600 || desktopArea.height < 420;

export const gadgetScale = () => (isSmallScreen() ? 0.7 : 1);

let topZ = 1;
let initialized = false;
let savingDisabled = false;

const save = () => {
  if (savingDisabled) return;
  try {
    const s = storage();
    if (!s) return;
    s.setItem(KEY, JSON.stringify({
      v: 1,
      gadgets: gadgets.list.map(({
        id, type, right, top, options,
      }) => ({
        id, type, right, top, options,
      })),
    }));
  } catch (_e) {
    // storage full or blocked: keep working without saving
  }
};

export const clearSavedGadgets = () => {
  savingDisabled = true; // nothing may write the gadgets back before the reload
  try {
    const s = storage();
    if (s) s.removeItem(KEY);
  } catch (_e) {
    // storage blocked
  }
};

const newId = () => `g${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;

const defaultOptions = (type) => {
  const make = GADGET_TYPES[type].defaultOptions;
  return make ? make() : {};
};

// Keeps a gadget fully on the desktop (in gadget pixels).
export const clampPosition = (type, right, top) => {
  const scale = gadgetScale();
  const { width, height } = GADGET_TYPES[type];
  const maxRight = Math.max(0, desktopArea.width / scale - width);
  const maxTop = Math.max(0, desktopArea.height / scale - height);
  return {
    right: Math.round(Math.min(Math.max(0, right), maxRight)),
    top: Math.round(Math.min(Math.max(0, top), maxTop)),
  };
};

// Like Windows 7: the first free place in the right-hand column, top to
// bottom, then the next column to the left.
const findFreeSpot = (type, others) => {
  const scale = gadgetScale();
  const areaWidth = desktopArea.width / scale;
  const areaHeight = desktopArea.height / scale;
  const { width, height } = GADGET_TYPES[type];
  const rects = others.map((g) => ({
    right: g.right,
    top: g.top,
    width: GADGET_TYPES[g.type].width,
    height: GADGET_TYPES[g.type].height,
  }));
  const free = (right, top) => !rects.some((r) => right < r.right + r.width + GAP
    && r.right < right + width + GAP
    && top < r.top + r.height + GAP
    && r.top < top + height + GAP);
  for (let col = 0; MARGIN + col * (COLUMN + GAP) + width <= areaWidth || col === 0; col += 1) {
    const right = MARGIN + col * (COLUMN + GAP) + Math.max(0, (COLUMN - width) / 2);
    for (let top = TOP; top + height <= areaHeight; top += 4) {
      if (free(right, top)) return clampPosition(type, right, top);
    }
    if (col > 20) break;
  }
  const n = others.length % 6;
  return clampPosition(type, MARGIN + n * 16, TOP + n * 16);
};

const normalize = (saved) => {
  const list = [];
  saved.forEach((g) => {
    if (!g || !GADGET_TYPES[g.type]) return;
    const item = {
      id: typeof g.id === 'string' && g.id ? g.id : newId(),
      type: g.type,
      options: { ...defaultOptions(g.type), ...(g.options && typeof g.options === 'object' ? g.options : {}) },
      z: topZ,
    };
    topZ += 1;
    if (Number.isFinite(g.right) && Number.isFinite(g.top)) {
      item.right = g.right;
      item.top = g.top;
    } else {
      Object.assign(item, findFreeSpot(g.type, list));
    }
    if (!list.some((other) => other.id === item.id)) list.push(item);
  });
  return list;
};

const defaults = () => normalize((isSmallScreen() ? DEFAULT_LAYOUT_SMALL : DEFAULT_LAYOUT)
  .map((type) => ({ type })));

const onResize = () => {
  desktopArea.width = window.innerWidth;
  desktopArea.height = window.innerHeight - parseInt(panelSize, 10);
};

// Loads the saved gadgets (or the default ones) once.
export const initGadgets = () => {
  if (initialized) return;
  initialized = true;
  onResize();
  let saved = null;
  try {
    const s = storage();
    saved = s && JSON.parse(s.getItem(KEY) || 'null');
  } catch (_e) {
    saved = null;
  }
  // Defaults are not saved until the user changes something, so they can
  // follow the screen size on the next visit.
  gadgets.list = saved && Array.isArray(saved.gadgets) ? normalize(saved.gadgets) : defaults();
  window.addEventListener('resize', onResize);
};

export const findGadget = (id) => gadgets.list.find((g) => g.id === id);

export const addGadget = (type) => {
  if (!GADGET_TYPES[type]) throw new Error(`Unknown gadget "${type}"`);
  initGadgets();
  topZ += 1;
  const item = {
    id: newId(),
    type,
    options: defaultOptions(type),
    z: topZ,
    ...findFreeSpot(type, gadgets.list),
  };
  gadgets.list.push(item);
  save();
  return item;
};

export const removeGadget = (id) => {
  const index = gadgets.list.findIndex((g) => g.id === id);
  if (index !== -1) {
    gadgets.list.splice(index, 1);
    save();
  }
  // its options window has nothing left to change
  windows.list
    .filter((w) => isOptionsWindowOf(w, id))
    .forEach((w) => closeWindow(w.id));
};

// Moves a gadget; while it is being dragged pass persist=false, then save at the end.
export const moveGadget = (id, right, top, persist = true) => {
  const g = findGadget(id);
  if (!g) return;
  const pos = clampPosition(g.type, right, top);
  g.right = pos.right;
  g.top = pos.top;
  if (persist) save();
};

export const setGadgetOptions = (id, options) => {
  const g = findGadget(id);
  if (!g) return;
  g.options = { ...g.options, ...options };
  save();
};

export const bringGadgetToFront = (id) => {
  const g = findGadget(id);
  if (g && g.z !== topZ) {
    topZ += 1;
    g.z = topZ;
  }
};

const showWindow = (win) => {
  if (win.minimized) minimizeWindow(win.id, false);
  focusWindow(win.id);
  return win;
};

// Opens the Gadgets gallery, or brings it to the front if it is open.
export const openGadgetGallery = () => {
  const open = windows.list.find((w) => w.fsData.runner.path === GALLERY_PATH && !w.fsData.file);
  if (open) return showWindow(open);
  return openFile(resolveFileByPath(GALLERY_PATH));
};

// Opens the options window of one gadget (the wrench button).
export const openGadgetOptions = (id) => {
  const g = findGadget(id);
  if (!g || !GADGET_TYPES[g.type].hasOptions) return null;
  const open = windows.list.find((w) => isOptionsWindowOf(w, id));
  if (open) return showWindow(open);
  return openFile(fileObject(OPTIONS_PATH, 'file', { id }));
};
