import "dotenv/config";
import { DatabaseSync } from "node:sqlite";
import { resolve } from "node:path";
import { createClient } from "@libsql/client";

const tables = [
  "profils",
  "consultations",
  "conversations_supremes",
  "apprentissage",
  "patterns_utilisateurs",
  "questions_generees",
  "messages_generees",
  "progression_utilisateur",
  "fragments_appris",
  "memoire_utilisateur",
  "personnalisation",
  "tirages_sixieme_sens"
];

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;
if (!url || !url.startsWith("libsql://") || !authToken) {
  console.error("TURSO_DATABASE_URL et TURSO_AUTH_TOKEN sont requis.");
  process.exit(1);
}

const sourcePath = resolve(process.argv[2] || "oracle.db");
const source = new DatabaseSync(sourcePath, { readOnly: true });
const destination = createClient({ url, authToken });

try {
  for (const table of tables) {
    const existe = source.prepare(
      "SELECT 1 FROM sqlite_master WHERE type='table' AND name=?"
    ).get(table);
    if (!existe) continue;

    const colonnes = source.prepare(`PRAGMA table_info("${table}")`).all().map(c => c.name);
    const lignes = source.prepare(`SELECT * FROM "${table}"`).all();
    if (!lignes.length) {
      console.log(`${table}: 0 ligne`);
      continue;
    }

    const marqueurs = colonnes.map(() => "?").join(", ");
    const sql = `INSERT OR REPLACE INTO "${table}" (${colonnes.map(c => `"${c}"`).join(", ")}) VALUES (${marqueurs})`;
    for (let i = 0; i < lignes.length; i += 50) {
      const lot = lignes.slice(i, i + 50).map(ligne => ({
        sql,
        args: colonnes.map(c => typeof ligne[c] === "bigint" ? Number(ligne[c]) : ligne[c])
      }));
      await destination.batch(lot, "write");
    }
    console.log(`${table}: ${lignes.length} ligne(s) importée(s)`);
  }
  console.log("Migration Turso terminée.");
} finally {
  source.close();
  destination.close();
}
