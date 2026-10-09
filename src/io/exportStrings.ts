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
} as const;

export type ExportKey = keyof typeof STR;

export function ex(key: ExportKey): string {
  const lang = getLang();
  const row = STR[key] as Record<string, string>;
  return row[lang] ?? row.en;
}
