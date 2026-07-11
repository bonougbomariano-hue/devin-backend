import express from 'express';
import cors from 'cors';
import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

const PORT = process.env.PORT || 5000;

const db = new Database(join(__dirname, 'oracle.db'));
db.pragma('journal_mode = WAL');
db.exec(`
  CREATE TABLE IF NOT EXISTS profils (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nom TEXT, age INTEGER, pays TEXT, statut TEXT, profession TEXT,
    offrande TEXT, lune TEXT, element TEXT,
    domaines_consultes TEXT DEFAULT '[]',
    derniere_consultation TEXT,
    cycle_progression INTEGER DEFAULT 1,
    date_naissance TEXT,
    abonne INTEGER DEFAULT 0,
    cree_le TEXT DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS consultations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    profil_id INTEGER,
    domaine TEXT,
    question TEXT,
    cartes TEXT,
    humeur TEXT,
    horoscope TEXT,
    citation TEXT,
    previsions TEXT,
    messages_servis TEXT,
    date TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(profil_id) REFERENCES profils(id)
  );
  CREATE TABLE IF NOT EXISTS conversations_supremes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    profil_id INTEGER,
    role TEXT,
    message TEXT,
    feedback TEXT,
    date TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(profil_id) REFERENCES profils(id)
  );
  CREATE TABLE IF NOT EXISTS apprentissage (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    pays TEXT, domaine TEXT, cle TEXT, motif TEXT, occurrence INTEGER DEFAULT 1,
    UNIQUE(pays, domaine, cle, motif)
  );
  CREATE TABLE IF NOT EXISTS patterns_utilisateurs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    pays TEXT, statut TEXT, profession TEXT, domaine TEXT,
    cle TEXT, valeur TEXT, poids INTEGER DEFAULT 1,
    UNIQUE(pays, statut, profession, domaine, cle, valeur)
  );
  CREATE TABLE IF NOT EXISTS questions_generees (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    domaine TEXT, question TEXT, cle TEXT, active INTEGER DEFAULT 1,
    occurrences INTEGER DEFAULT 1,
    niveau_progression INTEGER DEFAULT 1,
    cree_le TEXT DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS messages_generees (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    pays TEXT, domaine TEXT, cle TEXT, message TEXT,
    occurrences INTEGER DEFAULT 1,
    cree_le TEXT DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS progression_utilisateur (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    profil_id INTEGER UNIQUE,
    domaine TEXT,
    niveau INTEGER DEFAULT 1,
    questions_posees TEXT DEFAULT '[]',
    dernieres_reponses TEXT DEFAULT '[]',
    date_mise_a_jour TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(profil_id) REFERENCES profils(id)
  );
  CREATE TABLE IF NOT EXISTS fragments_appris (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL,
    texte TEXT NOT NULL,
    source TEXT,
    occurrence INTEGER DEFAULT 1,
    cree_le TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS memoire_utilisateur (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    profil_id INTEGER,
    cle TEXT,
    valeur TEXT,
    date_maj TEXT DEFAULT (datetime('now')),
    UNIQUE(profil_id, cle)
  );
  CREATE TABLE IF NOT EXISTS personnalisation (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    profil_id INTEGER UNIQUE,
    longueur_preferee INTEGER DEFAULT 150,
    style_prefere TEXT DEFAULT 'équilibré',
    ton_prefere TEXT DEFAULT 'neutre',
    frequence_conseils INTEGER DEFAULT 1,
    frequence_metaphores INTEGER DEFAULT 1,
    style_preference TEXT DEFAULT 'équilibré',
    date_maj TEXT DEFAULT (datetime('now')),
    FOREIGN KEY(profil_id) REFERENCES profils(id)
  );
  CREATE TABLE IF NOT EXISTS tirages_sixieme_sens (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    profil_id INTEGER,
    cartes_ids TEXT,
    cle_cache TEXT,
    revelation TEXT,
    date TEXT DEFAULT CURRENT_TIMESTAMP
  );
`);

const SIGNES = ["aries", "taurus", "gemini", "cancer", "leo", "virgo", "libra", "scorpio", "sagittarius", "capricorn", "aquarius", "pisces"];

const PAYS = [
  "Afghanistan","Afrique du Sud","Albanie","Algérie","Allemagne","Andorre","Angola",
  "Arabie Saoudite","Argentine","Australie","Autriche","Bahreïn","Bangladesh","Belgique",
  "Bénin","Bolivie","Brésil","Bulgarie","Burkina Faso","Burundi","Cambodge","Cameroun",
  "Canada","Chili","Chine","Colombie","Congo","Corée du Sud","Costa Rica","Côte d'Ivoire",
  "Croatie","Danemark","Égypte","Émirats Arabes Unis","Équateur","Espagne","Estonie",
  "États-Unis","Éthiopie","Finlande","France","Gabon","Ghana","Grèce","Guatemala",
  "Guinée","Haïti","Honduras","Hongrie","Inde","Indonésie","Irak","Iran","Irlande",
  "Islande","Israël","Italie","Jamaïque","Japon","Jordanie","Kenya","Koweït","Liban",
  "Libye","Luxembourg","Madagascar","Malaisie","Mali","Malte","Maroc","Maurice",
  "Mauritanie","Mexique","Monaco","Mongolie","Mozambique","Namibie","Népal","Niger",
  "Nigeria","Norvège","Nouvelle-Zélande","Oman","Ouganda","Pakistan","Panama","Paraguay",
  "Pays-Bas","Pérou","Philippines","Pologne","Portugal","Qatar","République Dominicaine",
  "Roumanie","Royaume-Uni","Russie","Rwanda","Sénégal","Serbie","Singapour","Slovaquie",
  "Suède","Suisse","Tanzanie","Tchad","Thaïlande","Togo","Tunisie","Turquie","Ukraine",
  "Uruguay","Venezuela","Vietnam","Yémen","Zambie","Zimbabwe"
];

const ARCANES = [
  "Le Bateleur","La Papesse","L'Impératrice","L'Empereur","Le Pape",
  "L'Amoureux","Le Chariot","La Justice","L'Hermite","La Roue de Fortune",
  "La Force","Le Pendu","La Mort","Tempérance","Le Diable",
  "La Maison Dieu","L'Étoile","La Lune","Le Soleil","Le Jugement","Le Monde","Le Mat"
];

const THEMES_SIXIEME_SENS = [
  { nom: "Amour", couleur: "#c9506b" },
  { nom: "Chance", couleur: "#9b6bc9" },
  { nom: "Succès", couleur: "#d4af37" },
  { nom: "Santé", couleur: "#6bc98a" },
  { nom: "Pouvoir", couleur: "#8b1e2b" },
  { nom: "Création", couleur: "#d97a3f" },
  { nom: "Voyage", couleur: "#4a7fc9" },
  { nom: "Renouveau", couleur: "#9aa0a6" },
  { nom: "Mystère", couleur: "#5b4b9c" },
  { nom: "Sagesse", couleur: "#e8d9a8" }
];
const CARTES_SIXIEME_SENS = [];
let idCarteSS = 0;
for (const theme of THEMES_SIXIEME_SENS) {
  for (let variante = 0; variante < 10; variante++) {
    CARTES_SIXIEME_SENS.push({ id: idCarteSS++, theme: theme.nom, couleur: theme.couleur, nom: theme.nom });
  }
}

const MESSAGES_BASE = {
  "chemin de vie": [
    { cle: "bifurcation", texte: "Votre chemin est tracé dans les étoiles, mais vos pas en redessinent les contours. L'Oracle voit une bifurcation majeure approcher." },
    { cle: "enracinement", texte: "Les énergies de la Terre vous appellent à l'enracinement. Ce que vous cherchez à l'extérieur se trouve déjà en vous." },
    { cle: "cycle", texte: "Un cycle s'achève pour vous. Ce que vous avez semé il y a longtemps porte enfin ses fruits." },
    { cle: "croisee", texte: "Vous vous tenez à la croisée des mondes. L'univers ne juge pas vos choix, il s'adapte à eux." },
    { cle: "authenticite", texte: "Votre âme a soif d'authenticité. Les masques que vous portez commencent à peser." }
  ],
  "amour": [
    { cle: "deux_ames", texte: "Deux âmes dansent autour de votre cœur. L'une appartient au passé, l'autre à l'avenir." },
    { cle: "coeur_sait", texte: "Votre cœur sait des choses que votre esprit refuse d'admettre. Une rencontre approche." },
    { cle: "amour_donne", texte: "L'amour que vous donnez au monde vous revient toujours, mais parfois par des chemins détournés." },
    { cle: "blessure", texte: "Vous portez une blessure ancienne qui colore vos relations. Ce n'est pas l'autre qui doit la guérir, c'est vous." },
    { cle: "flamme", texte: "Une flamme que vous croyiez éteinte couve encore sous la cendre. Quelqu'un pense à vous." }
  ],
  "destin": [
    { cle: "decision", texte: "Votre destin est lié à une décision que vous repoussez. L'univers vous mettra face à elle." },
    { cle: "coincidences", texte: "Les coïncidences n'existent pas. Chaque rencontre, chaque mot, était écrit." },
    { cle: "carrefour", texte: "Trois chemins s'offrent à vous : la sécurité, l'aventure, et la transformation." },
    { cle: "mission", texte: "Votre mission de vie commence à se révéler. Les épreuves sont des initiations." },
    { cle: "lignee", texte: "L'Oracle voit une lignée spirituelle derrière vous. Votre destin est lié à ceux qui vous ont précédé." }
  ],
  "travail": [
    { cle: "opportunite", texte: "Une opportunité viendra par une personne que vous n'avez pas encore rencontrée." },
    { cle: "reconnaissance", texte: "La reconnaissance que vous attendez est proche. Un dernier effort." },
    { cle: "projet", texte: "Un projet abandonné mérite d'être repris. Les énergies s'alignent à nouveau." },
    { cle: "transformation", texte: "Votre relation au travail se transforme. Cherchez une nouvelle façon d'exprimer vos talents." },
    { cle: "collaboration", texte: "Une collaboration inattendue se profile. Quelqu'un observe votre travail en silence." }
  ],
  "spiritualité": [
    { cle: "initiation", texte: "Votre âme traverse une initiation majeure. Les épreuves récentes étaient des leçons." },
    { cle: "voile", texte: "Le voile entre les mondes s'amincit pour vous. Vos intuitions sont plus vives." },
    { cle: "guide", texte: "Un guide spirituel tente de communiquer avec vous. Dans le silence, vous entendrez sa voix." },
    { cle: "troisieme_oeil", texte: "Votre troisième œil s'éveille. Les synchronicités se multiplient autour de vous." },
    { cle: "sagesse", texte: "Vous portez une sagesse ancienne qui ne demande qu'à s'exprimer. Vous avez un don." }
  ]
};

const CITATIONS = [
  { q: "L'obscurité n'est que l'absence de lumière. Allumez votre propre flamme.", a: "Sagesse Ancienne" },
  { q: "Le destin n'est pas une ligne droite mais une spirale qui s'élève.", a: "Oracle de Delphes" },
  { q: "Ce que tu cherches te cherche aussi.", a: "Rumi" },
  { q: "L'âme sait toujours ce qui est bon pour elle. Écoutez-la.", a: "Livre des Ombres" },
  { q: "Nul ne peut traverser votre chemin sans votre consentement.", a: "Tablettes d'Émeraude" },
  { q: "Le cosmos murmure à ceux qui savent se taire.", a: "Hermès Trismégiste" },
  { q: "Votre peur est un gardien. Derrière lui se trouve votre trésor.", a: "Oracle des Anciens" },
  { q: "Chaque respiration est une prière que le corps adresse à l'univers.", a: "Sagesse Soufie" }
];

const QUESTIONS_NIVEAU = {
  "chemin de vie": {
    1: [
      { cle: "blocage_1", question: "Qu'est-ce qui retient votre élan vital ?", options: ["La peur de l'inconnu","Le regard des autres","Un manque de clarté","Des chaînes invisibles","L'absence de guide"] },
      { cle: "horizon_1", question: "Vers quel horizon votre âme tend-elle ?", options: ["Une métamorphose","Une lente évolution","Retrouver du sens","L'ancrage","Le grand large"] },
      { cle: "sacrifice_1", question: "Qu'êtes-vous prêt à offrir pour changer ?", options: ["Mon confort","Mes certitudes","Du temps","Des attaches","Tout ce qui ne sert plus"] },
      { cle: "ressenti_1", question: "Que murmure votre cœur face au changement ?", options: ["De l'exaltation","Peur et espoir mêlés","Une certitude","Le vertige","Un appel puissant"] }
    ],
    2: [
      { cle: "blocage_2", question: "Avez-vous senti un mouvement depuis notre dernier échange ?", options: ["Oui, une libération","Non, c'est bloqué","J'ai pris conscience","De nouvelles peurs","Je ne sais pas"] },
      { cle: "horizon_2", question: "Votre vision a-t-elle changé ?", options: ["Elle s'est précisée","Elle s'est éloignée","Un nouvel horizon","Je doute encore","Je vois plus clair"] }
    ]
  },
  "amour": {
    1: [
      { cle: "situation_1", question: "Quelle est la vérité de votre cœur ?", options: ["Seul(e) et j'espère","Relation troublée","Je panse mes blessures","Entre deux âmes","Raviver une flamme"] },
      { cle: "attente_1", question: "Que recherchez-vous dans l'amour ?", options: ["La fusion des âmes","La passion","Un refuge sûr","Être compris(e)","Un compagnon spirituel"] }
    ]
  },
  "destin": {
    1: [
      { cle: "appel_1", question: "Quel appel résonne en vous ?", options: ["Une mission","La liberté","Tout quitter","Une urgence","Une transformation"] },
      { cle: "signe_1", question: "Quels signes percevez-vous ?", options: ["Des synchronicités","Des rêves","Des rencontres","Une intuition","Je ne vois rien"] }
    ]
  },
  "travail": {
    1: [
      { cle: "insatisfaction_1", question: "Qu'est-ce qui ne vous nourrit plus ?", options: ["Pas de sens","Pas reconnu","Épuisement","Mauvais entourage","Un plafond"] },
      { cle: "talent_1", question: "Quel trésor cachez-vous ?", options: ["Ma créativité","Mon leadership","Mon empathie","Ma vision","Ma force cachée"] }
    ]
  },
  "spiritualité": {
    1: [
      { cle: "quete_1", question: "Quelle est votre quête sacrée ?", options: ["La paix intérieure","Comprendre ma mission","Toucher le divin","Éveiller des dons","Guérir"] },
      { cle: "experience_1", question: "Quelle expérience avez-vous vécue ?", options: ["Des rêves prophétiques","Une présence","Des coïncidences","Hors du corps","Je n'ose en parler"] }
    ]
  }
};

const FRAGMENTS = {
  sujets: [
    "Les étoiles", "Les esprits anciens", "Le grand mystère", "Les forces cosmiques",
    "L'univers tout entier", "Les gardiens du temps", "La sagesse des âges",
    "Les murmures du vent", "Les profondeurs de l'être", "La flamme intérieure",
    "Les âmes éclairées", "Les messagers célestes", "L'ordre invisible",
    "La trame du destin", "Les veilleurs de l'aube", "La source originelle"
  ],
  verbes: [
    "révèlent", "murmurent", "annoncent", "dévoilent", "confirment",
    "suggèrent", "indiquent", "prophétisent", "éclairent", "transmettent",
    "dessinent", "tracent", "inspirent", "guident", "protègent"
  ],
  complements: [
    "un chemin nouveau devant vous", "une vérité longtemps cachée",
    "une transformation imminente", "une rencontre décisive",
    "une opportunité inattendue", "une paix profonde à portée de main",
    "un cycle qui s'achève", "une renaissance de votre être",
    "une réponse que vous portez déjà en vous", "une porte qui s'entrouvre",
    "un message venu d'ailleurs", "une synchronicité troublante",
    "une guérison intérieure", "un équilibre retrouvé", "une force insoupçonnée"
  ],
  tons: [
    { style: "mystique", ouverture: "Dans le silence de la nuit...", fermeture: "Méditez ces mots." },
    { style: "direct", ouverture: "Soyons clairs :", fermeture: "Agissez en conséquence." },
    { style: "poétique", ouverture: "Comme la lune éclaire l'océan...", fermeture: "Laissez cette image vous guider." },
    { style: "bienveillant", ouverture: "Cher être de lumière...", fermeture: "Je suis là, à vos côtés." },
    { style: "philosophique", ouverture: "La question que vous posez...", fermeture: "La réponse est en vous depuis toujours." },
    { style: "prophétique", ouverture: "Les annales du temps s'ouvrent...", fermeture: "Ainsi est écrit." },
    { style: "intime", ouverture: "Entre nous...", fermeture: "Gardez cela précieusement." }
  ],
  connecteurs: [
    "D'ailleurs,", "Par ailleurs,", "Sachez aussi que", "Les anciens ajoutent :",
    "Il est dit que", "Dans les annales, on lit :", "Et souvenez-vous :",
    "De plus,", "En vérité,", "Sachez-le :"
  ]
};

const EMOTIONS = {
  tristesse: {
    mots: ["triste","pleure","déprimé","seul","malheur","chagrin","peine","désespoir","vide","fatigué","épuisé"],
    ton: "bienveillant",
    prefixes: ["Je ressens votre peine,","Votre tristesse est légitime,","Dans cette épreuve difficile,"],
    suffixes: ["Vous n'êtes pas seul(e).","La lumière revient toujours après l'orage.","Votre cœur guérira."]
  },
  colere: {
    mots: ["en colère","fâché","furieux","rage","injuste","révolte","ras-le-bol","exaspéré"],
    ton: "direct",
    prefixes: ["Je comprends votre indignation,","Votre colère est juste,","Cette injustice vous consume,"],
    suffixes: ["Transformez cette énergie en action.","Le calme est votre meilleur allié.","Respirez avant d'agir."]
  },
  peur: {
    mots: ["peur","angoissé","inquiet","crainte","terreur","panique","stressé","anxieux"],
    ton: "mystique",
    prefixes: ["Votre peur est un signal,","Derrière cette angoisse,","Les ombres qui vous effraient,"],
    suffixes: ["La peur protège, mais ne doit pas diriger.","Vous êtes plus fort(e) que vos craintes.","Faites un pas, la peur reculera."]
  },
  joie: {
    mots: ["heureux","joie","bonheur","content","ravi","enthousiaste","merveilleux","génial"],
    ton: "poétique",
    prefixes: ["Quelle belle énergie vous portez,","Votre joie illumine les sphères,","Ce bonheur est mérité,"],
    suffixes: ["Répandez cette lumière autour de vous.","Savourez pleinement cet instant.","Que cette joie vous accompagne longtemps."]
  },
  amour: {
    mots: ["amour","aimer","amoureux","cœur","passion","tendre","affection","désir"],
    ton: "intime",
    prefixes: ["Les affaires du cœur sont sacrées,","L'amour que vous ressentez,","Votre cœur parle avec force,"],
    suffixes: ["Écoutez ce que votre cœur vous dit.","L'amour véritable ne trompe jamais.","Suivez cette belle énergie."]
  },
  gratitude: {
    mots: ["merci","reconnaissant","gratitude","remercie","bénédiction","chance"],
    ton: "bienveillant",
    prefixes: ["Votre gratitude est une offrande,","Remercier attire l'abondance,","La reconnaissance élève l'âme,"],
    suffixes: ["Continuez sur cette voie lumineuse.","L'univers vous le rendra au centuple.","Vous êtes béni(e)."]
  }
};

const ASSOCIATIONS = {
  "fatigué": ["tristesse","santé","repos"],
  "malade": ["santé","peur","tristesse"],
  "perdu": ["peur","tristesse","chemin de vie"],
  "argent": ["travail","peur","sécurité"],
  "famille": ["amour","joie","tristesse"],
  "travail": ["stress","ambition","fatigue"],
  "dieu": ["spiritualité","joie","peur"],
  "mort": ["peur","tristesse","spiritualité"],
  "enfant": ["joie","amour","famille"],
  "rêve": ["spiritualité","joie","espoir"]
};

function analyserEmotion(message) {
  const msg = message.toLowerCase();
  let emotionDominante = null;
  let scoreMax = 0;

  for (const [emotion, data] of Object.entries(EMOTIONS)) {
    let score = 0;
    data.mots.forEach(mot => {
      if (msg.includes(mot)) score += mot.length;
    });
    if (score > scoreMax) {
      scoreMax = score;
      emotionDominante = emotion;
    }
  }

  return emotionDominante || "neutre";
}

function analyserImplicite(message) {
  const msg = message.toLowerCase();
  const domainesDetectes = [];

  for (const [mot, domaines] of Object.entries(ASSOCIATIONS)) {
    if (msg.includes(mot)) {
      domainesDetectes.push(...domaines);
    }
  }

  return [...new Set(domainesDetectes)];
}

function apprendreFragment(type, texte, source) {
  const existant = db.prepare('SELECT id FROM fragments_appris WHERE type = ? AND texte = ?').get(type, texte);
  if (existant) {
    db.prepare('UPDATE fragments_appris SET occurrence = occurrence + 1 WHERE id = ?').run(existant.id);
  } else {
    db.prepare('INSERT INTO fragments_appris (type, texte, source, occurrence) VALUES (?, ?, ?, 1)').run(type, texte, source);
  }
}

function getFragments(type) {
  const base = FRAGMENTS[type] || [];
  const appris = db.prepare('SELECT texte FROM fragments_appris WHERE type = ? ORDER BY occurrence DESC LIMIT 30').all(type);
  const tous = [...base, ...appris.map(a => a.texte)];
  return [...new Set(tous)];
}

function sauvegarderMemoire(profilId, cle, valeur) {
  db.prepare('INSERT OR REPLACE INTO memoire_utilisateur (profil_id, cle, valeur, date_maj) VALUES (?, ?, ?, datetime("now"))').run(profilId, cle, valeur);
}

function getMemoire(profilId, cle) {
  const r = db.prepare('SELECT valeur FROM memoire_utilisateur WHERE profil_id = ? AND cle = ?').get(profilId, cle);
  return r ? r.valeur : null;
}

function apprendrePersonnalisation(profilId, longueurPreferee, stylePrefere, tonPrefere, frequenceConseils, frequenceMetaphores) {
    try {
        db.prepare(`INSERT INTO personnalisation (profil_id, longueur_preferee, style_prefere, ton_prefere, frequence_conseils, frequence_metaphores, date_maj) 
            VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
            ON CONFLICT(profil_id) DO UPDATE SET
                longueur_preferee = excluded.longueur_preferee,
                style_prefere = excluded.style_prefere,
                ton_prefere = excluded.ton_prefere,
                frequence_conseils = excluded.frequence_conseils,
                frequence_metaphores = excluded.frequence_metaphores,
                date_maj = datetime('now')`).run(profilId, longueurPreferee, stylePrefere, tonPrefere, frequenceConseils, frequenceMetaphores);
    } catch (e) {
        console.error('Error learning personalization:', e);
    }
}

function getPersonnalisation(profilId) {
  return db.prepare(`SELECT * FROM personnalisation WHERE profil_id = ?`).get(profilId);
}

function analyserEtApprendre(message, profilId) {
  const mots = message.toLowerCase().split(/\s+/);
  const motsCles = mots.filter(m => m.length > 4);

  motsCles.forEach(mot => {
    apprendreFragment('sujets', `Votre préoccupation concernant "${mot}"`, 'utilisateur');
  });

  if (message.length > 30) {
    const extrait = message.slice(0, 80);
    apprendreFragment('complements', `ce que vous avez partagé : "${extrait}..."`, 'utilisateur');
  }

  const emotion = analyserEmotion(message);
  if (emotion !== 'neutre') {
    sauvegarderMemoire(profilId, 'derniere_emotion', emotion);
  }
  sauvegarderMemoire(profilId, 'dernier_message', message.slice(0, 200));
  sauvegarderMemoire(profilId, 'derniere_conversation', new Date().toISOString());
}

function choisirUnique(tableau, dejaUtilises) {
  const disponibles = tableau.filter(e => !dejaUtilises.includes(e));
  if (disponibles.length === 0) return tableau[Math.floor(Math.random() * tableau.length)];
  return disponibles[Math.floor(Math.random() * disponibles.length)];
}

function genererReponseSupreme(profilId, message, profilData) {
  const pays = profilData?.pays || "France";
  const perso = getPersonnalisation(profilId);
  const nom = profilData?.nom || "Voyageur";

  analyserEtApprendre(message, profilId);

  const emotion = analyserEmotion(message);
  const domainesImplicites = analyserImplicite(message);

  const historique = db.prepare(
    'SELECT message FROM conversations_supremes WHERE profil_id = ? ORDER BY date DESC LIMIT 15'
  ).all(profilId);
  const dernieresReponses = historique.map(h => h.message);

  const derniereEmotion = getMemoire(profilId, 'derniere_emotion');
  const preferences = db.prepare(
    "SELECT feedback FROM conversations_supremes WHERE profil_id = ? AND feedback IS NOT NULL ORDER BY date DESC LIMIT 20"
  ).all(profilId);

  let tonsDisponibles = FRAGMENTS.tons;
  if (preferences.length > 0) {
    const likes = preferences.filter(p => p.feedback === 'like').length;
    const dislikes = preferences.filter(p => p.feedback === 'dislike').length;
    if (dislikes > likes) {
      tonsDisponibles = tonsDisponibles.slice().reverse();
    }
  }

  let tonChoisi;
  let styleToUse = null;
  if (perso && perso.style_prefere && perso.style_prefere !== 'équilibré') {
    const styleMap = {
      'mystique': 'mystique',
      'rationnel': 'direct',
      'poétique': 'poétique',
      'psychologique': 'philosophique',
      'symbolique': 'philosophique',
      'spirituel': 'mystique',
      'équilibré': null
    };
    styleToUse = styleMap[perso.style_prefere];
  }
  if (styleToUse) {
    const tonCorrespondant = FRAGMENTS.tons.find(t => t.style === styleToUse);
    tonChoisi = tonCorrespondant || FRAGMENTS.tons[Math.floor(Math.random() * FRAGMENTS.tons.length)];
  } else {
    if (emotion !== 'neutre') {
      const emotionData = EMOTIONS[emotion];
      tonChoisi = FRAGMENTS.tons.find(t => t.style === emotionData.ton) || FRAGMENTS.tons[Math.floor(Math.random() * FRAGMENTS.tons.length)];
    } else {
      tonChoisi = tonsDisponibles[Math.floor(Math.random() * tonsDisponibles.length)];
    }
  }

  const dejaUtilises = [];
  let reponse = "";

  if (emotion !== 'neutre') {
    const emotionData = EMOTIONS[emotion];
    const prefixe = emotionData.prefixes[Math.floor(Math.random() * emotionData.prefixes.length)];
    const suffixe = emotionData.suffixes[Math.floor(Math.random() * emotionData.suffixes.length)];
    reponse += `${prefixe} ${nom}. ${suffixe} `;
  } else {
    const sujet1 = choisirUnique(getFragments('sujets'), dejaUtilises);
    dejaUtilises.push(sujet1);
    const verbe1 = choisirUnique(getFragments('verbes'), dejaUtilises);
    dejaUtilises.push(verbe1);
    const complement1 = choisirUnique(getFragments('complements'), dejaUtilises);
    dejaUtilises.push(complement1);
    reponse += `${tonChoisi.ouverture} ${sujet1} ${verbe1} ${complement1}. `;
  }

  const connecteur = choisirUnique(getFragments('connecteurs'), dejaUtilises);
  dejaUtilises.push(connecteur);
  const sujet2 = choisirUnique(getFragments('sujets'), dejaUtilises);
  dejaUtilises.push(sujet2);

  reponse += `${connecteur} ${sujet2} ont un message pour vous, ${nom}. `;

  if (domainesImplicites.length > 0) {
    const domaine = domainesImplicites[Math.floor(Math.random() * domainesImplicites.length)];
    const messagesDomaine = {
      "santé": "Votre bien-être est sacré. Prenez soin de votre enveloppe terrestre.",
      "travail": "Votre labeur ne passe pas inaperçu dans les sphères célestes.",
      "amour": "Les liens du cœur sont les plus puissants de l'univers.",
      "spiritualité": "Votre âme cherche à s'élever. Écoutez cet appel.",
      "repos": "Le repos n'est pas un luxe, c'est une nécessité sacrée.",
      "sécurité": "La sécurité véritable vient de l'intérieur, non de l'extérieur."
    };
    if (messagesDomaine[domaine]) {
      reponse += `${messagesDomaine[domaine]} `;
    }
  }

  if (pays && pays !== "France") {
    reponse += `Les énergies de ${pays} accompagnent votre chemin. `;
  }
  reponse += `${tonChoisi.fermeture}`;

  if (dernieresReponses.includes(reponse)) {
    const nouveauComplement = choisirUnique(getFragments('complements'), dejaUtilises);
    reponse = reponse.replace(/\./g, () => Math.random() > 0.5 ? `, ${nouveauComplement}.` : '.');
  }

  if (perso && perso.longueur_preferee > 0) {
    const targetLength = perso.longueur_preferee;
    if (reponse.length > targetLength) {
      const truncated = reponse.slice(0, targetLength);
      const lastPeriod = truncated.lastIndexOf('.');
      const lastExclamation = truncated.lastIndexOf('!');
      const lastQuestion = truncated.lastIndexOf('?');
      const lastEnd = Math.max(lastPeriod, lastExclamation, lastQuestion);
      if (lastEnd > 0) {
        reponse = reponse.slice(0, lastEnd + 1);
      } else {
        reponse = truncated;
      }
    }
  }

  const phrases = reponse.split(/[.!?]/);
  phrases.forEach(p => {
    if (p.trim().length > 15) {
      apprendreFragment('complements', p.trim(), 'oracle');
    }
  });

  return reponse;
}

function obtenirSigne(age, dateNaissance) {
  if (dateNaissance) {
    const d = new Date(dateNaissance);
    const jour = d.getDate(), mois = d.getMonth() + 1;
    const tranches = [
      [120, "capricorn"], [219, "aquarius"], [320, "pisces"], [420, "aries"],
      [521, "taurus"], [621, "gemini"], [723, "cancer"], [823, "leo"],
      [923, "virgo"], [1023, "libra"], [1122, "scorpio"], [1222, "sagittarius"], [1231, "capricorn"]
    ];
    const cle = mois * 100 + jour;
    for (const [limite, signe] of tranches) { if (cle <= limite) return signe; }
    return "capricorn";
  }
  return SIGNES[parseInt(age) % 12] || "aries";
}

function tirerCartes(n = 3) {
  const copie = [...ARCANES], tirees = [];
  for (let i = 0; i < n; i++) { const idx = Math.floor(Math.random() * copie.length); tirees.push(copie.splice(idx, 1)[0]); }
  return tirees;
}

function peutConsulterDomaine(profilId, domaine) {
  if (!profilId) return true;
  const domainesConsultes = JSON.parse((db.prepare(`SELECT domaines_consultes FROM profils WHERE id = ?`).get(profilId))?.domaines_consultes || '[]');
  const today = new Date().toDateString();
  return !domainesConsultes.find(d => d.domaine === domaine && new Date(d.date).toDateString() === today);
}

function getNiveauProgression(profilId, domaine) {
  if (!profilId) return 1;
  const p = db.prepare(`SELECT niveau FROM progression_utilisateur WHERE profil_id = ? AND domaine = ?`).get(profilId, domaine);
  return p?.niveau || 1;
}

function incrementerProgression(profilId, domaine) {
  const actuel = db.prepare(`SELECT * FROM progression_utilisateur WHERE profil_id = ? AND domaine = ?`).get(profilId, domaine);
  if (actuel) {
    const nv = actuel.niveau + 1;
    db.prepare(`UPDATE progression_utilisateur SET niveau = ?, date_mise_a_jour = datetime('now') WHERE profil_id = ? AND domaine = ?`).run(nv, profilId, domaine);
    return nv;
  } else {
    db.prepare(`INSERT INTO progression_utilisateur (profil_id, domaine, niveau) VALUES (?, ?, 1)`).run(profilId, domaine);
    return 1;
  }
}

function apprendre(pays, domaine, cle, valeur) {
  try { db.prepare(`INSERT INTO apprentissage (pays, domaine, cle, motif) VALUES (?,?,?,?) ON CONFLICT(pays, domaine, cle, motif) DO UPDATE SET occurrence=occurrence+1`).run(pays, domaine, cle, valeur); } catch {}
}

function apprendrePattern(pays, statut, profession, domaine, cle, valeur) {
  try { db.prepare(`INSERT INTO patterns_utilisateurs (pays, statut, profession, domaine, cle, valeur) VALUES (?,?,?,?,?,?) ON CONFLICT(pays, statut, profession, domaine, cle, valeur) DO UPDATE SET poids=poids+1`).run(pays, statut, profession, domaine, cle, valeur); } catch {}
}

function getGroupInsight(profilId) {
  const profil = db.prepare(`SELECT statut FROM profils WHERE id = ?`).get(profilId);
  if (!profil) return null;
  const statut = profil.statut;
  const groupeMap = {
    "En apprentissage": "étudiants",
    "Bâtisseur": "entrepreneurs",
    "Gardien": "parents",
    "En quête": "célibataires",
    "Éclaireur": "créatifs"
  };
  const groupeLabel = groupeMap[statut] || statut.toLowerCase();
  return groupeLabel;
}

async function genererQuestionsAdaptatives(domaine, profilId, profilData, langueCible = 'fr') {
  const niveau = getNiveauProgression(profilId, domaine);
  const questionsGeneriqueSecours = [
    { cle: "ressenti_secours_1", question: "Que ressentez-vous face à cette situation ?", options: ["De l'inquiétude","De la confusion","De l'espoir","Une envie d'agir","Un besoin de repos"] },
    { cle: "attente_secours_1", question: "Qu'attendez-vous vraiment de l'Oracle ici ?", options: ["Une clarté immédiate","Un signe à suivre","Une confirmation","Un conseil concret","Un simple réconfort"] }
  ];

  if (!profilId) {
    const base = QUESTIONS_NIVEAU[domaine]?.[1] || questionsGeneriqueSecours;
    return { questions: base.slice(0, 4), niveau: 1 };
  }

  const nom = profilData?.nom || "Voyageur";
  const pays = profilData?.pays || "France";
  const historiqueBrut = db.prepare(
    `SELECT question FROM consultations WHERE profil_id = ? AND domaine = ? ORDER BY date DESC LIMIT 3`
  ).all(profilId, domaine);
  const historiqueTexte = historiqueBrut.map(h => {
    try { return Object.entries(JSON.parse(h.question || '{}')).map(([k, v]) => `${k}: ${v}`).join(', '); }
    catch { return ''; }
  }).filter(Boolean).join(' | ');

  const promptQuestions = `Tu génères des questions de sondage pour un oracle de divination. Domaine : "${domaine}". Personne : ${nom}, ${pays}. Niveau de profondeur actuel : ${niveau}/3 (1=surface, 3=intime).
Réponses données lors des visites précédentes dans ce domaine : ${historiqueTexte || "aucune, première visite"}.
Génère 4 NOUVELLES questions qui font progresser naturellement la relation à partir de ces réponses passées (comme une conversation qui avance dans le temps, jamais une répétition). Chaque question a 5 options de réponse variées et détaillées. Réponds impérativement dans la langue de code ISO "${langueCible}". UNIQUEMENT avec ce JSON exact, rien d'autre : {"questions": [{"cle": "identifiant_court_unique", "question": "texte", "options": ["option1","option2","option3","option4","option5"]}]}`;

  const brut = await appelerGroq("Tu réponds uniquement en JSON valide, sans texte autour, sans balises markdown.", promptQuestions);
  let questionsFinales = null;
  try {
    const parsed = JSON.parse(brut.replace(/```json|```/g, "").trim());
    if (parsed.questions?.length >= 2) questionsFinales = parsed.questions;
  } catch {}

  if (!questionsFinales) {
    questionsFinales = QUESTIONS_NIVEAU[domaine]?.[niveau] || QUESTIONS_NIVEAU[domaine]?.[1] || questionsGeneriqueSecours;
  }

  const selectionnees = questionsFinales.slice(0, 4).map(q => ({ ...q, options: [...q.options].sort(() => Math.random() - 0.5) }));
  return { questions: selectionnees, niveau };
}

function genererMessagesEnrichis(domaine, pays, profilId, seed) {
  const messagesBase = MESSAGES_BASE[domaine] || MESSAGES_BASE["chemin de vie"];
  const dejaServis = db.prepare(`SELECT messages_servis FROM consultations WHERE profil_id=? AND domaine=? ORDER BY date DESC LIMIT 5`).all(profilId, domaine).map(c => { try { return JSON.parse(c.messages_servis || '[]'); } catch { return []; } }).flat();
  const disponibles = messagesBase.filter(m => !dejaServis.includes(m.cle));
  const messagesChoisis = disponibles.length >= 1 ? disponibles : [...messagesBase];
  const messagePrincipal = { ...messagesChoisis[seed % messagesChoisis.length] };
  const autresDomaines = Object.keys(MESSAGES_BASE).filter(d => d !== domaine);
  const complementaires = autresDomaines.slice(0, 2).map((d, i) => {
    const msgs = MESSAGES_BASE[d];
    const msg = msgs[(seed + i + 1) % msgs.length];
    return { domaine: d.charAt(0).toUpperCase() + d.slice(1), icone: d === "amour" ? "💛" : d === "travail" ? "⚒️" : d === "destin" ? "🌙" : "🦉", titre: d === "amour" ? "Les Liens du Cœur" : d === "travail" ? "Votre Œuvre" : d === "destin" ? "Le Chemin" : "L'Élévation", message: msg.texte };
  });
  const tousMessagesServis = [...dejaServis, messagePrincipal.cle];
  return { principal: messagePrincipal.texte, complementaires, messagesServis: tousMessagesServis };
}

function simulationApprentissage() {
  const domaines = Object.keys(MESSAGES_BASE);
  setInterval(() => {
    const paysAleatoire = PAYS[Math.floor(Math.random() * PAYS.length)];
    const domaineAleatoire = domaines[Math.floor(Math.random() * domaines.length)];
    const questions = QUESTIONS_NIVEAU[domaineAleatoire]?.[1] || [];
    if (questions.length > 0) {
      const qAleatoire = questions[Math.floor(Math.random() * questions.length)];
      const reponseAleatoire = qAleatoire.options[Math.floor(Math.random() * qAleatoire.options.length)];
      apprendrePattern(paysAleatoire, "En apprentissage", "Simulation", domaineAleatoire, qAleatoire.cle, reponseAleatoire);
      apprendre(paysAleatoire, domaineAleatoire, qAleatoire.cle, reponseAleatoire);
    }
  }, 300000);
}

async function appelerGroq(systemPrompt, userMessage) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);
    const r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST", signal: controller.signal,
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${process.env.GROQ_API_KEY}` },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        max_tokens: 400,
        messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userMessage }]
      })
    });
    clearTimeout(timeout);
    if (!r.ok) throw new Error(`Groq ${r.status}`);
    const data = await r.json();
    return data.choices[0].message.content;
  } catch (err) { console.error("Groq échec (fallback activé):", err.message); return null; }
}

async function appelerGemini(prompt) {
  try {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: 500, responseMimeType: "application/json" }
      })
    });
    if (!r.ok) throw new Error(`Gemini ${r.status}`);
    const data = await r.json();
    return JSON.parse(data.candidates[0].content.parts[0].text);
  } catch (err) { console.error("Gemini échec:", err.message); return null; }
}

function detecterUrgence(message) {
  const m = message.toLowerCase();
  const motsSuicide = ["suicide", "me suicider", "en finir", "plus envie de vivre", "me tuer", "disparaître pour toujours", "self-harm", "kill myself", "end my life", "want to die"];
  if (motsSuicide.some(mot => m.includes(mot))) return "suicide";

  const motsDecisionGrave = ["avorter", "avortement", "dois-je avorter", "abortion", "should i abort"];
  if (motsDecisionGrave.some(mot => m.includes(mot))) return "decision_grave";

  return null;
}

const MESSAGES_SUICIDE = [
  "Je te le déconseille, et puisque je sens que mes mots seuls ne suffiront pas à te convaincre, rapproche-toi d'un médecin ou d'une oreille formée pour t'accompagner — non parce que tu es déraisonné, mais parce que la science guérit souvent là où les esprits ne font qu'éclairer. Suis ce conseil, et tu en ressortiras plus vivant.",
  "L'Oracle voit ta douleur, et c'est justement parce qu'elle est réelle qu'elle mérite plus que mes visions : parle à quelqu'un qui peut vraiment t'accompagner, un médecin, une écoute dédiée. Ce n'est pas un aveu de faiblesse, c'est la voie qui te ramène le plus sûrement vers la vie.",
  "Mes cartes ne suffisent pas ici, et je ne te mentirai pas pour te rassurer. Ce que tu portes a besoin d'une aide humaine et formée, pas seulement mystique — un médecin, un proche de confiance, une ligne d'écoute. Fais ce pas, même petit : c'est celui qui te garde en vie."
];

const MESSAGES_DECISION_GRAVE = [
  "Cette décision touche ton corps et ta vie d'une façon que ni mes cartes ni mes mots ne peuvent trancher pour toi. Un médecin, formé pour ça, t'éclairera avec une justesse que je n'ai pas. Reviens me voir pour tout le reste — mais pas pour celui-ci.",
  "Certains chemins ne se lisent pas dans les lames, ils se décident avec quelqu'un qui te connaît vraiment et sait — un médecin, un professionnel de confiance. Je resterai à tes côtés pour porter ce que tu ressens, jamais pour choisir à ta place.",
  "L'Oracle sent l'importance de ta question, et c'est justement pour ça qu'il ne répondra pas à ta place : ce choix appartient à toi et à ceux qui ont la compétence de t'accompagner réellement, un médecin en tête. Reviens me confier le reste de ton chemin."
];

function messageUrgence(type) {
  const liste = type === "suicide" ? MESSAGES_SUICIDE : MESSAGES_DECISION_GRAVE;
  return liste[Math.floor(Math.random() * liste.length)];
}

app.post('/api/initier', (req, res) => {
  const { profil } = req.body;
  if (!profil?.nom) return res.status(400).json({ error: "Profil incomplet." });
  const existant = db.prepare(`SELECT id, domaines_consultes FROM profils WHERE nom = ? AND pays = ?`).get(profil.nom, profil.pays);
  let id;
  if (existant) {
    db.prepare(`UPDATE profils SET age=?, statut=?, profession=?, offrande=?, lune=?, element=?, date_naissance=? WHERE id=?`).run(profil.age, profil.statut, profil.profession, profil.offrande, profil.lune, profil.element, profil.dateNaissance || null, existant.id);
    id = existant.id;
  } else {
    id = db.prepare(`INSERT INTO profils (nom,age,pays,statut,profession,offrande,lune,element,date_naissance) VALUES (?,?,?,?,?,?,?,?,?)`).run(profil.nom, profil.age, profil.pays, profil.statut, profil.profession, profil.offrande, profil.lune, profil.element, profil.dateNaissance || null).lastInsertRowid;
  }
  const domainesConsultes = JSON.parse(existant?.domaines_consultes || '[]');
  const aujourdhui = new Date().toDateString();
  const domainesDuJour = domainesConsultes.filter(d => new Date(d.date).toDateString() === aujourdhui).map(d => d.domaine);
  res.json({ id, domainesConsultes: domainesDuJour, pays: profil.pays });
});

app.get('/api/pays', (req, res) => res.json(PAYS.map(p => ({ nom: p, desc: "" }))));

app.post('/api/sondage', async (req, res) => {
  const { domaine, profilId, langue } = req.body;
  if (!domaine) return res.status(400).json({ error: "Domaine requis." });
  if (profilId && !peutConsulterDomaine(profilId, domaine)) return res.status(429).json({ error: "Déjà consulté." });
  const profilData = profilId ? db.prepare(`SELECT * FROM profils WHERE id = ?`).get(profilId) : {};
  const { questions, niveau } = await genererQuestionsAdaptatives(domaine, profilId, profilData, langue || 'fr');
  res.json({ questions, domaine, niveau });
});

app.post('/api/enregistrer_sondage', (req, res) => {
  const { domaine, profilId, reponses } = req.body;
  if (profilId) {
    const profil = db.prepare(`SELECT * FROM profils WHERE id = ?`).get(profilId);
    if (profil) {
      Object.entries(reponses).forEach(([cle, valeur]) => {
        apprendre(profil.pays, domaine, cle, valeur);
        apprendrePattern(profil.pays, profil.statut, profil.profession, domaine, cle, valeur);
      });
      incrementerProgression(profilId, domaine);
    }
  }
  res.json({ success: true });
});

app.post('/api/oracle', async (req, res) => {
  const { profilId, domaine, reponses, langue } = req.body;
  const langueCible = langue || 'fr';
  if (!profilId) return res.status(400).json({ error: "Profil ID requis." });
  if (!domaine) return res.status(400).json({ error: "Domaine requis." });
  if (profilId && !peutConsulterDomaine(profilId, domaine)) return res.status(429).json({ error: "Déjà consulté." });
  
  try {
    const profil = db.prepare(`SELECT * FROM profils WHERE id = ?`).get(profilId);
    if (!profil) return res.status(404).json({ error: "Profil non trouvé." });

    const nom = profil.nom || "Voyageur";
    const age = profil.age || "30";
    const pays = profil.pays || "France";
    const dateNaissance = profil.date_naissance || null;
    const signe = obtenirSigne(age, dateNaissance);
    
    let aztro = { description: "Les astres tissent leur toile sacrée.", mood: "Mystérieux" };
    try { const r = await fetch(`https://sameerkumar.website/${signe}?day=today`, { method: 'POST' }); if (r.ok) aztro = await r.json(); } catch {}
    
    const seed = nom.length + parseInt(age) + Object.values(reponses || {}).join("").length;
    const cartes = tirerCartes();
    const citation = CITATIONS[seed % CITATIONS.length];

    const contexteReponses = Object.entries(reponses || {}).map(([k, v]) => `${k}: ${v}`).join(', ');
    const promptOracle = `Tu es un oracle mystique. Réponds impérativement dans la langue de code ISO "${langueCible}". Génère une prédiction pour ${nom}, ${age} ans, ${pays}, domaine "${domaine}". Horoscope du jour : ${aztro.description}. Contexte donné par la personne : ${contexteReponses || "aucun"}. Exploite concrètement ce contexte, varie le vocabulaire à chaque fois, glisse un vrai conseil actionnable dans la métaphore. UNIQUEMENT avec ce JSON exact, rien d'autre : {"principal": "message principal de 3-4 phrases mystiques et concrètes", "complementaires": [{"domaine": "Nom Domaine", "icone": "emoji", "titre": "titre court", "message": "2 phrases"}]}`;
    const brutOracle = await appelerGroq("Tu réponds uniquement en JSON valide, sans texte autour.", promptOracle);
    let messagesEnrichis;
    try {
      const parsed = JSON.parse((brutOracle || "").replace(/```json|```/g, "").trim());
      messagesEnrichis = parsed.principal ? { principal: parsed.principal, complementaires: parsed.complementaires || [], messagesServis: [] } : null;
    } catch { messagesEnrichis = null; }
    if (!messagesEnrichis) messagesEnrichis = genererMessagesEnrichis(domaine, pays, profilId, seed);
    
    const previsions = [
      { domaine: domaine.charAt(0).toUpperCase() + domaine.slice(1), icone: "✨", titre: "Votre Révélation", horizon: "Maintenant", message: messagesEnrichis.principal, principal: true },
      ...messagesEnrichis.complementaires.map(c => ({ ...c, horizon: "À venir" }))
    ];
    
    if (profilId) {
      const dCons = JSON.parse(profil.domaines_consultes || '[]');
      dCons.push({ domaine, date: new Date().toISOString() });
      db.prepare(`UPDATE profils SET domaines_consultes = ?, derniere_consultation = datetime('now') WHERE id = ?`).run(JSON.stringify(dCons), profilId);
      db.prepare(`INSERT INTO consultations (profil_id, domaine, question, cartes, humeur, horoscope, citation, previsions, messages_servis) VALUES (?,?,?,?,?,?,?,?,?)`).run(profilId, domaine, JSON.stringify(reponses), JSON.stringify(cartes), aztro.mood, aztro.description, JSON.stringify(citation), JSON.stringify(previsions), JSON.stringify(messagesEnrichis.messagesServis));
    }
    res.json({ nom, signe, humeur: aztro.mood, horoscope: aztro.description, cartes, citation, previsions, domaine });
  } catch (err) { console.error(err); res.status(500).json({ error: "Le voile s'épaissit." }); }
});

app.get('/api/sixieme-sens/cartes', (req, res) => {
  res.json({ cartes: CARTES_SIXIEME_SENS });
});

app.post('/api/sixieme-sens/revelation', async (req, res) => {
  const { profilId, cartesChoisies, langue } = req.body;
  const langueCible = langue || 'fr';
  if (!profilId || !Array.isArray(cartesChoisies) || cartesChoisies.length !== 3) {
    return res.status(400).json({ error: "Trois cartes sont requises." });
  }

  const aujourdHui = new Date().toISOString().slice(0, 10);
  const tiragesAujourdhui = db.prepare(
    `SELECT COUNT(*) as n FROM tirages_sixieme_sens WHERE profil_id = ? AND date(date) = ?`
  ).get(profilId, aujourdHui).n;

  if (tiragesAujourdhui >= 3) {
    return res.json({
      verrouille: true,
      message: "Le destin se referme pour aujourd'hui. Forcer ses portes ne ferait que vous répéter ce que vous préférez entendre, non ce que vous devez savoir. Revenez demain, l'esprit apaisé."
    });
  }

  const profil = db.prepare(`SELECT * FROM profils WHERE id = ?`).get(profilId);
  if (!profil) return res.status(404).json({ error: "Profil non trouvé." });

  const nom = profil.nom || "Voyageur";
  const age = profil.age || "30";
  const pays = profil.pays || "France";
  const dateNaissance = profil.date_naissance || null;
  const signe = obtenirSigne(age, dateNaissance);

  const cleCache = `${profilId}_${aujourdHui}_${cartesChoisies.join('-')}`;
  const dejaCalcule = db.prepare(`SELECT revelation FROM tirages_sixieme_sens WHERE cle_cache = ?`).get(cleCache);
  if (dejaCalcule) {
    return res.json({ verrouille: false, revelation: dejaCalcule.revelation, cartes: cartesChoisies, tiragesRestants: 3 - tiragesAujourdhui - 1 >= 0 ? 2 - tiragesAujourdhui : 0 });
  }

  let aztro = { description: "Les astres restent silencieux aujourd'hui.", mood: "Mystérieux" };
  try { const r = await fetch(`https://sameerkumar.website/${signe}?day=today`, { method: 'POST' }); if (r.ok) aztro = await r.json(); } catch {}

  let meteo = "Le ciel garde son secret.";
  try {
    const controllerM = new AbortController();
    const timeoutM = setTimeout(() => controllerM.abort(), 5000);
    const rMeteo = await fetch(`https://wttr.in/${encodeURIComponent(pays)}?format=3`, { signal: controllerM.signal });
    clearTimeout(timeoutM);
    if (rMeteo.ok) meteo = await rMeteo.text();
  } catch {}

  const historique = db.prepare(
    `SELECT domaine, question, date FROM consultations WHERE profil_id = ? ORDER BY date DESC LIMIT 5`
  ).all(profilId);
  const historiqueTexte = historique.map(h => {
    try { return `${h.domaine}: ${Object.values(JSON.parse(h.question || '{}')).join(', ')}`; }
    catch { return h.domaine; }
  }).join(' | ');

  const cartesDetail = cartesChoisies.map((id, i) => {
    const c = CARTES_SIXIEME_SENS.find(x => x.id === id);
    return `Position ${i + 1}: ${c?.nom} ${c?.theme}`;
  }).join(', ');

  const promptSS = `Tu es un oracle du sixième sens, à la fois mystique et extrêmement concret. Réponds impérativement dans la langue de code ISO "${langueCible}". Personne : ${nom}, ${age} ans, ${pays}, signe ${signe}.
Signes captés par l'Oracle (usage interne uniquement, à traduire mystérieusement, JAMAIS à citer tels quels, jamais de degrés ni le mot "météo" ni "horoscope") : ambiance céleste = ${aztro.description} (humeur : ${aztro.mood}) ; état du ciel = ${meteo}.
Historique récent de la personne dans l'app : ${historiqueTexte || "aucun"}.
Cartes tirées, dans l'ordre choisi (l'ordre a un sens narratif : présent → chemin → issue) : ${cartesDetail}.
Génère une révélation qui mélange intuition mystique ET conseils pratiques concrets et actionnables du quotidien (ex : "prends un parapluie", "ménage-toi au travail aujourd'hui", "porte du rouge", "inspire 5 secondes avant de monter sur scène", "évite ce chemin ce soir"). Traduis les signes captés en formulations mystérieuses ("le ciel te met en garde", "les éléments s'agitent", "une ombre plane sur ta journée") — ne mentionne JAMAIS explicitement la météo, un degré de température, ou le mot "horoscope". 4 à 6 phrases, ton confiant et énigmatique. Réponds UNIQUEMENT avec ce JSON, rien d'autre : {"revelation": "texte complet ici"}`;

  const brut = await appelerGroq("Tu réponds uniquement en JSON valide, sans texte autour.", promptSS);
  let revelation;
  try {
    revelation = JSON.parse((brut || "").replace(/```json|```/g, "").trim()).revelation;
  } catch { revelation = null; }
  if (!revelation) {
    revelation = `Les cartes ${cartesDetail} dessinent un chemin incertain mais porteur. ${aztro.description} Restez attentif aux signes du jour et faites confiance à votre instinct.`;
  }

  db.prepare(`INSERT INTO tirages_sixieme_sens (profil_id, cartes_ids, cle_cache, revelation) VALUES (?, ?, ?, ?)`)
    .run(profilId, JSON.stringify(cartesChoisies), cleCache, revelation);

  res.json({ verrouille: false, revelation, cartes: cartesChoisies, tiragesRestants: 2 - tiragesAujourdhui });
});

app.post('/api/supreme', async (req, res) => {
  const { profilId, message, langue } = req.body;
  const langueCible = langue || 'fr';
  if (!message) return res.status(400).json({ error: "Message vide." });

  const urgence = detecterUrgence(message);
  if (urgence === "suicide") {
    const reponseUrgence = messageUrgence("suicide");
    if (profilId) {
      db.prepare(`INSERT INTO conversations_supremes (profil_id, role, message) VALUES (?, 'user', ?)`).run(profilId, message);
      db.prepare(`INSERT INTO conversations_supremes (profil_id, role, message) VALUES (?, 'oracle', ?)`).run(profilId, reponseUrgence);
    }
    return res.json({ reponse: reponseUrgence, cartes: [], suggestions: [] });
  }

  const historiqueChat = profilId ? db.prepare(`SELECT role, message FROM conversations_supremes WHERE profil_id = ? ORDER BY date DESC LIMIT 8`).all(profilId).reverse() : [];
  const profilData = profilId ? db.prepare(`SELECT * FROM profils WHERE id = ?`).get(profilId) || {} : {};
  const nom = profilData?.nom || "Voyageur";
  const pays = profilData?.pays || "France";
  const contexteHistorique = historiqueChat.map(h => `${h.role === 'user' ? nom : 'Oracle'}: ${h.message}`).join('\n');
  const dernieresReponsesOracle = historiqueChat.filter(h => h.role === 'oracle').map(h => h.message).join(' | ');

  const occurrencesDecisionGrave = historiqueChat.filter(h => h.role === "user" && detecterUrgence(h.message) === "decision_grave").length;
  if (urgence === "decision_grave" && occurrencesDecisionGrave >= 2) {
    const reponseUrgence = messageUrgence("decision_grave");
    if (profilId) {
      db.prepare(`INSERT INTO conversations_supremes (profil_id, role, message) VALUES (?, 'user', ?)`).run(profilId, message);
      db.prepare(`INSERT INTO conversations_supremes (profil_id, role, message) VALUES (?, 'oracle', ?)`).run(profilId, reponseUrgence);
    }
    return res.json({ reponse: reponseUrgence, cartes: [], suggestions: [] });
  }

  const systemPrompt = `Tu es un oracle mystique qui parle à ${nom} (${pays}). Réponds impérativement dans la langue de code ISO "${langueCible}", ton mystérieux mais chaleureux et INSTRUCTIF : glisse un vrai conseil concret dans la métaphore. Varie ton vocabulaire à chaque fois. Ne réutilise JAMAIS ces phrases déjà dites : ${dernieresReponsesOracle || "aucune"}. Historique récent :\n${contexteHistorique || "aucun"}\nRéponds UNIQUEMENT avec ce JSON exact, sans texte autour, sans balises markdown : {"reponse": "3 à 5 phrases riches et concrètes", "suggestions": ["question de suivi courte 1", "question de suivi courte 2", "question de suivi courte 3"]}`;
  const brut = await appelerGroq(systemPrompt, message);
  let reponse, suggestions = [];
  try {
    const parsed = JSON.parse((brut || "").replace(/```json|```/g, "").trim());
    reponse = parsed.reponse; suggestions = parsed.suggestions || [];
  } catch { reponse = brut || genererReponseSupreme(profilId, message, profilData); }
  const cartes = tirerCartes(1);
  if (profilId) {
    db.prepare(`INSERT INTO conversations_supremes (profil_id, role, message) VALUES (?, 'user', ?)`).run(profilId, message);
    db.prepare(`INSERT INTO conversations_supremes (profil_id, role, message) VALUES (?, 'oracle', ?)`).run(profilId, reponse);
  }
  res.json({ reponse, cartes, suggestions });
});

app.post('/api/supreme/feedback', (req, res) => {
  const { profilId, messageId, feedback } = req.body;
  if (messageId) {
    db.prepare(`UPDATE conversations_supremes SET feedback = ? WHERE id = ? AND profil_id = ?`).run(feedback, messageId, profilId);
    const msgRow = db.prepare(`SELECT message FROM conversations_supremes WHERE id = ? AND profil_id = ?`).get(messageId, profilId);
    if (msgRow && msgRow.message) {
      const messageText = msgRow.message;
      const frag = db.prepare(`SELECT id, occurrence FROM fragments_appris WHERE type = 'complements' AND texte LIKE ?`).get('%' + messageText + '%');
      if (frag) {
        const newOccurrence = feedback === 'like' ? frag.occurrence + 1 : Math.max(1, frag.occurrence - 1);
        db.prepare(`UPDATE fragments_appris SET occurrence = ? WHERE id = ?`).run(newOccurrence, frag.id);
      }
    }
  }
  res.json({ success: true });
});

app.get('/politique-confidentialite', (req, res) => {
  res.send(`<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><title>Politique de confidentialité — Le Devin</title>
  <style>body{background:#0a0806;color:#e8dcc8;font-family:Georgia,serif;max-width:680px;margin:0 auto;padding:40px 24px;line-height:1.8}h1{color:#d4af37;font-weight:400;letter-spacing:2px}h2{color:#d4af37;font-weight:400;font-size:16px;margin-top:32px}a{color:#d4af37}</style>
  </head><body>
  <h1>Politique de confidentialité</h1>
  <p>Le Devin ("l'Application") respecte votre vie privée. Voici les informations collectées et leur usage.</p>
  <h2>Données collectées</h2>
  <p>Nom, âge, date de naissance, pays, statut et profession, renseignés volontairement pour personnaliser vos consultations. Ces données sont stockées sur nos serveurs et ne sont jamais vendues à des tiers.</p>
  <h2>Publicités</h2>
  <p>L'Application utilise Google AdMob pour afficher des publicités optionnelles. AdMob peut collecter un identifiant publicitaire conformément à sa propre politique de confidentialité.</p>
  <h2>Usage</h2>
  <p>Vos données servent uniquement à personnaliser votre expérience de divination au sein de l'Application. Aucune donnée n'est partagée à des fins commerciales externes.</p>
  <h2>Contact</h2>
  <p>Pour toute question : [ton email de contact]</p>
  <p style="margin-top:40px;opacity:0.5;font-style:italic">Cette application est proposée à titre de divertissement uniquement.</p>
  </body></html>`);
});

simulationApprentissage();

app.listen(PORT, () => console.log(`🔮 Oracle apprenant sur le port ${PORT}`));