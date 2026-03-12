import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

function loadLocalEnv(filePath) {
  if (!existsSync(filePath)) return;

  const raw = readFileSync(filePath, "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIndex = trimmed.indexOf("=");
    if (eqIndex < 0) continue;
    const key = trimmed.slice(0, eqIndex).trim();
    const value = trimmed.slice(eqIndex + 1).trim();
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

loadLocalEnv(resolve(process.cwd(), ".env.local"));

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local");
  process.exitCode = 1;
} else {
  const selectResponse = await fetch(`${url}/rest/v1/debates?select=id,created_at&limit=1`, {
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`
    }
  });

  if (!selectResponse.ok) {
    const errorText = await selectResponse.text();
    console.error("Supabase connection test failed during select:", errorText);
    process.exitCode = 1;
  } else {
    const insertResponse = await fetch(`${url}/rest/v1/debates`, {
      method: "POST",
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        Prefer: "return=representation"
      },
      body: JSON.stringify({
        topic: "connection-test",
        messages: [
          { role: "assistant", content: "connection-test", timestamp: new Date().toISOString() }
        ]
      })
    });

    if (!insertResponse.ok) {
      const errorText = await insertResponse.text();
      console.error("Supabase connection test failed during insert:", errorText);
      process.exitCode = 1;
    } else {
      const insertedRows = await insertResponse.json();
      console.log("Supabase connection test passed. Inserted debate id:", insertedRows[0]?.id);
    }
  }
}
