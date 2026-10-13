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
  company: { sq: 'Kompania', en: 'Company', it: 'Azienda', de: 'Firma' },
  drawnBy: { sq: 'Projektoi', en: 'Drawn by', it: 'Disegnato da', de: 'Gezeichnet' },
  checkedBy: { sq: 'Kontrolloi / Miratoi', en: 'Checked / Approved', it: 'Controllato / Approvato', de: 'Geprüft / Freigegeben' },
  client: { sq: 'Klienti', en: 'Client', it: 'Committente', de: 'Auftraggeber' },
  address: { sq: 'Adresa e objektit', en: 'Site address', it: 'Indirizzo', de: 'Objektadresse' },
  drawingNo: { sq: 'Nr. i vizatimit', en: 'Drawing no.', it: 'N. disegno', de: 'Zeichnungsnr.' },
  revision: { sq: 'Rev.', en: 'Rev.', it: 'Rev.', de: 'Rev.' },
  dateTime: { sq: 'Data dhe ora', en: 'Date and time', it: 'Data e ora', de: 'Datum und Uhrzeit' },
  titleBlock: { sq: 'Kartela e projektit', en: 'Title block', it: 'Cartiglio', de: 'Schriftfeld' },
  titleBlockHint: { sq: 'Del në tabelën e titullit të PDF-së (sipas ISO 7200). Data bosh = data dhe ora kur ruhet PDF-ja.', en: 'Shown in the PDF title block (ISO 7200). Empty date = date and time when the PDF is saved.', it: 'Compare nel cartiglio del PDF (ISO 7200). Data vuota = data e ora del salvataggio.', de: 'Erscheint im Schriftfeld des PDF (ISO 7200). Leeres Datum = Datum und Uhrzeit beim Speichern.' },
  now: { sq: 'Tani', en: 'Now', it: 'Adesso', de: 'Jetzt' },
} as const;

export type ExportKey = keyof typeof STR;

export function ex(key: ExportKey): string {
  const lang = getLang();
  const row = STR[key] as Record<string, string>;
  return row[lang] ?? row.en;
}
