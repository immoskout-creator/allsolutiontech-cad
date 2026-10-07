# AllSolutionTech CAD 2D

Program 2D për projektimin e instalimeve elektrike në shtëpi. Vetëm 2D.

## Faza 0 (ky version)
- Fletë vizatimi me zoom (rrota e miut), lëvizje (hapësira + tërhiq, ose butoni i mesit), rrjetë dhe snap.
- Vizatim muresh me trashësi, gjatësi e shkruar me tastierë (p.sh. `430` + Enter = 4.30 m), Orto/Shift.
- Zgjedhje, lëvizje, fshirje, vetitë e murit (gjatësia, trashësia, pozicioni).
- Shtresat (shfaq/fshih, blloko), zhbëj/ribëj, ruaj/hap skedar `.astcad.json`, ruajtje automatike.

## Struktura
- `src/core` modeli i dokumentit, gjeometria, historia (zhbëj/ribëj)
- `src/view` kamera (viewport) dhe vizatimi në canvas
- `src/tools` veglat dhe ndërveprimi me miun/tastierën
- `src/io` ruajtja dhe hapja e skedarëve
- `src/main.ts` ndërfaqja dhe lidhja e pjesëve

## Komandat
```
npm install
npm run build      # dist/index.html, hapet direkt në shfletues
npm test           # testet
npm run typecheck
```
