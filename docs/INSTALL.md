# Install / Run Guide

## Web (local)
1. Open `Index.html` directly for a quick test (WASM features are disabled on `file://`).
2. For full features, run a local server:
```bash
cd /home/sam/Desktop/Brotato-Lite
python3 -m http.server 8000
```
Open `http://localhost:8000` in a browser.

## Desktop (Electron)
### Requirements
- Node.js LTS

### Install & Run (Windows)
```powershell
cd C:\Dev\Pressure-Point
npm install
npm run start
```

### Install & Run (Linux)
```bash
cd /home/sam/Desktop/Brotato-Lite
npm install
npm run start
```

### Build installers
```bash
npm run dist
```
Artifacts are generated in `dist/`.

## Notes
- If `npm install` fails on Windows, move the repo out of OneDrive and retry.
- `package.json` must exist at repo root; if missing, switch GitHub default branch to `master`.
