# Programet për Android

Çdo program (Electrical, CCTV, AP, Fire, Emergency, All in One) bëhet aplikacion `.apk` më vete me Capacitor.
Aplikacioni hap të njëjtën faqe që ndërton `build.mjs` (`dist/...`), pa nevojë për internet; projektet dhe kodet e
aktivizimit ruhen veçmas për çdo program, si te Windows.

Ndërtimi bëhet vetë në GitHub (`.github/workflows/android.yml`): pas çdo ndryshimi në `main` aplikacionet dalin te
**Releases** me emrin "Programet për Android" (`android-latest`); nga një PR dalin si provë (`android-test`).

Në kompjuter (JDK 21 dhe Android SDK):

```
npm ci && npm run build                          # në rrënjë: faqet e programeve
cd mobile && npm ci
node build-apk.mjs                               # të gjashtë aplikacionet në mobile/release/
node build-apk.mjs --edition all                 # vetëm All in One
node build-apk.mjs --edition all --prepare && npx cap open android   # projekti në Android Studio
```

- Prekja: një gisht punon si miu (trokit = klik, tërhiq = tërheqje), gishti i mbajtur = klik i djathtë (mbyll murin
  ose kabllon), dy gishta zhvendosin dhe zmadhojnë pamjen (`src/tools/touch.ts`).
- Butoni **Përditëso** (paneli majtas në telefon; edhe një kontroll vetë pak pas hapjes) lexon versionin te
  `https://allsolutiontech.de/soft/cad/versioni.json`
  (`{"produkti":"allsolutiontech-cad","windows":"0.1.25","android":"0.1.8","faqja":"https://allsolutiontech.de/soft/#cad"}`)
  dhe, kur ka version më të ri, hap vetëm faqen `https://allsolutiontech.de/soft/#cad` në shfletues. Programi nuk
  shkarkon asgjë vetë; kur s'lexohet skedari del "S'u kontrollua dot – provo më vonë" (`src/io/androidUpdate.ts`).
- Ruajtja (Ctrl+S, "Ruaj si" PDF/DXF/SVG/PNG/projekt, CSV, raportet): `@capacitor/filesystem` e shkruan skedarin te
  Dokumentet / AllSolutionTech CAD si "<emri> – <data>.<prapashtesa>", pastaj del mesazhi me "Hap / Ndaj"
  (`@capacitor/share`: email, WhatsApp, Drive, printim) dhe "Mbyll". Kur Android-i s'lejon Dokumentet, skedari
  shkruhet te Cache dhe hapet menjëherë "Ndaj"; çdo dështim del si "Ruajtja dështoi: …" (`src/io/androidFiles.ts`).
- "Hap" tregon të gjithë skedarët (zgjedhësi i Android-it s'i njeh .astcad/.dxf si lloje).
- Raportet në telefon: titulli, faqet dhe butonat majtas, faqja A4 djathtas (në këmbë dhe shtrirë); "Printo" s'punon
  në WebView, prandaj në Android butoni "PDF" ruan PDF-në e planit (me legjendën dhe listën e materialeve).
- Pamja në telefon (`src/ui/phone.ts`): i shtrirë, paneli majtas (~168 px) me menynë, veglat në rrjetë 3 kolona me emrin poshtë ikonës, butonat Libraritë dhe Panelet,
  cilësimet dhe poshtë gjuhën, kontaktin, përditësimin dhe licencën; në këmbë, paneli vetëm me ikona (56 px) që hapet
  me ☰. Tableti mbetet si në kompjuter. Faqja nuk shkon nën shiritin e orës dhe nën Back/Home
  (`adjustMarginsForEdgeToEdge: "force"` dhe ngjyra e shiritave te `native/MainActivity.java`).
- Prova falas: `CapacitorHttp` është aktiv (fetch nga ana native, pa Origin); pajisja nga `AstFiles.deviceId` (ANDROID_ID).
- Versioni: `version` te `mobile/package.json` (rrite para çdo publikimi; versionCode është numri i fundit).
- Nënshkrimi: tani me çelësin e provës `test-signing.keystore` (fjalëkalimi në `build-apk.mjs`), që versionet e reja të
  instalohen mbi të vjetrat. Para shpërndarjes ose Google Play duhet një çelës i vërtetë, i dhënë me `AST_KEYSTORE`,
  `AST_KEYSTORE_PASSWORD`, `AST_KEY_ALIAS`, `AST_KEY_PASSWORD` (sekrete në GitHub); aplikacionet e nënshkruara me
  çelësin e provës duhen çinstaluar një herë kur ndërrohet çelësi.
