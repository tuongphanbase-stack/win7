<div align="center">
  <img src="public/favicon.ico" height="96" alt=""/>
  <h1>Windows 7 on the web</h1>
  <p>A Windows 7 desktop that runs in the browser, built with Vue 3 and Vite.</p>
  <img src="screen-record.gif" height="281" alt="Screen recording of the desktop"/>
</div>

Based on [nainemom/win7](https://github.com/nainemom/win7) by Amir Momenian
(Apache License 2.0, see `LICENSE`), with these additions:

| Feature | What it does |
|---|---|
| **Command Prompt** | A real command line: `help`, `dir`, `cd`, `type`, `tree`, `start`, `echo`, `date`, `time`, `cls`, `ver`, drive switching (`D:`). Windows-style paths, case-insensitive names, ↑/↓ history, Tab completion, Ctrl+L to clear. Replaces the original, which ran typed text as JavaScript. |
| **Recycle Bin** | Delete moves files to the Recycle Bin (desktop icon shows empty/full). Inside it: Restore, Delete permanently, Restore all, Empty the Recycle Bin. |
| **Explorer navigation** | Back, Forward and Up buttons, an address bar you can type a path into (`C:\User\Documents`), and an item count. |
| **Control Panel** | Personalization (desktop background), System info, Programs, Recycle Bin, Command Prompt, and **Reset this PC**. |
| **Saved files** | New folders and text files, renames, moves, edits and the Recycle Bin are remembered in this browser. Reset this PC brings back the original files. |

Open the Command Prompt and Control Panel from the Start menu or the desktop.

## Run it locally

```bash
npm ci
npm run dev      # start with hot reload
npm run build    # production build in dist/
npm run lint
```

## Deploying

`.github/workflows/pages.yml` builds the site and publishes it to GitHub
Pages on every push to `main`. In the repository settings, set
**Pages → Source** to **GitHub Actions** once.

## Media files

The original demo songs and video in `D:` are not included because they are
copyrighted. Put your own `.mp3` files in `src/D:/Musics` and `.mp4` files in
`src/D:/Videos` to have them appear in the music and video players.

## History

The previous version of this fork was lost when its GitHub account was
suspended; notes from that recovery are in `docs/recovery/`. The features
listed in `docs/recovery/CUSTOM_CHANGES.md` were rebuilt here, except the
desktop gadgets (the taskbar clock and calendar are still there).
