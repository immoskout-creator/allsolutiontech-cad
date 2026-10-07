import type { Doc, Entity } from './types';

const HISTORY_LIMIT = 200;

/**
 * Mban dokumentin, përzgjedhjen dhe historinë (zhbëj/ribëj).
 * Çdo ndryshim i dokumentit kalon nga commit(), që të mund të zhbëhet.
 */
export class Store {
  doc: Doc;
  selection = new Set<string>();
  private past: string[] = [];
  private future: string[] = [];
  private listeners = new Set<() => void>();

  constructor(doc: Doc) {
    this.doc = doc;
  }

  subscribe(fn: () => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  emit(): void {
    for (const fn of this.listeners) fn();
  }

  commit(mutate: (doc: Doc) => void): void {
    const before = JSON.stringify(this.doc);
    mutate(this.doc);
    if (JSON.stringify(this.doc) === before) return;
    this.past.push(before);
    if (this.past.length > HISTORY_LIMIT) this.past.shift();
    this.future = [];
    this.pruneSelection();
    this.emit();
  }

  get canUndo(): boolean {
    return this.past.length > 0;
  }

  get canRedo(): boolean {
    return this.future.length > 0;
  }

  undo(): void {
    const prev = this.past.pop();
    if (prev === undefined) return;
    this.future.push(JSON.stringify(this.doc));
    this.doc = JSON.parse(prev) as Doc;
    this.pruneSelection();
    this.emit();
  }

  redo(): void {
    const next = this.future.pop();
    if (next === undefined) return;
    this.past.push(JSON.stringify(this.doc));
    this.doc = JSON.parse(next) as Doc;
    this.pruneSelection();
    this.emit();
  }

  /** Zëvendëson gjithë dokumentin (p.sh. kur hapet një skedar) dhe pastron historinë. */
  replace(doc: Doc): void {
    this.doc = doc;
    this.past = [];
    this.future = [];
    this.selection.clear();
    this.emit();
  }

  setSelection(ids: Iterable<string>): void {
    this.selection = new Set(ids);
    this.emit();
  }

  selected(): Entity[] {
    return this.doc.entities.filter((e) => this.selection.has(e.id));
  }

  layer(id: string) {
    return this.doc.layers.find((l) => l.id === id);
  }

  /** Entitetet që shihen dhe mund të zgjidhen (shtresa e dukshme dhe e pabllokuar). */
  editable(): Entity[] {
    return this.doc.entities.filter((e) => {
      const l = this.layer(e.layer);
      return !l || (l.visible && !l.locked);
    });
  }

  private pruneSelection(): void {
    const ids = new Set(this.doc.entities.map((e) => e.id));
    for (const id of [...this.selection]) if (!ids.has(id)) this.selection.delete(id);
  }
}
