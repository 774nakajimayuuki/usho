# Usho

Run Claude Code and Codex per GitHub issue, and watch every status on one board.

A *usho* (鵜匠) is a cormorant master: one person who handles a dozen birds on lines at once and collects what each one catches. Usho does the same for AI coding agents — hand each issue to an agent, and keep track of all of them from one place.

> Early development. The board runs on sample data; no agents are started yet.

## Requirements

- Node.js 22.12 or later
- [GitHub CLI](https://cli.github.com/) (`gh`), signed in
- [Claude Code](https://docs.claude.com/en/docs/claude-code) (`claude`) and/or [Codex CLI](https://github.com/openai/codex) (`codex`)

## Development

```bash
npm install
npm run dev
```

| Script | What it does |
| --- | --- |
| `npm run dev` | Start the app with hot reload |
| `npm run typecheck` | Type-check the main, preload and renderer code |
| `npm run build` | Type-check and build into `out/` |
| `npm run dist:mac` / `npm run dist:win` | Package the app into `dist/` |

## Project layout

```
src/
  main/       Electron main process: windows, IPC, running CLIs
  preload/    Bridge that exposes `window.usho` to the renderer
  renderer/   React UI
  shared/     Types used by more than one process
```

## License

[MIT](LICENSE)
