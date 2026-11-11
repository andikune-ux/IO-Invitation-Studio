import { readFileSync } from "node:fs";
import { Script } from "node:vm";
const html = readFileSync("guest.html", "utf8");
const blocks = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];
if (!blocks.length) throw new Error("guest.html tidak memiliki inline script.");
new Script(blocks.at(-1)[1], { filename: "guest.html:inline-script" });
console.log("guest.html inline script syntax OK");
