import { createRequire } from "module";
const req = createRequire(import.meta.url);
const a = require("pdf-parse");
const b = require("pdf-parse/lib/pdf-parse.js");
console.log("main typeof", typeof a, "lib typeof", typeof b);
