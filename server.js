import express from 'express';
import cors from 'cors';
import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
app.use(cors({
  origin: ['http://localhost:5173', 'https://le-devin.netlify.app', 'https://localhost', 'capacitor://localhost'],
  methods: ['POST', 'GET'],
  allowedHeaders: ['Content-Type']
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

// ==================== BASE DE CONNAISSANCES ====================
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

// ==================== MOTEUR DE CONVERSATION INTELLIGENT ====================

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

// Détection d'émotions et adaptation du ton
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

// Déduction par association (implicite)
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

  // Sauvegarder en mémoire utilisateur
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

  // Apprendre du message
  analyserEtApprendre(message, profilId);

  // Analyser émotion et implicite
  const emotion = analyserEmotion(message);
  const domainesImplicites = analyserImplicite(message);

  // Historique
  const historique = db.prepare(
    'SELECT message FROM conversations_supremes WHERE profil_id = ? ORDER BY date DESC LIMIT 15'
  ).all(profilId);
  const dernieresReponses = historique.map(h => h.message);

  // Mémoire utilisateur
  const derniereEmotion = getMemoire(profilId, 'derniere_emotion');
  const preferences = db.prepare(
    "SELECT feedback FROM conversations_supremes WHERE profil_id = ? AND feedback IS NOT NULL ORDER BY date DESC LIMIT 20"
  ).all(profilId);

  // Ajuster le ton selon les préférences
  let tonsDisponibles = FRAGMENTS.tons;
  if (preferences.length > 0) {
    const likes = preferences.filter(p => p.feedback === 'like').length;
    const dislikes = preferences.filter(p => p.feedback === 'dislike').length;
    if (dislikes > likes) {
      // Changer de style si l'utilisateur n'aime pas
      tonsDisponibles = tonsDisponibles.slice().reverse();
    }
  }

  // Sélectionner le ton selon l'émotion et les préférences
  let tonChoisi;
  // Si l'utilisateur a un style préféré (et ce n'est pas l'équilibré par défaut), on l'utilise pour choisir le ton
  let styleToUse = null;
  if (perso && perso.style_prefere && perso.style_prefere !== 'équilibré') {
    const styleMap = {
      'mystique': 'mystique',
      'rationnel': 'direct',
      'poétique': 'poétique',
      'psychologique': 'philosophique',
      'symbolique': 'philosophique',
      'spirituel': 'mystique',
      'équilibré': null // utiliser l'émotion
    };
    styleToUse = styleMap[perso.style_prefere];
  }
  // Maintenant, choisir le ton en fonction du style à utiliser (ou de l'émotion si pas de préférence)
  if (styleToUse) {
    // Essayer de trouver un ton correspondant au style souhaité
    const tonCorrespondant = FRAGMENTS.tons.find(t => t.style === styleToUse);
    tonChoisi = tonCorrespondant || FRAGMENTS.tons[Math.floor(Math.random() * FRAGMENTS.tons.length)];
  } else {
    // Pas de préférence de style, on utilise l'émotion
    if (emotion !== 'neutre') {
      const emotionData = EMOTIONS[emotion];
      tonChoisi = FRAGMENTS.tons.find(t => t.style === emotionData.ton) || FRAGMENTS.tons[Math.floor(Math.random() * FRAGMENTS.tons.length)];
    } else {
      tonChoisi = tonsDisponibles[Math.floor(Math.random() * tonsDisponibles.length)];
    }
  }

  const dejaUtilises = [];
  let reponse = "";

  // Phrase 1 : Adaptation selon émotion
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

  // Phrase 2 : Connexion avec le contexte
  const connecteur = choisirUnique(getFragments('connecteurs'), dejaUtilises);
  dejaUtilises.push(connecteur);
  const sujet2 = choisirUnique(getFragments('sujets'), dejaUtilises);
  dejaUtilises.push(sujet2);

  reponse += `${connecteur} ${sujet2} ont un message pour vous, ${nom}. `;

  // Phrase 3 : Implicite
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

  // Phrase 4 : Fermeture
  if (pays && pays !== "France") {
    reponse += `Les énergies de ${pays} accompagnent votre chemin. `;
  }
  reponse += `${tonChoisi.fermeture}`;

  // Anti-répétition
  if (dernieresReponses.includes(reponse)) {
    const nouveauComplement = choisirUnique(getFragments('complements'), dejaUtilises);
    reponse = reponse.replace(/\./g, () => Math.random() > 0.5 ? `, ${nouveauComplement}.` : '.');
  }

  // Ajuster la longueur selon les préférences
  if (perso && perso.longueur_preferee > 0) {
    const targetLength = perso.longueur_preferee;
    if (reponse.length > targetLength) {
      // Trouver la dernière phrase qui ne dépasse pas la longueur cible
      const truncated = reponse.slice(0, targetLength);
      const lastPeriod = truncated.lastIndexOf('.');
      const lastExclamation = truncated.lastIndexOf('!');
      const lastQuestion = truncated.lastIndexOf('?');
      const lastEnd = Math.max(lastPeriod, lastExclamation, lastQuestion);
      if (lastEnd > 0) {
        reponse = reponse.slice(0, lastEnd + 1);
      } else {
        // Si pas de ponctuation, on coupe brusquement (pas idéal)
        reponse = truncated;
      }
    }
    // Si la réponse est trop courte, on pourrait ajouter une phrase générique, mais on ne fait rien pour éviter de dénaturer
  }

  // Ajuster la longueur selon les préférences
  if (perso && perso.longueur_preferee > 0) {
    const targetLength = perso.longueur_preferee;
    if (reponse.length > targetLength) {
      // Trouver la dernière phrase qui ne dépasse pas la longueur cible
      const truncated = reponse.slice(0, targetLength);
      const lastPeriod = truncated.lastIndexOf('.');
      const lastExclamation = truncated.lastIndexOf('!');
      const lastQuestion = truncated.lastIndexOf('?');
      const lastEnd = Math.max(lastPeriod, lastExclamation, lastQuestion);
      if (lastEnd > 0) {
        reponse = reponse.slice(0, lastEnd + 1);
      } else {
        // Si pas de ponctuation, on coupe brusquement (pas idéal)
        reponse = truncated;
      }
    }
    // Si la réponse est trop courte, on pourrait ajouter une phrase générique, mais on ne fait rien pour éviter de dénaturer
  }

  // Apprendre de sa propre réponse
  const phrases = reponse.split(/[.!?]/);
  phrases.forEach(p => {
    if (p.trim().length > 15) {
      apprendreFragment('complements', p.trim(), 'oracle');
    }
  });

  return reponse;
}

// ==================== UTILITAIRES ====================
function obtenirSigne(age) { return SIGNES[parseInt(age) % 12] || "aries"; }
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
  async function genererQuestionsAdaptatives(domaine, profilId, profilData) {
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
Génère 4 NOUVELLES questions qui font progresser naturellement la relation à partir de ces réponses passées (comme une conversation qui avance dans le temps, jamais une répétition). Chaque question a 5 options de réponse variées et détaillées. Réponds en français, UNIQUEMENT avec ce JSON exact, rien d'autre : {"questions": [{"cle": "identifiant_court_unique", "question": "texte", "options": ["option1","option2","option3","option4","option5"]}]}`;

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

// ==================== ROUTES ====================

app.post('/api/initier', (req, res) => {
  const { profil } = req.body;
  if (!profil?.nom) return res.status(400).json({ error: "Profil incomplet." });
  const existant = db.prepare(`SELECT id, domaines_consultes FROM profils WHERE nom = ? AND pays = ?`).get(profil.nom, profil.pays);
  let id;
  if (existant) {
    db.prepare(`UPDATE profils SET age=?, statut=?, profession=?, offrande=?, lune=?, element=? WHERE id=?`).run(profil.age, profil.statut, profil.profession, profil.offrande, profil.lune, profil.element, existant.id);
    id = existant.id;
  } else {
    id = db.prepare(`INSERT INTO profils (nom,age,pays,statut,profession,offrande,lune,element) VALUES (?,?,?,?,?,?,?,?)`).run(profil.nom, profil.age, profil.pays, profil.statut, profil.profession, profil.offrande, profil.lune, profil.element).lastInsertRowid;
  }
  const domainesConsultes = JSON.parse(existant?.domaines_consultes || '[]');
  const aujourdhui = new Date().toDateString();
  const domainesDuJour = domainesConsultes.filter(d => new Date(d.date).toDateString() === aujourdhui).map(d => d.domaine);
  res.json({ id, domainesConsultes: domainesDuJour, pays: profil.pays });
});

app.get('/api/pays', (req, res) => res.json(PAYS.map(p => ({ nom: p, desc: "" }))));

app.post('/api/sondage', async (req, res) => {
  const { domaine, profilId } = req.body;
  if (!domaine) return res.status(400).json({ error: "Domaine requis." });
  if (profilId && !peutConsulterDomaine(profilId, domaine)) return res.status(429).json({ error: "Déjà consulté." });
  const profilData = profilId ? db.prepare(`SELECT * FROM profils WHERE id = ?`).get(profilId) : {};
  const { questions, niveau } = await genererQuestionsAdaptatives(domaine, profilId, profilData);
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
  const { profileText, profilId, domaine, reponses } = req.body;
  if (!profileText) return res.status(400).json({ error: "Empreinte introuvable." });
  if (profilId && !peutConsulterDomaine(profilId, domaine)) return res.status(429).json({ error: "Déjà consulté." });
  try {
    const nom = (profileText.match(/nom:\s*([^\n]+)/i) || [])[1]?.trim() || "Voyageur";
    const age = (profileText.match(/age:\s*([^\n]+)/i) || [])[1]?.trim() || "30";
    const pays = (profileText.match(/pays:\s*([^\n]+)/i) || [])[1]?.trim() || "France";
    const signe = obtenirSigne(age);
    let aztro = { description: "Les astres tissent leur toile sacrée.", mood: "Mystérieux" };
    try { const r = await fetch(`https://sameerkumar.website/${signe}?day=today`, { method: 'POST' }); if (r.ok) aztro = await r.json(); } catch {}
    const seed = nom.length + parseInt(age) + Object.values(reponses || {}).join("").length;
    const cartes = tirerCartes();
    const citation = CITATIONS[seed % CITATIONS.length];
    const promptGemini = `Génère une prédiction de divination en JSON pour ${nom}, ${age} ans, ${pays}, domaine "${domaine}". Réponds UNIQUEMENT avec ce format JSON exact, rien d'autre : {"principal": "message principal de 2-3 phrases mystiques", "complementaires": [{"domaine": "Nom Domaine", "icone": "emoji", "titre": "titre court", "message": "1-2 phrases"}]}`;
    const resultatGemini = await appelerGemini(promptGemini);
    const messagesEnrichis = resultatGemini || genererMessagesEnrichis(domaine, pays, profilId, seed);
    if (resultatGemini) messagesEnrichis.messagesServis = [];
    const previsions = [
      { domaine: domaine.charAt(0).toUpperCase() + domaine.slice(1), icone: "✨", titre: "Votre Révélation", horizon: "Maintenant", message: messagesEnrichis.principal, principal: true },
      ...messagesEnrichis.complementaires.map(c => ({ ...c, horizon: "À venir" }))
    ];
    if (profilId) {
      const profil = db.prepare(`SELECT domaines_consultes FROM profils WHERE id = ?`).get(profilId);
      const dCons = JSON.parse(profil?.domaines_consultes || '[]');
      dCons.push({ domaine, date: new Date().toISOString() });
      db.prepare(`UPDATE profils SET domaines_consultes = ?, derniere_consultation = datetime('now') WHERE id = ?`).run(JSON.stringify(dCons), profilId);
      db.prepare(`INSERT INTO consultations (profil_id, domaine, question, cartes, humeur, horoscope, citation, previsions, messages_servis) VALUES (?,?,?,?,?,?,?,?,?)`).run(profilId, domaine, JSON.stringify(reponses), JSON.stringify(cartes), aztro.mood, aztro.description, JSON.stringify(citation), JSON.stringify(previsions), JSON.stringify(messagesEnrichis.messagesServis));
    }
    res.json({ nom, signe, humeur: aztro.mood, horoscope: aztro.description, cartes, citation, previsions, domaine });
  } catch (err) { console.error(err); res.status(500).json({ error: "Le voile s'épaissit." }); }
});

app.post('/api/supreme', async (req, res) => {
  const { profilId, message } = req.body;
  if (!message) return res.status(400).json({ error: "Message vide." });
  const profilData = profilId ? db.prepare(`SELECT * FROM profils WHERE id = ?`).get(profilId) || {} : {};
  const nom = profilData?.nom || "Voyageur";
  const pays = profilData?.pays || "France";
  const historiqueChat = profilId ? db.prepare(`SELECT role, message FROM conversations_supremes WHERE profil_id = ? ORDER BY date DESC LIMIT 8`).all(profilId).reverse() : [];
  const contexteHistorique = historiqueChat.map(h => `${h.role === 'user' ? nom : 'Oracle'}: ${h.message}`).join('\n');
  const dernieresReponsesOracle = historiqueChat.filter(h => h.role === 'oracle').map(h => h.message).join(' | ');
  const systemPrompt = `Tu es un oracle mystique qui parle à ${nom} (${pays}). Réponds TOUJOURS en français, ton mystérieux mais chaleureux et INSTRUCTIF : glisse un vrai conseil concret dans la métaphore. Varie ton vocabulaire à chaque fois. Ne réutilise JAMAIS ces phrases déjà dites : ${dernieresReponsesOracle || "aucune"}. Historique récent :\n${contexteHistorique || "aucun"}\nRéponds UNIQUEMENT avec ce JSON exact, sans texte autour, sans balises markdown : {"reponse": "3 à 5 phrases riches et concrètes", "suggestions": ["question de suivi courte 1", "question de suivi courte 2", "question de suivi courte 3"]}`;
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

// Feedback utilisateur
app.post('/api/supreme/feedback', (req, res) => {
  const { profilId, messageId, feedback } = req.body;
  if (messageId) {
    db.prepare(`UPDATE conversations_supremes SET feedback = ? WHERE id = ? AND profil_id = ?`).run(feedback, messageId, profilId);
    
    // Retrieve the oracle response message
    const msgRow = db.prepare(`SELECT message FROM conversations_supremes WHERE id = ? AND profil_id = ?`).get(messageId, profilId);
    if (msgRow && msgRow.message) {
      const messageText = msgRow.message;
      // Find a fragment in fragments_appris of type 'complements' that matches the message text (or part of it)
            // Find a fragment in fragments_appris of type 'complements' that matches the message text (or part of it)
      const frag = db.prepare(`SELECT id, occurrence FROM fragments_appris WHERE type = 'complements' AND texte LIKE ?`).get('%' + messageText + '%');
      if (frag) {
        // Increase or decrease occurrence based on feedback
        const newOccurrence = feedback === 'like' ? frag.occurrence + 1 : Math.max(1, frag.occurrence - 1);
        db.prepare(`UPDATE fragments_appris SET occurrence = ? WHERE id = ?`).run(newOccurrence, frag.id);
      }
    }
  }
  res.json({ success: true });
});

simulationApprentissage();

app.listen(PORT, () => console.log(`🔮 Oracle apprenant sur le port ${PORT}`));
