import { getLang } from '../i18n/strings';

/** Tekstet e provës falas; gjuhët e tjera marrin anglishten (si te përditësimi në Android). */
const TEXT = {
  sq: {
    try: 'Provo 7 ditë falas',
    enterCode: 'Fut kodin e aktivizimit',
    choose: 'Provo programin 7 ditë falas, ose fut kodin e aktivizimit nga All Solution Tech.',
    bar: 'Prova falas: {n} ditë të mbetura',
    barLast: 'Prova falas: dita e fundit',
    activate: 'Aktivizo',
    over: 'Prova falas mbaroi. Fut kodin e aktivizimit nga All Solution Tech.',
    starting: 'Po nis provën…',
    started: 'Prova falas filloi: 7 ditë.',
    offline: 'Prova falas kërkon internet herën e parë. Lidhu me internetin dhe provo sërish.',
    busy: 'Shumë kërkesa. Provo sërish pas pak minutash.',
    failed: 'Prova nuk u nis. Provo sërish ose fut kodin e aktivizimit.',
  },
  en: {
    try: 'Try free for 7 days',
    enterCode: 'Enter activation code',
    choose: 'Try the program free for 7 days, or enter the activation code from All Solution Tech.',
    bar: 'Free trial: {n} days left',
    barLast: 'Free trial: last day',
    activate: 'Activate',
    over: 'The free trial has ended. Enter the activation code from All Solution Tech.',
    starting: 'Starting the trial…',
    started: 'Free trial started: 7 days.',
    offline: 'Starting the free trial needs the internet. Connect and try again.',
    busy: 'Too many requests. Try again in a few minutes.',
    failed: 'The trial could not be started. Try again or enter the activation code.',
  },
  it: {
    try: 'Prova gratis per 7 giorni',
    enterCode: 'Inserisci il codice di attivazione',
    choose: 'Prova il programma gratis per 7 giorni, oppure inserisci il codice di attivazione di All Solution Tech.',
    bar: 'Prova gratuita: {n} giorni rimasti',
    barLast: 'Prova gratuita: ultimo giorno',
    activate: 'Attiva',
    over: 'La prova gratuita è finita. Inserisci il codice di attivazione di All Solution Tech.',
    starting: 'Avvio della prova…',
    started: 'Prova gratuita avviata: 7 giorni.',
    offline: "Per avviare la prova gratuita serve internet. Collegati e riprova.",
    busy: 'Troppe richieste. Riprova tra qualche minuto.',
    failed: 'Impossibile avviare la prova. Riprova o inserisci il codice di attivazione.',
  },
  de: {
    try: '7 Tage kostenlos testen',
    enterCode: 'Aktivierungscode eingeben',
    choose: 'Teste das Programm 7 Tage kostenlos oder gib den Aktivierungscode von All Solution Tech ein.',
    bar: 'Kostenloser Test: noch {n} Tage',
    barLast: 'Kostenloser Test: letzter Tag',
    activate: 'Aktivieren',
    over: 'Der kostenlose Test ist abgelaufen. Gib den Aktivierungscode von All Solution Tech ein.',
    starting: 'Test wird gestartet…',
    started: 'Kostenloser Test gestartet: 7 Tage.',
    offline: 'Zum Starten des Tests wird Internet benötigt. Verbinde dich und versuche es erneut.',
    busy: 'Zu viele Anfragen. Versuche es in ein paar Minuten erneut.',
    failed: 'Der Test konnte nicht gestartet werden. Versuche es erneut oder gib den Aktivierungscode ein.',
  },
};

export type TrialKey = keyof (typeof TEXT)['sq'];

export function tr(key: TrialKey, vars: Record<string, string | number> = {}): string {
  const s = (TEXT[getLang() as keyof typeof TEXT] ?? TEXT.en)[key];
  return s.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m));
}
