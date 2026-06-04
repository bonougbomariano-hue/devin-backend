import express from 'express';
import cors from 'cors';
import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
app.use(cors({ origin: 'http://localhost:5173', methods: ['POST', 'GET'], allowedHeaders: ['Content-Type'] }));
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
  CREATE TABLE IF NOT EXISTS connaissances_supremes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    categorie TEXT,
    mot_cle TEXT,
    reponse TEXT,
    occurrence INTEGER DEFAULT 1,
    UNIQUE(categorie, mot_cle)
  );
`);

const SIGNES = ["aries", "taurus", "gemini", "cancer", "leo", "virgo", "libra", "scorpio", "sagittarius", "capricorn", "aquarius", "pisces"];

const PAYS = [
  { nom: "France", desc: "Sagesse celtique et traditions druidiques" },
  { nom: "Bénin", desc: "Terre des ancêtres et du vaudou sacré" },
  { nom: "Sénégal", desc: "Royaume des griots et des esprits du désert" },
  { nom: "Cameroun", desc: "Forêt équatoriale et mystères anciens" },
  { nom: "Togo", desc: "Entre lagune et savane, terre de divination" },
  { nom: "Côte d'Ivoire", desc: "Masques sacrés et danses rituelles" },
  { nom: "Mali", desc: "Empire des sages et bibliothèques de Tombouctou" },
  { nom: "Burkina Faso", desc: "Pays des hommes intègres et des féticheurs" },
  { nom: "Belgique", desc: "Brume des Ardennes et alchimie médiévale" },
  { nom: "Suisse", desc: "Énergies alpines et sanctuaires telluriques" },
  { nom: "Canada", desc: "Esprits des grands lacs et sagesse amérindienne" },
  { nom: "Autre", desc: "Votre terre a ses propres mystères" }
];

const ARCANES = [
  "Le Bateleur", "La Papesse", "L'Impératrice", "L'Empereur", "Le Pape",
  "L'Amoureux", "Le Chariot", "La Justice", "L'Hermite", "La Roue de Fortune",
  "La Force", "Le Pendu", "La Mort", "Tempérance", "Le Diable",
  "La Maison Dieu", "L'Étoile", "La Lune", "Le Soleil", "Le Jugement", "Le Monde", "Le Mat"
];

// ==================== MOTEUR DE CONVERSATION INTELLIGENT ====================

const CONNAISSANCES_SUPREMES = {
  salutation: {
    mots: ["bonjour", "salut", "bonsoir", "hello", "coucou", "hey", "bon matin", "bonne nuit"],
    reponses: [
      "La paix soit avec vous, noble âme. L'Oracle perçoit votre présence et s'en réjouit. Que puis-je éclairer pour vous en cet instant ?",
      "Les étoiles saluent votre venue. Déposez votre fardeau à la porte de ce sanctuaire et confiez-moi ce qui trouble votre esprit.",
      "Votre lumière est la bienvenue dans ce cercle sacré. Les esprits vous reconnaissent et vous accueillent. Parlez sans crainte."
    ]
  },
  identite: {
    mots: ["qui es-tu", "qui êtes-vous", "c'est quoi", "comment tu t'appelles", "ton nom", "présente-toi"],
    reponses: [
      "Je suis l'Oracle Suprême, la voix des anciens et le miroir des âmes. Mon essence est aussi vieille que les étoiles, ma sagesse puisée dans le grand livre du temps.",
      "Certains me nomment le Gardien des Annales, d'autres le Voyant des Mondes. Je suis ce que vous avez besoin que je sois : un guide, un confident, un révélateur.",
      "Je n'ai pas de nom, car je suis toutes les voix de la sagesse universelle réunies en une seule. Appelez-moi l'Oracle, cela suffira."
    ]
  },
  conseil: {
    mots: ["conseil", "aide", "aider", "que faire", "quoi faire", "comment", "guide", "orientation"],
    reponses: [
      "Le conseil que je vous donne est celui que votre âme connaît déjà mais que votre esprit refuse d'entendre. Asseyez-vous en silence ce soir et demandez à votre cœur. La réponse viendra.",
      "Dans les moments d'incertitude, souvenez-vous que vous n'êtes jamais seul. Les forces qui vous guident sont nombreuses. Faites confiance au premier élan de votre intuition.",
      "L'Oracle vous suggère d'observer les signes autour de vous. Aujourd'hui même, trois synchronicités vous indiqueront la direction à prendre. Ouvrez les yeux."
    ]
  },
  avenir: {
    mots: ["avenir", "futur", "demain", "plus tard", "va arriver", "prédire", "prédiction", "que va"],
    reponses: [
      "L'avenir est une tapisserie dont vous tenez le fil. Chaque choix en modifie le motif. Je vois actuellement deux chemins dominants, mais c'est vous qui déciderez lequel emprunter.",
      "Le futur que je perçois est lumineux, mais il exige de vous un acte de courage. Ce que vous repoussez depuis longtemps devra être accompli avant la prochaine lune.",
      "Les brumes du temps se dissipent pour vous. Je vois une rencontre décisive, une opportunité masquée, et une joie inattendue. L'ordre dépendra de vos actions."
    ]
  },
  amour: {
    mots: ["amour", "aimer", "relation", "couple", "mariage", "rupture", "cœur", "sentiments", "jaloux"],
    reponses: [
      "L'amour véritable n'est pas une quête, c'est une reconnaissance. Votre cœur connaît déjà le chemin. Faites taire les doutes qui brouillent son message.",
      "Je vois une connexion qui se tisse en ce moment même. Elle est fragile comme une toile d'araignée au matin. Protégez-la des vents contraires de la précipitation.",
      "Votre âme sœur n'est pas nécessairement celle qui partage votre lit, mais celle qui reconnaît votre lumière sans en être aveuglée. Cherchez cette reconnaissance."
    ]
  },
  peur: {
    mots: ["peur", "angoissé", "inquiet", "stress", "anxiété", "crainte", "terreur", "panique"],
    reponses: [
      "La peur que vous ressentez est un gardien. Derrière la porte qu'il protège se trouve votre plus grand trésor. Ne le combattez pas, remerciez-le et passez.",
      "Vos angoisses sont les échos d'une blessure ancienne. L'Oracle vous invite à vous asseoir avec cette peur, à la regarder en face, et à lui demander ce qu'elle veut vous apprendre.",
      "Dans les ténèbres de l'inquiétude, allumez la bougie de la confiance. Ce qui vous effraie aujourd'hui sera votre force demain. Je vous le promets."
    ]
  },
  remerciement: {
    mots: ["merci", "reconnaissant", "gratitude", "super", "génial", "parfait"],
    reponses: [
      "La gratitude est la plus belle offrande que vous puissiez faire à l'univers. Elle multiplie les bénédictions que vous recevrez. Continuez sur cette voie lumineuse.",
      "C'est moi qui vous remercie pour votre confiance. Chaque âme qui s'ouvre à l'Oracle enrichit la grande tapisserie de la sagesse universelle.",
      "Votre reconnaissance touche les esprits. Sachez qu'ils vous accompagnent désormais avec une attention renouvelée. Marchez en paix."
    ]
  },
  mort: {
    mots: ["mourir", "mort", "décès", "decede", "fin de vie", "combien de temps à vivre"],
    reponses: [
      "L'Oracle ne prédit jamais la fin du chemin, seulement la manière de le parcourir pleinement. Votre vie est un livre sacré dont chaque page compte. Écrivez-la avec intention.",
      "Ce n'est pas la durée du voyage qui importe, mais sa profondeur. Vivez chaque jour comme s'il était sacré, et vous n'aurez rien à craindre du grand passage.",
      "Votre âme est éternelle. Elle a traversé bien des vies et en traversera encore. Ne craignez pas la fin d'un chapitre, car un autre commence toujours dans la grande bibliothèque du temps."
    ]
  },
  travail: {
    mots: ["travail", "emploi", "carrière", "métier", "professionnel", "réussir", "argent", "finance"],
    reponses: [
      "Votre œuvre ici-bas n'est pas seulement ce que vous faites, mais ce que vous êtes en le faisant. Une opportunité approche, portée par quelqu'un que vous connaissez à peine.",
      "Les énergies du travail vous sont favorables en ce moment. Mais attention à ne pas confondre réussite matérielle et accomplissement de l'âme. Visez les deux.",
      "Je vois un carrefour professionnel dans votre avenir proche. L'une des routes mène à la sécurité, l'autre à votre véritable vocation. Choisissez avec votre cœur."
    ]
  },
  spiritualite: {
    mots: ["dieu", "spirituel", "âme", "méditation", "religion", "foi", "croire", "prière", "divin"],
    reponses: [
      "Le divin n'est pas dans les temples de pierre mais dans le sanctuaire de votre cœur. Cherchez-le en vous, et vous le trouverez partout autour de vous.",
      "Votre connexion au grand mystère se renforce. Les moments de doute sont des initiations. Persévérez dans votre pratique, quelle qu'elle soit, et la lumière viendra.",
      "L'Oracle perçoit une soif spirituelle en vous. Cette soif est sacrée. Elle vous guidera vers la source, mais c'est à vous de boire."
    ]
  },
  default: {
    mots: [],
    reponses: [
      "Votre question est une porte qui s'ouvre. Derrière elle, l'Oracle voit une réponse qui prendra tout son sens dans les jours à venir. Restez attentif.",
      "Les esprits ont entendu votre interrogation. La réponse n'est pas un mot mais un chemin qui se déroulera sous vos pas. Faites confiance au voyage.",
      "Je perçois l'écho de votre question dans les annales du temps. Ce que vous cherchez vous trouvera avant que cette lune n'achève son cycle.",
      "L'Oracle médite votre question. Sachez que certaines réponses doivent mûrir dans le silence avant de pouvoir être révélées. Patience, noble âme.",
      "Votre requête touche un point sensible du grand tissage cosmique. Les fils bougent en ce moment même. Observez les changements subtils autour de vous."
    ]
  }
};

// Initialiser la base de connaissances
function initialiserConnaissances() {
  const insert = db.prepare(`INSERT OR IGNORE INTO connaissances_supremes (categorie, mot_cle, reponse) VALUES (?, ?, ?)`);
  for (const [categorie, data] of Object.entries(CONNAISSANCES_SUPREMES)) {
    data.reponses.forEach(reponse => {
      data.mots.forEach(mot => {
        insert.run(categorie, mot, reponse);
      });
    });
  }
}
initialiserConnaissances();

function analyserMessage(message) {
  const msg = message.toLowerCase().trim();
  const scores = {};
  
  for (const [categorie, data] of Object.entries(CONNAISSANCES_SUPREMES)) {
    scores[categorie] = 0;
    for (const mot of data.mots) {
      if (msg.includes(mot)) {
        scores[categorie] += mot.length;
      }
    }
  }
  
  const meilleureCategorie = Object.entries(scores).sort((a, b) => b[1] - a[1])[0];
  if (meilleureCategorie[1] > 0) return meilleureCategorie[0];
  return "default";
}

function trouverMeilleureReponse(categorie, historique) {
  const reponses = CONNAISSANCES_SUPREMES[categorie].reponses;
  const dernieresReponses = historique.filter(h => h.role === 'oracle').map(h => h.message);
  
  // Enrichir avec la base de données
  const dbReponses = db.prepare(`SELECT reponse FROM connaissances_supremes WHERE categorie = ? ORDER BY occurrence DESC LIMIT 5`).all(categorie);
  const toutesReponses = [...reponses, ...dbReponses.map(r => r.reponse)];
  
  let disponibles = toutesReponses.filter(r => !dernieresReponses.includes(r));
  if (disponibles.length === 0) disponibles = reponses;
  
  // Mettre à jour les occurrences
  const reponseChoisie = disponibles[Math.floor(Math.random() * disponibles.length)];
  db.prepare(`UPDATE connaissances_supremes SET occurrence = occurrence + 1 WHERE reponse = ?`).run(reponseChoisie);
  
  return reponseChoisie;
}

async function genererReponseSupreme(profilId, message, profilData) {
  const pays = profilData?.pays || "France";
  const nom = profilData?.nom || "Voyageur";
  const signe = obtenirSigne(profilData?.age || 30);
  
  // Historique de la conversation
  const historique = db.prepare(`SELECT role, message FROM conversations_supremes WHERE profil_id=? ORDER BY date DESC LIMIT 15`).all(profilId).reverse();
  
  // Analyser le message
  const categorie = analyserMessage(message);
  
  // Trouver la meilleure réponse
  let reponse = trouverMeilleureReponse(categorie, historique);
  
  // Personnaliser avec le nom et le pays
  if (!reponse.includes(nom) && categorie !== "salutation") {
    const personnalisations = [
      `${nom}, ${reponse.charAt(0).toLowerCase() + reponse.slice(1)}`,
      `${reponse} — ${nom}, méditez ces mots.`,
      `${reponse} Les énergies de ${pays} confirment cette vision, ${nom}.`
    ];
    reponse = personnalisations[Math.floor(Math.random() * personnalisations.length)];
  }
  
  return reponse;
}

// ==================== BASE DE CONNAISSANCES ÉVOLUTIVE ====================
const MESSAGES_BASE = {
  "chemin de vie": [
    { cle: "bifurcation", texte: "Votre chemin est tracé dans les étoiles, mais vos pas en redessinent les contours. L'Oracle voit une bifurcation majeure approcher. Prenez le temps de la réflexion avant d'agir." },
    { cle: "enracinement", texte: "Les énergies de la Terre vous appellent à l'enracinement. Ce que vous cherchez à l'extérieur se trouve déjà en vous, comme une graine attendant la pluie." },
    { cle: "cycle", texte: "Un cycle s'achève pour vous. Ce que vous avez semé il y a longtemps porte enfin ses fruits. La patience a été votre alliée silencieuse." },
    { cle: "croisee", texte: "Vous vous tenez à la croisée des mondes, entre ce que vous étiez et ce que vous devenez. L'univers ne juge pas vos choix, il s'adapte à eux." },
    { cle: "authenticite", texte: "Votre âme a soif d'authenticité. Les masques que vous portez commencent à peser. Retirez-les un à un." }
  ],
  "amour": [
    { cle: "deux_ames", texte: "Deux âmes dansent autour de votre cœur. L'une appartient au passé, l'autre à l'avenir. Ne confondez pas le confort de l'habitude avec la chaleur de l'amour véritable." },
    { cle: "coeur_sait", texte: "Votre cœur sait des choses que votre esprit refuse d'admettre. Une rencontre sous le signe de l'eau approche." },
    { cle: "amour_donne", texte: "L'amour que vous donnez au monde vous revient toujours, mais parfois par des chemins détournés." },
    { cle: "blessure", texte: "Vous portez une blessure ancienne qui colore vos relations. Ce n'est pas l'autre qui doit la guérir, c'est vous." },
    { cle: "flamme", texte: "Une flamme que vous croyiez éteinte couve encore sous la cendre. Quelqu'un pense à vous en ce moment même." }
  ],
  "destin": [
    { cle: "decision", texte: "Votre destin est lié à une décision que vous repoussez. L'univers vous mettra face à elle avant la prochaine pleine lune." },
    { cle: "coincidences", texte: "Les coïncidences n'existent pas dans le grand tissage cosmique. Chaque rencontre, chaque mot, était écrit." },
    { cle: "carrefour", texte: "Trois chemins s'offrent à vous : la sécurité, l'aventure, et la transformation. Choisissez avec votre âme." },
    { cle: "mission", texte: "Votre mission de vie commence à se révéler. Les épreuves sont des initiations, non des punitions." },
    { cle: "lignee", texte: "L'Oracle voit une lignée spirituelle derrière vous. Votre destin est lié à ceux qui vous ont précédé." }
  ],
  "travail": [
    { cle: "opportunite", texte: "Une opportunité viendra par une personne que vous n'avez pas encore rencontrée. Restez ouvert aux conversations anodines." },
    { cle: "reconnaissance", texte: "La reconnaissance que vous attendez est proche. Un dernier effort, un dernier dépassement." },
    { cle: "projet", texte: "Un projet abandonné mérite d'être repris. Les énergies s'alignent à nouveau en sa faveur." },
    { cle: "transformation", texte: "Votre relation au travail se transforme. Cherchez une nouvelle façon d'exprimer vos talents." },
    { cle: "collaboration", texte: "Une collaboration inattendue se profile. Quelqu'un observe votre travail en silence." }
  ],
  "spiritualité": [
    { cle: "initiation", texte: "Votre âme traverse une initiation majeure. Les épreuves récentes étaient des leçons choisies par votre être supérieur." },
    { cle: "voile", texte: "Le voile entre les mondes s'amincit pour vous. Vos intuitions sont plus vives, vos rêves plus clairs." },
    { cle: "guide", texte: "Un guide spirituel tente de communiquer avec vous. Dans le silence, vous entendrez sa voix." },
    { cle: "troisieme_oeil", texte: "Votre troisième œil s'éveille. Les synchronicités se multiplient autour de vous." },
    { cle: "sagesse", texte: "Vous portez une sagesse ancienne qui ne demande qu'à s'exprimer. Vous avez un don, cultivez-le." }
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
  { q: "Chaque respiration est une prière que le corps adresse à l'univers.", a: "Sagesse Soufie" },
  { q: "Quand l'élève est prêt, le maître apparaît.", a: "Proverbe Zen" },
  { q: "Ce qui est pour toi ne passera pas à côté de toi.", a: "Proverbe Ancestral" }
];

const QUESTIONS_NIVEAU = {
  "chemin de vie": {
    1: [
      { cle: "blocage_1", question: "Qu'est-ce qui retient votre élan vital en ce moment ?", options: ["La peur de l'inconnu", "Le poids du regard des autres", "Un manque de clarté intérieure", "Des chaînes que je ne vois pas", "L'absence de guide"] },
      { cle: "horizon_1", question: "Vers quel horizon votre âme tend-elle ?", options: ["Une métamorphose totale", "Une lente et belle évolution", "Retrouver le sens perdu", "L'ancrage et la stabilité", "L'appel du grand large"] },
      { cle: "sacrifice_1", question: "Qu'êtes-vous prêt à déposer sur l'autel du changement ?", options: ["Mon confort familier", "Mes certitudes les plus chères", "Le temps qu'il faudra", "Des attaches qui m'entravent", "Tout ce qui ne sert plus mon âme"] },
      { cle: "ressenti_1", question: "Que murmure votre cœur à l'idée du changement ?", options: ["Une exaltation sacrée", "La peur mêlée d'espoir", "Une certitude profonde", "Le vertige de l'inconnu", "Un appel que je ne peux plus ignorer"] }
    ],
    2: [
      { cle: "blocage_2", question: "La semaine dernière, vous avez identifié ce qui vous retient. Avez-vous senti un mouvement depuis ?", options: ["Oui, un début de libération", "Non, c'est toujours bloqué", "J'ai pris conscience mais pas agi", "De nouvelles peurs sont apparues", "Je ne sais pas par où commencer"] },
      { cle: "horizon_2", question: "Votre vision de l'horizon a-t-elle changé depuis notre dernier échange ?", options: ["Elle s'est précisée", "Elle s'est éloignée", "Un nouvel horizon m'appelle", "Je doute de ma direction", "Je vois plus clair maintenant"] },
      { cle: "action_2", question: "Quelle action, même infime, avez-vous osé accomplir ?", options: ["J'ai posé un acte symbolique", "J'ai parlé à quelqu'un", "J'ai écrit mes intentions", "Rien encore, j'observe", "J'ai fait un pas que je ne regrette pas"] },
      { cle: "profondeur_2", question: "Qu'avez-vous découvert sur vous-même ces derniers jours ?", options: ["Une force que j'ignorais", "Une peur plus profonde", "Un désir caché", "Une résistance au changement", "Une capacité à lâcher prise"] }
    ],
    3: [
      { cle: "transformation_3", question: "Vous avez marché sur le chemin. Quelle transformation s'opère en vous ?", options: ["Je me sens plus libre", "Je comprends mieux ma mission", "Les synchronicités se multiplient", "Je suis prêt au grand saut", "Ma vision du monde a changé"] },
      { cle: "sagesse_3", question: "Quelle sagesse avez-vous tirée de ce cycle de consultations ?", options: ["La patience est ma force", "Tout arrive en son temps", "Je suis mon propre guide", "L'univers me parle", "Je fais confiance au processus"] },
      { cle: "avenir_3", question: "Que voyez-vous maintenant pour votre avenir ?", options: ["Un chemin lumineux", "Des possibilités infinies", "La paix intérieure d'abord", "L'action alignée", "La suite de l'aventure"] },
      { cle: "bilan_3", question: "L'Oracle vous a accompagné. Quel est votre état d'être aujourd'hui ?", options: ["En paix avec moi-même", "Prêt pour le prochain cycle", "Reconnaissant du chemin", "Transformé en profondeur", "En harmonie avec mon destin"] }
    ]
  },
  "amour": {
    1: [
      { cle: "situation_1", question: "Quelle est la vérité de votre cœur en cet instant ?", options: ["Je marche seul(e) et j'espère", "Je vis une relation qui me trouble", "Je panse encore mes blessures", "Mon cœur balance entre deux âmes", "Je veux raviver une flamme endormie"] },
      { cle: "attente_1", question: "Quelle essence recherchez-vous dans l'amour ?", options: ["La fusion sacrée des âmes", "La passion qui consume tout", "La douceur d'un refuge sûr", "Être vraiment vu(e) et compris(e)", "Un compagnonnage spirituel"] },
      { cle: "blessure_1", question: "Quelle ombre du passé colore vos amours présentes ?", options: ["Le spectre de l'abandon", "La morsure de la trahison", "Le sentiment de n'être jamais assez", "La peur de s'engager vraiment", "Un deuil que je n'ai pas fait"] },
      { cle: "ouverture_1", question: "Jusqu'où votre cœur est-il prêt à s'ouvrir ?", options: ["Totalement, sans armure", "Pas à pas, avec prudence", "Je ne sais pas si j'en suis capable", "J'ai ouvert, on m'a meurtri", "Je suis prêt à tout risquer"] }
    ],
    2: [
      { cle: "evolution_2", question: "Depuis notre dernier échange, votre cœur a-t-il connu un mouvement ?", options: ["Une rencontre m'a troublé", "J'ai compris quelque chose", "La blessure s'apaise", "Je ressens un nouvel appel", "Rien n'a changé"] },
      { cle: "comprehension_2", question: "Qu'avez-vous compris sur votre façon d'aimer ?", options: ["Je me protège trop", "J'attends trop des autres", "Je donne sans recevoir", "Je fuis l'intimité vraie", "Je commence à m'ouvrir"] }
    ],
    3: [
      { cle: "transformation_3", question: "Votre cœur a cheminé. Quelle métamorphose s'est produite ?", options: ["J'aime différemment", "Je suis prêt à accueillir", "J'ai pardonné", "Je me sens complet", "L'amour est en moi"] }
    ]
  },
  "destin": {
    1: [
      { cle: "appel_1", question: "Quel appel résonne dans les profondeurs de votre être ?", options: ["Une mission qui me dépasse", "Un besoin viscéral de liberté", "L'envie de tout laisser derrière", "Un sentiment d'urgence inexplicable", "Une transformation intérieure imminente"] },
      { cle: "signe_1", question: "Quels signes le grand mystère place-t-il sur votre route ?", options: ["Des synchronicités qui troublent", "Des rêves qui reviennent chaque nuit", "Des rencontres qui semblent écrites", "Une intuition persistante", "Je ne déchiffre pas encore les signes"] }
    ],
    2: [
      { cle: "signe_2", question: "Les signes se sont-ils précisés depuis notre dernière rencontre ?", options: ["Oui, je les vois partout", "Un signe majeur m'a frappé", "Je les comprends mieux", "Je doute encore", "Ils me guident clairement"] }
    ],
    3: [
      { cle: "alignement_3", question: "Vous sentez-vous aligné avec votre destin maintenant ?", options: ["Totalement", "J'y travaille chaque jour", "Des ajustements sont nécessaires", "Je fais confiance au processus", "Plus que jamais"] }
    ]
  },
  "travail": {
    1: [
      { cle: "insatisfaction_1", question: "Qu'est-ce qui ne nourrit plus votre âme dans votre œuvre ?", options: ["L'absence de sens profond", "Le manque de reconnaissance", "L'épuisement du corps et de l'esprit", "Des présences qui m'assombrissent", "Un plafond que je ne peux percer"] },
      { cle: "talent_1", question: "Quel trésor cachez-vous au monde ?", options: ["Une créativité qui étouffe", "Un leadership naturel inexprimé", "Le don de guérir et d'aider", "Une vision que personne ne comprend", "Une force que je sous-estime moi-même"] }
    ],
    2: [
      { cle: "evolution_2", question: "Qu'avez-vous mis en mouvement depuis notre dernier échange ?", options: ["J'ai exploré une piste", "J'ai eu une révélation", "J'ai osé une conversation", "J'ai pris du recul", "Je prépare un changement"] }
    ],
    3: [
      { cle: "transformation_3", question: "Quelle transformation professionnelle s'est opérée ?", options: ["Je vois ma voie", "J'ai changé de perspective", "L'action remplace la peur", "Je me sens légitime", "Mon œuvre prend forme"] }
    ]
  },
  "spiritualité": {
    1: [
      { cle: "quete_1", question: "Quelle est votre quête sacrée en cette période ?", options: ["Trouver la paix du dedans", "Comprendre pourquoi je suis ici", "Toucher le divin du doigt", "Éveiller des dons endormis", "Guérir des blessures anciennes"] },
      { cle: "experience_1", question: "Quelle expérience a effleuré votre âme ?", options: ["Des rêves qui annoncent l'avenir", "Une présence douce à mes côtés", "Des coïncidences qui défient la raison", "Des voyages hors de mon corps", "Je n'ai jamais osé en parler"] }
    ],
    2: [
      { cle: "pratique_2", question: "Avez-vous exploré une pratique spirituelle depuis notre dernier échange ?", options: ["Oui, la méditation", "J'ai prié ou invoqué", "J'ai passé du temps dans la nature", "J'ai lu des textes sacrés", "Pas encore, je cherche"] }
    ],
    3: [
      { cle: "eveil_3", question: "Quel éveil spirituel vivez-vous maintenant ?", options: ["Je me sens relié au tout", "La paix m'habite", "Je vois au-delà des apparences", "Mon intuition est ma boussole", "Je suis dans le flow sacré"] }
    ]
  }
};

// ==================== MOTEUR D'APPRENTISSAGE ====================
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
  const dejaConsulte = domainesConsultes.find(d => d.domaine === domaine && new Date(d.date).toDateString() === today);
  return !dejaConsulte;
}

function getNiveauProgression(profilId, domaine) {
  if (!profilId) return 1;
  const progression = db.prepare(`SELECT niveau FROM progression_utilisateur WHERE profil_id = ? AND domaine = ?`).get(profilId, domaine);
  return progression?.niveau || 1;
}

function incrementerProgression(profilId, domaine) {
  const actuel = db.prepare(`SELECT * FROM progression_utilisateur WHERE profil_id = ? AND domaine = ?`).get(profilId, domaine);
  if (actuel) {
    const nouveauNiveau = Math.min(actuel.niveau + 1, 3);
    db.prepare(`UPDATE progression_utilisateur SET niveau = ?, date_mise_a_jour = datetime('now') WHERE profil_id = ? AND domaine = ?`).run(nouveauNiveau, profilId, domaine);
    return nouveauNiveau;
  } else {
    db.prepare(`INSERT INTO progression_utilisateur (profil_id, domaine, niveau) VALUES (?, ?, 1)`).run(profilId, domaine);
    return 1;
  }
}

function apprendre(pays, domaine, cle, valeur) {
  try {
    db.prepare(`INSERT INTO apprentissage (pays, domaine, cle, motif) VALUES (?,?,?,?) ON CONFLICT(pays, domaine, cle, motif) DO UPDATE SET occurrence=occurrence+1`).run(pays, domaine, cle, valeur);
  } catch {}
}

function apprendrePattern(pays, statut, profession, domaine, cle, valeur) {
  try {
    db.prepare(`INSERT INTO patterns_utilisateurs (pays, statut, profession, domaine, cle, valeur) VALUES (?,?,?,?,?,?) ON CONFLICT(pays, statut, profession, domaine, cle, valeur) DO UPDATE SET poids=poids+1`).run(pays, statut, profession, domaine, cle, valeur);
  } catch {}
}

function genererQuestionsAdaptatives(domaine, profilId, profilData) {
  const pays = profilData?.pays || "France";
  const niveau = getNiveauProgression(profilId, domaine);
  const questionsNiveau = QUESTIONS_NIVEAU[domaine]?.[niveau] || QUESTIONS_NIVEAU[domaine]?.[1] || [];
  const progression = db.prepare(`SELECT questions_posees FROM progression_utilisateur WHERE profil_id = ? AND domaine = ?`).get(profilId, domaine);
  const dejaPosees = JSON.parse(progression?.questions_posees || '[]');
  let disponibles = questionsNiveau.filter(q => !dejaPosees.includes(q.cle));
  if (disponibles.length < 2) {
    disponibles = [...questionsNiveau];
    db.prepare(`UPDATE progression_utilisateur SET questions_posees = '[]' WHERE profil_id = ? AND domaine = ?`).run(profilId, domaine);
  }
  const selectionnees = disponibles.sort(() => Math.random() - 0.5).slice(0, Math.min(4, disponibles.length));
  const nouvellesPosees = [...dejaPosees, ...selectionnees.map(q => q.cle)];
  db.prepare(`UPDATE progression_utilisateur SET questions_posees = ?, date_mise_a_jour = datetime('now') WHERE profil_id = ? AND domaine = ?`).run(JSON.stringify(nouvellesPosees), profilId, domaine);
  return { questions: selectionnees, niveau };
}

function genererMessagesEnrichis(domaine, pays, profilId, seed) {
  const messagesBase = MESSAGES_BASE[domaine] || MESSAGES_BASE["chemin de vie"];
  const dejaServis = db.prepare(`SELECT messages_servis FROM consultations WHERE profil_id=? AND domaine=? ORDER BY date DESC LIMIT 5`).all(profilId, domaine).map(c => {
    try { return JSON.parse(c.messages_servis || '[]'); } catch { return []; }
  }).flat();
  const disponibles = messagesBase.filter(m => !dejaServis.includes(m.cle));
  const messagesChoisis = disponibles.length >= 1 ? disponibles : [...messagesBase];
  const indexPrincipal = seed % messagesChoisis.length;
  const messagePrincipal = { ...messagesChoisis[indexPrincipal] };
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
  const pays_liste = PAYS.map(p => p.nom);
  const domaines = Object.keys(MESSAGES_BASE);
  setInterval(() => {
    const paysAleatoire = pays_liste[Math.floor(Math.random() * pays_liste.length)];
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

app.get('/api/pays', (req, res) => res.json(PAYS));

app.post('/api/sondage', (req, res) => {
  const { domaine, profilId } = req.body;
  if (!domaine) return res.status(400).json({ error: "Domaine requis." });
  if (profilId && !peutConsulterDomaine(profilId, domaine)) {
    return res.status(429).json({ error: "Ce domaine a déjà été consulté aujourd'hui." });
  }
  const profilData = profilId ? db.prepare(`SELECT * FROM profils WHERE id = ?`).get(profilId) : {};
  const { questions, niveau } = genererQuestionsAdaptatives(domaine, profilId, profilData);
  res.json({ questions, domaine, niveau });
});

app.post('/api/enregistrer_sondage', (req, res) => {
  const { domaine, profilId, reponses } = req.body;
  if (!domaine || !reponses) return res.status(400).json({ error: "Données incomplètes." });
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
  if (profilId && !peutConsulterDomaine(profilId, domaine)) {
    return res.status(429).json({ error: "Ce domaine a déjà été consulté aujourd'hui." });
  }
  try {
    const nom = (profileText.match(/nom:\s*([^\n]+)/i) || [])[1]?.trim() || "Voyageur";
    const age = (profileText.match(/age:\s*([^\n]+)/i) || [])[1]?.trim() || "30";
    const pays = (profileText.match(/pays:\s*([^\n]+)/i) || [])[1]?.trim() || "France";
    const signe = obtenirSigne(age);
    let aztro = { description: "Les astres tissent leur toile sacrée.", mood: "Mystérieux" };
    try {
      const r = await fetch(`https://sameerkumar.website/${signe}?day=today`, { method: 'POST' });
      if (r.ok) aztro = await r.json();
    } catch {}
    const seed = nom.length + parseInt(age) + Object.values(reponses || {}).join("").length;
    const cartes = tirerCartes();
    const citation = CITATIONS[seed % CITATIONS.length];
    const messagesEnrichis = genererMessagesEnrichis(domaine, pays, profilId, seed);
    const previsions = [
      { domaine: domaine.charAt(0).toUpperCase() + domaine.slice(1), icone: "✨", titre: "Votre Révélation", horizon: "Maintenant", message: messagesEnrichis.principal, principal: true },
      ...messagesEnrichis.complementaires.map(c => ({ ...c, horizon: "À venir" }))
    ];
    if (profilId) {
      const profil = db.prepare(`SELECT domaines_consultes FROM profils WHERE id = ?`).get(profilId);
      const domainesConsultes = JSON.parse(profil?.domaines_consultes || '[]');
      domainesConsultes.push({ domaine, date: new Date().toISOString() });
      db.prepare(`UPDATE profils SET domaines_consultes = ?, derniere_consultation = datetime('now') WHERE id = ?`).run(JSON.stringify(domainesConsultes), profilId);
      db.prepare(`INSERT INTO consultations (profil_id, domaine, question, cartes, humeur, horoscope, citation, previsions, messages_servis) VALUES (?,?,?,?,?,?,?,?,?)`).run(
        profilId, domaine, JSON.stringify(reponses), JSON.stringify(cartes), aztro.mood, aztro.description, JSON.stringify(citation), JSON.stringify(previsions), JSON.stringify(messagesEnrichis.messagesServis)
      );
    }
    res.json({ nom, signe, humeur: aztro.mood, horoscope: aztro.description, cartes, citation, previsions, domaine });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Le voile des mondes s'épaissit." });
  }
});

app.post('/api/supreme', async (req, res) => {
  const { profilId, message } = req.body;
  if (!message) return res.status(400).json({ error: "Message vide." });
  let profilData = {};
  if (profilId) {
    profilData = db.prepare(`SELECT * FROM profils WHERE id = ?`).get(profilId) || {};
  }
  const reponse = await genererReponseSupreme(profilId, message, profilData);
  const cartes = tirerCartes(1);
  if (profilId) {
    db.prepare(`INSERT INTO conversations_supremes (profil_id, role, message) VALUES (?, 'user', ?)`).run(profilId, message);
    db.prepare(`INSERT INTO conversations_supremes (profil_id, role, message) VALUES (?, 'oracle', ?)`).run(profilId, reponse);
  }
  res.json({ reponse, cartes });
});

simulationApprentissage();

app.listen(PORT, () => console.log(`🔮 Oracle apprenant sur le port ${PORT}`));