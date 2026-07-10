import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { isWidgetOriginAllowed, normalizeWidgetOrigin, parseWidgetAllowedOrigins } from "../server/widget-security";
import type { Chatbot } from "../shared/schema";

const allowedOrigins = parseWidgetAllowedOrigins(
  "https://www.difzapopan.gob.mx, https://difzapopan.gob.mx\nhttp://localhost:5173",
);

assert.deepEqual(allowedOrigins, [
  "https://www.difzapopan.gob.mx",
  "https://difzapopan.gob.mx",
  "http://localhost:5173",
]);
assert.equal(normalizeWidgetOrigin("https://www.difzapopan.gob.mx/path?x=1"), "https://www.difzapopan.gob.mx");
assert.equal(normalizeWidgetOrigin("ftp://difzapopan.gob.mx"), null);
assert.equal(isWidgetOriginAllowed({ allowedDomains: "localhost" } as Chatbot, "http://localhost:5173"), true);
assert.equal(isWidgetOriginAllowed({ allowedDomains: "difzapopan.gob.mx" } as Chatbot, "http://difzapopan.gob.mx"), false);

const scriptPath = path.resolve(process.cwd(), "client/public/widget.js");
const widgetSource = fs.readFileSync(scriptPath, "utf8");
assert.match(widgetSource, /scriptUrl = new URL\(script\.src\)/);
assert.match(widgetSource, /const baseUrl = scriptUrl\.origin/);
assert.match(widgetSource, /credentials: 'omit'/);
assert.doesNotMatch(widgetSource, /script\.src\.replace\('\/widget\.js'/);

const cacheBustedScript = new URL("https://chatdif.difzapopan.gob.mx/widget.js?v=20260706-avatar-font");
assert.equal(
  new URL("/api/widget/1/config", cacheBustedScript.origin).href,
  "https://chatdif.difzapopan.gob.mx/api/widget/1/config",
);

console.log("Widget security checks passed: 10/10");
