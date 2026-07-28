// Demo-quality translations (not professionally reviewed) — proving the
// "expandable localization system" pattern from docs/08-design-system.md.
// Adding a language means adding one entry here; no component changes.
export const LANGUAGES = ['en', 'af', 'zu'] as const;
export type Language = (typeof LANGUAGES)[number];

export const LANGUAGE_LABELS: Record<Language, string> = {
  en: 'English',
  af: 'Afrikaans',
  zu: 'isiZulu',
};

export const dictionaries: Record<Language, Record<string, string>> = {
  en: {
    'nav.stops': 'Nearby Stops',
    'nav.plan': 'Plan a Trip',
    'nav.routes': 'Routes',
    'nav.wallet': 'Wallet',
    'nav.safety': 'Safety',
    'auth.signIn': 'Sign in',
    'auth.signOut': 'Sign out',
    'auth.signUp': 'Sign up',
    'common.go': 'Go',
    'common.add': 'Add',
    'common.delete': 'Delete',
    'wallet.balance': 'Balance',
    'wallet.buyTicket': 'Buy a ticket',
    'safety.sos': 'SOS — Alert Dispatch',
    'plan.from': 'From…',
    'plan.to': 'To…',
  },
  af: {
    'nav.stops': 'Nabygeleë Haltes',
    'nav.plan': 'Beplan ’n Rit',
    'nav.routes': 'Roetes',
    'nav.wallet': 'Beursie',
    'nav.safety': 'Veiligheid',
    'auth.signIn': 'Meld aan',
    'auth.signOut': 'Meld af',
    'auth.signUp': 'Registreer',
    'common.go': 'Gaan',
    'common.add': 'Voeg by',
    'common.delete': 'Skrap',
    'wallet.balance': 'Balans',
    'wallet.buyTicket': 'Koop ’n kaartjie',
    'safety.sos': 'SOS — Waarsku Versending',
    'plan.from': 'Van…',
    'plan.to': 'Na…',
  },
  zu: {
    'nav.stops': 'Izitobhi Eziseduze',
    'nav.plan': 'Hlela Uhambo',
    'nav.routes': 'Imizila',
    'nav.wallet': 'Isikhwama',
    'nav.safety': 'Ukuphepha',
    'auth.signIn': 'Ngena',
    'auth.signOut': 'Phuma',
    'auth.signUp': 'Bhalisa',
    'common.go': 'Hamba',
    'common.add': 'Engeza',
    'common.delete': 'Susa',
    'wallet.balance': 'Ibhalansi',
    'wallet.buyTicket': 'Thenga ithikithi',
    'safety.sos': 'SOS — Xwayisa Umhlahlandlela',
    'plan.from': 'Kusuka…',
    'plan.to': 'Kuya…',
  },
};
