import { randomBytes } from "node:crypto";
import { chmod, readFile, writeFile } from "node:fs/promises";

const key = "WORKFLOW_INTERNAL_TOKEN";
const files = [".env.local", ".env.n8n.local"];

async function existing(path: string) {
  try {
    const content = await readFile(path, "utf8");
    const values = content.split(/\r?\n/).filter(line => line.startsWith(`${key}=`)).map(line => line.slice(key.length + 1));
    if (values.length > 1) throw new Error(`Hay varias entradas ${key} en ${path}.`);
    return { content, token: values[0] || null, hasEntry: values.length === 1 };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return { content: "", token: null, hasEntry: false };
    throw error;
  }
}

async function main() {
  const entries = await Promise.all(files.map(existing));
  const tokens = entries.map(entry => entry.token).filter((token): token is string => !!token);
  if (tokens.some(token => token.length < 32 || token !== tokens[0])) throw new Error("Los archivos locales contienen tokens distintos o demasiado cortos; corrige la configuración antes de continuar.");
  const token = tokens[0] ?? randomBytes(32).toString("hex");
  for (let index = 0; index < files.length; index++) {
    const entry = entries[index];
    if (!entry.token) {
      const newline = entry.content && !entry.content.endsWith("\n") ? "\n" : "";
      const content = entry.hasEntry ? entry.content.replace(/^WORKFLOW_INTERNAL_TOKEN=\r?$/m, `${key}=${token}`) : `${entry.content}${newline}${key}=${token}\n`;
      await writeFile(files[index], content, { mode: 0o600 });
    }
    await chmod(files[index], 0o600);
  }
  console.log("Token local de n8n y Next.js sincronizado; valor omitido.");
}

main().catch(error => { console.error(error instanceof Error ? error.message : "No se pudo configurar el token."); process.exitCode = 1; });
