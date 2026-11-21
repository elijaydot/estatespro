/**
 * Rwanda & East Africa Internationalization (i18n) Engine
 * Designed for FishGate Property OS with priority on Rwanda (RRA compliance, UPI, Kigali sectors)
 * and the broader East African Community (EAC).
 */

export type SupportedLanguage = 'en' | 'rw' | 'fr' | 'sw';

export interface LanguageOption {
  code: SupportedLanguage;
  name: string;
  nativeName: string;
  flag: string;
  region: string;
}

export const SUPPORTED_LANGUAGES: LanguageOption[] = [
  {
    code: 'rw',
    name: 'Kinyarwanda',
    nativeName: 'Ikinyarwanda',
    flag: '🇷🇼',
    region: 'Rwanda (National)',
  },
  {
    code: 'en',
    name: 'English',
    nativeName: 'English',
    flag: '🇬🇧',
    region: 'Global / EAC',
  },
  {
    code: 'fr',
    name: 'French',
    nativeName: 'Français',
    flag: '🇫🇷',
    region: 'Rwanda / Francophone',
  },
  {
    code: 'sw',
    name: 'Swahili',
    nativeName: 'Kiswahili',
    flag: '🇹🇿',
    region: 'East African Community',
  },
];

export type TranslationKey = keyof typeof translations.en;

export const translations = {
  // English (Default International)
  en: {
    // Auth & Shell
    welcome_back: 'Welcome back',
    sign_in_subtitle: 'Enter your credentials to access your Property OS account',
    email_label: 'Email Address',
    password_label: 'Password',
    forgot_password: 'Forgot password?',
    sign_in_button: 'Sign In',
    signing_in: 'Signing in...',
    tenant_portal: 'Tenant Portal',
    secure_tenant_access: 'Secure Tenant Access',
    staff_login: 'Staff & Manager Portal',
    need_account: "Don't have an account?",
    register_here: 'Register here',
    
    // Rwanda Specific Compliance & Identity
    republic_of_rwanda: 'Republic of Rwanda',
    rra_compliance: 'Rwanda Revenue Authority (RRA) Tax Compliance',
    rra_lease_filing: '15-Day Statutory Lease Registration',
    upi_label: 'Unique Parcel Identifier (UPI)',
    kigali_localities: 'Gasabo · Kicukiro · Nyarugenge',
    ebm_receipt: 'Electronic Billing Machine (EBM) Verified',
    currency_rwf: 'Rwandan Franc (RWF)',
    
    // Main Navigation
    dashboard: 'Dashboard',
    crm: 'CRM Sales',
    leads: 'Pipeline Leads',
    visits: 'Property Visits',
    deals: 'Deals & Opportunities',
    properties: 'Properties & Estates',
    units: 'Unit Inventory',
    leases: 'Lease Agreements',
    tenants: 'Tenants Directory',
    invoices: 'Billing & Invoices',
    payments: 'Payment Ledger',
    maintenance: 'Maintenance Orders',
    reports: 'Executive Reports',
    owner_portal: 'Landlord / Owner Portal',
    settings: 'System Settings',
    quick_add: 'Quick Add',

    // Action verbs
    book_unit: 'Book Unit (Atomic)',
    schedule_visit: 'Schedule Site Tour',
    draft_lease: 'Draft Lease Contract',
    sign_lease: 'Sign Agreement',
    make_payment: 'Pay via Mobile Money / Card',
    auto_route: 'Auto-Route Lead',
    
    // Statuses
    status_vacant: 'Vacant',
    status_occupied: 'Occupied',
    status_reserved: 'Reserved',
    status_sold: 'Sold / Booked',
    status_pending: 'Pending',
    status_paid: 'Paid',
    status_overdue: 'Overdue',
    
    // Tenant Onboarding Checklist
    welcome_tenant: 'Welcome to your new home',
    checklist_title: 'Tenant Move-In Checklist',
    step1_title: '1. Review & Sign Digital Lease',
    step1_desc: 'Execute your verified tenancy contract electronically with statutory RRA filing protections.',
    step2_title: '2. Pay Security Deposit & Rent',
    step2_desc: 'Complete payment with instant receipting via MTN Mobile Money, Airtel Money, or Bank Transfer.',
    step3_title: '3. Complete Move-In Inspection',
    step3_desc: 'Document the physical condition of fixtures to protect your security deposit upon exit.',
    
    // Language Toggle
    change_language: 'Language',

    // KYB Business Verification (Rwanda)
    business_verification: 'RDB Business Verification',
    tin_label: 'RRA TIN / RDB Company Code (9 digits)',
    national_id_label: 'Rwandan National ID (NIDA - 16 digits)',
    verify_company_button: 'Verify with RDB Registry',
    ncsa_consent_label: 'I consent to identity and business verification under Rwandan Law Nº 058/2021 relating to data protection (NCSA).',
    rdb_certificate_label: 'RDB Certificate of Domestic Company Registration',
    legal_structure_label: 'Corporate Legal Structure',
    rwareb_license_label: 'RWAREB Professional License Number',
  },

  // Ikinyarwanda (National Language of Rwanda)
  rw: {
    // Auth & Shell
    welcome_back: 'Murakaza neza',
    sign_in_subtitle: 'Injiza imyirondoro yawe kugira ngo ukoreshe porogaramu ya FishGate',
    email_label: 'Imeli',
    password_label: 'Ijambobanga',
    forgot_password: 'Wibagiwe ijambobanga?',
    sign_in_button: 'Injira',
    signing_in: 'Kwinjira...',
    tenant_portal: 'Urubuga rw’Abakodesha',
    secure_tenant_access: 'Urubuga rw’Umukodesha rutekanye',
    staff_login: 'Abakozi n’Abayobozi',
    need_account: 'Nta konti ufite?',
    register_here: 'Iyandikishe hano',

    // Rwanda Specific Compliance & Identity
    republic_of_rwanda: 'Repubulika y’u Rwanda',
    rra_compliance: 'Ibyerekeye Umusoro ku Bukode (RRA)',
    rra_lease_filing: 'Kumenyekanisha amasezerano mu minsi 15 (RRA)',
    upi_label: 'Nimero y’ikibanza (UPI)',
    kigali_localities: 'Gasabo · Kicukiro · Nyarugenge',
    ebm_receipt: 'Inyemezabwishyu ya EBM yemewe',
    currency_rwf: 'Amafaranga y’u Rwanda (RWF)',

    // Main Navigation
    dashboard: 'Imbonerahamwe',
    crm: 'Ubucuruzi (CRM)',
    leads: 'Abakiriya b’agateganyo',
    visits: 'Gusura amazu',
    deals: 'Amasezerano n’Amahirwe',
    properties: 'Amazu n’Imitungo',
    units: 'Ibyumba n’Inzu zihari',
    leases: 'Amasezerano y’Ubukode',
    tenants: 'Urutonde rw’Abakodesha',
    invoices: 'Inyemezabwishyu',
    payments: 'Kwishyura no Kwakira',
    maintenance: 'Gusana no Kubungabunga',
    reports: 'Raporo z’Ibikorwa',
    owner_portal: 'Urubuga rwa Nyir’inzu',
    settings: 'Igenamiterere',
    quick_add: 'Kongeramo vuba',

    // Action verbs
    book_unit: 'Fata icyumba ubu',
    schedule_visit: 'Teganya gusura inzu',
    draft_lease: 'Kora amasezerano mashya',
    sign_lease: 'Sinya amasezerano',
    make_payment: 'Kwishyura kuri MoMo / Banki',
    auto_route: 'Guhereza umukozi mu buryo bwikora',

    // Statuses
    status_vacant: 'Iracyarimo ubusa',
    status_occupied: 'Irimo umukodesha',
    status_reserved: 'Yafashwe',
    status_sold: 'Yaguzwe / Yafashwe burundu',
    status_pending: 'Bitegereje',
    status_paid: 'Byishyuwe',
    status_overdue: 'Byarengeje igihe',

    // Tenant Onboarding Checklist
    welcome_tenant: 'Murakaza neza mu nzu yanyu nshya',
    checklist_title: 'Intambwe zo kwinjira mu nzu',
    step1_title: '1. Gusuzuma no gusinya amasezerano',
    step1_desc: 'Sinya amasezerano y’ubukode mu buryo bw’ikoranabuhanga yubahirije amategeko ya RRA.',
    step2_title: '2. Kwishyura ingwate n’ukwezi kwa mbere',
    step2_desc: 'Kora ubwishyu ukoresheje MTN MoMo, Airtel Money, cyangwa banki uhabwe inyemezabwishyu ako kanya.',
    step3_title: '3. Kugenzura ibikoresho byo mu nzu',
    step3_desc: 'Fata amafoto y’uko inzu imeze kugira ngo ingwate yawe izakugarukire igihe uzimukira.',

    // Language Toggle
    change_language: 'Ururimi',

    // KYB Business Verification (Rwanda)
    business_verification: 'Isuzuma ry’Ubucuruzi muri RDB',
    tin_label: 'Nimero y’Umusoro (TIN / RDB Code - imibare 9)',
    national_id_label: 'Indangamuntu y’u Rwanda (NIDA - imibare 16)',
    verify_company_button: 'Suma muri RDB Registry',
    ncsa_consent_label: 'Nemeye ko imyirondoro n’amakuru byanjye bikoreshwa hakurikijwe Itegeko Nº 058/2021 rigenga kurinda amakuru bwite (NCSA).',
    rdb_certificate_label: 'Kopi ya Icyemezo cy’Ubucuruzi cya RDB',
    legal_structure_label: 'Ubwoko bw’Ikigo cy’Ubucuruzi',
    rwareb_license_label: 'Nimero y’Uruhushya rwa RWAREB',
  },

  // Français (Official Language in Rwanda)
  fr: {
    // Auth & Shell
    welcome_back: 'Bienvenue',
    sign_in_subtitle: 'Entrez vos identifiants pour accéder à votre compte FishGate',
    email_label: 'Adresse e-mail',
    password_label: 'Mot de passe',
    forgot_password: 'Mot de passe oublié ?',
    sign_in_button: 'Se connecter',
    signing_in: 'Connexion...',
    tenant_portal: 'Portail Locataire',
    secure_tenant_access: 'Accès Locataire Sécurisé',
    staff_login: 'Portail Gestion & Équipe',
    need_account: 'Pas encore de compte ?',
    register_here: 'Inscrivez-vous ici',

    // Rwanda Specific Compliance & Identity
    republic_of_rwanda: 'République du Rwanda',
    rra_compliance: 'Conformité Fiscale RRA (Rwanda Revenue Authority)',
    rra_lease_filing: 'Enregistrement Légal du Bail sous 15 Jours',
    upi_label: 'Identifiant Unique de Parcelle (UPI)',
    kigali_localities: 'Gasabo · Kicukiro · Nyarugenge',
    ebm_receipt: 'Reçu Vérifié Machine de Facturation Électronique (EBM)',
    currency_rwf: 'Franc Rwandais (RWF)',

    // Main Navigation
    dashboard: 'Tableau de bord',
    crm: 'CRM Ventes',
    leads: 'Piste de Prospects',
    visits: 'Visites de Propriétés',
    deals: 'Opportunités Commerciales',
    properties: 'Biens Immobiliers',
    units: 'Unités & Logements',
    leases: 'Baux de Location',
    tenants: 'Répertoire des Locataires',
    invoices: 'Facturation & Factures',
    payments: 'Règlement des Paiements',
    maintenance: 'Ordres de Maintenance',
    reports: 'Rapports de Gestion',
    owner_portal: 'Portail Propriétaire / Bailleur',
    settings: 'Paramètres du Système',
    quick_add: 'Ajout Rapide',

    // Action verbs
    book_unit: 'Réserver le Logement (Atomique)',
    schedule_visit: 'Programmer une Visite',
    draft_lease: 'Rédiger le Contrat de Bail',
    sign_lease: 'Signer l’Accord',
    make_payment: 'Payer par Mobile Money / Carte',
    auto_route: 'Attribution Automatique',

    // Statuses
    status_vacant: 'Vacant',
    status_occupied: 'Occupé',
    status_reserved: 'Réservé',
    status_sold: 'Vendu / Réservé',
    status_pending: 'En attente',
    status_paid: 'Payé',
    status_overdue: 'En retard',

    // Tenant Onboarding Checklist
    welcome_tenant: 'Bienvenue dans votre nouveau logement',
    checklist_title: 'Guide d’Emménagement du Locataire',
    step1_title: '1. Examiner et Signer le Bail Électronique',
    step1_desc: 'Signez votre contrat sécurisé et protégé par les normes d’enregistrement de la RRA.',
    step2_title: '2. Payer le Dépôt de Garantie et le Premier Loyer',
    step2_desc: 'Payez via MTN Mobile Money, Airtel Money ou virement bancaire avec reçu instantané.',
    step3_title: '3. Effectuer l’État des Lieux Initial',
    step3_desc: 'Prenez des photos de l’état de l’unité pour protéger votre caution lors de votre sortie.',

    // Language Toggle
    change_language: 'Langue',

    // KYB Business Verification (Rwanda)
    business_verification: 'Vérification d’Entreprise RDB',
    tin_label: 'Numéro Fiscal RRA / Code RDB (9 chiffres)',
    national_id_label: 'Carte Nationale d’Identité (NIDA - 16 chiffres)',
    verify_company_button: 'Vérifier auprès du Registre RDB',
    ncsa_consent_label: 'Je consens au traitement des données conformément à la loi Nº 058/2021 sur la protection des données (NCSA).',
    rdb_certificate_label: 'Certificat d’Enregistrement RDB',
    legal_structure_label: 'Structure Juridique de l’Entreprise',
    rwareb_license_label: 'Numéro de Licence Professionnelle RWAREB',
  },

  // Kiswahili (East African Community Official Language)
  sw: {
    // Auth & Shell
    welcome_back: 'Karibu tena',
    sign_in_subtitle: 'Weka taarifa zako ili kuingia kwenye akaunti yako ya FishGate',
    email_label: 'Barua Pepe',
    password_label: 'Nenosiri',
    forgot_password: 'Umesahau nenosiri?',
    sign_in_button: 'Ingia',
    signing_in: 'Inaingia...',
    tenant_portal: 'Tovuti ya Wapangaji',
    secure_tenant_access: 'Ufikiaji Salama wa Mpangaji',
    staff_login: 'Tovuti ya Wafanyakazi na Wasimamizi',
    need_account: 'Huna akaunti?',
    register_here: 'Jisajili hapa',

    // Rwanda Specific Compliance & Identity
    republic_of_rwanda: 'Jamhuri ya Rwanda',
    rra_compliance: 'Uzingatiaji wa Kodi wa RRA (Rwanda Revenue Authority)',
    rra_lease_filing: 'Usajili wa Mkataba wa Kodi wa Siku 15',
    upi_label: 'Nambari ya Kipekee ya Kiwanja (UPI)',
    kigali_localities: 'Gasabo · Kicukiro · Nyarugenge',
    ebm_receipt: 'Stakabadhi Iliyothibitishwa ya EBM',
    currency_rwf: 'Faranga ya Rwanda (RWF)',

    // Main Navigation
    dashboard: 'Dashibodi',
    crm: 'Mauzo ya CRM',
    leads: 'Wateja Wanaotarajiwa',
    visits: 'Ziara za Majengo',
    deals: 'Mikataba na Fursa',
    properties: 'Majengo na Mali',
    units: 'Vyumba na Nyumba',
    leases: 'Mikataba ya Kupangisha',
    tenants: 'Orodha ya Wapangaji',
    invoices: 'Ankara na Malipo',
    payments: 'Daftari la Malipo',
    maintenance: 'Matengenezo ya Nyumba',
    reports: 'Ripoti za Utendaji',
    owner_portal: 'Tovuti ya Wamiliki / Wenye Nyumba',
    settings: 'Mipangilio ya Mfumo',
    quick_add: 'Ongeza Haraka',

    // Action verbs
    book_unit: 'Weka Nafasi ya Chumba',
    schedule_visit: 'Panga Ziara ya Kukagua',
    draft_lease: 'Andaa Mkataba wa Kodi',
    sign_lease: 'Weka Sahihi Mkataba',
    make_payment: 'Lipa kwa Pesa ya Simu / Benki',
    auto_route: 'Panga Mteja Kiotomatiki',

    // Statuses
    status_vacant: 'Wazi',
    status_occupied: 'Imepangishwa',
    status_reserved: 'Imetengwa',
    status_sold: 'Imechukuliwa Kamili',
    status_pending: 'Inasubiri',
    status_paid: 'Imelipwa',
    status_overdue: 'Imechelewa',

    // Tenant Onboarding Checklist
    welcome_tenant: 'Karibu katika nyumba yako mpya',
    checklist_title: 'Mwongozo wa Kuingia Nyumbani',
    step1_title: '1. Kagua na Utie Sahihi Mkataba wa Kidijitali',
    step1_desc: 'Weka sahihi mkataba wako unaozingatia sheria za kodi za RRA.',
    step2_title: '2. Lipa Amana ya Usalama na Kodi ya Mwezi wa Kwanza',
    step2_desc: 'Kamilisha malipo kwa MTN MoMo, Airtel Money, au benki na upate risiti mara moja.',
    step3_title: '3. Kamilisha Ukaguzi wa Mwanzo wa Nyumba',
    step3_desc: 'Weka kumbukumbu za picha za hali ya nyumba ili kulinda amana yako utakapoondoka.',

    // Language Toggle
    change_language: 'Lugha',

    // KYB Business Verification (Rwanda)
    business_verification: 'Uthibitisho wa Biashara RDB',
    tin_label: 'Nambari ya Kodi (TIN / RDB - tarakimu 9)',
    national_id_label: 'Kitambulisho cha Taifa cha Rwanda (NIDA - tarakimu 16)',
    verify_company_button: 'Thibitisha na Sajili ya RDB',
    ncsa_consent_label: 'Ninakubali usindikaji wa data kulingana na Sheria Nº 058/2021 ya ulinzi wa data binafsi (NCSA).',
    rdb_certificate_label: 'Cheti cha Usajili wa Kampuni (RDB)',
    legal_structure_label: 'Muundo wa Kisheria wa Kampuni',
    rwareb_license_label: 'Nambari ya Leseni ya Kitaalamu ya RWAREB',
  },
};
