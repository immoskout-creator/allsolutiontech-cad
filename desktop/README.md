# Programet për Windows

Çdo program (Electrical, CCTV, AP, Fire, Emergency, All in One) bëhet instalues `.exe` më vete me Electron.
Programi hap të njëjtën faqe që ndërton `build.mjs` (`dist/...`), pa nevojë për internet; projektet dhe kodet e
aktivizimit ruhen veçmas për çdo program.

Ndërtimi bëhet vetë në GitHub (`.github/workflows/windows.yml`) pas çdo ndryshimi në `main`; instaluesit dalin te
faqja **Releases** me emrin "Programet për Windows".

Në kompjuter (Windows):

```
npm ci && npm run build          # në rrënjë: faqet e programeve
cd desktop && npm ci
node build-installers.mjs        # të gjashtë instaluesit në desktop/release/
node build-installers.mjs --edition fire
node build-installers.mjs --stage --edition fire && npx electron stage/fire   # provë pa instalues
```

Në programin e Windows, Ruaj, PDF dhe DXF hapin dritaren "Ruaj si" (desktop/preload.cjs → main.cjs).
Ikona është `icon.png` (logoja AST). Te Releases ka edhe `SHA256SUMS.txt`; në Windows kontrollohet me
`certutil -hashfile <skedari> SHA256`.

Instaluesit nuk janë ende të nënshkruar, ndaj Windows SmartScreen shfaq një paralajmërim deri sa të shtohet një certifikatë.
