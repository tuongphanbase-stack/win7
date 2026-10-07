<template>
  <div
    :class="$style.desktop"
    :style="{ backgroundImage: wallpaper }"
  >
    <FilesContainer
      path="C:/User/Desktop"
      direction="column"
      :file-props="{ shadow: true }"
      :context-menu-extras="contextMenuExtras"
    />
    <GadgetLayer />
  </div>
</template>

<script>
import { fitSize } from '@/styles/common';
import { panelSize } from '@/styles/constants';
import FilesContainer from '@/components/FilesContainer.vue';
import GadgetLayer from '@/components/Gadgets/GadgetLayer.vue';
import { resolveFileByPath } from '@/services/fs';
import { openFile } from '@/services/wm';
import { config } from '@/services/cnf';
import { openGadgetGallery } from '@/services/gadgets';

export default {
  name: 'Desktop',
  components: {
    FilesContainer,
    GadgetLayer,
  },
  style({ className }) {
    return [
      className('desktop', {
        position: 'absolute',
        ...fitSize,
        paddingBottom: panelSize,
        backgroundPosition: 'bottom center',
        backgroundSize: 'cover',
      }),
    ];
  },
  computed: {
    wallpaper() {
      try {
        return `url("${resolveFileByPath(config.wallpaperPath).data}")`;
      } catch (_e) {
        return '';
      }
    },
    contextMenuExtras() {
      return {
        Gadgets: openGadgetGallery,
        'Change Background': this.openChangeBackground,
      };
    },
  },
  methods: {
    openChangeBackground() {
      openFile(
        resolveFileByPath('C:/Windows/ChangeBackground.vue'),
      );
    },
  },
};
</script>
