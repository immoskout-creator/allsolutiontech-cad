import { EXTRA, type ExtraLang } from './extra';

/** Gjuhët bazë: tekstet e tyre janë këtu dhe te libraria e simboleve. */
export type CoreLang = 'sq' | 'en' | 'it' | 'de';
/** Të gjitha gjuhët: bazë + gjuhët e tjera zyrtare të BE-së (te ./extra). */
export type Lang = CoreLang | ExtraLang;

/** Gjuhët në zgjedhës, me emrin në gjuhën e vet. */
export const LANGS: { id: Lang; label: string }[] = [
  { id: 'sq', label: 'Shqip' },
  { id: 'bg', label: 'Български' },
  { id: 'cs', label: 'Čeština' },
  { id: 'da', label: 'Dansk' },
  { id: 'de', label: 'Deutsch' },
  { id: 'et', label: 'Eesti' },
  { id: 'el', label: 'Ελληνικά' },
  { id: 'en', label: 'English' },
  { id: 'es', label: 'Español' },
  { id: 'fr', label: 'Français' },
  { id: 'ga', label: 'Gaeilge' },
  { id: 'hr', label: 'Hrvatski' },
  { id: 'it', label: 'Italiano' },
  { id: 'lv', label: 'Latviešu' },
  { id: 'lt', label: 'Lietuvių' },
  { id: 'hu', label: 'Magyar' },
  { id: 'mt', label: 'Malti' },
  { id: 'nl', label: 'Nederlands' },
  { id: 'pl', label: 'Polski' },
  { id: 'pt', label: 'Português' },
  { id: 'ro', label: 'Română' },
  { id: 'sk', label: 'Slovenčina' },
  { id: 'sl', label: 'Slovenščina' },
  { id: 'fi', label: 'Suomi' },
  { id: 'sv', label: 'Svenska' },
];

type Dict = Record<string, Record<CoreLang, string>>;

const isCore = (l: Lang): l is CoreLang => l === 'sq' || l === 'en' || l === 'it' || l === 'de';

/** Emri i një simboli ose kategorie në gjuhën aktuale; gjuhët e tjera e marrin nga ./extra. */
export function localName(names: Record<CoreLang, string>, id: string, kind: 'symbols' | 'categories'): string {
  const lang = current;
  if (isCore(lang)) return names[lang];
  return EXTRA[lang][kind][id] ?? names.en;
}

/** Tekstet e ndërfaqes. {n} dhe të ngjashme zëvendësohen nga t(). */
export const STRINGS = {
  brandSub: { sq: 'Instalime elektrike civile', en: 'Residential electrical installations', it: 'Impianti elettrici civili', de: 'Elektroinstallation Wohnbau' },
  project: { sq: 'Projekti', en: 'Project', it: 'Progetto', de: 'Projekt' },
  new: { sq: 'I ri', en: 'New', it: 'Nuovo', de: 'Neu' },
  open: { sq: 'Hap', en: 'Open', it: 'Apri', de: 'Öffnen' },
  save: { sq: 'Ruaj', en: 'Save', it: 'Salva', de: 'Speichern' },
  saveTitle: { sq: 'Ruaj (Ctrl+S)', en: 'Save (Ctrl+S)', it: 'Salva (Ctrl+S)', de: 'Speichern (Strg+S)' },
  language: { sq: 'Gjuha', en: 'Language', it: 'Lingua', de: 'Sprache' },
  toolbar: { sq: 'Veglat e vizatimit', en: 'Drawing tools', it: 'Strumenti di disegno', de: 'Zeichenwerkzeuge' },
  select: { sq: 'Zgjidh', en: 'Select', it: 'Seleziona', de: 'Auswählen' },
  selectTitle: { sq: 'Zgjidh dhe lëviz (V)', en: 'Select and move (V)', it: 'Seleziona e sposta (V)', de: 'Auswählen und verschieben (V)' },
  wall: { sq: 'Mur', en: 'Wall', it: 'Muro', de: 'Wand' },
  wallTitle: { sq: 'Vizato mur (W)', en: 'Draw wall (W)', it: 'Disegna muro (W)', de: 'Wand zeichnen (W)' },
  pan: { sq: 'Pamja', en: 'Pan', it: 'Sposta', de: 'Ansicht' },
  panTitle: { sq: 'Lëviz pamjen (H ose Hapësira + tërhiq)', en: 'Pan the view (H or Space + drag)', it: 'Sposta la vista (H o Spazio + trascina)', de: 'Ansicht verschieben (H oder Leertaste + ziehen)' },
  undo: { sq: 'Zhbëj', en: 'Undo', it: 'Annulla', de: 'Rückgängig' },
  redo: { sq: 'Ribëj', en: 'Redo', it: 'Ripeti', de: 'Wiederholen' },
  delete: { sq: 'Fshi', en: 'Delete', it: 'Elimina', de: 'Löschen' },
  fit: { sq: 'Gjithë planin', en: 'Whole plan', it: 'Tutta la pianta', de: 'Ganzer Plan' },
  fitTitle: { sq: 'Shfaq gjithë planin (F)', en: 'Show the whole plan (F)', it: 'Mostra tutta la pianta (F)', de: 'Ganzen Plan zeigen (F)' },
  sheetScaleLabel: { sq: 'Shkalla e fletës', en: 'Sheet scale', it: 'Scala del foglio', de: 'Blattmaßstab' },
  sheetScale: { sq: 'Shkalla 1:{v}', en: 'Scale 1:{v}', it: 'Scala 1:{v}', de: 'Maßstab 1:{v}' },
  thickness: { sq: 'Trashësia e murit', en: 'Wall thickness', it: 'Spessore muro', de: 'Wandstärke' },
  snapTitle: { sq: 'Kap pikat dhe rrjetën (F9)', en: 'Snap to points and grid (F9)', it: 'Aggancia a punti e griglia (F9)', de: 'Fang an Punkten und Raster (F9)' },
  grid: { sq: 'Rrjeta', en: 'Grid', it: 'Griglia', de: 'Raster' },
  gridTitle: { sq: 'Shfaq rrjetën (F7)', en: 'Show grid (F7)', it: 'Mostra griglia (F7)', de: 'Raster zeigen (F7)' },
  orthoTitle: { sq: 'Vetëm vija horizontale dhe vertikale (F8, ose mbaj Shift)', en: 'Horizontal and vertical only (F8, or hold Shift)', it: 'Solo orizzontale e verticale (F8, o tieni Shift)', de: 'Nur waagrecht und senkrecht (F8 oder Umschalt halten)' },
  properties: { sq: 'Vetitë', en: 'Properties', it: 'Proprietà', de: 'Eigenschaften' },
  libraries: { sq: 'Libraritë', en: 'Libraries', it: 'Librerie', de: 'Bibliotheken' },
  libCivil: { sq: 'Elektrike civile', en: 'Residential electrical', it: 'Elettrico civile', de: 'Elektro Wohnbau' },
  libFire: { sq: 'Mbrojtja nga zjarri', en: 'Fire protection', it: 'Antincendio', de: 'Brandschutz' },
  libIndustrial: { sq: 'Ndriçim industrial', en: 'Industrial lighting', it: 'Illuminazione industriale', de: 'Industriebeleuchtung' },
  libCctv: { sq: 'Kamera CCTV', en: 'CCTV cameras', it: 'Telecamere CCTV', de: 'Videoüberwachung' },
  libAp: { sq: 'Access Point / Rrjet', en: 'Access points / Network', it: 'Access point / Rete', de: 'Access Points / Netzwerk' },
  libAudio: { sq: 'Sistem audio', en: 'Audio system', it: 'Impianto audio', de: 'Audiosystem' },
  later: { sq: 'më vonë', en: 'later', it: 'in seguito', de: 'später' },
  searchSymbol: { sq: 'Kërko simbol ose kod', en: 'Search symbol or code', it: 'Cerca simbolo o codice', de: 'Symbol oder Code suchen' },
  noResults: { sq: 'Asnjë simbol nuk u gjet.', en: 'No symbols found.', it: 'Nessun simbolo trovato.', de: 'Keine Symbole gefunden.' },
  libraryHelp: { sq: 'Kliko një simbol, pastaj kliko në plan. Pranë murit ngjitet vetë. R e rrotullon.', en: 'Click a symbol, then click on the plan. Near a wall it attaches itself. R rotates it.', it: 'Clicca un simbolo, poi clicca sulla pianta. Vicino a un muro si aggancia da solo. R lo ruota.', de: 'Symbol anklicken, dann in den Plan klicken. An Wänden rastet es ein. R dreht es.' },
  layers: { sq: 'Shtresat', en: 'Layers', it: 'Livelli', de: 'Ebenen' },
  inPlan: { sq: 'Simbolet në plan', en: 'Symbols in the plan', it: 'Simboli nella pianta', de: 'Symbole im Plan' },
  noSymbols: { sq: 'Ende pa simbole. Zgjidh një nga libraria majtas.', en: 'No symbols yet. Pick one from the library on the left.', it: 'Ancora nessun simbolo. Scegline uno dalla libreria a sinistra.', de: 'Noch keine Symbole. Wähle eines links aus der Bibliothek.' },
  code: { sq: 'Kodi', en: 'Code', it: 'Codice', de: 'Code' },
  qty: { sq: 'Sasia', en: 'Qty', it: 'Q.tà', de: 'Menge' },
  shortcuts: { sq: 'Shkurtoret', en: 'Shortcuts', it: 'Scorciatoie', de: 'Tastenkürzel' },
  kWall: { sq: 'Vizato mur', en: 'Draw wall', it: 'Disegna muro', de: 'Wand zeichnen' },
  kSelect: { sq: 'Zgjidh', en: 'Select', it: 'Seleziona', de: 'Auswählen' },
  kTyped: { sq: 'Mur 4.30 m', en: '4.30 m wall', it: 'Muro di 4,30 m', de: 'Wand 4,30 m' },
  kTypedKey: { sq: 'Shkruaj 430 + Enter', en: 'Type 430 + Enter', it: 'Digita 430 + Invio', de: '430 + Enter tippen' },
  kRotate: { sq: 'Rrotullo simbolin, kthe derën', en: 'Rotate symbol, flip door', it: 'Ruota simbolo, gira porta', de: 'Symbol drehen, Tür wenden' },
  kShift: { sq: 'Vetëm horizontal / vertikal', en: 'Horizontal / vertical only', it: 'Solo orizzontale / verticale', de: 'Nur waagrecht / senkrecht' },
  kEsc: { sq: 'Mbaro / anulo', en: 'Finish / cancel', it: 'Termina / annulla', de: 'Beenden / abbrechen' },
  kEscKey: { sq: 'Esc / kliko djathtas', en: 'Esc / right-click', it: 'Esc / clic destro', de: 'Esc / Rechtsklick' },
  kWheel: { sq: 'Zmadho / zvogëlo', en: 'Zoom in / out', it: 'Zoom avanti / indietro', de: 'Vergrößern / verkleinern' },
  kWheelKey: { sq: 'Rrota e miut', en: 'Mouse wheel', it: 'Rotella del mouse', de: 'Mausrad' },
  kPan: { sq: 'Lëviz pamjen', en: 'Pan the view', it: 'Sposta la vista', de: 'Ansicht verschieben' },
  kPanKey: { sq: 'Hapësira + tërhiq', en: 'Space + drag', it: 'Spazio + trascina', de: 'Leertaste + ziehen' },
  kUndo: { sq: 'Zhbëj / ribëj', en: 'Undo / redo', it: 'Annulla / ripeti', de: 'Rückgängig / wiederholen' },
  kSave: { sq: 'Ruaj', en: 'Save', it: 'Salva', de: 'Speichern' },
  zoomIn: { sq: 'Zmadho', en: 'Zoom in', it: 'Ingrandisci', de: 'Vergrößern' },
  zoomOut: { sq: 'Zvogëlo', en: 'Zoom out', it: 'Riduci', de: 'Verkleinern' },
  canvasLabel: { sq: 'Fleta e vizatimit', en: 'Drawing sheet', it: 'Foglio di disegno', de: 'Zeichenblatt' },
  newTitle: { sq: 'Fillo projekt të ri?', en: 'Start a new project?', it: 'Iniziare un nuovo progetto?', de: 'Neues Projekt beginnen?' },
  newText: { sq: 'Plani aktual do mbyllet. Nëse do ta mbash, ruaje më parë.', en: 'The current plan will close. Save it first if you want to keep it.', it: 'La pianta attuale verrà chiusa. Salvala prima se vuoi tenerla.', de: 'Der aktuelle Plan wird geschlossen. Speichere ihn vorher, wenn du ihn behalten willst.' },
  projectName: { sq: 'Emri i projektit', en: 'Project name', it: 'Nome del progetto', de: 'Projektname' },
  cancel: { sq: 'Anulo', en: 'Cancel', it: 'Annulla', de: 'Abbrechen' },
  create: { sq: 'Krijo projektin', en: 'Create project', it: 'Crea progetto', de: 'Projekt erstellen' },
  openSample: { sq: 'Plani shembull', en: 'Sample plan', it: 'Pianta di esempio', de: 'Beispielplan' },
  newDefault: { sq: 'Projekt i ri', en: 'New project', it: 'Nuovo progetto', de: 'Neues Projekt' },
  panels: { sq: 'Panelet', en: 'Panels', it: 'Pannelli', de: 'Bereiche' },

  // dinamike
  walls: { sq: 'Mure', en: 'Walls', it: 'Muri', de: 'Wände' },
  wallLength: { sq: 'Gjatësia e mureve', en: 'Wall length', it: 'Lunghezza muri', de: 'Wandlänge' },
  symbolsCount: { sq: 'Simbole', en: 'Symbols', it: 'Simboli', de: 'Symbole' },
  pickHint: { sq: "Zgjidh një objekt për t'i parë dhe ndryshuar vetitë.", en: 'Select an object to see and change its properties.', it: 'Seleziona un oggetto per vederne e modificarne le proprietà.', de: 'Wähle ein Objekt, um seine Eigenschaften zu sehen und zu ändern.' },
  layer: { sq: 'Shtresa', en: 'Layer', it: 'Livello', de: 'Ebene' },
  lengthCm: { sq: 'Gjatësia (cm)', en: 'Length (cm)', it: 'Lunghezza (cm)', de: 'Länge (cm)' },
  thicknessShort: { sq: 'Trashësia', en: 'Thickness', it: 'Spessore', de: 'Stärke' },
  startX: { sq: 'Fillimi X (m)', en: 'Start X (m)', it: 'Inizio X (m)', de: 'Anfang X (m)' },
  startY: { sq: 'Fillimi Y (m)', en: 'Start Y (m)', it: 'Inizio Y (m)', de: 'Anfang Y (m)' },
  deleteWall: { sq: 'Fshi murin', en: 'Delete wall', it: 'Elimina muro', de: 'Wand löschen' },
  deleteSymbol: { sq: 'Fshi simbolin', en: 'Delete symbol', it: 'Elimina simbolo', de: 'Symbol löschen' },
  deleteN: { sq: 'Fshi {n} objektet', en: 'Delete {n} objects', it: 'Elimina {n} oggetti', de: '{n} Objekte löschen' },
  nSelected: { sq: '{n} objekte të zgjedhura', en: '{n} objects selected', it: '{n} oggetti selezionati', de: '{n} Objekte ausgewählt' },
  total: { sq: 'Gjithsej {v}', en: 'Total {v}', it: 'Totale {v}', de: 'Gesamt {v}' },
  thicknessAll: { sq: 'Trashësia e mureve', en: 'Wall thickness', it: 'Spessore dei muri', de: 'Wandstärke' },
  mixed: { sq: 'Të ndryshme', en: 'Mixed', it: 'Misto', de: 'Gemischt' },
  heightCm: { sq: 'Lartësia (cm)', en: 'Height (cm)', it: 'Altezza (cm)', de: 'Höhe (cm)' },
  powerW: { sq: 'Fuqia (W)', en: 'Power (W)', it: 'Potenza (W)', de: 'Leistung (W)' },
  rotation: { sq: 'Rrotullimi (°)', en: 'Rotation (°)', it: 'Rotazione (°)', de: 'Drehung (°)' },
  ceiling: { sq: 'Në tavan', en: 'On ceiling', it: 'A soffitto', de: 'An der Decke' },
  infoSelect: { sq: 'Kliko një objekt për ta zgjedhur, tërhiq për ta lëvizur. Tërhiq në bosh për të zgjedhur disa.', en: 'Click an object to select it, drag to move it. Drag on empty space to select several.', it: 'Clicca un oggetto per selezionarlo, trascina per spostarlo. Trascina nel vuoto per selezionarne diversi.', de: 'Objekt anklicken zum Auswählen, ziehen zum Verschieben. Im Leeren ziehen für Mehrfachauswahl.' },
  infoWall: { sq: 'Kliko për pikën e parë, pastaj për çdo cep. Esc ose kliko djathtas për të mbaruar.', en: 'Click the first point, then each corner. Esc or right-click to finish.', it: 'Clicca il primo punto, poi ogni angolo. Esc o clic destro per terminare.', de: 'Ersten Punkt klicken, dann jede Ecke. Esc oder Rechtsklick zum Beenden.' },
  infoPan: { sq: 'Tërhiq për të lëvizur pamjen. Rrota e miut zmadhon.', en: 'Drag to pan. The mouse wheel zooms.', it: 'Trascina per spostare. La rotella fa lo zoom.', de: 'Ziehen zum Verschieben. Mausrad zoomt.' },
  infoSymbol: { sq: 'Kliko në plan për të vendosur {name}. R e rrotullon, Esc mbaron.', en: 'Click on the plan to place {name}. R rotates, Esc finishes.', it: 'Clicca sulla pianta per posare {name}. R ruota, Esc termina.', de: 'In den Plan klicken, um {name} zu setzen. R dreht, Esc beendet.' },
  hintWallStart: { sq: 'Kliko për të filluar murin. Trashësia: {v} cm', en: 'Click to start the wall. Thickness: {v} cm', it: 'Clicca per iniziare il muro. Spessore: {v} cm', de: 'Klicken, um die Wand zu beginnen. Stärke: {v} cm' },
  hintWallNext: { sq: 'Shkruaj gjatësinë në cm (p.sh. <b>430</b>) dhe shtyp Enter, ose kliko pikën tjetër.', en: 'Type the length in cm (e.g. <b>430</b>) and press Enter, or click the next point.', it: 'Digita la lunghezza in cm (es. <b>430</b>) e premi Invio, o clicca il punto successivo.', de: 'Länge in cm tippen (z. B. <b>430</b>) und Enter drücken, oder nächsten Punkt klicken.' },
  hintWallTyped: { sq: 'Gjatësia: <b>{v} cm</b> · Enter për ta vendosur', en: 'Length: <b>{v} cm</b> · Enter to place', it: 'Lunghezza: <b>{v} cm</b> · Invio per posare', de: 'Länge: <b>{v} cm</b> · Enter zum Setzen' },
  hintSymbol: { sq: '<b>{code}</b> {name}', en: '<b>{code}</b> {name}', it: '<b>{code}</b> {name}', de: '<b>{code}</b> {name}' },
  snapEndpoint: { sq: 'Snap: fund muri', en: 'Snap: wall end', it: 'Snap: fine muro', de: 'Fang: Wandende' },
  snapMidpoint: { sq: 'Snap: mesi i murit', en: 'Snap: wall middle', it: 'Snap: metà muro', de: 'Fang: Wandmitte' },
  snapGrid: { sq: 'Snap: rrjeta', en: 'Snap: grid', it: 'Snap: griglia', de: 'Fang: Raster' },
  snapWall: { sq: 'Ngjitur te muri', en: 'Attached to wall', it: 'Agganciato al muro', de: 'An der Wand' },
  savedAuto: { sq: 'Ruajtur automatikisht në këtë shfletues', en: 'Saved automatically in this browser', it: 'Salvato automaticamente in questo browser', de: 'Automatisch in diesem Browser gespeichert' },
  savedFile: { sq: 'Ruajtur në skedar', en: 'Saved to file', it: 'Salvato su file', de: 'In Datei gespeichert' },
  toastSaved: { sq: 'Projekti u ruajt si skedar.', en: 'Project saved as a file.', it: 'Progetto salvato come file.', de: 'Projekt als Datei gespeichert.' },
  toastOpened: { sq: 'U hap: {v}', en: 'Opened: {v}', it: 'Aperto: {v}', de: 'Geöffnet: {v}' },
  toastNew: { sq: 'Projekti i ri është gati. Vizato muret.', en: 'The new project is ready. Draw the walls.', it: 'Il nuovo progetto è pronto. Disegna i muri.', de: 'Das neue Projekt ist bereit. Zeichne die Wände.' },
  hide: { sq: 'Fshih', en: 'Hide', it: 'Nascondi', de: 'Ausblenden' },
  show: { sq: 'Shfaq', en: 'Show', it: 'Mostra', de: 'Einblenden' },
  lock: { sq: 'Blloko', en: 'Lock', it: 'Blocca', de: 'Sperren' },
  unlock: { sq: 'Zhblloko', en: 'Unlock', it: 'Sblocca', de: 'Entsperren' },
  door: { sq: 'Derë', en: 'Door', it: 'Porta', de: 'Tür' },
  doorTitle: { sq: 'Vendos derë (D)', en: 'Place door (D)', it: 'Inserisci porta (D)', de: 'Tür einfügen (D)' },
  window: { sq: 'Dritare', en: 'Window', it: 'Finestra', de: 'Fenster' },
  windowTitle: { sq: 'Vendos dritare (N)', en: 'Place window (N)', it: 'Inserisci finestra (N)', de: 'Fenster einfügen (N)' },
  room: { sq: 'Dhomë', en: 'Room', it: 'Stanza', de: 'Raum' },
  roomTitle: { sq: 'Shto dhomë me m² (M)', en: 'Add room with m² (M)', it: 'Aggiungi stanza con m² (M)', de: 'Raum mit m² hinzufügen (M)' },
  openingWidth: { sq: 'Gjerësia', en: 'Width', it: 'Larghezza', de: 'Breite' },
  openingHeight: { sq: 'Lartësia', en: 'Height', it: 'Altezza', de: 'Höhe' },
  openingHeightCm: { sq: 'Lartësia (cm)', en: 'Height (cm)', it: 'Altezza (cm)', de: 'Höhe (cm)' },
  sillCm: { sq: 'Parapeti nga dyshemeja (cm)', en: 'Sill height (cm)', it: 'Altezza davanzale (cm)', de: 'Brüstungshöhe (cm)' },
  sizeRange: { sq: 'Masa duhet të jetë nga 30 deri në 600 cm.', en: 'The size must be between 30 and 600 cm.', it: 'La misura deve essere tra 30 e 600 cm.', de: 'Das Maß muss zwischen 30 und 600 cm liegen.' },
  infoDoor: { sq: 'Kliko mbi një mur për të vendosur derën. Kursori zgjedh anën e hapjes, R ndryshon menteshat.', en: 'Click on a wall to place the door. The cursor picks the swing side, R swaps the hinges.', it: 'Clicca su un muro per inserire la porta. Il cursore sceglie il verso di apertura, R cambia le cerniere.', de: 'Auf eine Wand klicken, um die Tür einzufügen. Der Cursor wählt die Aufschlagseite, R wechselt die Bänder.' },
  infoWindow: { sq: 'Kliko mbi një mur për të vendosur dritaren.', en: 'Click on a wall to place the window.', it: 'Clicca su un muro per inserire la finestra.', de: 'Auf eine Wand klicken, um das Fenster einzufügen.' },
  infoRoom: { sq: 'Kliko brenda një dhome të mbyllur me mure. Sipërfaqja llogaritet vetë.', en: 'Click inside a room closed by walls. The area is calculated automatically.', it: "Clicca dentro una stanza chiusa da muri. L'area viene calcolata da sola.", de: 'In einen von Wänden geschlossenen Raum klicken. Die Fläche wird automatisch berechnet.' },
  roomDefault: { sq: 'Dhoma {n}', en: 'Room {n}', it: 'Stanza {n}', de: 'Raum {n}' },
  roomName: { sq: 'Emri i dhomës', en: 'Room name', it: 'Nome stanza', de: 'Raumname' },
  area: { sq: 'Sipërfaqja', en: 'Area', it: 'Superficie', de: 'Fläche' },
  perimeter: { sq: 'Perimetri', en: 'Perimeter', it: 'Perimetro', de: 'Umfang' },
  roomOpen: { sq: 'Dhoma nuk është e mbyllur me mure', en: 'The room is not closed by walls', it: 'La stanza non è chiusa da muri', de: 'Der Raum ist nicht von Wänden geschlossen' },
  toastRoomNotClosed: { sq: 'Këtu nuk ka dhomë të mbyllur me mure.', en: 'There is no room closed by walls here.', it: 'Qui non c’è una stanza chiusa da muri.', de: 'Hier gibt es keinen von Wänden geschlossenen Raum.' },
  toastRoomExists: { sq: 'Kjo dhomë është shtuar tashmë.', en: 'This room has already been added.', it: 'Questa stanza è già stata aggiunta.', de: 'Dieser Raum wurde bereits hinzugefügt.' },
  toastNoWall: { sq: 'Kliko mbi një mur ose afër tij.', en: 'Click on or near a wall.', it: 'Clicca su un muro o vicino.', de: 'Auf oder nahe einer Wand klicken.' },
  flipSide: { sq: 'Kthe anën e hapjes', en: 'Flip swing side', it: 'Inverti verso di apertura', de: 'Aufschlagseite wechseln' },
  flipHinge: { sq: 'Ndrysho menteshat', en: 'Swap hinges', it: 'Inverti cerniere', de: 'Bänder wechseln' },
  fromWallStart: { sq: 'Nga fillimi i murit (cm)', en: 'From wall start (cm)', it: 'Da inizio muro (cm)', de: 'Ab Wandanfang (cm)' },
  widthCm: { sq: 'Gjerësia (cm)', en: 'Width (cm)', it: 'Larghezza (cm)', de: 'Breite (cm)' },
  rooms: { sq: 'Dhomat', en: 'Rooms', it: 'Stanze', de: 'Räume' },
  totalArea: { sq: 'Gjithsej', en: 'Total', it: 'Totale', de: 'Gesamt' },
  noRooms: { sq: 'Ende pa dhoma. Përdor veglën Dhomë dhe kliko brenda një dhome.', en: 'No rooms yet. Use the Room tool and click inside a room.', it: 'Ancora nessuna stanza. Usa lo strumento Stanza e clicca dentro.', de: 'Noch keine Räume. Werkzeug Raum wählen und hineinklicken.' },
  kDoor: { sq: 'Derë / dritare', en: 'Door / window', it: 'Porta / finestra', de: 'Tür / Fenster' },
  kRoom: { sq: 'Dhomë me m²', en: 'Room with m²', it: 'Stanza con m²', de: 'Raum mit m²' },
  layer_hapjet: { sq: 'Dyer dhe dritare', en: 'Doors and windows', it: 'Porte e finestre', de: 'Türen und Fenster' },
  layer_dhomat: { sq: 'Dhomat', en: 'Rooms', it: 'Stanze', de: 'Räume' },
  layer_muret: { sq: 'Muret', en: 'Walls', it: 'Muri', de: 'Wände' },
  layer_ndricimi: { sq: 'Ndriçimi', en: 'Lighting', it: 'Illuminazione', de: 'Beleuchtung' },
  layer_prizat: { sq: 'Prizat', en: 'Sockets', it: 'Prese', de: 'Steckdosen' },
  layer_pajisje: { sq: 'Kuadro dhe pajisje', en: 'Panels and appliances', it: 'Quadri e apparecchi', de: 'Verteiler und Geräte' },
  layer_kabllot: { sq: 'Kabllot', en: 'Cables', it: 'Cavi', de: 'Kabel' },
  layer_kuotat: { sq: 'Kuotat', en: 'Dimensions', it: 'Quote', de: 'Bemaßung' },
  layer_tekstet: { sq: 'Tekstet', en: 'Texts', it: 'Testi', de: 'Texte' },
} satisfies Dict;

export type StringKey = keyof typeof STRINGS;

let current: Lang = 'sq';

export function setLang(lang: Lang): void {
  current = lang;
}

export function getLang(): Lang {
  return current;
}

export function isLang(v: unknown): v is Lang {
  return LANGS.some((l) => l.id === v);
}

export function t(key: StringKey, vars: Record<string, string | number> = {}): string {
  const s = isCore(current) ? STRINGS[key][current] : (EXTRA[current].ui[key] ?? STRINGS[key].en);
  return s.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m));
}

/** Emri i shtresës në gjuhën aktuale (ose emri i ruajtur, për shtresat që nuk njihen). */
export function layerName(id: string, fallback: string): string {
  const key = `layer_${id}` as StringKey;
  return key in STRINGS ? t(key) : fallback;
}

/**
 * Përkthen elementet statike të faqes:
 * data-i18n -> tekst, data-i18n-title / -aria / -placeholder -> atributet.
 */
export function applyStatic(root: ParentNode): void {
  root.querySelectorAll<HTMLElement>('[data-i18n]').forEach((el) => {
    el.textContent = t(el.dataset.i18n as StringKey);
  });
  root.querySelectorAll<HTMLElement>('[data-i18n-title]').forEach((el) => {
    el.title = t(el.dataset.i18nTitle as StringKey);
  });
  root.querySelectorAll<HTMLElement>('[data-i18n-aria]').forEach((el) => {
    el.setAttribute('aria-label', t(el.dataset.i18nAria as StringKey));
  });
  root.querySelectorAll<HTMLInputElement>('[data-i18n-placeholder]').forEach((el) => {
    el.placeholder = t(el.dataset.i18nPlaceholder as StringKey);
  });
}
