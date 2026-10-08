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

## Qarqet dhe kabllot
Paneli **Qarqet** krijon qarqet e kuadrit (Q1, Q2…), me lloj (ndriçim, priza, pajisje), furnizim njëfazor ose trefazor dhe ngjyrë. Qarku aktiv merr simbolet e reja dhe kabllot e vizatuara me veglën **Kabllo** (K); simbolet ekzistuese lidhen nga vetitë, edhe disa njëherësh.
- Për çdo qark llogariten fuqia, rryma Ib, siguresa, kablloja (3×1.5, 3×2.5 … ose 5× për trefazorin), gjatësia me zbritjet në mur dhe rënia e tensionit (IEC 60364, bakër PVC në tub, metoda B2; 3% ndriçim, 5% të tjerat). Kablloja trashet vetë kur rënia del mbi kufi.
- **Tabela** jep listën e plotë të qarqeve dhe e eksporton në CSV për Excel.

## Raportet
Butoni **Raportet** lart hap tre raporte, secili gati për printim (A4), për ruajtje si HTML dhe, kur ka kuptim, për eksport CSV:
- **Lista e materialeve**: pajisjet me sasitë, metrat e kabllove sipas llojit (me zbritjet në mur dhe 10% rezervë) dhe siguresat e kuadrit sipas lakores dhe rrymës.
- **Simbolet e përdorura**: legjenda e planit, me simbolin, kodin AST, emrin dhe sasinë.
- **Libraria e plotë**: katalogu i të gjitha simboleve sipas kategorive, përfshirë simbolet e tua.

## Katër programe: elektrik, CCTV, AP dhe FIRE
Nga i njëjti kod ndërtohen katër programe të veçanta, secili me emrin, linkun, simbolet dhe projektet e veta (ruajtja automatike nuk përzihet). Planimetria (muret, dyert, dritaret, dhomat, kuotat) është e njëjtë te të katërt.
- **AllSolutionTech CAD 2D**: instalimet elektrike civile (`dist/`).
- **AllSolutionTech CAD 2D CCTV**: kamerat e sigurisë, 8 simbole AST-CC, shtresa Kamerat (`dist/cctv/`).
- **AllSolutionTech CAD 2D AP**: rrjeti dhe access point, 7 simbole AST-RJ, shtresa Rrjeti / AP (`dist/ap/`).
- **AllSolutionTech CAD 2D FIRE**: sinjalizimi i zjarrit, 10 simbole AST-ZJ, shtresa Zjarri (`dist/fire/`).

Te programi CCTV, çdo kamerë ka **modelin** (bullet, dome, PTZ, fisheye me objektivin dhe distancën IR), **lartësinë e montimit**, **këndin e shikimit** (me objektivat 2.8 / 4 / 6 / 8 / 12 mm si sugjerim), **distancën** dhe **drejtimin**; plani tregon zonën e mbulimit në shkallë, me këndin dhe distancën të shkruara.

Te programi FIRE, detektorët e tymit, të nxehtësisë dhe multisensor kanë **lartësinë e montimit** dhe **këndin e sensorit**: rrezja në dysheme është lartësia × tan(këndi/2), jo më shumë se 7.5 m për tymin dhe 5.3 m për nxehtësinë; mbi 10.5 m (tym) ose 9 m (nxehtësi) del paralajmërim. Plani vizaton rrethin e mbulimit me këndin dhe rrezen, të prerë te muret e dhomës.
- Rregullat e vendosjes (EN 54-14 / BS 5839-1): çdo pikë e dhomës duhet të jetë brenda rrezes së një detektori të asaj dhome (pjesët pa mbulim dalin të kuqe në plan dhe tabela e dhomave tregon mbulimin në %); detektori jo më afër se 0.5 m nga muri; dy detektorë fqinjë në të njëjtën dhomë jo më larg se rrezja × √2 (10.6 m tym, 7.5 m nxehtësi). Detektori që shkel një rregull merr unazë të kuqe dhe paralajmërim te vetitë.

Te programet e sistemeve, **Qark i ri** krijon linjë (CAM1, NET1, FA1) pa siguresë: zgjidhet kablloja (U/UTP Cat6, F/UTP Cat6 PE, Cat5e, RG59, Cat6A, fibër OM3, kabllo zjarri PH30/PH120, J-Y(St)Y) dhe kontrollohen gjatësia e çdo kablloje (90 m për UTP) dhe numri i pajisjeve në zonën e zjarrit (32). Lista e materialeve jep pajisjet, metrat e kabllove, konektorët RJ45 (2 për çdo kabllo UTP) dhe rezistencat e fundit të zonës. Programi zgjidhet në `src/edition.ts`; `build.mjs` i ndërton të katërt.

## Kodet e aktivizimit
Çdo program hapet vetëm me një kod aktivizimi nga administratori: **7 ditë, 1 muaj, 6 muaj, 1 vit ose përjetë**. Kodi është për një program (elektrik, CCTV, AP, FIRE, EMERGENCY) ose për **të gjitha**; kodi "të gjitha" hap çdo program.
- Kodet krijohen te faqja e administratorit `admin-dist/index.html` (zgjidh programin, kohëzgjatjen, datën e fillimit dhe klientin). Faqja ruan listën e kodeve të krijuara dhe e shkarkon në CSV, dhe kontrollon çdo kod që i ngjit.
- Kodi është i nënshkruar me çelësin privat të administratorit (ECDSA P-256); programet kanë vetëm çelësin publik (`src/license/publicKey.ts`), prandaj kodet nuk krijohen dot duke ndryshuar programin. Afati llogaritet nga data e fillimit; dita e fundit vlen.
- Çelësi privat është në `admin-key.json`, që **nuk futet në git**. Me të, `npm run build` e fut çelësin brenda faqes së administratorit; pa të, faqja kërkon skedarin. `node scripts/keygen.mjs --force` krijon çelës të ri, por kodet e vjetra nuk vlejnë më.
- Programi kujton kodin në shfletues dhe tregon lart ditët që mbeten; butoni i licencës ndryshon kodin. Kthimi i orës mbrapa nuk e zgjat licencën.
- Një program në shfletues nuk mbrohet plotësisht nga dikush që di ta ndryshojë kodin e faqes; versioni `.exe` mund ta forcojë më tej.

## Të gjitha bashkë: ALL-IN-ONE
`dist/all/` është **AllSolutionTech CAD 2D ALL-IN-ONE**: të gjitha libraritë, linjat dhe shtresat e programeve të tjera në një, me ruajtjen e vet. Lista e librarive majtas zgjedh një librari ose "Të gjitha". Programet e reja që shtohen te `EDITIONS` hyjnë vetë këtu.

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
