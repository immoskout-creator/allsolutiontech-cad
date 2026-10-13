// Kartela e projektit (tabela e titullit sipas ISO 7200): kush e projektoi, kush e kontrolloi, kompania, klienti,
// adresa, nr. i vizatimit, rishikimi, data dhe ora. Ruhet me projektin (doc.info) dhe del në PDF.
import type { Store } from '../core/store';
import { TITLE_FIELDS, type TitleInfo } from '../core/types';
import { ex } from '../io/exportStrings';
import { parseInfo } from '../io/files';

type Field = (typeof TITLE_FIELDS)[number];

const LABEL: Record<Field, Parameters<typeof ex>[0]> = {
  company: 'company',
  drawnBy: 'drawnBy',
  checkedBy: 'checkedBy',
  client: 'client',
  address: 'address',
  drawingNo: 'drawingNo',
  revision: 'revision',
  date: 'dateTime',
};

const pad = (n: number) => String(n).padStart(2, '0');

/** Data dhe ora si "14.10.2026 09:30" (dita, muaji, viti, ora, minuta). */
export function nowStamp(d = new Date()): string {
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Emrat e fushave për tabelën e titullit të PDF-së, në gjuhën aktuale. */
export function titleLabels(): Record<Field | 'dateTime', string> {
  const out = { dateTime: ex('dateTime') } as Record<Field | 'dateTime', string>;
  for (const f of TITLE_FIELDS) out[f] = ex(LABEL[f]);
  return out;
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

/** Dritarja e kartelës: fushat, "Tani" për datën dhe orën, Anulo / Ruaj. */
export function openTitleInfo(store: Store, labels: { cancel: string; save: string }): void {
  document.getElementById('titleInfoModal')?.remove();
  const info: TitleInfo = store.doc.info ?? {};
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.id = 'titleInfoModal';
  const field = (f: Field) =>
    `<label class="field" for="ti_${f}"><span>${esc(ex(LABEL[f]))}</span>${
      f === 'date'
        ? `<span class="ti-date"><input id="ti_date" type="text" maxlength="120" value="${esc(info.date ?? '')}" placeholder="${esc(nowStamp())}"><button class="btn" type="button" id="tiNow">${esc(ex('now'))}</button></span>`
        : `<input id="ti_${f}" type="text" maxlength="120" value="${esc(info[f] ?? '')}">`
    }</label>`;
  modal.innerHTML = `<form class="modal-box ti-box" role="dialog" aria-modal="true" aria-labelledby="tiTitle">
    <h2 id="tiTitle">${esc(ex('titleBlock'))}</h2>
    <div class="ti-grid">${TITLE_FIELDS.map(field).join('')}</div>
    <p class="muted small">${esc(ex('titleBlockHint'))}</p>
    <div class="modal-actions"><button class="btn" type="button" id="tiCancel">${esc(labels.cancel)}</button>
    <button class="btn btn-primary" type="submit">${esc(labels.save)}</button></div></form>`;
  const close = () => modal.remove();
  modal.querySelector('#tiCancel')!.addEventListener('click', close);
  modal.querySelector('#tiNow')!.addEventListener('click', () => ((modal.querySelector('#ti_date') as HTMLInputElement).value = nowStamp()));
  modal.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      close();
    }
  });
  modal.querySelector('form')!.addEventListener('submit', (e) => {
    e.preventDefault();
    const raw: Record<string, string> = {};
    for (const f of TITLE_FIELDS) raw[f] = (modal.querySelector(`#ti_${f}`) as HTMLInputElement).value;
    const next = parseInfo(raw);
    store.commit((d) => {
      if (next) d.info = next;
      else delete d.info;
    });
    close();
  });
  document.body.appendChild(modal);
  (modal.querySelector('#ti_company') as HTMLInputElement).focus();
}
