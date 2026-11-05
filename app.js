'use strict';
// すべての記録はこの端末のブラウザ領域に保存。外部送信しない。
const STORAGE_KEY = 'personal-workout-log-v1';
const DEFAULT_EXERCISES = ['ベンチプレス', 'スクワット', 'デッドリフト', 'ブルガリアンスクワット', 'オーバーヘッドプレス', 'ダンベルプレス', '腕立て伏せ', '懸垂', 'ローイング'];
const $ = id => document.getElementById(id);
const localDate = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; };
const readStore = () => {
  try { const v = JSON.parse(localStorage.getItem(STORAGE_KEY)); if (v && v.version === 1 && Array.isArray(v.records) && Array.isArray(v.exercises)) return v; } catch (_) {}
  return {version:1, exercises:[...DEFAULT_EXERCISES], records:[]};
};
let store = readStore();
let currentSets = [];
let editingDate = localDate();
const safeNumber = n => Number.isFinite(Number(n)) && Number(n)>=0 && Number(n)<=10000 ? Number(n) : null;
function persist() { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(store)); return true; } catch (e) { alert('保存できませんでした。iPhoneの空き容量またはSafariの設定を確認してください。'); return false; } }
function optionList(select, entries) { const prev = select.value; select.replaceChildren(...entries.map(s=>new Option(s,s))); if(entries.includes(prev)) select.value=prev; }
function refreshOptions() { optionList($('exerciseSelect'), store.exercises); optionList($('chartExercise'), store.exercises); }
function newSet(previous) { return {weight:previous?previous.weight:'', reps:previous?previous.reps:''}; }
function addExercise(name) {
  if(currentSets.some(x=>x.name===name)) { alert('この種目はすでに追加されています。'); return; }
  currentSets.push({name, sets:[newSet()]}); renderExercises(); $('saveMessage').textContent='';
}
function renderExercises() {
  const root=$('exerciseList'); root.replaceChildren();
  currentSets.forEach((ex, exIdx)=> {
    const block=document.createElement('div'); block.className='exercise';
    const head=document.createElement('div'); head.className='exerciseHead';
    const title=document.createElement('strong'); title.textContent=ex.name;
    const remove=document.createElement('button'); remove.className='btn btn-quiet btn-danger btn-small'; remove.type='button'; remove.textContent='種目を削除';
    remove.addEventListener('click',()=>{ currentSets.splice(exIdx,1); renderExercises(); }); head.append(title,remove); block.append(head);
    const headings=document.createElement('div'); headings.className='setHead';
    for(const v of ['','重量 (kg)','回数','']) {const h=document.createElement('span'); h.textContent=v; headings.append(h);} block.append(headings);
    ex.sets.forEach((set,setIdx)=> {
      const line=document.createElement('div'); line.className='setRow';
      const num=document.createElement('span'); num.className='setNum'; num.textContent=String(setIdx+1);
      const weight=document.createElement('input'); weight.type='number'; weight.min='0'; weight.max='10000'; weight.step='0.5'; weight.inputMode='decimal'; weight.placeholder='kg'; weight.value=set.weight; weight.setAttribute('aria-label',`${ex.name} ${setIdx+1}セット目の重量`);
      weight.addEventListener('input',()=>{set.weight=weight.value; $('saveMessage').textContent='';});
      const reps=document.createElement('input'); reps.type='number'; reps.min='1'; reps.max='1000'; reps.step='1'; reps.inputMode='numeric'; reps.placeholder='回'; reps.value=set.reps; reps.setAttribute('aria-label',`${ex.name} ${setIdx+1}セット目の回数`);
      reps.addEventListener('input',()=>{set.reps=reps.value; $('saveMessage').textContent='';});
      const del=document.createElement('button'); del.type='button'; del.className='btn btn-small btn-danger'; del.textContent='×'; del.setAttribute('aria-label',`${ex.name} ${setIdx+1}セット目を削除`);
      del.addEventListener('click',()=>{ if(ex.sets.length===1) {alert('最低1セットは残してください。');return;} ex.sets.splice(setIdx,1);renderExercises();});
      line.append(num,weight,reps,del); block.append(line);
    });
    const add=document.createElement('button'); add.type='button'; add.className='btn btn-quiet btn-small'; add.textContent='＋ セットを追加（前の数値を引継ぎ）';
    add.addEventListener('click',()=>{ ex.sets.push(newSet(ex.sets[ex.sets.length-1]));renderExercises(); }); block.append(add);
    root.append(block);
  });
  if(!currentSets.length) {const e=document.createElement('div'); e.className='empty'; e.textContent='まだ種目がありません。上から種目を追加してください。';root.append(e);}
}
function openDate(date) {
  editingDate=date; $('workoutDate').value=date;
  const existing=store.records.find(r=>r.date===date);
  currentSets=existing?existing.items.map(ex=>({name:ex.name,sets:ex.sets.map(s=>({weight:String(s.weight),reps:String(s.reps)}))})):[];
  renderExercises(); $('saveMessage').textContent=existing?'保存済みの記録を編集中です。':''; showPage('record');
}
function validateItems() {
  if(!currentSets.length) {alert('種目を1つ以上追加してください。');return null;}
  const items=[];
  for(const ex of currentSets) {
    const sets=[];
    for(const s of ex.sets) {
      const w=safeNumber(s.weight), r=safeNumber(s.reps);
      if(s.weight===''||s.reps===''||w===null||r===null||r<1||!Number.isInteger(r)||r>1000) {alert(`${ex.name} の重量と回数を確認してください。重量は0kg以上、回数は1以上の整数で入力します。`);return null;}
      sets.push({weight:w,reps:r});
    }
    items.push({name:ex.name,sets});
  }
  return items;
}
function saveWorkout() {
  const items=validateItems(); if(!items) return;
  const date=$('workoutDate').value;
  if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||Number.isNaN(new Date(date+'T12:00:00').getTime())) { alert('日付を確認してください。'); return; }
  const previous=store.records.find(r=>r.date===date);
  const record={date,items}; store.records=store.records.filter(r=>r.date!==date); store.records.push(record);
  if(!persist()) {if(previous)store.records=store.records.filter(r=>r.date!==date).concat(previous);else store.records=store.records.filter(r=>r.date!==date);return;}
  $('saveMessage').textContent='✓ 保存しました。履歴からいつでも編集できます。';
}
function formatDate(date) {const [y,m,d]=date.split('-');return `${Number(y)}年${Number(m)}月${Number(d)}日`;}
function renderHistory() {
  const root=$('historyList');root.replaceChildren(); const recs=[...store.records].sort((a,b)=>b.date.localeCompare(a.date));
  $('recordCount').textContent=`${recs.length}日分`;
  if(!recs.length){const e=document.createElement('div');e.className='empty';e.textContent='記録はまだありません。最初のトレーニングを記録してみましょう。';root.append(e);return;}
  for(const record of recs) {
    const card=document.createElement('div');card.className='historyDay';
    const hd=document.createElement('div');hd.className='historyDayHead';const title=document.createElement('strong');title.textContent=formatDate(record.date);
    const edit=document.createElement('button');edit.className='btn btn-small';edit.type='button';edit.textContent='編集';edit.addEventListener('click',()=>openDate(record.date));hd.append(title,edit);card.append(hd);
    for(const item of record.items){const div=document.createElement('div');div.className='historyExercise';const name=document.createElement('strong');name.textContent=item.name;const details=document.createElement('div');details.className='muted';details.textContent=item.sets.map(s=>`${s.weight}kg × ${s.reps}回`).join(' ／ ');div.append(name,details);card.append(div);}
    const del=document.createElement('button');del.type='button';del.className='btn btn-quiet btn-danger btn-small';del.textContent='この日の記録を削除';del.style.marginTop='6px';del.addEventListener('click',()=>{if(!confirm(`${formatDate(record.date)}の記録を削除しますか？`))return;const old=store.records;store.records=store.records.filter(r=>r.date!==record.date);if(!persist())store.records=old;renderHistory();});card.append(del);root.append(card);
  }
}
const oneRM=(w,r)=>r===1?w:w*(1+r/30);
function svgEl(tag,attrs={}) {const node=document.createElementNS('http://www.w3.org/2000/svg',tag);for(const [k,v] of Object.entries(attrs)) node.setAttribute(k,String(v));return node;}
function chartText(svg,x,y,value,anchor='middle') {const t=svgEl('text',{x,y,'text-anchor':anchor,fill:'#667085','font-size':11,'font-family':'-apple-system,sans-serif'});t.textContent=value;svg.append(t);}
function renderProgress() {
  const selected=$('chartExercise').value;
  const rows=store.records.flatMap(record=>record.items.filter(i=>i.name===selected).map(i=>({date:record.date,weight:Math.max(...i.sets.map(s=>s.weight)),oneRM:Math.max(...i.sets.map(s=>oneRM(s.weight,s.reps)))}))).sort((a,b)=>a.date.localeCompare(b.date));
  $('bestWeight').textContent=rows.length?`${Math.max(...rows.map(r=>r.weight))} kg`:'—';
  $('bestOneRM').textContent=rows.length?`${Math.max(...rows.map(r=>r.oneRM)).toFixed(1)} kg`:'—';
  $('chartEmpty').hidden=rows.length>0; const svg=$('chart');svg.replaceChildren();svg.hidden=!rows.length;if(!rows.length)return;
  const left=40,right=328,top=16,bottom=174;const max=Math.max(10,...rows.map(r=>r.oneRM));const upper=Math.ceil(max/10)*10||10;
  for(let i=0;i<=4;i++){const v=upper*i/4;const y=bottom-(bottom-top)*i/4;svg.append(svgEl('line',{x1:left,y1:y,x2:right,y2:y,stroke:'#e9edf3'}));chartText(svg,left-6,y+4,v.toFixed(v%1?1:0),'end');}
  const points=rows.map((r,i)=>({x:rows.length===1?(left+right)/2:left+(right-left)*i/(rows.length-1),y:bottom-(r.oneRM/upper)*(bottom-top),date:r.date,value:r.oneRM}));
  if(points.length>1)svg.append(svgEl('polyline',{points:points.map(p=>`${p.x},${p.y}`).join(' '),stroke:'#2767cf','stroke-width':3,fill:'none','stroke-linejoin':'round','stroke-linecap':'round'}));
  points.forEach(p=>{const c=svgEl('circle',{cx:p.x,cy:p.y,r:4.5,fill:'#2767cf'});const tooltip=svgEl('title');tooltip.textContent=`${formatDate(p.date)}：${p.value.toFixed(1)}kg`;c.append(tooltip);svg.append(c);});
  chartText(svg,left,197,rows[0].date.slice(5).replace('-','/'),'start');chartText(svg,right,197,rows[rows.length-1].date.slice(5).replace('-','/'),'end');
}
function showPage(page){for(const p of ['record','history','progress','settings'])$('page-'+p).hidden=p!==page;document.querySelectorAll('[data-page]').forEach(b=>{if(b.dataset.page===page)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');});if(page==='history')renderHistory();if(page==='progress')renderProgress();window.scrollTo({top:0,behavior:'instant'});}
function downloadBackup(){const blob=new Blob([JSON.stringify({format:'personal-workout-log',exportedAt:new Date().toISOString(),...store},null,2)],{type:'application/json'});const u=URL.createObjectURL(blob);const a=document.createElement('a');a.href=u;a.download=`workout-backup-${localDate()}.json`;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),1000);$('backupMessage').textContent='バックアップファイルを書き出しました。iPhoneの「ファイル」などに保存してください。';}
function validBackup(o){return o&&o.format==='personal-workout-log'&&o.version===1&&Array.isArray(o.exercises)&&Array.isArray(o.records)&&o.exercises.length<=500&&o.records.length<=10000&&o.exercises.every(n=>typeof n==='string'&&n.length>0&&n.length<=40)&&o.records.every(r=>r&&typeof r.date==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(r.date)&&Array.isArray(r.items)&&r.items.length<=100&&r.items.every(i=>i&&typeof i.name==='string'&&i.name.length<=40&&Array.isArray(i.sets)&&i.sets.length>0&&i.sets.length<=200&&i.sets.every(s=>s&&typeof s.weight==='number'&&s.weight>=0&&s.weight<=10000&&typeof s.reps==='number'&&Number.isInteger(s.reps)&&s.reps>=1&&s.reps<=1000)));}
async function importBackup(event){const file=event.target.files?.[0];event.target.value='';if(!file)return;if(file.size>10*1024*1024){alert('ファイルが大きすぎます。');return;}try{const data=JSON.parse(await file.text());if(!validBackup(data)){alert('対応していないバックアップファイルです。');return;}const dates=new Set(data.records.map(r=>r.date));const conflicts=store.records.filter(r=>dates.has(r.date)).length;if(!confirm(`${data.records.length}日分の記録を読み込みます。${conflicts?`同じ日付の既存記録 ${conflicts} 件は上書きされます。`:''}よろしいですか？`))return;const old=store;const merged=new Map(store.records.map(r=>[r.date,r]));for(const r of data.records)merged.set(r.date,r);store={version:1,exercises:[...new Set([...store.exercises,...data.exercises,...data.records.flatMap(r=>r.items.map(i=>i.name))])],records:[...merged.values()]};if(!persist()){store=old;return;}refreshOptions();openDate(localDate());$('backupMessage').textContent='バックアップを読み込みました。';}catch(err){alert('読み込みに失敗しました。JSONファイルを確認してください。');}}
$('workoutDate').value=editingDate;refreshOptions();
$('workoutDate').addEventListener('change',e=>{if(currentSets.length&&!confirm('日付を切り替えますか？未保存の入力内容は失われます。')){e.target.value=editingDate;return;}openDate(e.target.value);});
$('addExercise').addEventListener('click',()=>addExercise($('exerciseSelect').value));
$('addCustom').addEventListener('click',()=>{const name=$('customExercise').value.trim();if(!name){alert('種目名を入力してください。');return;}if(name.length>40){alert('種目名は40文字以内にしてください。');return;}if(!store.exercises.includes(name)){store.exercises.push(name);if(!persist()){store.exercises.pop();return;}refreshOptions();}addExercise(name);$('customExercise').value='';});
$('saveWorkout').addEventListener('click',saveWorkout);
$('chartExercise').addEventListener('change',renderProgress);
$('exportBtn').addEventListener('click',downloadBackup);
$('importFile').addEventListener('change',importBackup);
document.querySelectorAll('[data-page]').forEach(b=>b.addEventListener('click',()=>showPage(b.dataset.page)));
openDate(localDate());
if('serviceWorker' in navigator && (location.protocol==='https:'||location.hostname==='localhost'))window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}));
