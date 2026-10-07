<template>
  <div
    :class="[$style.calendar, view]"
    :data-view="view"
  >
    <div
      v-if="view === 'day'"
      class="page"
      role="button"
      tabindex="0"
      :title="preview ? '' : 'Show the month'"
      @click="showMonth"
      @keydown.enter="showMonth"
    >
      <div class="head">
        {{ dayMonthYear }}
      </div>
      <div class="number">
        {{ shown.getDate() }}
      </div>
      <div class="weekday">
        {{ dayWeekday }}
      </div>
    </div>

    <div
      v-else
      class="page"
    >
      <div class="head nav">
        <button
          type="button"
          class="arrow prev"
          aria-label="Previous month"
          @click="changeMonth(-1)"
        >
          <svg
            viewBox="0 0 8 10"
            width="8"
            height="10"
          ><path
            d="M6 1 L2 5 L6 9"
            fill="none"
            stroke="currentColor"
            stroke-width="1.6"
          /></svg>
        </button>
        <button
          type="button"
          class="title"
          title="Back to today"
          @click="showToday"
        >
          {{ cursorMonthYear }}
        </button>
        <button
          type="button"
          class="arrow next"
          aria-label="Next month"
          @click="changeMonth(1)"
        >
          <svg
            viewBox="0 0 8 10"
            width="8"
            height="10"
          ><path
            d="M2 1 L6 5 L2 9"
            fill="none"
            stroke="currentColor"
            stroke-width="1.6"
          /></svg>
        </button>
      </div>
      <div class="grid">
        <span
          v-for="(label, i) in weekdayHeadings"
          :key="`w${i}`"
          class="wd"
        >{{ label }}</span>
        <button
          v-for="cell in cells"
          :key="cell.key"
          type="button"
          class="day"
          :class="{ other: cell.other, today: cell.today, shown: cell.shown }"
          @click="showDay(cell.date)"
        >
          {{ cell.date.getDate() }}
        </button>
      </div>
    </div>
  </div>
</template>

<script>
import { props } from '@/utils/vue';
import {
  getLocale, weekdayName, monthYearName, monthYearTitle, firstDayOfWeek, weekdayLabels,
} from '@/utils/datetime';

const sameDay = (a, b) => a.getFullYear() === b.getFullYear()
  && a.getMonth() === b.getMonth()
  && a.getDate() === b.getDate();

export default {
  name: 'CalendarGadget',
  ...props({
    options: props.obj(() => ({})),
    preview: props.bool(false),
  }),
  data() {
    const today = new Date();
    return {
      locale: getLocale(),
      today,
      picked: null, // a day picked in the month view (null = today)
      view: 'day',
      cursor: { year: today.getFullYear(), month: today.getMonth() },
    };
  },
  computed: {
    shown() {
      return this.picked || this.today;
    },
    dayMonthYear() {
      return monthYearName(this.shown, this.locale);
    },
    dayWeekday() {
      return weekdayName(this.shown, this.locale);
    },
    cursorMonthYear() {
      return monthYearTitle(new Date(this.cursor.year, this.cursor.month, 1), this.locale);
    },
    firstDay() {
      return firstDayOfWeek(this.locale);
    },
    weekdayHeadings() {
      return weekdayLabels(this.firstDay, this.locale);
    },
    cells() {
      const { year, month } = this.cursor;
      const first = new Date(year, month, 1);
      const lead = (first.getDay() - this.firstDay + 7) % 7;
      const list = [];
      for (let i = 0; i < 42; i += 1) {
        const date = new Date(year, month, 1 - lead + i);
        list.push({
          key: `${date.getMonth()}-${date.getDate()}`,
          date,
          other: date.getMonth() !== month,
          today: sameDay(date, this.today),
          shown: !!this.picked && sameDay(date, this.picked),
        });
      }
      return list;
    },
  },
  mounted() {
    if (!this.preview) {
      // Notice midnight: check the date every half minute.
      this.timer = setInterval(() => {
        const now = new Date();
        if (!sameDay(now, this.today)) this.today = now;
      }, 30000);
    }
  },
  beforeUnmount() {
    clearInterval(this.timer);
  },
  methods: {
    showMonth() {
      if (this.preview) return;
      this.cursor = { year: this.shown.getFullYear(), month: this.shown.getMonth() };
      this.view = 'month';
    },
    changeMonth(step) {
      const d = new Date(this.cursor.year, this.cursor.month + step, 1);
      this.cursor = { year: d.getFullYear(), month: d.getMonth() };
    },
    showDay(date) {
      this.picked = sameDay(date, this.today) ? null : date;
      this.view = 'day';
    },
    showToday() {
      this.picked = null;
      this.view = 'day';
    },
  },
  style({ className }) {
    const accent = '#d4581f';
    return [
      className('calendar', {
        width: '144px',
        height: '150px',
        position: 'relative',
        fontFamily: '"Segoe UI", Tahoma, Arial, sans-serif',
        color: '#2b2b2b',
        '& .page': {
          position: 'relative',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          borderRadius: '6px',
          overflow: 'hidden',
          background: 'linear-gradient(180deg, #ffffff 0%, #fbfbf8 60%, #ecece6 100%)',
          boxShadow: [
            'inset 0 0 0 1px rgba(255, 255, 255, 0.9)',
            '0 0 0 1px rgba(0, 0, 0, 0.28)',
            '2px 3px 0 -1px #f2f2ec',
            '2px 3px 0 0 rgba(0, 0, 0, 0.18)',
            '4px 6px 0 -2px #e6e6df',
            '4px 6px 0 -1px rgba(0, 0, 0, 0.14)',
            '0 6px 12px rgba(0, 0, 0, 0.4)',
          ].join(','),
          cursor: 'default',
        },
        '& .head': {
          flexShrink: 0,
          height: '28px',
          lineHeight: '28px',
          padding: '0 6px',
          textAlign: 'center',
          fontSize: '12px',
          fontWeight: 600,
          color: '#fff',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          textShadow: '0 1px 1px rgba(0, 0, 0, 0.35)',
          background: `linear-gradient(180deg, #f6a46c 0%, #e8743a 45%, ${accent} 55%, #c4491a 100%)`,
          borderBottom: 'solid 1px #a63c14',
        },
        '& .number': {
          flexGrow: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '68px',
          fontWeight: 300,
          lineHeight: 1,
          letterSpacing: '-2px',
          color: '#30343a',
          textShadow: '0 1px 0 #fff',
        },
        '& .weekday': {
          flexShrink: 0,
          paddingBottom: '12px',
          textAlign: 'center',
          fontSize: '13px',
          fontWeight: 600,
          color: accent,
        },
        '& .head.nav': {
          display: 'flex',
          alignItems: 'center',
          padding: '0 2px',
          height: '24px',
          lineHeight: '24px',
          fontSize: '11px',
        },
        '& .head.nav button': {
          color: '#fff',
          cursor: 'pointer',
          borderRadius: '3px',
          '&:hover': { background: 'rgba(255, 255, 255, 0.22)' },
        },
        '& .arrow': {
          width: '20px',
          height: '20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        },
        '& .arrow svg': {
          display: 'block',
        },
        '& .title': {
          flexGrow: 1,
          height: '20px',
          lineHeight: '20px',
          fontWeight: 600,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          textShadow: '0 1px 1px rgba(0, 0, 0, 0.35)',
        },
        '& .grid': {
          flexGrow: 1,
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          gridTemplateRows: '15px repeat(6, 1fr)',
          padding: '3px 4px 6px',
          gap: '1px',
        },
        '& .wd': {
          fontSize: '9px',
          lineHeight: '15px',
          textAlign: 'center',
          color: '#8a8f96',
          fontWeight: 600,
        },
        '& .day': {
          fontSize: '10.5px',
          lineHeight: 1,
          textAlign: 'center',
          color: '#30343a',
          borderRadius: '3px',
          cursor: 'pointer',
          '&:hover': { background: 'rgba(212, 88, 31, 0.14)' },
          '&.other': { color: '#b5b8bd' },
          '&.shown': { boxShadow: `inset 0 0 0 1px ${accent}` },
          '&.today': {
            color: '#fff',
            fontWeight: 600,
            background: `linear-gradient(180deg, #ec8148, ${accent})`,
          },
        },
      }),
    ];
  },
};
</script>
