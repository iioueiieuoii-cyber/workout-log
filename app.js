'use strict';
// すべての記録はこの端末のブラウザ領域に保存。外部送信しない。
const STORAGE_KEY = 'personal-workout-log-v1'; // 旧版と共通：履歴を保持
const DRAFT_KEY = 'personal-workout-log-drafts-v2';
const PREF_KEY = 'personal-workout-log-prefs-v2';
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
let drafts = {}; try { drafts = JSON.parse(localStorage.getItem(DRAFT_KEY)) || {}; } catch (_) {}
let preferences = {}; try { preferences=JSON.parse(localStorage.getItem(PREF_KEY)) || {}; } catch (_) {}
const safeNumber = n => Number.isFinite(Number(n)) && Number(n)>=0 && Number(n)<=10000 ? Number(n) : null;
function persist() { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(store)); return true; } catch (e) { alert('保存できませんでした。iPhoneの空き容量またはSafariの設定を確認してください。'); return false; } }
function optionList(select, entries) { const prev = select.value; select.replaceChildren(...entries.map(s=>new Option(s,s))); if(entries.includes(prev)) select.value=prev; }
function refreshOptions() { optionList($('exerciseSelect'), store.exercises); optionList($('chartExercise'), store.exercises); const v=$('volumeExercise'); const prev=v.value; v.replaceChildren(new Option('全種目合計','__all__'),...store.exercises.map(n=>new Option(n,n))); if([...v.options].some(o=>o.value===prev))v.value=prev; }
function newSet() { return {weight:'', reps:''}; }
function validComplete(s) { return (s.weight==='自重' || (s.weight!=='' && Number.isFinite(Number(s.weight)) && Number(s.weight)>=0 && Number(s.weight)<=200)) && s.reps!=='' && Number.isInteger(Number(s.reps)) && Number(s.reps)>=1 && Number(s.reps)<=30; }
function autoSave(){
 const date=editingDate; drafts[date]=JSON.parse(JSON.stringify(currentSets));
 try { localStorage.setItem(DRAFT_KEY,JSON.stringify(drafts)); } catch(_) { $('saveMessage').textContent='下書きを保存できませんでした。バックアップをご確認ください。'; return; }
 const items=currentSets.map(ex=>({name:ex.name,sets:ex.sets.filter(validComplete).map(s=>({weight:s.weight==='自重'?'自重':Number(s.weight),reps:Number(s.reps)}))})).filter(ex=>ex.sets.length);
 const old=store.records; store.records=store.records.filter(r=>r.date!==date); if(items.length)store.records.push({date,items});
 if(!persist()){store.records=old;return;} $('saveMessage').textContent=items.length?'✓ 自動保存済み':'入力中の内容を保存しています（未完成のセットは集計対象外）';
}

function addExercise(name) {
  if(currentSets.some(x=>x.name===name)) { alert('この種目はすでに追加されています。'); return; }
  currentSets.push({name, sets:[newSet()]}); renderExercises(); autoSave();
}
function renderExercises() {
  const root=$('exerciseList'); root.replaceChildren();
  currentSets.forEach((ex, exIdx)=> {
    const block=document.createElement('div'); block.className='exercise';
    const head=document.createElement('div'); head.className='exerciseHead';
    const title=document.createElement('strong'); title.textContent=ex.name;
    const remove=document.createElement('button'); remove.className='btn btn-quiet btn-danger btn-small'; remove.type='button'; remove.textContent='種目を削除';
    remove.addEventListener('click',()=>{ currentSets.splice(exIdx,1); renderExercises(); autoSave(); }); head.append(title,remove); block.append(head);
    const headings=document.createElement('div'); headings.className='setHead';
    for(const v of ['','重量 (kg)','回数','']) {const h=document.createElement('span'); h.textContent=v; headings.append(h);} block.append(headings);
    ex.sets.forEach((set,setIdx)=> {
      const line=document.createElement('div'); line.className='setRow';
      const num=document.createElement('span'); num.className='setNum'; num.textContent=String(setIdx+1);
      const weight=document.createElement('button'); weight.type='button'; weight.className='setPick'+(set.weight===''?' placeholder':'');weight.textContent=set.weight===''?'重量':set.weight==='自重'?'自重':`${set.weight} kg`;weight.setAttribute('aria-label',`${ex.name} ${setIdx+1}セット目の重量を選択`);
      weight.addEventListener('click',()=>openPicker('weight',set,()=>{renderExercises();autoSave();},previousSetValue(ex.sets,setIdx,'weight')));
      const reps=document.createElement('button'); reps.type='button'; reps.className='setPick'+(set.reps===''?' placeholder':'');reps.textContent=set.reps===''?'回数':`${set.reps} 回`;reps.setAttribute('aria-label',`${ex.name} ${setIdx+1}セット目の回数を選択`);
      reps.addEventListener('click',()=>openPicker('reps',set,()=>{renderExercises();autoSave();},previousSetValue(ex.sets,setIdx,'reps')));
      const del=document.createElement('button'); del.type='button'; del.className='btn btn-small btn-danger'; del.textContent='×'; del.setAttribute('aria-label',`${ex.name} ${setIdx+1}セット目を削除`);
      del.addEventListener('click',()=>{ if(ex.sets.length===1) {alert('最低1セットは残してください。');return;} ex.sets.splice(setIdx,1);renderExercises();autoSave();});
      line.append(num,weight,reps,del); block.append(line);
    });
    const add=document.createElement('button'); add.type='button'; add.className='setAdd'; add.textContent='＋ セットを追加';
    add.addEventListener('click',()=>{ ex.sets.push(newSet());renderExercises();autoSave(); }); block.append(add);
    root.append(block);
  });
  if(!currentSets.length) {const e=document.createElement('div'); e.className='empty'; e.textContent='まだ種目がありません。上から種目を追加してください。';root.append(e);}
}
function openDate(date) {
  editingDate=date; $('workoutDate').value=date;
  const existing=store.records.find(r=>r.date===date);
  currentSets=Array.isArray(drafts[date]) ? JSON.parse(JSON.stringify(drafts[date])) : existing?existing.items.map(ex=>({name:ex.name,sets:ex.sets.map(s=>({weight:String(s.weight),reps:String(s.reps)}))})):[];
  renderExercises(); $('saveMessage').textContent=existing?'✓ 記録は自動保存されています。':''; showPage('record');
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
    for(const item of record.items){const div=document.createElement('div');div.className='historyExercise';const name=document.createElement('strong');name.textContent=item.name;const details=document.createElement('div');details.className='muted';details.textContent=item.sets.map(s=>`${s.weight==='自重'?'自重':s.weight+'kg'} × ${s.reps}回`).join(' ／ ');div.append(name,details);card.append(div);}
    const del=document.createElement('button');del.type='button';del.className='btn btn-quiet btn-danger btn-small';del.textContent='この日の記録を削除';del.style.marginTop='6px';del.addEventListener('click',()=>{if(!confirm(`${formatDate(record.date)}の記録を削除しますか？`))return;const old=store.records;store.records=store.records.filter(r=>r.date!==record.date);if(!persist())store.records=old;delete drafts[record.date];try{localStorage.setItem(DRAFT_KEY,JSON.stringify(drafts));}catch(_){} renderHistory();});card.append(del);root.append(card);
  }
}
const oneRM=(w,r)=>r===1?w:w*(1+r/30);
function svgEl(tag,attrs={}) {const node=document.createElementNS('http://www.w3.org/2000/svg',tag);for(const [k,v] of Object.entries(attrs)) node.setAttribute(k,String(v));return node;}
function chartText(svg,x,y,value,anchor='middle') {const t=svgEl('text',{x,y,'text-anchor':anchor,fill:'#667085','font-size':11,'font-family':'-apple-system,sans-serif'});t.textContent=value;svg.append(t);}
function renderProgress() {
  const selected=$('chartExercise').value;
  const rows=store.records.flatMap(record=>record.items.filter(i=>i.name===selected).map(i=>{const weighted=i.sets.filter(s=>typeof s.weight==='number');return weighted.length?{date:record.date,weight:Math.max(...weighted.map(s=>s.weight)),oneRM:Math.max(...weighted.map(s=>oneRM(s.weight,s.reps)))}:null}).filter(Boolean)).sort((a,b)=>a.date.localeCompare(b.date));
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
function showPage(page){for(const p of ['record','history','progress','settings'])$('page-'+p).hidden=p!==page;document.querySelectorAll('[data-page]').forEach(b=>{if(b.dataset.page===page)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');});if(page==='history')renderHistory();if(page==='progress'){renderProgress();renderVolume();}window.scrollTo({top:0,behavior:'instant'});}
function downloadBackup(){const blob=new Blob([JSON.stringify({format:'personal-workout-log',exportedAt:new Date().toISOString(),...store},null,2)],{type:'application/json'});const u=URL.createObjectURL(blob);const a=document.createElement('a');a.href=u;a.download=`workout-backup-${localDate()}.json`;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),1000);$('backupMessage').textContent='バックアップファイルを書き出しました。iPhoneの「ファイル」などに保存してください。';}
function validBackup(o){return o&&o.format==='personal-workout-log'&&o.version===1&&Array.isArray(o.exercises)&&Array.isArray(o.records)&&o.exercises.length<=500&&o.records.length<=10000&&o.exercises.every(n=>typeof n==='string'&&n.length>0&&n.length<=40)&&o.records.every(r=>r&&typeof r.date==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(r.date)&&Array.isArray(r.items)&&r.items.length<=100&&r.items.every(i=>i&&typeof i.name==='string'&&i.name.length<=40&&Array.isArray(i.sets)&&i.sets.length>0&&i.sets.length<=200&&i.sets.every(s=>s&&(s.weight==='自重'||(typeof s.weight==='number'&&s.weight>=0&&s.weight<=10000))&&typeof s.reps==='number'&&Number.isInteger(s.reps)&&s.reps>=1&&s.reps<=1000)));}
async function importBackup(event){const file=event.target.files?.[0];event.target.value='';if(!file)return;if(file.size>10*1024*1024){alert('ファイルが大きすぎます。');return;}try{const data=JSON.parse(await file.text());if(!validBackup(data)){alert('対応していないバックアップファイルです。');return;}const dates=new Set(data.records.map(r=>r.date));const conflicts=store.records.filter(r=>dates.has(r.date)).length;if(!confirm(`${data.records.length}日分の記録を読み込みます。${conflicts?`同じ日付の既存記録 ${conflicts} 件は上書きされます。`:''}よろしいですか？`))return;const old=store;const merged=new Map(store.records.map(r=>[r.date,r]));for(const r of data.records)merged.set(r.date,r);store={version:1,exercises:[...new Set([...store.exercises,...data.exercises,...data.records.flatMap(r=>r.items.map(i=>i.name))])],records:[...merged.values()]};if(!persist()){store=old;return;}refreshOptions();for(const date of dates)delete drafts[date];try{localStorage.setItem(DRAFT_KEY,JSON.stringify(drafts));}catch(_){}openDate(localDate());$('backupMessage').textContent='バックアップを読み込みました。';}catch(err){alert('読み込みに失敗しました。JSONファイルを確認してください。');}}
// 横型の選択画面。同日・同種目の直前に値のあるセットを開始位置に使用する。
// 新規セットの入力欄自体は未入力のまま維持し、「決定」時だけ保存する。
let pickerState=null;
const PICKER_ITEM_WIDTH=86;
const weightValues=['自重',...Array.from({length:81},(_,i)=>String(i*2.5))];
const repValues=Array.from({length:30},(_,i)=>String(i+1));
function previousSetValue(sets, index, kind){
 for(let i=index-1;i>=0;i--){const v=sets[i]?.[kind];if(v!=='' && v!==null && v!==undefined)return String(v);}
 return null;
}
function readPickerIndex(){
 if(!pickerState)return 0;
 const wheel=$('pickerWheel');
 return Math.min(pickerState.values.length-1,Math.max(0,Math.round(wheel.scrollLeft/PICKER_ITEM_WIDTH)));
}
function refreshPickerSelection(){
 if(!pickerState)return;
 const index=readPickerIndex();
 $('pickerWheel').querySelectorAll('.pickerOption').forEach((node,i)=>node.setAttribute('aria-selected',String(i===index)));
}
function openPicker(kind,set,onDone,priorValue=null){
 const values=kind==='weight'?weightValues:repValues;
 const labels=values.map(v=>kind==='weight'?(v==='自重'?v:`${v} kg`):`${v} 回`);
 const modal=$('pickerModal'),wheel=$('pickerWheel');wheel.replaceChildren();
 const pad1=document.createElement('div');pad1.className='pickerPad';wheel.append(pad1);
 labels.forEach((label,i)=>{
  const el=document.createElement('div');el.className='pickerOption';el.textContent=label;
  el.setAttribute('role','option');el.setAttribute('aria-selected','false');
  el.addEventListener('click',()=>wheel.scrollTo({left:i*PICKER_ITEM_WIDTH,behavior:'smooth'}));
  wheel.append(el);
 });
 const pad2=document.createElement('div');pad2.className='pickerPad';wheel.append(pad2);
 $('pickerTitle').textContent=kind==='weight'?'重量を選択':'回数を選択';
 pickerState={kind,set,values,onDone};modal.hidden=false;document.body.classList.add('pickerOpen');
 const own=String(set[kind]);
 let idx=values.indexOf(own!==''?own:priorValue===null?'':String(priorValue));
 if(idx<0)idx=kind==='weight'?values.indexOf('20'):values.indexOf('10');
 // 開くたびに中央から開始。空欄に値は自動確定しない。
 wheel.scrollLeft=idx*PICKER_ITEM_WIDTH;
 refreshPickerSelection();
 wheel.addEventListener('scroll',refreshPickerSelection,{passive:true});
}
function closePicker(){ $('pickerModal').hidden=true;document.body.classList.remove('pickerOpen');pickerState=null; }
$('pickerCancel').addEventListener('click',closePicker);
$('pickerModal').addEventListener('click',e=>{if(e.target===$('pickerModal'))closePicker();});
$('pickerDone').addEventListener('click',()=>{
 if(!pickerState)return;
 const {kind,set,values,onDone}=pickerState;
 const idx=readPickerIndex();set[kind]=values[idx];closePicker();onDone();
});

// 期間別の総負荷量（自重は重量換算しない）
function renderVolume(){
 const yearSelect=$('volumeYear');const existingYears=[...new Set(store.records.map(r=>r.date.slice(0,4)))].sort((a,b)=>b.localeCompare(a));if(!existingYears.length)existingYears.push(String(new Date().getFullYear()));
 const old=yearSelect.value;yearSelect.replaceChildren(...existingYears.map(y=>new Option(y+'年',y)));yearSelect.value=existingYears.includes(old)?old:existingYears[0];
 const period=$('volumePeriod').value;$('volumeYearWrap').hidden=period!=='year';
 const today=localDate();const now=new Date(today+'T12:00:00');const weekStart=new Date(now);weekStart.setDate(now.getDate()-6);const ymd=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
 const monthStart=today.slice(0,7)+'-01';const year=yearSelect.value;const name=$('volumeExercise').value;
 let total=0,sets=0;
 for(const record of store.records){const date=record.date;if(period==='week'&&(date<ymd(weekStart)||date>today))continue;if(period==='month'&&(date<monthStart||date>today))continue;if(period==='year'&&date.slice(0,4)!==year)continue;
 for(const item of record.items){if(name!=='__all__'&&name!==item.name)continue;for(const set of item.sets){if(typeof set.weight!=='number')continue;total+=set.weight*set.reps;sets++;}}}
 $('volumeTotal').textContent=total.toLocaleString('ja-JP',{maximumFractionDigits:1})+' kg';$('volumeCaption').textContent=period==='year'?year+'年の総負荷量':period==='week'?'直近7日間の総負荷量':'今月の総負荷量';$('volumeDetails').textContent=`重量換算できたセット：${sets}セット。自重セットは集計していません。`;
}

// 休憩タイマー: AudioContextはユーザー操作時に準備。音楽アプリの再生状態は操作しない。
let timerEnd=0,timerRemaining=90,timerTick=null,timerRunning=false;
let audioContext=null;
const savedDuration=Number(preferences.duration);
if([60,90,120,180].includes(savedDuration))$('timerDuration').value=String(savedDuration);
$('timerSound').checked=Boolean(preferences.sound);
timerRemaining=Number($('timerDuration').value);
const timerFormat=s=>`${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;
function renderTimer(){
 $('timerClock').textContent=timerFormat(timerRemaining);
 $('timerStart').textContent=timerRunning?'一時停止':timerRemaining===0?'再スタート':'START';
}
function prepareSound(){
 if(!$('timerSound').checked)return;
 try{
  const AC=window.AudioContext||window.webkitAudioContext;
  if(!AC){$('timerNotice').textContent='この環境では終了音を再生できません。';return;}
  if(!audioContext || audioContext.state==='closed') audioContext=new AC();
  // iOSではタップした瞬間にresumeが必要になることがある。
  if(audioContext.state==='suspended') audioContext.resume().catch(()=>{});
  // ユーザー操作に結び付いた無音の初期再生でオーディオを解錠。
  const osc=audioContext.createOscillator(),gain=audioContext.createGain();
  gain.gain.value=0;
  osc.connect(gain);gain.connect(audioContext.destination);
  osc.start();osc.stop(audioContext.currentTime+.015);
 }catch(err){$('timerNotice').textContent='音声を準備できませんでした。画面通知は利用できます。';}
}
// 6連の電子音を3節。ユーザーがOKを押せば、予約済みの音も停止する。
let activeBeepNodes=[];
function stopTimerSound(){
 for(const osc of activeBeepNodes){try{osc.stop();}catch(_){}}
 activeBeepNodes=[];
}
function playTimerSound(force=false){
 if(!force && !$('timerSound').checked)return;
 try{
  if(!audioContext || audioContext.state==='closed'){
   prepareSound();
   if(!audioContext)return;
  }
  if(audioContext.state==='suspended') audioContext.resume().catch(()=>{});
  stopTimerSound();
  const base=audioContext.currentTime+.055;
  // Each group: 6 pulses of 105ms, 65ms gaps. 3 groups with short breaks, ~3.4 seconds total.
  for(let group=0;group<3;group++){
   for(let beat=0;beat<6;beat++){
    const t=base+group*1.24+beat*.168;
    const osc=audioContext.createOscillator();
    const gain=audioContext.createGain();
    osc.type='triangle';
    osc.frequency.setValueAtTime((beat%2===0?920:1050),t);
    gain.gain.setValueAtTime(0,t);
    gain.gain.linearRampToValueAtTime(.24,t+.008);
    gain.gain.setValueAtTime(.24,t+.088);
    gain.gain.linearRampToValueAtTime(0,t+.115);
    osc.connect(gain);gain.connect(audioContext.destination);
    osc.start(t);osc.stop(t+.12);
    activeBeepNodes.push(osc);
   }
  }
 }catch(err){$('timerNotice').textContent='音を再生できませんでした。iPhoneの消音設定も確認してください。';}
}
function showTimerDone(){
 $('timerDoneOverlay').hidden=false;
 document.body.classList.add('timerDoneOpen');
 $('timerDoneOK').focus({preventScroll:true});
}
function closeTimerDone(){
 $('timerDoneOverlay').hidden=true;
 document.body.classList.remove('timerDoneOpen');
 stopTimerSound();
}
$('timerDoneOK').addEventListener('click',closeTimerDone);
function markTimerDone(){
 timerRunning=false;clearInterval(timerTick);timerTick=null;timerRemaining=0;
 document.querySelector('.timerCard').classList.add('isDone');
 $('timerNotice').textContent='休憩終了です！ 次のセットへ。';
 renderTimer();
 showTimerDone();
 playTimerSound();
}
function updateTimer(){
 if(!timerRunning)return;
 timerRemaining=Math.max(0,Math.ceil((timerEnd-Date.now())/1000));
 if(timerRemaining===0){markTimerDone();return;}
 renderTimer();
}
$('timerStart').addEventListener('click',()=>{
 closeTimerDone();
 document.querySelector('.timerCard').classList.remove('isDone');
 if(timerRunning){
  timerRemaining=Math.max(0,Math.ceil((timerEnd-Date.now())/1000));
  timerRunning=false;clearInterval(timerTick);timerTick=null;
  $('timerNotice').textContent='一時停止中です。';
 }else{
  if(timerRemaining===0)timerRemaining=Number($('timerDuration').value);
  prepareSound();
  timerEnd=Date.now()+timerRemaining*1000;timerRunning=true;
  timerTick=setInterval(updateTimer,200);
  $('timerNotice').textContent='休憩中…（この画面を開いたままお使いください）';
 }
 renderTimer();
});
$('timerReset').addEventListener('click',()=>{
 closeTimerDone();
 timerRunning=false;clearInterval(timerTick);timerTick=null;
 timerRemaining=Number($('timerDuration').value);
 document.querySelector('.timerCard').classList.remove('isDone');
 $('timerNotice').textContent='リセットしました。';renderTimer();
});
function savePreferences(){
 preferences={duration:Number($('timerDuration').value),sound:$('timerSound').checked};
 try{localStorage.setItem(PREF_KEY,JSON.stringify(preferences));}catch(_){}
}
$('timerDuration').addEventListener('change',()=>{
 savePreferences();if(!timerRunning){timerRemaining=Number($('timerDuration').value);renderTimer();}
});
$('timerSound').addEventListener('change',()=>{
 savePreferences();if($('timerSound').checked){prepareSound();$('timerNotice').textContent='終了音がオンになりました。「音をテスト」で確認できます。';}
 else $('timerNotice').textContent='終了音はオフです。休憩終了は画面で通知します。';
});
$('timerTestSound').addEventListener('click',()=>{
 if(!$('timerSound').checked){$('timerSound').checked=true;savePreferences();}
 prepareSound();playTimerSound(true);
 $('timerNotice').textContent='テスト音を再生しました。聞こえない場合はiPhoneの消音モードを解除してお試しください。';
});
renderTimer();

$('workoutDate').value=editingDate;refreshOptions();
$('workoutDate').addEventListener('change',e=>openDate(e.target.value));
$('addExercise').addEventListener('click',()=>addExercise($('exerciseSelect').value));
$('addCustom').addEventListener('click',()=>{const name=$('customExercise').value.trim();if(!name){alert('種目名を入力してください。');return;}if(name.length>40){alert('種目名は40文字以内にしてください。');return;}if(!store.exercises.includes(name)){store.exercises.push(name);if(!persist()){store.exercises.pop();return;}refreshOptions();}addExercise(name);$('customExercise').value='';});

$('chartExercise').addEventListener('change',renderProgress);
$('volumeExercise').addEventListener('change',renderVolume);$('volumePeriod').addEventListener('change',renderVolume);$('volumeYear').addEventListener('change',renderVolume);
$('exportBtn').addEventListener('click',downloadBackup);
$('importFile').addEventListener('change',importBackup);
document.querySelectorAll('[data-page]').forEach(b=>b.addEventListener('click',()=>showPage(b.dataset.page)));
openDate(localDate());
if('serviceWorker' in navigator && (location.protocol==='https:'||location.hostname==='localhost'))window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}));
