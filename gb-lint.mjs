/* gb-lint — the parser-backed half of check.py.
   node --check proves the file parses; it cannot see a name that is used and never declared.
   That blind spot shipped `label` (every model call broken, 11–23 Sep 2026) and `setOPS`
   (Autoresearch dead on its first proposal). This runs a real parser (ESLint) over the app's
   script block and fails on:
     • undeclared names, INCLUDING ones hidden behind `typeof X!=='undefined'` — a guard around a
       name that never exists is a feature that silently never runs;
     • duplicate object keys (the __gb export literal has had 37 at once);
     • let/const/class read before declaration in the same function (a TDZ throw);
     • a handful of always-a-bug rules (self-assign, unreachable, const reassignment…).
   ESLint lives outside iCloud, in ~/.cache/glassbox-lint (npm i eslint@9 globals there).
   Usage: node gb-lint.mjs [GlassBox.html]   → exit 0 clean, 1 findings, 2 lint not installed. */
import fs from "fs"; import os from "os"; import path from "path"; import {createRequire} from "module";
const home=path.join(os.homedir(),".cache","glassbox-lint");
let Linter,globals;
try{
  const req=createRequire(path.join(home,"package.json"));
  ({Linter}=req("eslint")); globals=req("globals");
}catch(e){console.log("SKIP gb-lint: ESLint not installed — run: mkdir -p ~/.cache/glassbox-lint && cd ~/.cache/glassbox-lint && npm init -y && npm i eslint@9 globals");process.exit(2);}
const file=process.argv[2]||"GlassBox.html";
const s=fs.readFileSync(file,"utf8");
const st=s.indexOf("\n<script>")+"\n<script>".length, en=s.indexOf("</"+"script>",st);
const code=s.slice(st,en); const off=s.slice(0,st).split("\n").length-1;
/* Names published on window by the app itself (window.x=…) are real globals. */
const own={}; for(const m of code.matchAll(/\bwindow\.([A-Za-z_$][\w$]*)\s*=(?!=)/g))own[m[1]]="writable";
const tdz={create(ctx){return{"Program:exit"(node){
  for(const sc of ctx.sourceCode.scopeManager.scopes)for(const v of sc.variables){
    const d=v.defs[0]; if(!d)continue;
    if(!((d.type==="Variable"&&d.parent.kind!=="var")||d.type==="ClassName"))continue;
    for(const r of v.references){
      if(r.identifier.range[0]>=d.name.range[0])continue;
      if(r.from.variableScope!==v.scope.variableScope)continue;   // closures run later — fine
      ctx.report({node:r.identifier,message:`'${v.name}' is read before its declaration (TDZ throw).`});
    }}}}}};
const res=new Linter({configType:"flat"}).verify(code,[{
  languageOptions:{ecmaVersion:"latest",sourceType:"script",globals:{...globals.browser,...own}},
  plugins:{gb:{rules:{tdz}}},
  rules:{"no-undef":["error",{typeof:true}],"no-dupe-keys":"error","gb/tdz":"error",
    "no-self-assign":["error",{props:false}],"no-unreachable":"error","no-const-assign":"error",
    "no-func-assign":"error","no-class-assign":"error","no-dupe-else-if":"error","no-unsafe-finally":"error",
    "valid-typeof":"error","use-isnan":"error","no-compare-neg-zero":"error","no-dupe-class-members":"error",
    "no-import-assign":"error","no-obj-calls":"error","no-setter-return":"error","getter-return":"error",
    "no-unsafe-negation":"error","no-debugger":"error","no-delete-var":"error","no-shadow-restricted-names":"error"}}]);
if(!res.length){console.log("OK  gb-lint: no undeclared names, no duplicate keys, no TDZ reads");process.exit(0);}
for(const m of res)console.log(`FAIL gb-lint ${file}:${m.line+off}  ${m.ruleId||"parse"}  ${m.message}`);
process.exit(1);
