<template>
  <svg
    :class="$style.meter"
    viewBox="0 0 160 104"
    width="160"
    height="104"
    role="img"
    :aria-label="`CPU ${cpu}%, memory ${memory}%`"
  >
    <defs>
      <linearGradient
        :id="uid('rim')"
        x1="0"
        y1="0"
        x2="0.3"
        y2="1"
      >
        <stop
          offset="0"
          stop-color="#f4f5f7"
        />
        <stop
          offset="0.5"
          stop-color="#7c828b"
        />
        <stop
          offset="1"
          stop-color="#2a2d32"
        />
      </linearGradient>
      <radialGradient
        :id="uid('face')"
        cx="0.5"
        cy="0.4"
        r="0.65"
      >
        <stop
          offset="0"
          stop-color="#40454d"
        />
        <stop
          offset="0.7"
          stop-color="#1a1c20"
        />
        <stop
          offset="1"
          stop-color="#08090a"
        />
      </radialGradient>
      <linearGradient
        :id="uid('glass')"
        x1="0"
        y1="0"
        x2="0"
        y2="1"
      >
        <stop
          offset="0"
          stop-color="#ffffff"
          stop-opacity="0.32"
        />
        <stop
          offset="1"
          stop-color="#ffffff"
          stop-opacity="0"
        />
      </linearGradient>
    </defs>

    <g
      v-for="dial in dials"
      :key="dial.key"
      :class="`dial dial-${dial.key}`"
    >
      <circle
        :cx="dial.cx"
        :cy="dial.cy"
        :r="dial.r"
        :fill="url('rim')"
        stroke="rgba(0,0,0,0.6)"
        stroke-width="0.8"
      />
      <circle
        :cx="dial.cx"
        :cy="dial.cy"
        :r="dial.r - 3.5"
        :fill="url('face')"
      />
      <line
        v-for="tick in dial.ticks"
        :key="tick.key"
        :x1="tick.x1"
        :y1="tick.y1"
        :x2="tick.x2"
        :y2="tick.y2"
        :stroke="tick.major ? '#f2f4f7' : '#8c939c'"
        :stroke-width="tick.major ? 1.1 : 0.6"
      />
      <text
        v-for="n in dial.numbers"
        :key="n.value"
        :x="n.x"
        :y="n.y"
        class="number"
        :class="dial.key"
        text-anchor="middle"
        dominant-baseline="central"
      >{{ n.value }}</text>
      <text
        :x="dial.cx"
        :y="dial.cy - dial.r * 0.36"
        class="caption"
        :class="dial.key"
        text-anchor="middle"
        dominant-baseline="central"
      >{{ dial.caption }}</text>
      <rect
        :x="dial.cx - dial.r * 0.34"
        :y="dial.cy + dial.r * 0.36"
        :width="dial.r * 0.68"
        :height="dial.r * 0.26"
        rx="2"
        fill="#050607"
        stroke="#5d636b"
        stroke-width="0.6"
      />
      <text
        :x="dial.cx"
        :y="dial.cy + dial.r * 0.49"
        class="readout"
        :class="dial.key"
        text-anchor="middle"
        dominant-baseline="central"
      >{{ dial.value }}%</text>
      <g
        class="needle"
        :style="{
          transform: `rotate(${angleFor(dial.value)}deg)`,
          transformOrigin: `${dial.cx}px ${dial.cy}px`,
        }"
      >
        <path
          :d="needlePath(dial)"
          fill="#e5262b"
          stroke="#7a0f12"
          stroke-width="0.4"
        />
      </g>
      <circle
        :cx="dial.cx"
        :cy="dial.cy"
        :r="dial.r * 0.1"
        :fill="url('rim')"
        stroke="#111"
        stroke-width="0.5"
      />
      <path
        :d="glassPath(dial)"
        :fill="url('glass')"
        pointer-events="none"
      />
    </g>
  </svg>
</template>

<script>
import { props } from '@/utils/vue';
import { windows } from '@/services/wm';

let instances = 0;

const SWEEP = 120; // the needles move from -120deg (0%) to +120deg (100%)
const MEMORY_SCALE = 128 * 1024 * 1024;

const clamp = (n) => Math.max(0, Math.min(100, Math.round(n)));

const makeDial = (key, caption, cx, cy, r, step, value) => {
  const ticks = [];
  const numbers = [];
  for (let v = 0; v <= 100; v += 5) {
    const a = ((-SWEEP + (v / 100) * SWEEP * 2) * Math.PI) / 180;
    const major = v % step === 0;
    const r1 = r - 4.5;
    const r2 = r1 - (major ? 4 : 2.2);
    ticks.push({
      key: v,
      major,
      x1: cx + r1 * Math.sin(a),
      y1: cy - r1 * Math.cos(a),
      x2: cx + r2 * Math.sin(a),
      y2: cy - r2 * Math.cos(a),
    });
    if (major) {
      const rn = r1 - (r > 40 ? 10.5 : 9);
      numbers.push({ value: v, x: cx + rn * Math.sin(a), y: cy - rn * Math.cos(a) });
    }
  }
  return {
    key, caption, cx, cy, r, ticks, numbers, value,
  };
};

export default {
  name: 'CpuMeterGadget',
  ...props({
    options: props.obj(() => ({})),
    preview: props.bool(false),
  }),
  data() {
    instances += 1;
    return {
      uidBase: `cpu${instances}`,
      cpu: this.preview ? 23 : 4,
      memory: this.preview ? 41 : 0,
    };
  },
  computed: {
    dials() {
      return [
        makeDial('memory', 'MEM', 122, 62, 31, 20, this.memory),
        makeDial('cpu', 'CPU', 50, 52, 48, 10, this.cpu),
      ];
    },
  },
  mounted() {
    if (this.preview) return;
    this.busyMs = 0;
    this.lastTick = performance.now();
    this.smoothed = 4;
    try {
      // Chromium reports scripts that block the page for over 50 ms.
      this.observer = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => { this.busyMs += entry.duration; });
      });
      this.observer.observe({ entryTypes: ['longtask'] });
    } catch (_e) {
      this.observer = null;
    }
    this.sample();
    this.timer = setInterval(this.sample, 1000);
  },
  beforeUnmount() {
    clearInterval(this.timer);
    if (this.observer) this.observer.disconnect();
  },
  methods: {
    uid(name) {
      return `${this.uidBase}-${name}`;
    },
    url(name) {
      return `url(#${this.uid(name)})`;
    },
    angleFor(value) {
      return -SWEEP + (value / 100) * SWEEP * 2;
    },
    needlePath(dial) {
      const { cx, cy, r } = dial;
      const tip = cy - (r - 7);
      const w = r > 40 ? 1.6 : 1.2;
      return `M${cx - w} ${cy + r * 0.12} L${cx - 0.5} ${tip} L${cx + 0.5} ${tip} L${cx + w} ${cy + r * 0.12} Z`;
    },
    glassPath(dial) {
      const { cx, cy } = dial;
      const r = dial.r - 4;
      return `M${cx - r} ${cy - 2} A${r} ${r} 0 0 1 ${cx + r} ${cy - 2} Q${cx} ${cy - r * 0.35} ${cx - r} ${cy - 2} Z`;
    },
    // A rough reading of how busy the page is: time lost to long tasks and
    // timer lateness over the last second, plus a little idle noise.
    sample() {
      const now = performance.now();
      const elapsed = Math.max(1, now - this.lastTick);
      const late = Math.max(0, elapsed - 1000);
      this.lastTick = now;
      const busy = ((this.busyMs + late) / elapsed) * 100;
      this.busyMs = 0;
      const raw = 2 + Math.random() * 5 + busy;
      this.smoothed = this.smoothed * 0.4 + raw * 0.6;
      this.cpu = clamp(this.smoothed);
      this.memory = clamp(this.readMemory());
    },
    readMemory() {
      const mem = performance.memory;
      if (mem && mem.usedJSHeapSize) {
        const scale = Math.min(MEMORY_SCALE, mem.jsHeapSizeLimit || MEMORY_SCALE);
        return (mem.usedJSHeapSize / scale) * 100;
      }
      // No memory reading in this browser: estimate from the open windows.
      return 18 + windows.list.length * 6;
    },
  },
  style({ className }) {
    return [
      className('meter', {
        display: 'block',
        width: '160px',
        height: '104px',
        overflow: 'visible',
        filter: 'drop-shadow(0 3px 4px rgba(0, 0, 0, 0.5))',
        '& .number': {
          font: '600 6.4px "Segoe UI", Tahoma, Arial, sans-serif',
          fill: '#e8ebef',
        },
        '& .number.memory': {
          fontSize: '5px',
        },
        '& .caption': {
          font: '600 6px "Segoe UI", Tahoma, Arial, sans-serif',
          fill: '#8f97a1',
          letterSpacing: '0.6px',
        },
        '& .caption.memory': {
          fontSize: '4.6px',
        },
        '& .readout': {
          font: '600 8.5px Consolas, "Lucida Console", monospace',
          fill: '#a6f07a',
        },
        '& .readout.memory': {
          fontSize: '6.5px',
        },
        '& .needle': {
          transition: 'transform 0.8s cubic-bezier(0.3, 1.4, 0.5, 1)',
          filter: 'drop-shadow(0 1px 1px rgba(0, 0, 0, 0.6))',
        },
      }),
    ];
  },
};
</script>
