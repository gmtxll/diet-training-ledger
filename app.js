const $ = (s) => document.querySelector(s);
// Safari on older iOS versions exposes crypto but not crypto.randomUUID().
const crypto = {
  randomUUID: typeof globalThis.crypto?.randomUUID === 'function'
    ? () => globalThis.crypto.randomUUID()
    : () => `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,12)}`
};
const today = () => new Date().toISOString().slice(0, 10);
const month = () => today().slice(0, 7);
const foods = [
  ['即食燕麦',260,393,11,10.6],['全脂奶粉',50,517,25.1,0],['花生酱',35,588,25,6],['亚麻籽粉',10,534,18.3,27.3],['大豆分离蛋白',20,350,76,1.4],['即食脱水蔬菜',20,300,10,20]
].map(([name,grams,kcal,protein,fiber])=>({name,grams,kcal,protein,fiber}));
const latestFoods=[
  {name:'\u5373\u98df\u71d5\u9ea6',grams:280,kcal:393,protein:11,fiber:10.6},
  {name:'\u82b1\u751f\u9171',grams:35,kcal:588,protein:25,fiber:6},
  {name:'\u4e9a\u9ebb\u7c7d\u7c89',grams:10,kcal:534,protein:18.3,fiber:27.3},
  {name:'\u5927\u8c46\u5206\u79bb\u86cb\u767d',grams:36.5,kcal:350,protein:76,fiber:1.4},
  {name:'\u5373\u98df\u8131\u6c34\u852c\u83dc',grams:20,kcal:300,protein:10,fiber:20}
];
const latestExercises=[
  {name:'\u6df1\u8e72',target:'25\u201330 \u6b21'},
  {name:'\u4fef\u5367\u6491',target:'10\u201315 \u6b21\uff08\u529b\u7aed\u524d\u505c\uff09'},
  {name:'\u4f11\u606f',target:'45 \u79d2',isRest:true},
  {name:'\u5f39\u529b\u5e26\u5212\u8239',target:'10\u201315 \u6b21'},
  {name:'\u81c0\u6865',target:'12\u201320 \u6b21'},
  {name:'\u4f11\u606f',target:'45 \u79d2',isRest:true},
  {name:'\u5e73\u677f\u652f\u6491',target:'45\u201360 \u79d2'},
  {name:'\u53cd\u5411\u5377\u8179',target:'12\u201315 \u6b21'},
  {name:'\u5377\u8179',target:'25\u201330 \u6b21'},
  {name:'\u4fa7\u5e73\u677f\u652f\u6491\uff08\u5de6\uff09',target:'30\u201345 \u79d2'},
  {name:'\u4fa7\u5e73\u677f\u652f\u6491\uff08\u53f3\uff09',target:'30\u201345 \u79d2'},
  {name:'\u4f11\u606f',target:'60 \u79d2',isRest:true}
];
const clonePlanItems=(items)=>JSON.parse(JSON.stringify(items));
const initial = { meals:[], workouts:[], weights:[], expenses:[], height:163, draftFoods:clonePlanItems(latestFoods) };
let state = JSON.parse(localStorage.getItem('diet-training-state') || 'null') || initial;
// Older backups and computer-sync snapshots may not contain every collection.
// Normalize them before any UI code runs so one missing field cannot stop the app.
if(!state || typeof state!=='object' || Array.isArray(state))state=clonePlanItems(initial);
if(!Array.isArray(state.meals))state.meals=[];
if(!Array.isArray(state.workouts))state.workouts=[];
if(!Array.isArray(state.weights))state.weights=[];
if(!Array.isArray(state.expenses))state.expenses=[];
if(!Array.isArray(state.games))state.games=[];
if(!Array.isArray(state.savings))state.savings=[];
state.draftFoods ||= clonePlanItems(latestFoods);
state.difficultyLevel=Math.min(5,Math.max(1,Number(state.difficultyLevel)||3));
let timer = {seconds:0, running:false, interval:null, exerciseIndex:0};
function syncActivePlanItems(){const mealPlan=state.mealPlans?.find(plan=>plan.id===state.activeMealPlan),workoutPlan=state.workoutPlans?.find(plan=>plan.id===state.activeWorkoutPlan);if(mealPlan&&Array.isArray(state.draftFoods))mealPlan.items=clonePlanItems(state.draftFoods);if(workoutPlan&&Array.isArray(state.exercises))workoutPlan.items=clonePlanItems(state.exercises);}
const save = () => { syncActivePlanItems();state.updatedAt=new Date().toISOString(); localStorage.setItem('diet-training-state', JSON.stringify(state)); localStorage.setItem('diet-training-backup-'+today(), JSON.stringify(state)); scheduleSync(); configureNativeAutoSync(); };
const fmt = (n) => Number(n).toLocaleString('zh-CN',{maximumFractionDigits:1});
const money = (n) => `¥${Number(n).toLocaleString('zh-CN',{maximumFractionDigits:2})}`;
function calcMeal(items=state.draftFoods){return items.reduce((a,f)=>({kcal:a.kcal+f.grams*f.kcal/100,protein:a.protein+f.grams*f.protein/100,fiber:a.fiber+f.grams*f.fiber/100}),{kcal:0,protein:0,fiber:0});}
function todayMeals(){return state.meals.filter(x=>x.date===today());}
function todayTotals(){return todayMeals().reduce((a,m)=>({kcal:a.kcal+m.kcal,protein:a.protein+m.protein}),{kcal:0,protein:0});}
function expensesThisMonth(){return state.expenses.filter(x=>x.type!=='income'&&x.date.startsWith(month()));}
function renderFood(){const list=$('#meal-items');list.innerHTML='';state.draftFoods.forEach((f,i)=>{const row=document.createElement('div');row.className='item-row';row.innerHTML=`<div><p>${f.name}</p><small>${fmt(f.grams*f.kcal/100)} kcal · ${fmt(f.grams*f.protein/100)} g 蛋白质</small></div><label><input class="gram-input" type="number" min="0" value="${f.grams}" data-food="${i}"> g</label>`;list.append(row);}); const t=calcMeal();$('#meal-total').textContent=`${fmt(t.kcal)} kcal · ${fmt(t.protein)} g 蛋白质 · ${fmt(t.fiber)} g 纤维`;
  $('#food-history').innerHTML=state.meals.length?state.meals.slice(0,8).map(m=>`<div class="history-row"><div><p>🍽️ ${m.name}</p><small>${m.date} · ${fmt(m.kcal)} kcal</small></div><button class="text-button" data-delete="meals:${m.id}">删除</button></div>`).join(''):'暂无饮食记录';}
function renderHome(){const ate=todayMeals().length>0,worked=state.workouts.some(x=>x.date===today()),todayWeight=state.weights.filter(x=>x.date===today()).at(-1);$('#month-expense').textContent=money(expensesThisMonth().reduce((sum,item)=>sum+Number(item.amount||0),0));$('#today-weight').textContent=todayWeight?`${fmt(todayWeight.value)} kg`:'—';$('#today-weight-note').textContent=todayWeight?'今日已记录':'尚未记录';const setStatus=(id,done,doneText,todoText)=>{const el=$(id);if(!el)return;el.classList.toggle('done',done);el.querySelector('small').textContent=done?doneText:todoText;};setStatus('#food-summary',ate,'已记录','未记录');setStatus('#workout-summary',worked,'已完成','未完成');}
function renderTrends(){const weights=[...state.weights].sort((a,b)=>a.date.localeCompare(b.date));const latest=weights.at(-1);$('#latest-weight').textContent=latest?fmt(latest.value):'—';const bmi=latest&&state.height?latest.value/((state.height/100)**2):null;$('#bmi-value').textContent=bmi?fmt(bmi):'—';$('#height-caption').textContent=state.height?`身高 ${state.height} cm`:'请设置身高';$('#height-input').value=state.height||'';if(!weights.length){$('#weight-chart').className='weight-chart empty-state';$('#weight-chart').textContent='记录体重后显示趋势';return}const min=Math.min(...weights.map(x=>x.value)),max=Math.max(...weights.map(x=>x.value)),span=Math.max(max-min,.4);$('#weight-chart').className='weight-chart';$('#weight-chart').innerHTML=weights.slice(-8).map(x=>`<div class="weight-bar" style="height:${35+((x.value-min)/span)*60}px"><b>${fmt(x.value)}</b><span>${x.date.slice(5)}</span></div>`).join('');}
function renderExpenses(){const expenses=expensesThisMonth(), total=expenses.reduce((a,x)=>a+x.amount,0), food=expenses.filter(x=>x.category==='食材').reduce((a,x)=>a+x.amount,0);$('#expense-total').textContent=money(total);$('#food-expense').textContent=money(food); const cats=['食材','补剂','其他'];$('#expense-breakdown').innerHTML=cats.map(c=>{const n=expenses.filter(x=>x.category===c).reduce((a,x)=>a+x.amount,0);return `<div class="breakdown-row"><span>${c}</span><div class="bar"><i style="width:${total?n/total*100:0}%"></i></div><b>${money(n)}</b></div>`}).join('');$('#expense-history').innerHTML=state.expenses.length?state.expenses.slice().sort((a,b)=>b.date.localeCompare(a.date)).slice(0,12).map(x=>`<div class="history-row"><div><p>${x.name}</p><small>${x.date} · ${x.category}</small></div><strong>${money(x.amount)}</strong></div>`).join(''):'暂无花销记录';}
function renderWorkouts(){ $('#workout-history').innerHTML=state.workouts.length?state.workouts.slice(0,8).map(x=>`<div class="history-row"><div><p>🏃 ${x.exercises?.length?'自定义训练':'自重循环'}</p><small>${x.date} · ${x.rounds} 轮</small></div><button class="text-button" data-delete="workouts:${x.id}">删除</button></div>`).join(''):'暂无训练记录';}
function render(){renderHome();renderFood();renderTrends();renderExpenses();renderWorkouts();renderExtras();}
function dialog(title,fields,onSave){$('#dialog-title').textContent=title;$('#dialog-fields').innerHTML=fields;const d=$('#entry-dialog');d.showModal();const form=$('#entry-form');form.onsubmit=(e)=>{e.preventDefault();onSave(new FormData(form));d.close();};}
document.addEventListener('input',(e)=>{if(e.target.matches('[data-food]')){state.draftFoods[e.target.dataset.food].grams=Math.max(0,Number(e.target.value)||0);save();const t=calcMeal();$('#meal-total').textContent=`${fmt(t.kcal)} kcal · ${fmt(t.protein)} g 蛋白质 · ${fmt(t.fiber)} g 纤维`;}});
function showToast(message){
  let toast=$('#app-toast');
  if(!toast){toast=document.createElement('div');toast.id='app-toast';toast.className='app-toast';toast.setAttribute('role','status');document.body.append(toast);}
  toast.textContent=message;toast.classList.add('show');clearTimeout(showToast.timer);showToast.timer=setTimeout(()=>toast.classList.remove('show'),2800);
}
function openView(name){
  document.querySelectorAll('.view').forEach(v=>v.classList.remove('active'));
  document.querySelectorAll('[data-view]').forEach(x=>x.classList.remove('active'));
  $(`#view-${name}`).classList.add('active');
  document.querySelector(`[data-view="${name}"]`)?.classList.add('active');
  window.scrollTo({top:0,behavior:'smooth'});
  if(name==='trends')setTimeout(pullFromServer,0);
}
document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>openView(b.dataset.view));document.querySelectorAll('[data-go]').forEach(b=>b.onclick=()=>openView(b.dataset.go));
$('#dialog-close').onclick=$('#dialog-cancel').onclick=()=>$('#entry-dialog').close();
$('#save-meal-button').onclick=()=>{const t=calcMeal();state.meals.unshift({id:crypto.randomUUID(),date:today(),createdAt:new Date().toISOString(),name:'一餐方案',...t});save();render();};
$('#add-food-button').onclick=()=>dialog('添加食材','<label class="form-field">名称<input name="name" required></label><label class="form-field">热量（kcal）<input name="kcal" type="number" min="0" required></label><label class="form-field">蛋白质（g）<input name="protein" type="number" min="0" value="0" required></label>',f=>{state.meals.unshift({id:crypto.randomUUID(),date:today(),createdAt:new Date().toISOString(),name:f.get('name'),kcal:Number(f.get('kcal')),protein:Number(f.get('protein'))});save();render();});
$('#add-weight-button').onclick=()=>dialog('记录体重','<label class="form-field">体重（kg）<input name="value" type="number" min="20" max="350" step="0.1" required autofocus></label><label class="form-field">日期<input name="date" type="date" value="'+today()+'" required></label>',f=>{state.weights.push({id:crypto.randomUUID(),date:f.get('date'),value:Number(f.get('value'))});state.weights.sort((a,b)=>a.date.localeCompare(b.date));save();render();});
$('#home-add-weight').onclick=()=>$('#add-weight-button').click();
$('#height-input').onchange=e=>{state.height=Number(e.target.value)||null;save();renderTrends();};
$('#add-expense-button').onclick=()=>dialog('记一笔','<label class="form-field">项目<input name="name" required autofocus></label><label class="form-field">类型<select name="type"><option value="expense">花销</option><option value="income">存钱/收入</option></select></label><label class="form-field">金额（元）<input name="amount" type="number" min="0.01" step="0.01" required></label><label class="form-field">分类<select name="category"><option>食材</option><option>补剂</option><option>其他</option></select></label><label class="form-field">日期<input name="date" type="date" value="'+today()+'" required></label>',f=>{state.expenses.unshift({id:crypto.randomUUID(),name:f.get('name'),type:f.get('type'),amount:Number(f.get('amount')),category:f.get('category'),date:f.get('date')});save();render();});
function difficultyLevel(){return Math.min(5,Math.max(1,Number(state.difficultyLevel)||3));}
function adjustedTarget(target){const level=difficultyLevel(),step=level-3,seconds=String(target).includes('秒'),amount=seconds?5:2;return String(target).replace(/\d+/g,value=>String(Math.max(1,Number(value)+step*amount)));}
function updateDifficultyUI(){const level=difficultyLevel(),input=$('#difficulty-input'),note=$('#difficulty-note'),delta=level-3;if(input)input.value=level;if(note)note.textContent=delta===0?'标准难度：按方案原始次数训练':`${level<3?'降低':'提高'}难度：每级${level<3?'减少':'增加'}约 2 次或 5 秒`;}
function displayTarget(item){return item?.isRest?item.target:adjustedTarget(item?.target||'');}
function drawTimer(){const s=timer.seconds, list=state.exercises||[], current=list[timer.exerciseIndex]||{name:'训练完成',target:'保存记录'};$('#timer-display').textContent=`${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;$('#timer-toggle').textContent=timer.running?'暂停':'开始';$('#timer-state').textContent=timer.running?'训练计时中':'准备开始';$('#exercise-name').textContent=`第 ${timer.exerciseIndex+1} 项：${current.name}`;$('#exercise-detail').textContent=`目标 ${displayTarget(current)} · 共 ${$('#rounds-input').value||3} 轮`;}
$('#difficulty-input').onchange=e=>{state.difficultyLevel=Math.min(5,Math.max(1,Number(e.target.value)||3));updateDifficultyUI();drawTimer();renderExtras();save();};
function startTimer(){if(timer.running)return;timer.running=true;clearInterval(timer.interval);timer.interval=setInterval(()=>{timer.seconds++;drawTimer();},1000);}
$('#timer-toggle').onclick=()=>{if(timer.running){timer.running=false;clearInterval(timer.interval);}else startTimer();drawTimer();};$('#reset-timer').onclick=()=>{timer.running=false;clearInterval(timer.interval);timer.seconds=0;timer.exerciseIndex=0;drawTimer();};$('#next-exercise').onclick=()=>{timer.exerciseIndex=(timer.exerciseIndex+1)%Math.max(1,(state.exercises||[]).length);timer.seconds=0;startTimer();drawTimer();};$('#complete-workout').onclick=()=>{const rounds=Math.max(1,Number($('#rounds-input').value)||3);state.workouts.unshift({id:crypto.randomUUID(),date:today(),createdAt:new Date().toISOString(),rounds,rest:Number($('#rest-input').value)||0,difficulty:difficultyLevel(),exercises:state.exercises.map(item=>({...item,target:displayTarget(item)})),duration:timer.seconds});save();timer.running=false;clearInterval(timer.interval);timer.seconds=0;timer.exerciseIndex=0;drawTimer();render();};
$('#export-button').onclick=()=>{const blob=new Blob([JSON.stringify(state,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`饮食训练本-${today()}.json`;a.click();URL.revokeObjectURL(url);};
let syncTimer;
const syncFetch=(url,options={})=>{const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),2500);return fetch(url,{...options,signal:controller.signal}).finally(()=>clearTimeout(timer));};
function serverUrl(){return $('#server-url-input').value.trim().replace(/\/$/,'');}
function setSyncStatus(message){$('#sync-status').textContent=message;}
function scheduleSync(){clearTimeout(syncTimer);if(serverUrl())syncTimer=setTimeout(pushToServer,700);}
async function pushToServer(){const url=serverUrl();if(!url)return;try{setSyncStatus('正在同步到电脑…');const response=await syncFetch(`${url}/api/state`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(state)});if(!response.ok)throw new Error();localStorage.setItem('diet-training-server',url);setSyncStatus('已同步到电脑');}catch{setSyncStatus('电脑服务器不可用；记录仍保存在本机');}}
async function pullFromServer(){const url=serverUrl();if(!url){setSyncStatus('请先填写电脑服务器地址');return;}try{setSyncStatus('正在从电脑读取…');const response=await syncFetch(`${url}/api/state`);if(!response.ok)throw new Error();const payload=await response.json();if(!payload.state||typeof payload.state!=='object')throw new Error();state=payload.state;localStorage.setItem('diet-training-state',JSON.stringify(state));localStorage.setItem('diet-training-server',url);render();setSyncStatus('已从电脑读取');}catch{setSyncStatus('无法连接电脑服务器');}}
async function syncNow(){
  const button=$('#sync-now-button');
  if(!serverUrl()){showToast('请先在设置中填写电脑服务器地址');return;}
  if(button){button.disabled=true;button.classList.add('is-syncing');button.textContent='同步中';}
  setSyncStatus('正在同步…');
  await pushToServer();
  await pullFromServer();
  if(button){button.disabled=false;button.classList.remove('is-syncing');button.textContent='同步';}
  showToast($('#sync-status').textContent.includes('已从')?'同步完成':'同步失败，请检查 Tailscale 或服务器');
}
// When opened through Tailscale (or the LAN server), sync back to that same server by default.
const tailscaleServerUrl='https://win-5i5fng50vt5.taila5a35b.ts.net';
const savedServerUrl=localStorage.getItem('diet-training-server');
const legacyServerUrls=['http://100.76.118.55:8787','http://192.168.1.5:8787'];
const defaultServerUrl=location.port==='8787'?location.origin:tailscaleServerUrl;
$('#server-url-input').value=legacyServerUrls.includes(savedServerUrl)?tailscaleServerUrl:(savedServerUrl||defaultServerUrl);
$('#server-url-input').onchange=()=>{localStorage.setItem('diet-training-server',serverUrl());configureNativeAutoSync();setSyncStatus('地址已保存；Android 将在 Wi‑Fi 下自动同步');};
$('#push-server-button')?.remove();
$('#pull-server-button')?.remove();
// Keep every local change durable on the computer server, including a final save when the page closes.
window.addEventListener('pagehide',()=>{const url=serverUrl();if(url)fetch(`${url}/api/state`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(state),keepalive:true}).catch(()=>{});});
state.games ||= []; state.savings ||= []; state.exercises ||= [{name:'深蹲',target:'25–30 次'},{name:'俯卧撑',target:'10–15 次'},{name:'平板支撑',target:'45–60 秒'},{name:'卷腹',target:'25–30 次'}]; state.mealPlans ||= [{id:'default-meal',name:'一餐方案',items:state.draftFoods}]; state.workoutPlans ||= [{id:'default-workout',name:'自重循环',items:state.exercises}]; state.activeMealPlan ||= 'default-meal'; state.activeWorkoutPlan ||= 'default-workout'; state.weights.forEach(x=>x.id ||= crypto.randomUUID());
// Versioned defaults: update only bundled plans, never historical records or custom plans.
const PLAN_UPDATE_VERSION=4;
if((state.planUpdateVersion||0)<PLAN_UPDATE_VERSION){
  let defaultMeal=state.mealPlans.find(x=>x.id==='default-meal');
  if(!defaultMeal){defaultMeal={id:'default-meal',name:'\u51cf\u8102\u57fa\u7840\u914d\u65b9',items:clonePlanItems(latestFoods)};state.mealPlans.unshift(defaultMeal);}
  else {defaultMeal.name='\u51cf\u8102\u57fa\u7840\u914d\u65b9';defaultMeal.items=clonePlanItems(latestFoods);}
  let defaultWorkout=state.workoutPlans.find(x=>x.id==='default-workout');
  if(!defaultWorkout){defaultWorkout={id:'default-workout',name:'\u8179\u808c\u51cf\u8102\u5faa\u73af',items:clonePlanItems(latestExercises)};state.workoutPlans.unshift(defaultWorkout);}
  else {defaultWorkout.name='\u8179\u808c\u51cf\u8102\u5faa\u73af';defaultWorkout.items=clonePlanItems(latestExercises);}
  if(state.activeMealPlan==='default-meal')state.draftFoods=defaultMeal.items;
  const activeWorkout=state.workoutPlans.find(x=>x.id===state.activeWorkoutPlan);
  if(activeWorkout){activeWorkout.items=clonePlanItems(latestExercises);state.exercises=activeWorkout.items;}
  state.planUpdateVersion=PLAN_UPDATE_VERSION;
  save();
}
function removeRecord(type,id){
  state.deletedRecords ||= {};
  state.deletedRecords[type] ||= [];
  if(!state.deletedRecords[type].includes(id))state.deletedRecords[type].push(id);
  state[type]=state[type].filter(x=>x.id!==id);save();render();
}
function renderExtras(){const mp=$('#meal-plan-select'),wp=$('#workout-plan-select');if(mp)mp.innerHTML=state.mealPlans.map(x=>`<option value="${x.id}">${x.name}</option>`).join('');if(wp)wp.innerHTML=state.workoutPlans.map(x=>`<option value="${x.id}">${x.name}</option>`).join('');if(mp)mp.value=state.activeMealPlan;if(wp)wp.value=state.activeWorkoutPlan;updateDifficultyUI();const exercises=$('#exercise-list');if(exercises)exercises.innerHTML=state.exercises.map((x,i)=>`<p class="${x.isRest?'rest-exercise':''}"><span>${i+1}</span><strong>${x.isRest?'⏸️ ':''}${x.name}</strong><b>${displayTarget(x)}</b><span class="exercise-actions"><button class="text-button" data-move-exercise="${i}:-1" ${i===0?'disabled':''}>↑</button><button class="text-button" data-move-exercise="${i}:1" ${i===state.exercises.length-1?'disabled':''}>↓</button><button class="text-button" data-add-rest-after="${i}">休息</button><button class="text-button" data-delete-exercise="${i}">删除</button></span></p>`).join('');const row=(x,type,label)=>`<div class="history-row"><div><p>${label} · ${x.name||x.date}</p><small>${x.date||''}</small></div><button class="text-button" data-delete="${type}:${x.id}">删除</button></div>`;$('#playing-games').innerHTML=state.games.filter(x=>x.status==='playing').map(x=>row(x,'games','🎮')).join('')||'暂无正在玩的游戏';$('#finished-games').innerHTML=state.games.filter(x=>x.status==='finished').map(x=>row(x,'games','✅')).join('')||'暂无已游玩游戏';const all=[...state.meals.map(x=>row(x,'meals','🍽️')),...state.workouts.map(x=>row(x,'workouts','🏃')),...state.weights.map(x=>row(x,'weights','⚖️')),...state.expenses.map(x=>row(x,'expenses',x.type==='income'?'💰':'🧾'))];$('#record-list').innerHTML=all.join('')||'暂无记录';const savings=$('#saving-list');if(savings)savings.innerHTML=state.savings.map(x=>`<div class="history-row"><div><p>🎯 ${x.name}</p><small>目标 ¥${x.target}</small></div><button class="text-button" data-delete="savings:${x.id}">删除</button></div>`).join('')||'暂无存钱计划';}
document.addEventListener('click',e=>{const id=e.target.dataset.delete;if(id){const [type,key]=id.split(':');removeRecord(type,key)}if(e.target.dataset.deleteExercise!==undefined){state.exercises.splice(Number(e.target.dataset.deleteExercise),1);save();renderExtras();}});
$('#add-exercise-button').onclick=()=>dialog('添加训练动作','<label class="form-field">动作名称<input name="name" required></label><label class="form-field">数量/时长<input name="target" required placeholder="例如 12 次"></label>',f=>{state.exercises.push({name:f.get('name'),target:f.get('target')});save();render();});
$('#add-game-button').onclick=()=>dialog('添加游戏','<label class="form-field">游戏名称<input name="name" required></label><label class="form-field">状态<select name="status"><option value="playing">正在游玩</option><option value="finished">已游玩</option></select></label>',f=>{state.games.unshift({id:crypto.randomUUID(),name:f.get('name'),status:f.get('status'),date:today()});save();render();});
$('#meal-plan-select').onchange=e=>{state.activeMealPlan=e.target.value;state.draftFoods=state.mealPlans.find(x=>x.id===e.target.value).items;save();render();};$('#workout-plan-select').onchange=e=>{state.activeWorkoutPlan=e.target.value;state.exercises=state.workoutPlans.find(x=>x.id===e.target.value).items;save();render();};$('#add-meal-plan').onclick=()=>dialog('新建饮食方案','<label class="form-field">方案名称<input name="name" required></label>',f=>{const x={id:crypto.randomUUID(),name:f.get('name'),items:JSON.parse(JSON.stringify(state.draftFoods))};state.mealPlans.push(x);state.activeMealPlan=x.id;state.draftFoods=x.items;save();render();});$('#add-workout-plan').onclick=()=>dialog('新建训练方案','<label class="form-field">方案名称<input name="name" required></label>',f=>{const x={id:crypto.randomUUID(),name:f.get('name'),items:JSON.parse(JSON.stringify(state.exercises))};state.workoutPlans.push(x);state.activeWorkoutPlan=x.id;state.exercises=x.items;save();render();});
if($('#add-saving-button'))$('#add-saving-button').onclick=()=>dialog('添加存钱计划','<label class="form-field">计划名称<input name="name" required></label><label class="form-field">目标金额（元）<input name="target" type="number" min="1" required></label>',f=>{state.savings.unshift({id:crypto.randomUUID(),name:f.get('name'),target:Number(f.get('target'))});save();render();});
$('#today-label').textContent=new Date().toLocaleDateString('zh-CN',{month:'long',day:'numeric',weekday:'long'});if('serviceWorker'in navigator)navigator.serviceWorker.register('sw.js');render();drawTimer();

// The profile button keeps settings out of the day-to-day recording flow.
const profileButton=document.createElement('button');
profileButton.id='profile-settings-button';
profileButton.className='profile-button';
profileButton.type='button';
profileButton.setAttribute('aria-label','打开设置');
profileButton.title='设置';
profileButton.textContent='我';
$('#export-button').before(profileButton);
profileButton.onclick=()=>dialog('设置',`<p class="settings-note">记录会自动保存在本机；连接电脑服务器时会在每次记录后自动同步。</p><label class="form-field">电脑服务器地址<input name="serverUrl" type="url" value="${serverUrl()}" placeholder="http://192.168.1.5:8787"></label>`,f=>{
  const url=String(f.get('serverUrl')||'').trim().replace(/\/$/,'');
  $('#server-url-input').value=url;
  localStorage.setItem('diet-training-server',url);
  configureNativeAutoSync();
  if(url){scheduleSync();setSyncStatus('自动同步已开启');showToast('设置已保存，将自动同步');}
  else {setSyncStatus('仅保存到本机');showToast('设置已保存，记录仅保存在本机');}
});
const syncCard=$('#server-url-input')?.closest('.settings-card');
if(syncCard){
  syncCard.querySelector('.button-row')?.remove();
  syncCard.querySelector('h3').textContent='自动同步';
  syncCard.querySelector('p').textContent='添加或修改记录后会自动同步；可在顶部头像中设置服务器地址。';
  syncCard.querySelector('label').hidden=true;
  syncCard.hidden=true;
}
const profileStyles=document.createElement('style');
profileStyles.textContent=`.profile-button{width:38px;height:38px;border:0;border-radius:50%;background:linear-gradient(145deg,#27643b,#5c9b6d);color:#fff;font:700 14px/1 inherit;box-shadow:0 3px 9px rgba(23,101,52,.22);cursor:pointer;flex:0 0 auto}.profile-button:active{transform:scale(.94)}.sync-now-button{height:36px;padding:0 11px;border:1px solid #cfe0d1;border-radius:11px;background:#fff;color:#1f6838;font:700 13px/1 inherit;cursor:pointer;box-shadow:0 2px 7px rgba(23,101,52,.08)}.sync-now-button:active{transform:scale(.96)}.sync-now-button.is-syncing{opacity:.65}.settings-note{margin:0 0 14px;color:#66736a;font-size:13px;line-height:1.55}.app-toast{position:fixed;z-index:20;left:50%;bottom:calc(86px + env(safe-area-inset-bottom));transform:translate(-50%,12px);width:max-content;max-width:calc(100vw - 36px);padding:10px 14px;border-radius:12px;background:rgba(24,43,28,.92);color:#fff;font-size:13px;box-shadow:0 9px 24px rgba(18,35,22,.22);opacity:0;pointer-events:none;transition:opacity .2s ease,transform .2s ease}.app-toast.show{opacity:1;transform:translate(-50%,0)}`;
document.head.append(profileStyles);

// Keep record deletion in the page where the record belongs.
const baseRender = render;
function renderScopedRecords(){
  const planRow = $('#add-meal-plan').parentElement;
  let deletePlan = $('#delete-meal-plan');
  if(!deletePlan){
    deletePlan=document.createElement('button');
    deletePlan.id='delete-meal-plan';
    deletePlan.className='text-button';
    deletePlan.type='button';
    deletePlan.textContent='\u5220\u9664\u65b9\u6848';
    planRow.append(deletePlan);
  }
  deletePlan.disabled=state.mealPlans.length<=1;

  const chart=$('#weight-chart');
  let weightHistory=$('#weight-history');
  if(!weightHistory){
    const section=document.createElement('section');
    section.className='section';
    section.innerHTML='<h3>\u4f53\u91cd\u8bb0\u5f55</h3><div id="weight-history" class="history-list empty-state"></div>';
    chart.closest('article').after(section);
    weightHistory=$('#weight-history');
  }
  weightHistory.innerHTML=state.weights.length
    ? [...state.weights].sort((a,b)=>b.date.localeCompare(a.date)).map(x=>`<div class="history-row"><div><p>\u2696\ufe0f ${fmt(x.value)} kg</p><small>${x.date}</small></div><button class="text-button" data-delete="weights:${x.id}">\u5220\u9664</button></div>`).join('')
    : '\u6682\u65e0\u4f53\u91cd\u8bb0\u5f55';

  const expenseRows=$$('#expense-history .history-row');
  const sortedExpenses=[...state.expenses].sort((a,b)=>b.date.localeCompare(a.date)).slice(0,12);
  expenseRows.forEach((row,index)=>{
    if(row.querySelector('[data-delete]'))return;
    const button=document.createElement('button');
    button.className='text-button';
    button.type='button';
    button.textContent='\u5220\u9664';
    button.dataset.delete=`expenses:${sortedExpenses[index].id}`;
    row.append(button);
  });
  const legacyRecords=$('#record-list')?.closest('article');
  if(legacyRecords)legacyRecords.hidden=true;
}
const $$ = (s) => [...document.querySelectorAll(s)];
render = function(){baseRender();renderScopedRecords();};
document.addEventListener('click',e=>{if(e.target.id!=='delete-meal-plan')return;
  if(state.mealPlans.length<=1){alert('\u81f3\u5c11\u4fdd\u7559\u4e00\u4e2a\u996e\u98df\u65b9\u6848');return;}
  const current=state.mealPlans.find(x=>x.id===state.activeMealPlan);
  if(!confirm(`\u786e\u5b9a\u5220\u9664\u300c${current.name}\u300d\u5417\uff1f`))return;
  state.mealPlans=state.mealPlans.filter(x=>x.id!==state.activeMealPlan);
  const next=state.mealPlans[0];
  state.activeMealPlan=next.id;
  state.draftFoods=next.items;
  save();render();
});
// Template ingredients are editable data, not completed meal records.
$('#add-food-button').onclick=()=>dialog('\u6dfb\u52a0\u5230\u5f53\u524d\u6a21\u677f','<label class="form-field">\u98df\u6750\u540d\u79f0<input name="name" required autofocus></label><label class="form-field">\u6bcf 100g \u70ed\u91cf (kcal)<input name="kcal" type="number" min="0" required></label><label class="form-field">\u6bcf 100g \u86cb\u767d\u8d28 (g)<input name="protein" type="number" min="0" value="0" required></label><label class="form-field">\u6bcf 100g \u7ea4\u7ef4 (g)<input name="fiber" type="number" min="0" value="0" required></label><label class="form-field">\u672c\u6b21\u7528\u91cf (g)<input name="grams" type="number" min="0" value="100" required></label>',f=>{
  state.draftFoods.push({name:f.get('name'),kcal:Number(f.get('kcal')),protein:Number(f.get('protein')),fiber:Number(f.get('fiber')),grams:Number(f.get('grams'))});
  save();render();
});
$('#add-exercise-button').onclick=()=>dialog('\u6dfb\u52a0\u8bad\u7ec3\u52a8\u4f5c','<label class="form-field">\u52a8\u4f5c\u540d\u79f0<input name="name" required autofocus></label><label class="form-field">\u6b21\u6570<input name="reps" type="number" min="1" value="12" required></label>',f=>{
  state.exercises.push({name:f.get('name'),target:`${Number(f.get('reps'))} \u6b21`});
  save();render();
});
document.addEventListener('click',e=>{
  const move=e.target.dataset.moveExercise;
  if(move!==undefined){const [index,offset]=move.split(':').map(Number),next=index+offset;if(next>=0&&next<state.exercises.length){[state.exercises[index],state.exercises[next]]=[state.exercises[next],state.exercises[index]];save();render();}return;}
  const restAfter=e.target.dataset.addRestAfter;
  if(restAfter!==undefined){state.exercises.splice(Number(restAfter)+1,0,{name:'休息',target:`${Number($('#rest-input').value)||45} 秒`,isRest:true});save();render();return;}
  const foodIndex=e.target.dataset.deleteFood;
  if(foodIndex!==undefined){
    state.draftFoods.splice(Number(foodIndex),1);
    save();render();
  }
  const editFoodIndex=e.target.dataset.editFood;
  if(editFoodIndex!==undefined){
    const item=state.draftFoods[Number(editFoodIndex)];
    dialog('编辑食材',`<label class="form-field">名称<input name="name" value="${item.name}" required></label><label class="form-field">每 100g 热量（kcal）<input name="kcal" type="number" min="0" value="${item.kcal}" required></label><label class="form-field">每 100g 蛋白质（g）<input name="protein" type="number" min="0" value="${item.protein}" required></label><label class="form-field">每 100g 纤维（g）<input name="fiber" type="number" min="0" value="${item.fiber||0}" required></label><label class="form-field">用量（g）<input name="grams" type="number" min="0" value="${item.grams}" required></label>`,f=>{Object.assign(item,{name:f.get('name'),kcal:Number(f.get('kcal')),protein:Number(f.get('protein')),fiber:Number(f.get('fiber')),grams:Number(f.get('grams'))});save();render();});
    return;
  }
  const exerciseIndex=e.target.dataset.editExercise;
  if(exerciseIndex!==undefined){
    const item=state.exercises[Number(exerciseIndex)];
    const unit=item.isRest?'秒':'次',field=item.isRest?'seconds':'reps';
    dialog(item.isRest?'设置休息时间':'设置训练次数',`<label class="form-field">动作<input value="${item.name}" disabled></label><label class="form-field">${unit}<input name="${field}" type="number" min="1" value="${(item.target.match(/\\d+/)||[''])[0]}" required></label>`,f=>{
      item.target=`${Number(f.get(field))} ${unit}`;
      save();render();
    });
  }
});
const originalScopedRecords=renderScopedRecords;
renderScopedRecords=function(){
  originalScopedRecords();
  $('#meal-plan-select').parentElement.hidden=false;
  $$('#meal-items .item-row').forEach((row,index)=>{
    if(row.querySelector('[data-delete-food]'))return;
    const edit=document.createElement('button');
    edit.className='text-button';
    edit.type='button';
    edit.textContent='编辑';
    edit.dataset.editFood=index;
    const button=document.createElement('button');
    button.className='text-button';
    button.type='button';
    button.textContent='\u5220\u9664';
    button.dataset.deleteFood=index;
    row.append(edit);
    row.append(button);
  });
  $$('#exercise-list [data-delete-exercise]').forEach(button=>{
    const index=button.dataset.deleteExercise;
    if(button.parentElement.querySelector('[data-edit-exercise]'))return;
    const edit=document.createElement('button');
    edit.className='text-button';
    edit.type='button';
    edit.textContent='\u8bbe\u7f6e\u6b21\u6570';
    edit.dataset.editExercise=index;
    button.before(edit);
  });
};
render();

// A backup can be restored after Safari site data is cleared to refresh the PWA.
const importButton=document.createElement('button');
importButton.id='import-backup-button';
importButton.className='icon-button';
importButton.type='button';
importButton.textContent='\u21e9';
importButton.setAttribute('aria-label','\u5bfc\u5165\u5907\u4efd');
const importFile=document.createElement('input');
importFile.id='import-backup-file';
importFile.type='file';
importFile.accept='application/json';
importFile.hidden=true;
$('#export-button').before(importButton);
$('#export-button').after(importFile);
importButton.onclick=()=>importFile.click();
importFile.onchange=async()=>{
  const file=importFile.files?.[0];
  if(!file)return;
  try{
    const restored=JSON.parse(await file.text());
    if(!restored||typeof restored!=='object'||!Array.isArray(restored.meals))throw new Error();
    if(!confirm('\u5bfc\u5165\u4f1a\u8986\u76d6\u5f53\u524d\u672c\u673a\u8bb0\u5f55\uff0c\u662f\u5426\u7ee7\u7eed\uff1f'))return;
    state=restored;
    state.meals ||= []; state.workouts ||= []; state.weights ||= []; state.expenses ||= []; state.games ||= []; state.savings ||= [];
    state.draftFoods ||= foods; state.exercises ||= []; state.mealPlans ||= [{id:'default-meal',name:'\u98df\u6750\u6e05\u5355',items:state.draftFoods}];
    state.workoutPlans ||= [{id:'default-workout',name:'\u81ea\u91cd\u5faa\u73af',items:state.exercises}];
    state.activeMealPlan ||= state.mealPlans[0].id; state.activeWorkoutPlan ||= state.workoutPlans[0].id;
    localStorage.setItem('diet-training-state',JSON.stringify(state));
    render();
    alert('\u5907\u4efd\u5df2\u5bfc\u5165');
  }catch{alert('\u5907\u4efd\u6587\u4ef6\u65e0\u6548\uff0c\u8bf7\u9009\u62e9\u7531\u672c\u5e94\u7528\u5bfc\u51fa\u7684 JSON \u6587\u4ef6');}
  importFile.value='';
};

function dailyBudgetStatus(){
  const limit=Number(state.dailyExpenseLimit)||15;
  const elapsed=Number(today().slice(8));
  const spent=state.expenses.filter(x=>x.type!=='income'&&x.date>=`${month()}-01`&&x.date<=today()).reduce((sum,x)=>sum+Number(x.amount||0),0);
  return {limit,spent,available:limit*elapsed-spent};
}
renderExpenses=()=>{
  const currentMonth=state.expenses.filter(x=>x.date.startsWith(month()));
  const outgoings=currentMonth.filter(x=>x.type!=='income');
  const incomes=currentMonth.filter(x=>x.type==='income');
  const totalOut=outgoings.reduce((sum,x)=>sum+Number(x.amount||0),0);
  const totalIn=incomes.reduce((sum,x)=>sum+Number(x.amount||0),0);
  const food=outgoings.filter(x=>x.category==='\u98df\u6750').reduce((sum,x)=>sum+Number(x.amount||0),0);
  const outCard=$('#expense-total').closest('.stat-card');
  outCard.querySelector('span').textContent='\u672c\u6708\u82b1\u9500';
  $('#expense-total').textContent=money(totalOut);
  const incomeCard=$('#food-expense').closest('.stat-card');
  incomeCard.querySelector('span').textContent='\u672c\u6708\u6536\u5165';
  $('#food-expense').textContent=money(totalIn);
  incomeCard.querySelector('small').textContent='\u4e0d\u8ba1\u5165\u82b1\u9500';
  let budgetCard=$('#daily-budget-card');
  if(!budgetCard){
    budgetCard=document.createElement('article');
    budgetCard.id='daily-budget-card';
    budgetCard.className='stat-card';
    outCard.parentElement.append(budgetCard);
  }
  const budget=dailyBudgetStatus();
  budgetCard.innerHTML=`<span>\u4eca\u65e5\u53ef\u82b1</span><strong>${money(budget.available)}</strong><small>\u6bcf\u65e5\u4e0a\u9650 ${money(budget.limit)}</small>`;
  const cats=['\u98df\u6750','\u8865\u5242','\u5176\u4ed6'];
  $('#expense-breakdown').innerHTML=cats.map(category=>{const amount=outgoings.filter(x=>x.category===category).reduce((sum,x)=>sum+Number(x.amount||0),0);return `<div class="breakdown-row"><span>${category}</span><div class="bar"><i style="width:${totalOut?amount/totalOut*100:0}%"></i></div><b>${money(amount)}</b></div>`}).join('');
  let budgetSetting=$('#daily-budget-setting');
  if(!budgetSetting){
    budgetSetting=document.createElement('article');
    budgetSetting.id='daily-budget-setting';
    budgetSetting.className='card settings-card';
    $('#expense-breakdown').closest('.card').after(budgetSetting);
  }
  budgetSetting.innerHTML=`<div class="section-heading"><h3>\u6bcf\u65e5\u82b1\u9500\u4e0a\u9650</h3><label class="compact-input">\u00a5 <input id="daily-limit-input" type="number" min="0" step="1" value="${budget.limit}"></label></div><p>\u4eca\u65e5\u7d2f\u8ba1\u53ef\u7528 ${money(budget.available)}\uff1b\u672a\u82b1\u5b8c\u4f1a\u7d2f\u79ef\u5230\u660e\u5929\uff0c\u8d85\u652f\u4f1a\u6263\u51cf\u540e\u7eed\u989d\u5ea6\u3002</p>`;
  $('#daily-limit-input').onchange=e=>{state.dailyExpenseLimit=Math.max(0,Number(e.target.value)||0);save();render();};
  const rows=(list,type,empty)=>list.length?list.slice().sort((a,b)=>b.date.localeCompare(a.date)).map(x=>`<div class="history-row"><div><p>${x.name}</p><small>${x.date} \u00b7 ${x.category}</small></div><strong>${money(x.amount)}</strong><button class="text-button" data-delete="${type}:${x.id}">\u5220\u9664</button></div>`).join(''): `<p class="empty-state">${empty}</p>`;
  $('#expense-history').innerHTML=`<div class="record-group"><h4>\u82b1\u9500</h4>${rows(outgoings,'expenses','\u6682\u65e0\u82b1\u9500\u8bb0\u5f55')}</div><div class="record-group"><h4>\u6536\u5165</h4>${rows(incomes,'expenses','\u6682\u65e0\u6536\u5165\u8bb0\u5f55')}</div>`;
};
state.dailyExpenseLimit ??= 15;
render();

// Android APK only: Health Connect is the supported bridge for OnePlus/OHealth data.
function renderHealthConnectCard(){
  const settings=$('#view-trends .settings-card');
  if(!settings)return;
  let card=$('#health-connect-card');
  if(!card){
    card=document.createElement('article');
    card.id='health-connect-card';
    card.className='card health-connect-card';
    settings.after(card);
  }
  const available=Boolean(window.Capacitor?.Plugins?.HealthConnect);
  const snapshot=state.healthConnectSnapshot;
  card.innerHTML=`<div class="section-heading"><div><h3>Android 健康数据</h3><p>${available?'通过 Health Connect 读取已授权的一加健康等数据源。':'仅 Android APK 可用；Safari 网页版仍使用手动记录。'}</p></div><span class="tag">${available?'Health Connect':'未连接'}</span></div>${snapshot?`<div class="health-metrics"><span>今日步数 <b>${Number(snapshot.stepsToday||0).toLocaleString()}</b></span><span>消耗 <b>${fmt(snapshot.caloriesBurnedToday||0)} kcal</b></span><span>运动 <b>${snapshot.exerciseSessionsToday||0} 项</b></span></div>`:''}<button id="health-connect-sync" class="secondary full" type="button" ${available?'':'disabled'}>${snapshot?'重新同步 Health Connect':'连接并同步 Health Connect'}</button><p class="health-note">仅在点击同步时读取；数据仍保存在本机。请先在一加健康 / OHealth 中启用同步到 Health Connect。</p>`;
}
function configureNativeAutoSync(){
  const health=window.Capacitor?.Plugins?.HealthConnect;
  const url=$('#server-url-input')?.value?.trim();
  if(health&&url)health.configureAutoSync({serverUrl:url,stateJson:JSON.stringify(state)}).catch(()=>{});
}
function applyBackgroundHealth(data){
  if(!data||typeof data!=='object')return;
  if(data.heightCm)state.height=Math.round(Number(data.heightCm)*10)/10;
  if(data.weightKg){
    const date=(data.weightTime||new Date().toISOString()).slice(0,10);
    if(!state.weights.some(x=>x.date===date&&Math.abs(Number(x.value)-Number(data.weightKg))<0.01))state.weights.push({id:crypto.randomUUID(),date,value:Math.round(Number(data.weightKg)*10)/10,source:'Health Connect'});
    state.weights.sort((a,b)=>a.date.localeCompare(b.date));
  }
  state.healthConnectSnapshot={stepsToday:data.stepsToday||0,caloriesBurnedToday:data.caloriesBurnedToday||0,exerciseSessionsToday:data.exerciseSessionsToday||0,syncedAt:data.syncedAt||new Date().toISOString()};
}
const previousRender=render;
render=function(){previousRender();renderHealthConnectCard();};
document.addEventListener('click',async event=>{
  if(event.target.id!=='health-connect-sync')return;
  const health=window.Capacitor?.Plugins?.HealthConnect;
  if(!health)return;
  const button=event.target;
  try{
    button.disabled=true;button.textContent='正在请求授权…';
    const permission=await health.requestHealthPermissions();
    if(!permission.granted){alert('未获得全部健康数据权限，可在系统设置 → Health Connect 中重新授权。');return;}
    button.textContent='正在读取数据…';
    const data=await health.readLatest();
    applyBackgroundHealth(data);
    save();render();alert('Health Connect 数据已同步到本机。');
  }catch(error){alert(error?.message||'Health Connect 同步失败，请检查授权和数据源。');}
  finally{button.disabled=false;}
});
// A background Android sync may have run while the app was closed. Bring those values into local storage on launch.
(async()=>{try{const health=window.Capacitor?.Plugins?.HealthConnect;if(!health)return;configureNativeAutoSync();const result=await health.getBackgroundHealth();if(!result.healthJson)return;applyBackgroundHealth(JSON.parse(result.healthJson));localStorage.setItem('diet-training-state',JSON.stringify(state));render();configureNativeAutoSync();}catch{}})();
render();

// Split the default diet into two gentler meals while preserving custom plans and past records.
const splitLunchFoods=[
  {name:'即食燕麦',grams:60,kcal:393,protein:11,fiber:10.6},
  {name:'亚麻籽粉',grams:10,kcal:534,protein:18.3,fiber:27.3},
  {name:'花生酱',grams:10,kcal:588,protein:25,fiber:6},
  {name:'大豆分离蛋白',grams:30,kcal:350,protein:76,fiber:1.4}
];
const splitDinnerFoods=[
  {name:'大豆分离蛋白',grams:30,kcal:350,protein:76,fiber:1.4},
  {name:'善存（29）',grams:1,kcal:0,protein:0,fiber:0},
  {name:'钙尔奇 D600',grams:1,kcal:0,protein:0,fiber:0}
];
if((state.mealSplitVersion||0)<1){
  let lunch=state.mealPlans.find(plan=>plan.id==='default-meal')||state.mealPlans.find(plan=>plan.name==='午餐');
  if(!lunch){lunch={id:'default-meal',name:'午餐',items:clonePlanItems(splitLunchFoods)};state.mealPlans.unshift(lunch);}
  else {lunch.name='午餐';lunch.items=clonePlanItems(splitLunchFoods);}
  let dinner=state.mealPlans.find(plan=>plan.id==='default-dinner')||state.mealPlans.find(plan=>plan.name==='晚餐');
  if(!dinner){dinner={id:'default-dinner',name:'晚餐',items:clonePlanItems(splitDinnerFoods)};state.mealPlans.push(dinner);}
  else {dinner.name='晚餐';dinner.items=clonePlanItems(splitDinnerFoods);}
  state.activeMealPlan=lunch.id;state.draftFoods=lunch.items;state.mealSplitVersion=1;save();
}
function openMealPlan(name){
  const plan=state.mealPlans.find(item=>item.name===name);
  if(!plan){showToast(`未找到${name}方案`);return;}
  state.activeMealPlan=plan.id;state.draftFoods=plan.items;render();openView('food');
}
renderHome=function(){
  const todayWeight=state.weights.filter(item=>item.date===today()).at(-1),budget=dailyBudgetStatus(),spent=spendingTotal(todayExpenses());
  const expenseCard=$('#month-expense').closest('.stat-card');
  expenseCard.classList.add('home-expense-card');expenseCard.setAttribute('role','button');expenseCard.setAttribute('tabindex','0');
  expenseCard.querySelector('span').textContent='今日消费';$('#month-expense').textContent=money(spent);expenseCard.querySelector('small').textContent=`今日还可花 ${money(budget.available)}`;
  expenseCard.onclick=()=>openView('expenses');expenseCard.onkeydown=event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();openView('expenses');}};
  $('#today-weight').textContent=todayWeight?`${fmt(todayWeight.value)} kg`:'—';$('#today-weight-note').textContent=todayWeight?'今日已记录':'尚未记录';
  const setStatus=(id,done,doneText,todoText)=>{const card=$(id);card.classList.toggle('done',done);card.querySelector('small').textContent=done?doneText:todoText;};
  setStatus('#lunch-summary',state.meals.some(item=>item.date===today()&&item.name==='午餐'),'已记录','未记录');
  setStatus('#dinner-summary',state.meals.some(item=>item.date===today()&&item.name==='晚餐'),'已记录','未记录');
  setStatus('#workout-summary',state.workouts.some(item=>item.date===today()),'已完成','未完成');
  setStatus('#expense-summary',todayExpenses().length>0,'已记录','未记录');
};
$('#save-meal-button').onclick=()=>{const totals=calcMeal(),plan=state.mealPlans.find(item=>item.id===state.activeMealPlan);state.meals.unshift({id:crypto.randomUUID(),date:today(),createdAt:new Date().toISOString(),name:plan?.name||'饮食',...totals});save();render();};
$('#home-add-lunch').onclick=()=>openMealPlan('午餐');
$('#home-add-dinner').onclick=()=>openMealPlan('晚餐');
renderExpenses=function(){
  const allExpenses=state.expenses.filter(item=>item.type!=='income'),queryDate=state.expenseQueryDate||'',records=queryDate?allExpenses.filter(item=>item.date===queryDate):allExpenses;
  const todayTotal=spendingTotal(todayExpenses()),budget=dailyBudgetStatus();
  const totalCard=$('#expense-total').closest('.stat-card');totalCard.querySelector('span').textContent='当前消费';$('#expense-total').textContent=money(todayTotal);totalCard.querySelector('small').textContent='今天已消费';
  const availableCard=$('#food-expense').closest('.stat-card');availableCard.querySelector('span').textContent='今日还可花';$('#food-expense').textContent=money(budget.available);availableCard.querySelector('small').textContent=`每日额度 ${money(budget.limit)} · 点击修改`;availableCard.classList.add('editable-budget-card');availableCard.onclick=editAvailableBudget;
  const queryInput=$('#expense-date-query');queryInput.value=queryDate;queryInput.onchange=event=>{state.expenseQueryDate=event.target.value;renderExpenses();};
  $('#clear-expense-query').onclick=()=>{state.expenseQueryDate='';renderExpenses();};
  $('#expense-query-total').textContent=`${queryDate?queryDate:'全部记录'} · 消费总和 ${money(spendingTotal(records))}`;
  let setting=$('#daily-budget-setting');if(!setting){setting=document.createElement('article');setting.id='daily-budget-setting';setting.className='card settings-card';$('#expense-total').closest('.stats-grid').after(setting);}
  setting.innerHTML=`<div class="section-heading"><h3>每日可花额度</h3><label class="compact-input">¥ <input id="daily-limit-input" type="number" min="0" step="1" value="${budget.limit}"></label></div><p>今天还可花 ${money(budget.available)}。未花完会累积到明天，超支会从后续额度扣除。</p>`;
  $('#daily-limit-input').onchange=event=>{state.dailyExpenseLimit=Math.max(0,Number(event.target.value)||0);save();render();};
  const rows=records.slice().sort((a,b)=>b.date.localeCompare(a.date)).map(item=>`<div class="history-row"><div><p>${item.name}</p><small>${item.date}</small></div><strong>${money(item.amount)}</strong><button class="text-button" data-delete="expenses:${item.id}">删除</button></div>`).join('');
  $('#expense-history').innerHTML=rows||'<p class="empty-state">暂无消费记录</p>';
};
render();
// The computer page and phone page each have their own browser storage.
// Refresh from the shared server shortly after opening so both screens converge.

// Header calendar and a compact settings list keep daily controls in one place.
const calendarButton=document.createElement('button');
calendarButton.id='calendar-button';
calendarButton.className='icon-button calendar-button';
calendarButton.type='button';
calendarButton.title='\u65e5\u5386';
calendarButton.setAttribute('aria-label','\u67e5\u770b\u65e5\u5386\u8bb0\u5f55');
calendarButton.textContent='\ud83d\uddd3\ufe0f';
profileButton.before(calendarButton);
const syncNowButton=document.createElement('button');
syncNowButton.id='sync-now-button';
syncNowButton.className='sync-now-button';
syncNowButton.type='button';
syncNowButton.title='立即同步';
syncNowButton.setAttribute('aria-label','立即同步记录');
syncNowButton.textContent='同步';
calendarButton.before(syncNowButton);
syncNowButton.onclick=syncNow;

function dateRecordRows(date){
  const row=(icon,title,detail)=>`<div class="history-row"><div><p>${icon} ${title}</p><small>${detail}</small></div></div>`;
  const meals=state.meals.filter(x=>x.date===date).map(x=>row('\ud83c\udf7d\ufe0f',x.name||'\u996e\u98df',`${fmt(x.kcal||0)} kcal`));
  const workouts=state.workouts.filter(x=>x.date===date).map(x=>row('\ud83c\udfc3',x.exercises?.length?'\u8bad\u7ec3':'\u8bad\u7ec3\u8bb0\u5f55',`${x.rounds||0} \u8f6e`));
  const weights=state.weights.filter(x=>x.date===date).map(x=>row('\u2696\ufe0f','\u4f53\u91cd',`${fmt(x.value)} kg`));
  const expenses=state.expenses.filter(x=>x.type!=='income'&&x.date===date).map(x=>row('\ud83e\uddfe',x.name||'\u6d88\u8d39',money(x.amount||0)));
  return [...meals,...workouts,...weights,...expenses];
}
function openCalendar(){
  dialog('\u65e5\u5386\u8bb0\u5f55',`<label class="form-field">\u65e5\u671f<input id="calendar-date-input" type="date" value="${today()}"></label><div id="calendar-record-list" class="history-list empty-state"></div>`,()=>{});
  const form=$('#entry-form');
  form.querySelector('.primary').textContent='\u5173\u95ed';
  const input=$('#calendar-date-input'),list=$('#calendar-record-list');
  const refresh=()=>{const rows=dateRecordRows(input.value);list.className=rows.length?'history-list':'history-list empty-state';list.innerHTML=rows.length?rows.join(''):'\u5f53\u65e5\u6682\u65e0\u8bb0\u5f55';};
  input.onchange=refresh;refresh();
}
function openSettingsList(){
  dialog('\u8bbe\u7f6e',`<p class="settings-note">\u8bb0\u5f55\u4f1a\u81ea\u52a8\u4fdd\u5b58\u5e76\u540c\u6b65\u3002</p><div class="settings-list"><button type="button" id="settings-games">\ud83c\udfae \u6e38\u620f\u8bb0\u5f55</button><button type="button" id="settings-export">\ud83d\udce5 \u4e0b\u8f7d\u5907\u4efd</button><button type="button" id="settings-import">\ud83d\udce4 \u4e0a\u4f20\u5907\u4efd</button></div><label class="form-field">\u7535\u8111\u670d\u52a1\u5668\u5730\u5740<input name="serverUrl" type="url" value="${serverUrl()}" placeholder="https://win-5i5fng50vt5.taila5a35b.ts.net"></label>`,f=>{
    const url=String(f.get('serverUrl')||'').trim().replace(/\/$/,'');
    $('#server-url-input').value=url;localStorage.setItem('diet-training-server',url);configureNativeAutoSync();
    if(url){scheduleSync();setSyncStatus('\u81ea\u52a8\u540c\u6b65\u5df2\u5f00\u542f');}else setSyncStatus('\u4ec5\u4fdd\u5b58\u5230\u672c\u673a');
  });
  $('#settings-export').onclick=()=>$('#export-button').click();
  $('#settings-games').onclick=()=>{$('#entry-dialog').close();openView('games');};
  $('#settings-import').onclick=()=>$('#import-backup-file').click();
}
calendarButton.onclick=openCalendar;
profileButton.onclick=openSettingsList;
$('#export-button').hidden=true;
$('#import-backup-button').hidden=true;
const settingsListStyles=document.createElement('style');
settingsListStyles.textContent=`.calendar-button{font-size:20px}.settings-list{display:grid;border:1px solid #e4ebe2;border-radius:12px;overflow:hidden;margin:12px 0}.settings-list button{border:0;border-bottom:1px solid #e4ebe2;background:#fff;padding:13px 12px;text-align:left;font:inherit;color:#1f4729;font-weight:650}.settings-list button:last-child{border-bottom:0}.settings-list button:active{background:#f1f7f0}`;
document.head.append(settingsListStyles);

// Spending is intentionally kept lightweight: only purchases and a rolling daily allowance.
function currentMonthExpenses(){return state.expenses.filter(item=>item.type!=='income'&&item.date.startsWith(month()));}
function todayExpenses(){return state.expenses.filter(item=>item.type!=='income'&&item.date===today());}
function spendingTotal(items){return items.reduce((sum,item)=>sum+Number(item.amount||0),0);}
function dailyBudgetStatus(){
  const limit=Math.max(0,Number(state.dailyExpenseLimit)||15);
  const elapsed=Number(today().slice(8));
  const spent=spendingTotal(currentMonthExpenses().filter(item=>item.date<=today()));
  const adjustment=Number(state.budgetAdjustment)||0;
  return {limit,spent,adjustment,available:limit*elapsed-spent+adjustment};
}
function editAvailableBudget(){
  const budget=dailyBudgetStatus();
  dialog('调整今日还可花',`<p class="settings-note">填写今天希望还可消费的金额；调整会延续到后续的滚动额度。</p><label class="form-field">今日还可花（元）<input name="available" type="number" step="0.01" value="${Math.max(0,budget.available)}" required autofocus></label>`,form=>{
    const desired=Number(form.get('available'));
    if(!Number.isFinite(desired)||desired<0)return;
    state.budgetAdjustment=(Number(state.budgetAdjustment)||0)+(desired-budget.available);
    save();render();
  });
}
renderHome=function(){
  const todayWeight=state.weights.filter(item=>item.date===today()).at(-1),budget=dailyBudgetStatus(),spent=spendingTotal(todayExpenses());
  const expenseCard=$('#month-expense').closest('.stat-card');
  expenseCard.classList.add('home-expense-card');
  expenseCard.setAttribute('role','button');
  expenseCard.setAttribute('tabindex','0');
  expenseCard.querySelector('span').textContent='今日消费';
  $('#month-expense').textContent=money(spent);
  expenseCard.querySelector('small').textContent=`今日还可花 ${money(budget.available)}`;
  expenseCard.onclick=()=>openView('expenses');
  expenseCard.onkeydown=event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();openView('expenses');}};
  $('#today-weight').textContent=todayWeight?`${fmt(todayWeight.value)} kg`:'—';
  $('#today-weight-note').textContent=todayWeight?'今日已记录':'尚未记录';
  const setStatus=(id,done,doneText,todoText)=>{const el=$(id);el.classList.toggle('done',done);el.querySelector('small').textContent=done?doneText:todoText;};
  setStatus('#lunch-summary',state.meals.some(item=>item.date===today()&&item.name==='午餐'),'已记录','未记录');
  setStatus('#dinner-summary',state.meals.some(item=>item.date===today()&&item.name==='晚餐'),'已记录','未记录');
  setStatus('#workout-summary',state.workouts.some(item=>item.date===today()),'已完成','未完成');
  setStatus('#expense-summary',todayExpenses().length>0,'已记录','未记录');
};
renderExpenses=function(){
  const allExpenses=state.expenses.filter(item=>item.type!=='income'),queryDate=state.expenseQueryDate||'',expenses=queryDate?allExpenses.filter(item=>item.date===queryDate):allExpenses,todayTotal=spendingTotal(todayExpenses()),budget=dailyBudgetStatus();
  const totalCard=$('#expense-total').closest('.stat-card');
  totalCard.querySelector('span').textContent='当前消费';
  $('#expense-total').textContent=money(todayTotal);
  totalCard.querySelector('small').textContent='今天已消费';
  const availableCard=$('#food-expense').closest('.stat-card');
  availableCard.querySelector('span').textContent='今日还可花';
  $('#food-expense').textContent=money(budget.available);
  availableCard.querySelector('small').textContent=`每日额度 ${money(budget.limit)} · 点击修改`;
  availableCard.classList.add('editable-budget-card');
  availableCard.setAttribute('role','button');availableCard.setAttribute('tabindex','0');
  availableCard.onclick=editAvailableBudget;
  availableCard.onkeydown=event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();editAvailableBudget();}};
  const queryInput=$('#expense-date-query');
  queryInput.value=queryDate;
  queryInput.onchange=event=>{state.expenseQueryDate=event.target.value;renderExpenses();};
  $('#clear-expense-query').onclick=()=>{state.expenseQueryDate='';renderExpenses();};
  $('#expense-query-total').textContent=`${queryDate?queryDate:'全部记录'} · 消费总和 ${money(spendingTotal(expenses))}`;
  let setting=$('#daily-budget-setting');
  if(!setting){setting=document.createElement('article');setting.id='daily-budget-setting';setting.className='card settings-card';$('#expense-total').closest('.stats-grid').after(setting);}
  setting.innerHTML=`<div class="section-heading"><h3>每日可花额度</h3><label class="compact-input">¥ <input id="daily-limit-input" type="number" min="0" step="1" value="${budget.limit}"></label></div><p>今天还可花 ${money(budget.available)}。未花完会累积到明天，超支会从后续额度扣除。</p>`;
  $('#daily-limit-input').onchange=event=>{state.dailyExpenseLimit=Math.max(0,Number(event.target.value)||0);save();render();};
  const rows=expenses.slice().sort((a,b)=>b.date.localeCompare(a.date)).map(item=>`<div class="history-row"><div><p>${item.name}</p><small>${item.date}</small></div><strong>${money(item.amount)}</strong><button class="text-button" data-delete="expenses:${item.id}">删除</button></div>`).join('');
  $('#expense-history').innerHTML=rows||'<p class="empty-state">暂无消费记录</p>';
  $('#saving-list')?.closest('.card')?.remove();
};
$('#add-expense-button').onclick=()=>dialog('记录消费','<label class="form-field">项目<input name="name" required autofocus></label><label class="form-field">金额（元）<input name="amount" type="number" min="0.01" step="0.01" required></label><label class="form-field">日期<input name="date" type="date" value="'+today()+'" required></label>',form=>{state.expenses.unshift({id:crypto.randomUUID(),name:form.get('name'),type:'expense',amount:Number(form.get('amount')),date:form.get('date')});save();render();});
$('#home-add-expense').onclick=()=>$('#add-expense-button').click();
state.dailyExpenseLimit ??=15;
const spendingStyles=document.createElement('style');
spendingStyles.textContent='.home-expense-card,.editable-budget-card{cursor:pointer}.home-expense-card:active,.editable-budget-card:active{transform:scale(.98);background:#f8fcf8}';
document.head.append(spendingStyles);
render();
