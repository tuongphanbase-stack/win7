// The component that draws each kind of gadget (see GADGET_TYPES in
// services/gadgets.js for names and sizes).
import ClockGadget from '@/components/Gadgets/ClockGadget.vue';
import CalendarGadget from '@/components/Gadgets/CalendarGadget.vue';
import CpuMeterGadget from '@/components/Gadgets/CpuMeterGadget.vue';

// eslint-disable-next-line import/prefer-default-export
export const GADGET_COMPONENTS = {
  clock: ClockGadget,
  calendar: CalendarGadget,
  cpu: CpuMeterGadget,
};
