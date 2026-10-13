import { getLang } from '../i18n/strings';

/** Tekstet e eksportit (PDF, DXF); gjuhët e tjera marrin anglishten. */
const STR = {
  pdfTitle: { sq: 'Ruaj planin si PDF për printim', en: 'Save the plan as PDF for printing', it: 'Salva la pianta in PDF per la stampa', de: 'Plan als PDF zum Drucken speichern' },
  dxfTitle: { sq: 'Ruaj planin si DXF (AutoCAD, ActCAD)', en: 'Save the plan as DXF (AutoCAD, ActCAD)', it: 'Salva la pianta in DXF (AutoCAD, ActCAD)', de: 'Plan als DXF speichern (AutoCAD, ActCAD)' },
  pdfSaved: { sq: 'PDF u ruajt.', en: 'PDF saved.', it: 'PDF salvato.', de: 'PDF gespeichert.' },
  dxfSaved: { sq: 'DXF u ruajt.', en: 'DXF saved.', it: 'DXF salvato.', de: 'DXF gespeichert.' },
  empty: { sq: 'Plani është bosh: vizato diçka para se ta ruash.', en: 'The plan is empty: draw something before saving it.', it: 'La pianta è vuota: disegna qualcosa prima di salvarla.', de: 'Der Plan ist leer: zuerst etwas zeichnen.' },
  project: { sq: 'Projekti', en: 'Project', it: 'Progetto', de: 'Projekt' },
  scale: { sq: 'Shkalla', en: 'Scale', it: 'Scala', de: 'Maßstab' },
  date: { sq: 'Data', en: 'Date', it: 'Data', de: 'Datum' },
  sheet: { sq: 'Fleta', en: 'Sheet', it: 'Foglio', de: 'Blatt' },
  nr: { sq: 'Nr', en: 'No.', it: 'N.', de: 'Nr.' },
  itemName: { sq: 'Emërtimi', en: 'Name', it: 'Denominazione', de: 'Bezeichnung' },
  pageOf: { sq: 'Faqe {n} / {total}', en: 'Page {n} / {total}', it: 'Pagina {n} / {total}', de: 'Seite {n} / {total}' },
  titleBlock: { sq: 'Kutia e titullit', en: 'Title block', it: 'Cartiglio', de: 'Schriftfeld' },
  tbFirm: { sq: 'Firma', en: 'Company', it: 'Azienda', de: 'Firma' },
  firmName: { sq: 'Emri i firmës', en: 'Company name', it: "Nome dell'azienda", de: 'Firmenname' },
  firmAddress: { sq: 'Adresa', en: 'Address', it: 'Indirizzo', de: 'Adresse' },
  firmContact: { sq: 'Telefoni / email', en: 'Phone / email', it: 'Telefono / email', de: 'Telefon / E-Mail' },
  firmLogo: { sq: 'Logoja (PNG/JPG)', en: 'Logo (PNG/JPG)', it: 'Logo (PNG/JPG)', de: 'Logo (PNG/JPG)' },
  tbDesigner: { sq: 'Projektuesi', en: 'Designer', it: 'Progettista', de: 'Planer' },
  designerName: { sq: 'Emri dhe mbiemri', en: 'Full name', it: 'Nome e cognome', de: 'Vor- und Nachname' },
  designerTitle: { sq: 'Titulli / nr. i licencës', en: 'Title / licence no.', it: 'Titolo / n. iscrizione', de: 'Titel / Lizenznr.' },
  signature: { sq: 'Firma (nënshkrimi)', en: 'Signature', it: 'Firma', de: 'Unterschrift' },
  sigHint: { sq: 'Vizato me gisht ose me mi në kutinë e bardhë, ose ngarko një PNG.', en: 'Draw with your finger or mouse in the white box, or upload a PNG.', it: 'Disegna con il dito o il mouse nel riquadro bianco, oppure carica un PNG.', de: 'Mit Finger oder Maus im weißen Feld zeichnen oder ein PNG hochladen.' },
  upload: { sq: 'Ngarko', en: 'Upload', it: 'Carica', de: 'Hochladen' },
  clear: { sq: 'Fshi', en: 'Clear', it: 'Cancella', de: 'Löschen' },
  tbObject: { sq: 'Objekti', en: 'Building', it: 'Opera', de: 'Objekt' },
  objectName: { sq: 'Emri i objektit / projektit', en: 'Building / project name', it: "Nome dell'opera / progetto", de: 'Objekt- / Projektname' },
  address: { sq: 'Adresa e objektit', en: 'Site address', it: "Indirizzo dell'opera", de: 'Objektadresse' },
  client: { sq: 'Investitori / klienti', en: 'Client', it: 'Committente', de: 'Bauherr / Auftraggeber' },
  tbDrawing: { sq: 'Vizatimi', en: 'Drawing', it: 'Disegno', de: 'Zeichnung' },
  sheetName: { sq: 'Emri i fletës', en: 'Sheet title', it: 'Titolo della tavola', de: 'Blatttitel' },
  sheetHint: { sq: 'p.sh. Plani i instalimeve elektrike – Kati 1', en: 'e.g. Electrical installation plan – Floor 1', it: 'es. Pianta impianto elettrico – Piano 1', de: 'z. B. Elektroinstallationsplan – EG' },
  drawingNo: { sq: 'Nr. i vizatimit', en: 'Drawing no.', it: 'N. disegno', de: 'Zeichnungsnr.' },
  revision: { sq: 'Revizioni', en: 'Revision', it: 'Revisione', de: 'Revision' },
  checkedBy: { sq: 'Kontrolloi / miratoi', en: 'Checked / approved', it: 'Controllato / approvato', de: 'Geprüft / freigegeben' },
  optional: { sq: 'opsionale', en: 'optional', it: 'facoltativo', de: 'optional' },
  now: { sq: 'Tani', en: 'Now', it: 'Adesso', de: 'Jetzt' },
  tbHint: { sq: 'Firma dhe projektuesi ruhen në program dhe dalin vetë në çdo projekt të ri; objekti dhe vizatimi ruhen me projektin. Fushat bosh nuk dalin në PDF; shkalla dhe faqja X / N plotësohen vetë.', en: 'Company and designer are kept in the program and filled into every new project; building and drawing are saved with the project. Empty fields are left out of the PDF; scale and page X / N are filled in automatically.', it: "Azienda e progettista restano nel programma e compaiono in ogni nuovo progetto; opera e disegno si salvano con il progetto. I campi vuoti non compaiono nel PDF; scala e pagina X / N sono automatiche.", de: 'Firma und Planer bleiben im Programm und erscheinen in jedem neuen Projekt; Objekt und Zeichnung werden mit dem Projekt gespeichert. Leere Felder erscheinen nicht im PDF; Maßstab und Seite X / N werden automatisch ergänzt.' },
  savePdf: { sq: 'Ruaj PDF', en: 'Save PDF', it: 'Salva PDF', de: 'PDF speichern' },
  legendMore: { sq: 'vazhdim', en: 'continued', it: 'continua', de: 'Fortsetzung' },
} as const;

export type ExportKey = keyof typeof STR;

export function ex(key: ExportKey): string {
  const lang = getLang();
  const row = STR[key] as Record<string, string>;
  return row[lang] ?? row.en;
}
