const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
// Compile the same presentation helper used by React, with the installed project compiler.
const root=path.resolve(__dirname,'../..'),runtime=process.env.DICE_FRONTEND_RUNTIME || path.join(root,'frontend');
const ts=require(path.join(runtime,'node_modules/typescript'));
function load(name){const source=fs.readFileSync(fs.existsSync(path.join(root,'frontend/src/lib',name+'.ts'))?path.join(root,'frontend/src/lib',name+'.ts'):path.join(runtime,'src/lib',name+'.ts'),'utf8');const code=ts.transpile(source,{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020});const module={exports:{}};new Function('require','module','exports',code)(name=>{if(name==='./commissionBlockText')return load('commissionBlockText');throw Error(name)},module,module.exports);return module.exports;}
const {commissionBriefRows,usageText}=load('commissionBrief');
const brief={character_name:"Mina's OC",usage_type:'PERSONAL',brief:'Keep exact text สีฟ้า',canvas_size:'1:1 Square (โปรไฟล์ / โซเชียล)',requested_deadline:'2026-12-14T00:00:00Z',base_price_snapshot:123.45,total_price:148.70,tos_snapshot:'Original terms',tos_version:2,addons_snapshot:[{name:'Artist custom add-on',price_type:'FIXED',price_value:25.25}],custom_responses:{privacy_nda:false,scope_exclusions_acknowledged:true,pose_expression:'ศิลปินออกแบบท่าทางให้อิสระ (Free Pose)',custom_answers:{q1:'PDF + PNG',q2:'Keep old answer'},custom_question_labels:{q1:'Artist original question'}}};
test('English brief localizes known defaults and keeps authored text',()=>{
 const rows=commissionBriefRows(brief,'en');assert.ok(rows.some(x=>x.value==='Personal use'));assert.ok(rows.some(x=>x.value==='1:1 Square (profile / social media)'));assert.ok(rows.some(x=>x.value==='Artist chooses the pose (Free Pose)'));assert.ok(rows.some(x=>x.label==='Artist original question'&&x.value==='PDF + PNG'));assert.ok(rows.some(x=>x.value==='Keep exact text สีฟ้า'));assert.ok(rows.some(x=>x.label==='Keep work private (NDA)'&&x.value==='No'));
});
test('Thai brief translates fields, enum values and boolean answers',()=>{
 const rows=commissionBriefRows(brief,'th');assert.ok(rows.some(x=>x.label==='สิทธิ์การใช้งาน'&&x.value==='ใช้ส่วนบุคคล'));assert.ok(rows.some(x=>x.label==='ยอมรับข้อจำกัดงาน'&&x.value==='ใช่'));assert.ok(rows.some(x=>x.label==='Artist original question'&&x.value==='PDF + PNG'));
});
test('legacy answer gets an honest generic label and selected date never shifts',()=>{
 for(const locale of ['en','th']){const rows=commissionBriefRows(brief,locale);assert.ok(rows.some(x=>x.value==='Keep old answer'&&x.label===(locale==='th'?'คำตอบเพิ่มเติม 2':'Additional answer 2')));assert.ok(rows.some(x=>x.value==='2026-12-14'));assert.ok(!rows.some(x=>x.label==='q2'));}
});
test('rendering does not mutate snapshots or rewrite unknown artist choices',()=>{
 const before=JSON.stringify(brief);commissionBriefRows(brief,'en');commissionBriefRows(brief,'th');assert.equal(JSON.stringify(brief),before);assert.equal(usageText('Artist-authored license','th'),'Artist-authored license');
});

test('actual persisted commercial licenses localize in both languages',()=>{
 assert.equal(usageText('COMMERCIAL_STREAMING','en'),'Streaming / VTuber');
 assert.equal(usageText('COMMERCIAL_MERCH','en'),'Commercial merchandise');
 assert.equal(usageText('COMMERCIAL_MERCH','th'),'สินค้าเชิงพาณิชย์');
});
