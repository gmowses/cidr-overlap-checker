# CIDR Overlap Checker

Enter two or more IPv4 CIDR blocks and instantly check if they overlap. Shows detailed info for each block and highlights overlapping ranges. Everything runs client-side.

**[Live Demo](https://gmowses.github.io/cidr-overlap-checker)**

## Features

- Add 2 or more CIDR blocks dynamically
- Detects all pairwise overlaps
- Shows per-CIDR info: network, broadcast, netmask, usable hosts
- Shows overlap range (start IP – end IP) and overlapping host count
- Visual overlap indicator bar
- Input validation (invalid CIDR, host bits must be zero)
- Dark/light mode
- i18n: English and Portuguese (BR)
- Client-side only

## Tech Stack

React 19 + TypeScript, Tailwind CSS v4, Vite, Lucide icons, GitHub Pages

## Development

```bash
npm install
npm run dev
```

## License

MIT — Gabriel Mowses
