# AllSolutionTech CAD 2D

Program 2D për projektimin e instalimeve elektrike në shtëpi. Vetëm 2D.

## Faza 0 (ky version)
- Fletë vizatimi me zoom (rrota e miut), lëvizje (hapësira + tërhiq, ose butoni i mesit), rrjetë dhe snap.
- Vizatim muresh me trashësi, gjatësi e shkruar me tastierë (p.sh. `430` + Enter = 4.30 m), Orto/Shift.
- Zgjedhje, lëvizje, fshirje, vetitë e murit (gjatësia, trashësia, pozicioni).
- Shtresat (shfaq/fshih, blloko), zhbëj/ribëj, ruaj/hap skedar `.astcad.json`, ruajtje automatike.

## Simbolet elektrike
- 79 simbole civile sipas IEC 60617: priza, çelësa, ndriçim, kuadro dhe pajisje, sensorë dhe automatizim, TV dhe komunikim.
- Çdo simbol ka kodin e vet AllSolutionTech (p.sh. `AST-PR-02`) dhe emrin në shqip, anglisht, italisht dhe gjermanisht.
- Simbolet e murit ngjiten vetë te faqja e murit; `R` i rrotullon.
- Lista "Simbolet në plan" numëron çdo simbol me kod.

## Dyer, dritare dhe dhoma
- Vegla **Derë** (`D`) dhe **Dritare** (`N`): kliko mbi mur. Hapja e pret murin, ndjek murin kur ai lëviz dhe rrëshqet përgjatë tij kur zhvendoset. Gjerësia dhe lartësia shkruhen te shiriti në cm (çdo masë nga 30 deri në 600 cm, me masat standarde si sugjerim) ose ndryshohen më vonë te Vetitë, bashkë me parapetin e dritares. Pranë çdo hapjeje shkruhet masa, p.sh. `90/210`. Te dera, kursori zgjedh anën e hapjes dhe `R` ndryshon menteshat.
- Vegla **Dhomë** (`M`): kliko brenda një dhome të mbyllur me mure. Programi e gjen konturën vetë dhe llogarit sipërfaqen neto (pa trashësinë e mureve) dhe perimetrin. Kur muret ndryshojnë, m² përditësohen vetë.
- Paneli "Dhomat" liston çdo dhomë me m² dhe totalin.

## Simbolet e mia
Butoni **Simbol i ri** te libraria hap redaktorin: vizaton me vija, drejtkëndësha, rrathë (bosh ose të mbushur), harqe dhe tekst, mbi një rrjetë ku shihet edhe muri. I jep kodin (p.sh. AST-U-01), emrin, shtresën, vendosjen (në mur ose e lirë), lartësinë dhe fuqinë.
- Simbolet ruhen brenda projektit dhe dalin te "Simbolet e mia"; lapsi mbi pllakë i ndryshon.
- **Eksporto** i ruan si librari (`.astlib.json`), **Importo** i merr nga një librari ose nga një projekt tjetër.

## Gjuhët
Ndërfaqja dhe emrat e simboleve në 31 gjuhë (zgjedhja lart djathtas): shqip, 24 gjuhët zyrtare të BE-së, serbisht (latinisht dhe cirilicë), boshnjakisht, malazezisht, maqedonisht dhe turqisht. Kodet AST janë të njëjta në çdo gjuhë.
- Gjuhët bazë (sq, en, it, de) janë te `src/i18n/strings.ts` dhe `src/symbols/library.ts`; të tjerat te `src/i18n/extra/<kodi>.ts`. Serbishtja me cirilicë del vetë nga ajo me latinisht.
- Përkthimet e gjuhëve shtesë janë bërë automatikisht; mirë është t'i kontrollojë një folës i gjuhës. Testi `test/i18n.test.ts` kontrollon që çdo gjuhë ka të gjitha tekstet.

## Struktura
- `src/core` modeli i dokumentit, gjeometria, historia (zhbëj/ribëj)
- `src/view` kamera (viewport) dhe vizatimi në canvas
- `src/tools` veglat dhe ndërveprimi me miun/tastierën
- `src/symbols` libraria e simboleve dhe vendosja në mur
- `src/i18n` përkthimet
- `src/io` ruajtja dhe hapja e skedarëve
- `src/main.ts` ndërfaqja dhe lidhja e pjesëve

## Komandat
```
npm install
npm run build      # dist/index.html, hapet direkt në shfletues
npm test           # testet
npm run typecheck
```
