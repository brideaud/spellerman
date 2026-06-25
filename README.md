# Spellerman

A 3D spelling game for kids built with Three.js and TypeScript. Walk around a small island, pick up letter tiles, and throw them onto a letter rack to spell sight words aloud.

## Play locally

```bash
npm install
npm run dev
```

Open http://localhost:5173

## Build

```bash
npm run build
npm run preview
```

## Controls

- **WASD / Arrow keys** — walk
- **Space** — pick up a nearby letter, or throw at the letter rack

## Stack

- [Three.js](https://threejs.org/) — 3D world
- [Vite](https://vitejs.dev/) — dev server and bundler
- Web Speech API — word announcements