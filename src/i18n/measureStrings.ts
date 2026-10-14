import { getLang } from './strings';

/** Tekstet e masave, të shtresave me "sy" dhe të pamjeve; gjuhët e tjera marrin anglishten. */
const STR = {
  grp_walls: { sq: 'Muret dhe dyert', en: 'Walls and doors', it: 'Muri e porte', de: 'Wände und Türen' },
  grp_elements: { sq: 'Prizat, çelësat, elementet', en: 'Sockets, switches, devices', it: 'Prese, interruttori, dispositivi', de: 'Steckdosen, Schalter, Geräte' },
  grp_cables: { sq: 'Kabllot', en: 'Cables', it: 'Cavi', de: 'Kabel' },
  grp_dims: { sq: 'Masat (kuotat + h)', en: 'Dimensions (chains + h)', it: 'Quote (catene + h)', de: 'Maße (Ketten + h)' },
  grp_coverage: { sq: 'Zonat e mbulimit', en: 'Coverage zones', it: 'Zone di copertura', de: 'Abdeckungszonen' },
  grp_texts: { sq: 'Tekstet', en: 'Texts', it: 'Testi', de: 'Texte' },
  grp_grid: { sq: 'Rrjeta', en: 'Grid', it: 'Griglia', de: 'Raster' },
  views: { sq: 'Pamjet', en: 'Views', it: 'Viste', de: 'Ansichten' },
  view_all: { sq: 'Plani i plotë', en: 'Full plan', it: 'Pianta completa', de: 'Gesamtplan' },
  view_dims: { sq: 'Plani i masave', en: 'Dimension plan', it: 'Pianta quotata', de: 'Maßplan' },
  view_cables: { sq: 'Plani i kabllove', en: 'Cable plan', it: 'Pianta dei cavi', de: 'Kabelplan' },
  viewSave: { sq: 'Ruaj pamjen', en: 'Save view', it: 'Salva vista', de: 'Ansicht speichern' },
  viewName: { sq: 'Emri i pamjes (p.sh. Plani i prizave)', en: 'View name (e.g. Socket plan)', it: 'Nome della vista (es. Pianta prese)', de: 'Name der Ansicht (z. B. Steckdosenplan)' },
  viewDelete: { sq: 'Fshi pamjen {name}', en: 'Delete view {name}', it: 'Elimina vista {name}', de: 'Ansicht {name} löschen' },
  viewHint: { sq: 'Ajo që mbyllet me sy nuk del as në printim, as në PDF/DXF/SVG/PNG.', en: 'What is hidden with the eye is not printed or exported to PDF/DXF/SVG/PNG.', it: "Ciò che è nascosto con l'occhio non viene stampato né esportato in PDF/DXF/SVG/PNG.", de: 'Was mit dem Auge ausgeblendet ist, wird weder gedruckt noch als PDF/DXF/SVG/PNG exportiert.' },
  layerDetails: { sq: 'Shtresat një nga një', en: 'Individual layers', it: 'Livelli singoli', de: 'Einzelne Ebenen' },
  measures: { sq: 'Masat (cm)', en: 'Measurements (cm)', it: 'Misure (cm)', de: 'Maße (cm)' },
  mFloor: { sq: 'Lartësia nga toka', en: 'Height from floor', it: 'Altezza da terra', de: 'Höhe ab Boden' },
  mCeiling: { sq: 'Nga tavani', en: 'From ceiling', it: 'Dal soffitto', de: 'Ab Decke' },
  mLeft: { sq: 'Nga muri majtas', en: 'From left wall', it: 'Dal muro sinistro', de: 'Von Wand links' },
  mRight: { sq: 'Nga muri djathtas', en: 'From right wall', it: 'Dal muro destro', de: 'Von Wand rechts' },
  mTop: { sq: 'Nga muri lart', en: 'From top wall', it: 'Dal muro in alto', de: 'Von Wand oben' },
  mBottom: { sq: 'Nga muri poshtë', en: 'From bottom wall', it: 'Dal muro in basso', de: 'Von Wand unten' },
  mRoom: { sq: 'Lartësia e dhomës: {v} cm', en: 'Room height: {v} cm', it: 'Altezza del locale: {v} cm', de: 'Raumhöhe: {v} cm' },
  mHint: { sq: 'Shkruaj njërën masë: tjetra llogaritet dhe elementi lëviz vetë. Majtas/djathtas: parë nga dhoma drejt murit.', en: 'Type one value: the other is calculated and the element moves by itself. Left/right: seen from the room facing the wall.', it: "Scrivi una misura: l'altra si calcola e l'elemento si sposta da solo. Sinistra/destra: visto dalla stanza verso il muro.", de: 'Einen Wert eingeben: der andere wird berechnet und das Element verschiebt sich. Links/rechts: vom Raum aus zur Wand gesehen.' },
  mFreeHint: { sq: 'Element i lirë: largësitë nga muret e dhomës në plan (majtas/djathtas, lart/poshtë).', en: 'Free element: distances from the room walls in the plan (left/right, top/bottom).', it: 'Elemento libero: distanze dai muri della stanza in pianta (sinistra/destra, alto/basso).', de: 'Freies Element: Abstände zu den Raumwänden im Plan (links/rechts, oben/unten).' },
  mNoRoom: { sq: 'Masat nga muret dalin kur elementi është në një dhomë të mbyllur me mure.', en: 'Distances from walls appear when the element is inside a room closed by walls.', it: 'Le distanze dai muri compaiono quando l’elemento è in una stanza chiusa da muri.', de: 'Wandabstände erscheinen, wenn das Element in einem geschlossenen Raum liegt.' },
  pdfView: { sq: 'Pamja në PDF', en: 'View in PDF', it: 'Vista nel PDF', de: 'Ansicht im PDF' },
  pdfViewCurrent: { sq: 'Pamja aktuale (si në ekran)', en: 'Current view (as on screen)', it: 'Vista attuale (come a schermo)', de: 'Aktuelle Ansicht (wie am Bildschirm)' },
  pdfViewAll: { sq: 'Të gjitha pamjet: një PDF me shumë faqe', en: 'All views: one multi-page PDF', it: 'Tutte le viste: un PDF a più pagine', de: 'Alle Ansichten: ein mehrseitiges PDF' },
} as const;

export type MeasureKey = keyof typeof STR;

export function ms(key: MeasureKey, vars: Record<string, string | number> = {}): string {
  const e = STR[key] as Record<string, string>;
  const s = e[getLang()] ?? e.en;
  return s.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m));
}
