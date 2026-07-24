import "dotenv/config";
import { createClient } from "@libsql/client";

const url = process.env.TURSO_DATABASE_URL || "file:oracle.db";
const authToken = process.env.TURSO_AUTH_TOKEN || undefined;
const client = createClient({ url, authToken });

function normaliserArguments(args) {
  return args.map(value => value === undefined ? null : value);
}

export const db = {
  async pragma() {
    // Turso gère lui-même le journal et la réplication.
  },

  async exec(sql) {
    const statements = sql
      .split(";")
      .map(statement => statement.trim())
      .filter(Boolean)
      .map(statement => ({ sql: statement, args: [] }));
    if (statements.length) await client.batch(statements, "write");
  },

  prepare(sql) {
    return {
      async get(...args) {
        const result = await client.execute({ sql, args: normaliserArguments(args) });
        return result.rows[0];
      },
      async all(...args) {
        const result = await client.execute({ sql, args: normaliserArguments(args) });
        return result.rows;
      },
      async run(...args) {
        return client.execute({ sql, args: normaliserArguments(args) });
      }
    };
  },

  async close() {
    client.close();
  }
};

export const databaseInfo = {
  provider: url.startsWith("libsql://") || url.startsWith("https://") ? "turso" : "sqlite-local",
  url: url.startsWith("file:") ? url : "remote"
};
