<template>
  <svg
    :class="$style.clock"
    viewBox="0 0 130 130"
    width="130"
    height="130"
    role="img"
    :aria-label="ariaLabel"
  >
    <defs>
      <linearGradient
        :id="uid('bezel')"
        x1="0"
        y1="0"
        x2="0.35"
        y2="1"
      >
        <stop
          offset="0"
          stop-color="#ffffff"
        />
        <stop
          offset="0.45"
          stop-color="#c6ccd4"
        />
        <stop
          offset="0.55"
          stop-color="#8d96a1"
        />
        <stop
          offset="1"
          stop-color="#e9edf1"
        />
      </linearGradient>
      <linearGradient
        :id="uid('ring')"
        x1="0"
        y1="1"
        x2="0.3"
        y2="0"
      >
        <stop
          offset="0"
          stop-color="#f7f9fb"
        />
        <stop
          offset="1"
          stop-color="#59616c"
        />
      </linearGradient>
      <radialGradient
        :id="uid('face')"
        cx="0.5"
        cy="0.42"
        r="0.62"
      >
        <stop
          offset="0"
          stop-color="#ffffff"
        />
        <stop
          offset="0.75"
          stop-color="#f3f5f8"
        />
        <stop
          offset="1"
          stop-color="#d9dee5"
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
          stop-opacity="0.85"
        />
        <stop
          offset="1"
          stop-color="#ffffff"
          stop-opacity="0"
        />
      </linearGradient>
    </defs>

    <circle
      cx="65"
      cy="65"
      r="63"
      :fill="url('bezel')"
      stroke="rgba(0,0,0,0.35)"
      stroke-width="1"
    />
    <circle
      cx="65"
      cy="65"
      r="57.5"
      :fill="url('ring')"
    />
    <circle
      cx="65"
      cy="65"
      r="55"
      :fill="url('face')"
    />

    <line
      v-for="tick in ticks"
      :key="tick.key"
      :x1="tick.x1"
      :y1="tick.y1"
      :x2="tick.x2"
      :y2="tick.y2"
      :stroke="tick.major ? '#2b2f36' : '#8a9099'"
      :stroke-width="tick.major ? 2.2 : 0.8"
      stroke-linecap="round"
    />
    <text
      v-for="n in numerals"
      :key="n.value"
      :x="n.x"
      :y="n.y"
      class="numeral"
      text-anchor="middle"
      dominant-baseline="central"
    >{{ n.value }}</text>
    <text
      v-if="label"
      x="65"
      y="86"
      class="label"
      text-anchor="middle"
      dominant-baseline="central"
    >{{ label }}</text>

    <g class="hands">
      <path
        class="hour-hand"
        d="M63.1 72 L63.7 39 Q65 35.5 66.3 39 L66.9 72 Z"
        fill="#23272e"
        :transform="`rotate(${angles.hour} 65 65)`"
      />
      <path
        class="minute-hand"
        d="M63.7 73 L64.3 21 Q65 18 65.7 21 L66.3 73 Z"
        fill="#23272e"
        :transform="`rotate(${angles.minute} 65 65)`"
      />
      <g
        v-if="showSeconds"
        class="second-hand"
        :transform="`rotate(${angles.second} 65 65)`"
      >
        <line
          x1="65"
          y1="78"
          x2="65"
          y2="16"
          stroke="#d0202a"
          stroke-width="1.1"
          stroke-linecap="round"
        />
        <circle
          cx="65"
          cy="74"
          r="2.2"
          fill="#d0202a"
        />
      </g>
      <circle
        cx="65"
        cy="65"
        r="3.6"
        fill="#23272e"
      />
      <circle
        cx="65"
        cy="65"
        r="1.4"
        :fill="showSeconds ? '#d0202a' : '#9aa1ab'"
      />
    </g>

    <path
      d="M17 58 A48 48 0 0 1 113 58 Q65 44 17 58 Z"
      :fill="url('glass')"
      pointer-events="none"
    />
  </svg>
</template>

<script>
import { props } from '@/utils/vue';
import { timeIn, zoneCity } from '@/utils/datetime';

let instances = 0;

// The hour, minute and second hands of the classic product shot.
const PREVIEW_TIME = { h: 10, m: 8, s: 37 };

export default {
  name: 'ClockGadget',
  ...props({
    options: props.obj(() => ({})),
    preview: props.bool(false),
  }),
  data() {
    instances += 1;
    return {
      uidBase: `clk${instances}`,
      time: this.preview ? PREVIEW_TIME : timeIn(this.options.timeZone),
    };
  },
  computed: {
    showSeconds() {
      return this.options.seconds !== false;
    },
    label() {
      const name = (this.options.name || '').trim() || zoneCity(this.options.timeZone);
      return name.length > 16 ? `${name.slice(0, 15)}…` : name;
    },
    angles() {
      const { h, m, s } = this.time;
      return {
        hour: ((h % 12) * 30) + (m * 0.5),
        minute: (m * 6) + (s * 0.1),
        second: s * 6,
      };
    },
    ariaLabel() {
      const { h, m } = this.time;
      return `Clock${this.label ? ` (${this.label})` : ''}: ${h}:${String(m).padStart(2, '0')}`;
    },
    ticks() {
      const list = [];
      for (let i = 0; i < 60; i += 1) {
        const major = i % 5 === 0;
        const a = (i * Math.PI) / 30;
        const r1 = major ? 46 : 49.5;
        const r2 = 52;
        list.push({
          key: i,
          major,
          x1: 65 + r1 * Math.sin(a),
          y1: 65 - r1 * Math.cos(a),
          x2: 65 + r2 * Math.sin(a),
          y2: 65 - r2 * Math.cos(a),
        });
      }
      return list;
    },
    numerals() {
      return [12, 3, 6, 9].map((value) => {
        const a = ((value % 12) * Math.PI) / 6;
        return {
          value,
          x: 65 + 38 * Math.sin(a),
          y: 65 - 38 * Math.cos(a),
        };
      });
    },
  },
  watch: {
    'options.timeZone': function onZone() {
      this.updateTime();
    },
  },
  mounted() {
    if (!this.preview) this.schedule();
  },
  beforeUnmount() {
    clearTimeout(this.timer);
  },
  methods: {
    uid(name) {
      return `${this.uidBase}-${name}`;
    },
    url(name) {
      return `url(#${this.uid(name)})`;
    },
    updateTime() {
      if (!this.preview) this.time = timeIn(this.options.timeZone);
    },
    // Tick right after each new second starts, like a quartz clock.
    schedule() {
      this.timer = setTimeout(() => {
        this.updateTime();
        this.schedule();
      }, 1000 - (Date.now() % 1000) + 15);
    },
  },
  style({ className }) {
    return [
      className('clock', {
        display: 'block',
        width: '130px',
        height: '130px',
        overflow: 'visible',
        filter: 'drop-shadow(0 3px 4px rgba(0, 0, 0, 0.45))',
        '& .numeral': {
          font: '600 10px "Segoe UI", Tahoma, Arial, sans-serif',
          fill: '#2b2f36',
        },
        '& .label': {
          font: '600 7.5px "Segoe UI", Tahoma, Arial, sans-serif',
          fill: '#5b6370',
          letterSpacing: '0.2px',
        },
      }),
    ];
  },
};
</script>
