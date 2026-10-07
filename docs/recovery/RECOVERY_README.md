# Windows 7 on the web

A fork of [nainemom/win7](https://github.com/nainemom/win7), a Windows 7
desktop recreated in the browser (Vue 3 + Vite, Apache-2.0), with extra
features added on top.

## Status: partially restored

The original repository was lost when its GitHub account was suspended. This
repo only has:

- `index.upstream-exact.html`: the page from the original upstream project
- `UPSTREAM_README.md`: notes on the upstream project
- `CUSTOM_CHANGES.md`: the list of custom features that were added (Explorer
  navigation, Recycle Bin, Command Prompt, Control Panel, themes, gadgets and
  more). **Their source code is missing.**
- `RECOVERY_STATUS.md`: recovery notes

To rebuild it, start from a fresh copy of the upstream project and re-add the
features listed in `CUSTOM_CHANGES.md`.
