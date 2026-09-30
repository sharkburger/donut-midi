const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const src=fs.readFileSync('research-session.js','utf8');
const logic=src.slice(src.indexOf('const researchPairs='),src.indexOf('const researchPanel='));
test('every session has three matched melody pairs with both visibility conditions',()=>{const ctx={};vm.createContext(ctx);vm.runInContext(logic,ctx);for(let i=0;i<20;i++){const tasks=vm.runInContext('makeResearchTasks()',ctx);assert.equal(tasks.length,6);for(let pair=0;pair<3;pair++){const rows=tasks.filter(t=>t.pair===pair);assert.equal(rows.length,2);assert.equal(new Set(rows.map(r=>r.kind)).size,2);assert.equal(JSON.stringify(rows[0].notes),JSON.stringify(rows[1].notes));}}});
