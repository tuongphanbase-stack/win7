<template>
  <div :class="$style.options">
    <div
      v-if="gadget"
      class="body"
    >
      <div class="preview">
        <ClockGadget :options="form" />
      </div>
      <label class="row">
        <span>Clock name:</span>
        <input
          v-model="form.name"
          class="field"
          type="text"
          maxlength="24"
          spellcheck="false"
          :placeholder="cityPlaceholder"
        >
      </label>
      <label class="row">
        <span>Time zone:</span>
        <select
          v-model="form.timeZone"
          class="field"
        >
          <option value="">
            Current computer time {{ localOffset }}
          </option>
          <option
            v-for="z in zones"
            :key="z.zone"
            :value="z.zone"
          >
            {{ z.text }}
          </option>
        </select>
      </label>
      <label class="check">
        <input
          v-model="form.seconds"
          type="checkbox"
        >
        <span>Show the second hand</span>
      </label>
    </div>
    <div
      v-else
      class="body gone"
    >
      This gadget has been closed.
    </div>
    <div class="buttons">
      <button
        v-if="gadget"
        type="button"
        @click="ok"
      >
        OK
      </button>
      <button
        type="button"
        @click="close"
      >
        Cancel
      </button>
    </div>
  </div>
</template>

<script>
import { props } from '@/utils/vue';
import { resolveFileByPath } from '@/services/fs';
import { closeWindow } from '@/services/wm';
import { GADGET_TYPES, findGadget, setGadgetOptions } from '@/services/gadgets';
import {
  TIME_ZONES, zoneOffsetMinutes, formatOffset, zoneCity,
} from '@/utils/datetime';
import ClockGadget from '@/components/Gadgets/ClockGadget.vue';

// Options window of a gadget, opened with its wrench button. The file it
// opens is made by openGadgetOptions() in services/gadgets.js.
export default {
  name: 'GadgetOptions',
  components: {
    ClockGadget,
  },
  canHandle: (file) => !!file && file.path === '.gadget',
  metaData: (file) => {
    const g = file && file.data && findGadget(file.data.id);
    return {
      title: g ? GADGET_TYPES[g.type].name : 'Gadget options',
      icon: resolveFileByPath('C:/Windows/system/icons/gadgets.png'),
      width: 400,
      height: 385,
      maximizable: false,
      minimizable: false,
      resizable: false,
    };
  },
  ...props({
    file: props.obj(null),
    wmId: props.any(),
  }),
  data() {
    const g = this.file && findGadget(this.file.data.id);
    return {
      form: {
        name: '', timeZone: '', seconds: true, ...(g ? g.options : {}),
      },
    };
  },
  computed: {
    gadget() {
      return this.file ? findGadget(this.file.data.id) : null;
    },
    zones() {
      const now = new Date();
      return TIME_ZONES
        .map((z) => ({ ...z, offset: zoneOffsetMinutes(z.zone, now) }))
        .sort((a, b) => a.offset - b.offset)
        .map((z) => ({ zone: z.zone, text: `${formatOffset(z.offset)} ${z.label}` }));
    },
    localOffset() {
      return formatOffset(zoneOffsetMinutes(''));
    },
    cityPlaceholder() {
      return zoneCity(this.form.timeZone) || 'No name';
    },
  },
  methods: {
    ok() {
      if (this.gadget) {
        setGadgetOptions(this.gadget.id, {
          name: this.form.name.trim(),
          timeZone: this.form.timeZone,
          seconds: !!this.form.seconds,
        });
      }
      this.close();
    },
    close() {
      closeWindow(this.wmId);
    },
  },
  style({ className }) {
    return [
      className('options', {
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        background: '#fff',
        color: '#1e1e1e',
        fontSize: '13px',
        '& > .body': {
          flexGrow: 1,
          padding: '14px 22px 6px',
          overflowY: 'auto',
        },
        '& > .body.gone': {
          color: '#4d6185',
          paddingTop: '30px',
          textAlign: 'center',
        },
        '& .preview': {
          display: 'flex',
          justifyContent: 'center',
          padding: '8px 0 16px',
          marginBottom: '12px',
          borderRadius: '4px',
          background: 'radial-gradient(ellipse at 50% 30%, #f6f9fd 0%, #dfe9f5 100%)',
          border: 'solid 1px #d5e1f0',
        },
        '& .row': {
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          marginBottom: '10px',
          '& > span': { width: '84px', flexShrink: 0, color: '#1e395b' },
        },
        '& .field': {
          flexGrow: 1,
          minWidth: 0,
          height: '24px',
          padding: '0 6px',
          fontSize: '13px',
          color: '#1e1e1e',
          background: '#fff',
          border: 'solid 1px #abadb3',
          borderRadius: '2px',
          userSelect: 'text',
          '&:focus': { borderColor: '#3c7fb1' },
        },
        '& .check': {
          display: 'flex',
          alignItems: 'center',
          gap: '7px',
          marginLeft: '94px',
          cursor: 'pointer',
          '& > input': {
            width: '13px',
            height: '13px',
            appearance: 'auto',
            borderWidth: '1px',
          },
        },
        '& > .buttons': {
          flexShrink: 0,
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '8px',
          padding: '10px',
          background: '#f0f0f0',
          borderTop: 'solid 1px #dfdfdf',
          '& > button': {
            minWidth: '74px',
            padding: '5px 12px',
            fontSize: '13px',
            border: 'solid 1px #707070',
            borderRadius: '3px',
            background: 'linear-gradient(180deg, #f2f2f2 0%, #ebebeb 45%, #dddddd 50%, #cfcfcf 100%)',
            cursor: 'pointer',
            '&:hover, &:focus-visible': {
              borderColor: '#3c7fb1',
              background: 'linear-gradient(180deg, #eaf6fd 0%, #d9f0fc 45%, #bee6fd 50%, #a7d9f5 100%)',
            },
          },
        },
      }),
    ];
  },
};
</script>
