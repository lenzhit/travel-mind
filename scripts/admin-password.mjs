import { randomBytes, scryptSync } from "node:crypto";

if (!process.stdin.isTTY) {
  console.error("Ejecuta este comando en una terminal interactiva.");
  process.exit(1);
}
process.stdout.write("Nueva contraseña administrativa (mínimo 12 caracteres, entrada oculta): ");
process.stdin.setRawMode(true);
process.stdin.setEncoding("utf8");
process.stdin.resume();
let password = "";
process.stdin.on("data", (chunk) => {
  for (const char of chunk) {
    if (char === "\u0003") { process.stdin.setRawMode(false); process.exit(1); }
    if (char === "\r" || char === "\n") {
      process.stdin.setRawMode(false);
      if (password.length < 12 || password.length > 256) { console.error("\nLa contraseña debe tener entre 12 y 256 caracteres."); process.exit(1); }
      const salt = randomBytes(16).toString("hex");
      console.log(`\nADMIN_PASSWORD_HASH=${salt}:${scryptSync(password, salt, 64).toString("hex")}`);
      password = "";
      process.exit(0);
    }
    if (char === "\u007f" || char === "\b") password = password.slice(0, -1);
    else if (password.length < 257) password += char;
  }
});
