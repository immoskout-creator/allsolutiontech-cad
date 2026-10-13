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
- Butoni **Përditëso** lart (dhe një kontroll vetë pak pas hapjes) gjen versionin e ri te `android-latest` dhe hap
  APK-në në shfletues; Android e instalon mbi të vjetrin (`src/io/androidUpdate.ts`).
- Ruaj, PDF, DXF, CSV hapin dritaren "Ruaj si" të Android (`native/AstFilesPlugin.java` ← `src/io/files.ts`).
- Pamja në telefon (`src/ui/phone.ts`): i shtrirë, paneli majtas (~168 px) me menynë, veglat në rrjetë 4 kolona,
  cilësimet dhe poshtë gjuhën, kontaktin, përditësimin dhe licencën; në këmbë, paneli vetëm me ikona (56 px) që hapet
  me ☰. Tableti mbetet si në kompjuter. Faqja nuk shkon nën shiritin e orës dhe nën Back/Home
  (`adjustMarginsForEdgeToEdge: "force"` dhe ngjyra e shiritave te `native/MainActivity.java`).
- Prova falas: `CapacitorHttp` është aktiv (fetch nga ana native, pa Origin); pajisja nga `AstFiles.deviceId` (ANDROID_ID).
- Versioni: `version` te `mobile/package.json` (rrite para çdo publikimi; versionCode është numri i fundit).
- Nënshkrimi: tani me çelësin e provës `test-signing.keystore` (fjalëkalimi në `build-apk.mjs`), që versionet e reja të
  instalohen mbi të vjetrat. Para shpërndarjes ose Google Play duhet një çelës i vërtetë, i dhënë me `AST_KEYSTORE`,
  `AST_KEYSTORE_PASSWORD`, `AST_KEY_ALIAS`, `AST_KEY_PASSWORD` (sekrete në GitHub); aplikacionet e nënshkruara me
  çelësin e provës duhen çinstaluar një herë kur ndërrohet çelësi.
