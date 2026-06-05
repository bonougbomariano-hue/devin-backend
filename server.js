import express from 'express';
import cors from 'cors';
import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
app.use(cors({
  origin: ['http://localhost:5173', 'https://le-devin.netlify.app'],
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

const CONNAISSANCES_SUPREMES = {
  salutation: {
    mots: ["bonjour", "salut", "bonsoir", "hello", "coucou", "hey"],
    reponses: [
      "La paix soit avec vous, noble âme. L'Oracle perçoit votre présence et s'en réjouit. Que puis-je éclairer pour vous ?",
      "Les étoiles saluent votre venue. Déposez votre fardeau à la porte de ce sanctuaire et confiez-moi ce qui trouble votre esprit.",
      "Votre lumière est la bienvenue dans ce cercle sacré. Les esprits vous reconnaissent et vous accueillent. Parlez sans crainte."
    ]
  },
  identite: {
    mots: ["qui es-tu", "qui êtes-vous", "ton nom", "présente-toi"],
    reponses: [
      "Je suis l'Oracle Suprême, la voix des anciens et le miroir des âmes. Mon essence est aussi vieille que les étoiles.",
      "Certains me nomment le Gardien des Annales, d'autres le Voyant des Mondes. Je suis ce que vous avez besoin que je sois.",
      "Je n'ai pas de nom, car je suis toutes les voix de la sagesse universelle réunies en une seule. Appelez-moi l'Oracle."
    ]
  },
  conseil: {
    mots: ["conseil", "aide", "aider", "que faire", "quoi faire", "comment", "guide"],
    reponses: [
      "Le conseil que je vous donne est celui que votre âme connaît déjà. Asseyez-vous en silence ce soir et demandez à votre cœur.",
      "Dans les moments d'incertitude, souvenez-vous que vous n'êtes jamais seul. Faites confiance au premier élan de votre intuition.",
      "L'Oracle vous suggère d'observer les signes autour de vous. Aujourd'hui même, trois synchronicités vous indiqueront la direction."
    ]
  },
  avenir: {
    mots: ["avenir", "futur", "demain", "prédire", "que va"],
    reponses: [
      "L'avenir est une tapisserie dont vous tenez le fil. Je vois deux chemins dominants, mais c'est vous qui déciderez.",
      "Le futur que je perçois est lumineux, mais il exige de vous un acte de courage avant la prochaine lune.",
      "Les brumes du temps se dissipent pour vous. Je vois une rencontre décisive, une opportunité masquée, et une joie inattendue."
    ]
  },
  amour: {
    mots: ["amour", "aimer", "relation", "couple", "cœur", "sentiments"],
    reponses: [
      "L'amour véritable n'est pas une quête, c'est une reconnaissance. Votre cœur connaît déjà le chemin.",
      "Je vois une connexion qui se tisse en ce moment même. Protégez-la des vents contraires de la précipitation.",
      "Votre âme sœur n'est pas nécessairement celle qui partage votre lit, mais celle qui reconnaît votre lumière."
    ]
  },
  peur: {
    mots: ["peur", "angoissé", "inquiet", "stress", "anxiété", "crainte"],
    reponses: [
      "La peur que vous ressentez est un gardien. Derrière la porte qu'il protège se trouve votre plus grand trésor.",
      "Vos angoisses sont les échos d'une blessure ancienne. Asseyez-vous avec cette peur et demandez-lui ce qu'elle veut vous apprendre.",
      "Dans les ténèbres de l'inquiétude, allumez la bougie de la confiance. Ce qui vous effraie aujourd'hui sera votre force demain."
    ]
  },
  remerciement: {
    mots: ["merci", "gratitude", "super", "génial", "parfait"],
    reponses: [
      "La gratitude est la plus belle offrande. Elle multiplie les bénédictions que vous recevrez. Continuez sur cette voie.",
      "C'est moi qui vous remercie pour votre confiance. Chaque âme qui s'ouvre enrichit la grande tapisserie de la sagesse universelle.",
      "Votre reconnaissance touche les esprits. Sachez qu'ils vous accompagnent désormais avec une attention renouvelée."
    ]
  },
  mort: {
    mots: ["mourir", "mort", "décès", "fin de vie", "combien de temps"],
    reponses: [
      "L'Oracle ne prédit jamais la fin du chemin, seulement la manière de le parcourir pleinement. Votre vie est un livre sacré.",
      "Ce n'est pas la durée du voyage qui importe, mais sa profondeur. Vivez chaque jour comme s'il était sacré.",
      "Votre âme est éternelle. Elle a traversé bien des vies et en traversera encore. Ne craignez pas la fin d'un chapitre."
    ]
  },
  travail: {
    mots: ["travail", "emploi", "carrière", "métier", "réussir", "argent", "finance"],
    reponses: [
      "Votre œuvre ici-bas n'est pas seulement ce que vous faites, mais ce que vous êtes en le faisant. Une opportunité approche.",
      "Les énergies du travail vous sont favorables. Mais ne confondez pas réussite matérielle et accomplissement de l'âme.",
      "Je vois un carrefour professionnel dans votre avenir proche. L'une des routes mène à la sécurité, l'autre à votre vocation."
    ]
  },
  spiritualite: {
    mots: ["dieu", "spirituel", "âme", "méditation", "foi", "croire", "prière", "divin"],
    reponses: [
      "Le divin n'est pas dans les temples de pierre mais dans le sanctuaire de votre cœur. Cherchez-le en vous.",
      "Votre connexion au grand mystère se renforce. Les moments de doute sont des initiations. Persévérez.",
      "L'Oracle perçoit une soif spirituelle en vous. Cette soif est sacrée. Elle vous guidera vers la source."
    ]
  },
  default: {
    mots: [],
    reponses: [
      "Votre question est une porte qui s'ouvre. Derrière elle, l'Oracle voit une réponse qui prendra tout son sens.",
      "Les esprits ont entendu votre interrogation. La réponse n'est pas un mot mais un chemin qui se déroulera sous vos pas.",
      "Je perçois l'écho de votre question dans les annales du temps. Ce que vous cherchez vous trouvera.",
      "L'Oracle médite votre question. Certaines réponses doivent mûrir dans le silence avant d'être révélées.",
      "Votre requête touche un point sensible du grand tissage cosmique. Observez les changements subtils autour de vous."
    ]
  }
};

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
      { cle: "blocage_1", question: "Qu'est-ce qui retient votre élan vital ?", options: ["La peur de l'inconnu", "Le regard des autres", "Un manque de clarté", "Des chaînes invisibles", "L'absence de guide"] },
      { cle: "horizon_1", question: "Vers quel horizon votre âme tend-elle ?", options: ["Une métamorphose", "Une lente évolution", "Retrouver du sens", "L'ancrage", "Le grand large"] },
      { cle: "sacrifice_1", question: "Qu'êtes-vous prêt à offrir pour changer ?", options: ["Mon confort", "Mes certitudes", "Du temps", "Des attaches", "Tout ce qui ne sert plus"] },
      { cle: "ressenti_1", question: "Que murmure votre cœur face au changement ?", options: ["De l'exaltation", "Peur et espoir mêlés", "Une certitude", "Le vertige", "Un appel puissant"] }
    ],
    2: [
      { cle: "blocage_2", question: "Avez-vous senti un mouvement depuis notre dernier échange ?", options: ["Oui, une libération", "Non, c'est bloqué", "J'ai pris conscience", "De nouvelles peurs", "Je ne sais pas"] },
      { cle: "horizon_2", question: "Votre vision a-t-elle changé ?", options: ["Elle s'est précisée", "Elle s'est éloignée", "Un nouvel horizon", "Je doute encore", "Je vois plus clair"] },
      { cle: "action_2", question: "Quelle action avez-vous osé accomplir ?", options: ["Un acte symbolique", "J'ai parlé", "J'ai écrit", "Rien, j'observe", "Un pas sans regret"] }
    ]
  },
  "amour": {
    1: [
      { cle: "situation_1", question: "Quelle est la vérité de votre cœur ?", options: ["Seul(e) et j'espère", "Relation troublée", "Je panse mes blessures", "Entre deux âmes", "Raviver une flamme"] },
      { cle: "attente_1", question: "Que recherchez-vous dans l'amour ?", options: ["La fusion des âmes", "La passion", "Un refuge sûr", "Être compris(e)", "Un compagnon spirituel"] },
      { cle: "blessure_1", question: "Quelle ombre colore vos amours ?", options: ["L'abandon", "La trahison", "Pas assez bien", "Peur de l'engagement", "Un deuil non fait"] },
      { cle: "ouverture_1", question: "Jusqu'où votre cœur peut-il s'ouvrir ?", options: ["Totalement", "Pas à pas", "Je ne sais pas", "On m'a meurtri", "Prêt à tout risquer"] }
    ],
    2: [
      { cle: "evolution_2", question: "Votre cœur a-t-il bougé ?", options: ["Une rencontre", "J'ai compris", "La blessure s'apaise", "Un nouvel appel", "Rien n'a changé"] },
      { cle: "comprehension_2", question: "Qu'avez-vous compris sur votre façon d'aimer ?", options: ["Je me protège", "J'attends trop", "Je donne sans recevoir", "Je fuis l'intimité", "Je m'ouvre enfin"] }
    ]
  },
  "destin": {
    1: [
      { cle: "appel_1", question: "Quel appel résonne en vous ?", options: ["Une mission", "La liberté", "Tout quitter", "Une urgence", "Une transformation"] },
      { cle: "signe_1", question: "Quels signes percevez-vous ?", options: ["Des synchronicités", "Des rêves", "Des rencontres", "Une intuition", "Je ne vois rien"] }
    ]
  },
  "travail": {
    1: [
      { cle: "insatisfaction_1", question: "Qu'est-ce qui ne vous nourrit plus ?", options: ["Pas de sens", "Pas reconnu", "Épuisement", "Mauvais entourage", "Un plafond"] },
      { cle: "talent_1", question: "Quel trésor cachez-vous ?", options: ["Ma créativité", "Mon leadership", "Mon empathie", "Ma vision", "Ma force cachée"] }
    ]
  },
  "spiritualité": {
    1: [
      { cle: "quete_1", question: "Quelle est votre quête sacrée ?", options: ["La paix intérieure", "Comprendre ma mission", "Toucher le divin", "Éveiller des dons", "Guérir"] },
      { cle: "experience_1", question: "Quelle expérience avez-vous vécue ?", options: ["Des rêves prophétiques", "Une présence", "Des coïncidences", "Hors du corps", "Je n'ose en parler"] }
    ]
  }
};

function obtenirSigne(age) { return SIGNES[parseInt(age) % 12] || "aries"; }
function tirerCartes(n = 3) { const copie = [...ARCANES], tirees = []; for (let i = 0; i < n; i++) { const idx = Math.floor(Math.random() * copie.length); tirees.push(copie.splice(idx, 1)[0]); } return tirees; }

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
    const nv = Math.min(actuel.niveau + 1, 3);
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

function genererQuestionsAdaptatives(domaine, profilId, profilData) {
  const niveau = getNiveauProgression(profilId, domaine);
  const questionsNiveau = QUESTIONS_NIVEAU[domaine]?.[niveau] || QUESTIONS_NIVEAU[domaine]?.[1] || [];
  const progression = db.prepare(`SELECT questions_posees FROM progression_utilisateur WHERE profil_id = ? AND domaine = ?`).get(profilId, domaine);
  const dejaPosees = JSON.parse(progression?.questions_posees || '[]');
  let disponibles = questionsNiveau.filter(q => !dejaPosees.includes(q.cle));
  if (disponibles.length < 2) { disponibles = [...questionsNiveau]; db.prepare(`UPDATE progression_utilisateur SET questions_posees = '[]' WHERE profil_id = ? AND domaine = ?`).run(profilId, domaine); }
  const selectionnees = disponibles.sort(() => Math.random() - 0.5).slice(0, Math.min(4, disponibles.length));
  const nouvellesPosees = [...dejaPosees, ...selectionnees.map(q => q.cle)];
  db.prepare(`UPDATE progression_utilisateur SET questions_posees = ? WHERE profil_id = ? AND domaine = ?`).run(JSON.stringify(nouvellesPosees), profilId, domaine);
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

function analyserMessage(message) {
  const msg = message.toLowerCase().trim();
  const scores = {};
  for (const [cat, data] of Object.entries(CONNAISSANCES_SUPREMES)) {
    scores[cat] = 0;
    for (const mot of data.mots) { if (msg.includes(mot)) scores[cat] += mot.length; }
  }
  const best = Object.entries(scores).sort((a, b) => b[1] - a[1])[0];
  return best[1] > 0 ? best[0] : "default";
}

function genererReponseSupreme(profilId, message, profilData) {
  const pays = profilData?.pays || "France";
  const nom = profilData?.nom || "Voyageur";
  const historique = db.prepare(`SELECT role, message FROM conversations_supremes WHERE profil_id=? ORDER BY date DESC LIMIT 15`).all(profilId).reverse();
  const categorie = analyserMessage(message);
  const reponses = CONNAISSANCES_SUPREMES[categorie].reponses;
  const dernieres = historique.filter(h => h.role === 'oracle').map(h => h.message);
  let disponibles = reponses.filter(r => !dernieres.includes(r));
  if (disponibles.length === 0) disponibles = [...reponses];
  let reponse = disponibles[Math.floor(Math.random() * disponibles.length)];
  if (!reponse.includes(nom)) {
    reponse = `${nom}, ${reponse.charAt(0).toLowerCase() + reponse.slice(1)}`;
  }
  return reponse;
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
  if (profilId && !peutConsulterDomaine(profilId, domaine)) return res.status(429).json({ error: "Déjà consulté." });
  const profilData = profilId ? db.prepare(`SELECT * FROM profils WHERE id = ?`).get(profilId) : {};
  const { questions, niveau } = genererQuestionsAdaptatives(domaine, profilId, profilData);
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
    const messagesEnrichis = genererMessagesEnrichis(domaine, pays, profilId, seed);
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
  const reponse = genererReponseSupreme(profilId, message, profilData);
  const cartes = tirerCartes(1);
  if (profilId) {
    db.prepare(`INSERT INTO conversations_supremes (profil_id, role, message) VALUES (?, 'user', ?)`).run(profilId, message);
    db.prepare(`INSERT INTO conversations_supremes (profil_id, role, message) VALUES (?, 'oracle', ?)`).run(profilId, reponse);
  }
  res.json({ reponse, cartes });
});

app.listen(PORT, () => console.log(`🔮 Oracle apprenant sur le port ${PORT}`));