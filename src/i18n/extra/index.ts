import type { StringKey } from '../strings';

/** Përkthimi i një gjuhe shtesë: ndërfaqja, emrat e simboleve (sipas id) dhe kategoritë. */
export interface ExtraLocale {
  ui: Record<StringKey, string>;
  symbols: Record<string, string>;
  categories: Record<string, string>;
}

import bg from './bg';
import cs from './cs';
import da from './da';
import el from './el';
import es from './es';
import et from './et';
import fi from './fi';
import fr from './fr';
import ga from './ga';
import hr from './hr';
import hu from './hu';
import lt from './lt';
import lv from './lv';
import mt from './mt';
import nl from './nl';
import pl from './pl';
import pt from './pt';
import ro from './ro';
import sk from './sk';
import sl from './sl';
import sv from './sv';
import bs from './bs';
import cnr from './cnr';
import mk from './mk';
import sr from './sr';
import tr from './tr';
import { cyrillicLocale } from './cyrillic';

/**
 * Gjuhët e tjera zyrtare të Bashkimit Europian (përveç anglishtes, italishtes dhe gjermanishtes)
 * dhe gjuhët e Ballkanit jashtë BE-së. Serbishtja me cirilicë del vetë nga ajo me latinisht.
 */
export const EXTRA = { bg, cs, da, el, es, et, fi, fr, ga, hr, hu, lt, lv, mt, nl, pl, pt, ro, sk, sl, sv, bs, cnr, mk, sr, 'sr-Cyrl': cyrillicLocale(sr), tr } satisfies Record<string, ExtraLocale>;

export type ExtraLang = keyof typeof EXTRA;
