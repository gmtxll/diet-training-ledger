const $ = (s) => document.querySelector(s);
const today = () => new Date().toISOString().slice(0, 10);
const month = () => today().slice(0, 7);
const foods = [
  ['鍗抽鐕曢害',260,393,11,10.6],['鍏ㄨ剛濂剁矇',50,517,25.1,0],['鑺辩敓閰?,35,588,25,6],['浜氶夯绫界矇',10,534,18.3,27.3],['澶ц眴鍒嗙铔嬬櫧',20,350,76,1.4],['鍗抽鑴辨按钄彍',20,300,10,20]
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
  {name:'\u5f39\u529b\u5e26\u5212\u8239',target:'10\u201315 \u6b21'},
  {name:'\u81c0\u6865',target:'12\u201320 \u6b21'},
  {name:'\u5e73\u677f\u652f\u6491',target:'45\u201360 \u79d2'},
  {name:'\u5377\u8179',target:'25\u201330 \u6b21'}
];
const clonePlanItems=(items)=>JSON.parse(JSON.stringify(items));
const initial = { meals:[], workouts:[], weights:[], expenses:[], height:163, draftFoods:clonePlanItems(latestFoods) };
let state = JSON.parse(localStorage.getItem('diet-training-state') || 'null') || initial;
let timer = {seconds:0, running:false, interval:null, exerciseIndex:0};
const save = () => { state.updatedAt=new Date().toISOString(); localStorage.setItem('diet-training-state', JSON.stringify(state)); localStorage.setItem('diet-training-backup-'+today(), JSON.stringify(state)); scheduleSync(); configureNativeAutoSync(); };
const fmt = (n) => Number(n).toLocaleString('zh-CN',{maximumFractionDigits:1});
const money = (n) => `楼${Number(n).toLocaleString('zh-CN',{maximumFractionDigits:2})}`;
function calcMeal(items=state.draftFoods){return items.reduce((a,f)=>({kcal:a.kcal+f.grams*f.kcal/100,protein:a.protein+f.grams*f.protein/100,fiber:a.fiber+f.grams*f.fiber/100}),{kcal:0,protein:0,fiber:0});}
function todayMeals(){return state.meals.filter(x=>x.date===today());}
function todayTotals(){return todayMeals().reduce((a,m)=>({kcal:a.kcal+m.kcal,protein:a.protein+m.protein}),{kcal:0,protein:0});}
function expensesThisMonth(){return state.expenses.filter(x=>x.type!=='income'&&x.date.startsWith(month()));}
function renderFood(){const list=$('#meal-items');list.innerHTML='';state.draftFoods.forEach((f,i)=>{const row=document.createElement('div');row.className='item-row';row.innerHTML=`<div><p>${f.name}</p><small>${fmt(f.grams*f.kcal/100)} kcal 路 ${fmt(f.grams*f.protein/100)} g 铔嬬櫧璐?/small></div><label><input class="gram-input" type="number" min="0" value="${f.grams}" data-food="${i}"> g</label>`;list.append(row);}); const t=calcMeal();$('#meal-total').textContent=`${fmt(t.kcal)} kcal 路 ${fmt(t.protein)} g 铔嬬櫧璐?路 ${fmt(t.fiber)} g 绾ょ淮`;
  $('#food-history').innerHTML=state.meals.length?state.meals.slice(0,8).map(m=>`<div class="history-row"><div><p>馃嵔锔?${m.name}</p><small>${m.date} 路 ${fmt(m.kcal)} kcal</small></div><button class="text-button" data-delete="meals:${m.id}">鍒犻櫎</button></div>`).join(''):'鏆傛棤楗璁板綍';}
function renderHome(){const totals=todayTotals(), expenses=expensesThisMonth();$('#today-kcal').textContent=fmt(totals.kcal);$('#today-protein').textContent=fmt(totals.protein);$('#month-expense').textContent=money(expenses.reduce((a,x)=>a+x.amount,0));const worked=state.workouts.some(x=>x.date===today());$('#workout-summary').textContent=worked?'浠婂ぉ宸插畬鎴愯缁?:'浠婂ぉ杩樻湭璁粌'; const events=[...todayMeals().map(x=>({time:x.createdAt,text:`${x.name} 路 ${fmt(x.kcal)} kcal`})),...state.workouts.filter(x=>x.date===today()).map(x=>({time:x.createdAt,text:`鑷噸寰幆 路 ${x.rounds} 杞甡}))].sort((a,b)=>b.time.localeCompare(a.time));$('#today-timeline').innerHTML=events.length?events.map(x=>`<div class="history-row"><p>${new Date(x.time).toLocaleTimeString('zh-CN',{hour:'2-digit',minute:'2-digit'})}銆€${x.text}</p></div>`).join(''):'浠婂ぉ杩樻病鏈夎褰?;}
function renderTrends(){const weights=[...state.weights].sort((a,b)=>a.date.localeCompare(b.date));const latest=weights.at(-1);$('#latest-weight').textContent=latest?fmt(latest.value):'鈥?;const bmi=latest&&state.height?latest.value/((state.height/100)**2):null;$('#bmi-value').textContent=bmi?fmt(bmi):'鈥?;$('#height-caption').textContent=state.height?`韬珮 ${state.height} cm`:'璇疯缃韩楂?;$('#height-input').value=state.height||'';if(!weights.length){$('#weight-chart').className='weight-chart empty-state';$('#weight-chart').textContent='璁板綍浣撻噸鍚庢樉绀鸿秼鍔?;return}const min=Math.min(...weights.map(x=>x.value)),max=Math.max(...weights.map(x=>x.value)),span=Math.max(max-min,.4);$('#weight-chart').className='weight-chart';$('#weight-chart').innerHTML=weights.slice(-8).map(x=>`<div class="weight-bar" style="height:${35+((x.value-min)/span)*60}px"><b>${fmt(x.value)}</b><span>${x.date.slice(5)}</span></div>`).join('');}
function renderExpenses(){const expenses=expensesThisMonth(), total=expenses.reduce((a,x)=>a+x.amount,0), food=expenses.filter(x=>x.category==='椋熸潗').reduce((a,x)=>a+x.amount,0);$('#expense-total').textContent=money(total);$('#food-expense').textContent=money(food); const cats=['椋熸潗','琛ュ墏','鍏朵粬'];$('#expense-breakdown').innerHTML=cats.map(c=>{const n=expenses.filter(x=>x.category===c).reduce((a,x)=>a+x.amount,0);return `<div class="breakdown-row"><span>${c}</span><div class="bar"><i style="width:${total?n/total*100:0}%"></i></div><b>${money(n)}</b></div>`}).join('');$('#expense-history').innerHTML=state.expenses.length?state.expenses.slice().sort((a,b)=>b.date.localeCompare(a.date)).slice(0,12).map(x=>`<div class="history-row"><div><p>${x.name}</p><small>${x.date} 路 ${x.category}</small></div><strong>${money(x.amount)}</strong></div>`).join(''):'鏆傛棤鑺遍攢璁板綍';}
function renderWorkouts(){ $('#workout-history').innerHTML=state.workouts.length?state.workouts.slice(0,8).map(x=>`<div class="history-row"><div><p>馃弮 ${x.exercises?.length?'鑷畾涔夎缁?:'鑷噸寰幆'}</p><small>${x.date} 路 ${x.rounds} 杞?/small></div><button class="text-button" data-delete="workouts:${x.id}">鍒犻櫎</button></div>`).join(''):'鏆傛棤璁粌璁板綍';}
function render(){renderHome();renderFood();renderTrends();renderExpenses();renderWorkouts();renderExtras();}
function dialog(title,fields,onSave){$('#dialog-title').textContent=title;$('#dialog-fields').innerHTML=fields;const d=$('#entry-dialog');d.showModal();const form=$('#entry-form');form.onsubmit=(e)=>{e.preventDefault();onSave(new FormData(form));d.close();};}
document.addEventListener('input',(e)=>{if(e.target.matches('[data-food]')){state.draftFoods[e.target.dataset.food].grams=Math.max(0,Number(e.target.value)||0);save();const t=calcMeal();$('#meal-total').textContent=`${fmt(t.kcal)} kcal 路 ${fmt(t.protein)} g 铔嬬櫧璐?路 ${fmt(t.fiber)} g 绾ょ淮`;}});
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
  if(name==='workout'){scheduleSync();showToast('璁粌璁板綍浼氳嚜鍔ㄤ繚瀛樺苟鍚屾鍒扮數鑴?);}
}
document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>openView(b.dataset.view));document.querySelectorAll('[data-go]').forEach(b=>b.onclick=()=>openView(b.dataset.go));
$('#dialog-close').onclick=$('#dialog-cancel').onclick=()=>$('#entry-dialog').close();
$('#save-meal-button').onclick=()=>{const t=calcMeal();state.meals.unshift({id:crypto.randomUUID(),date:today(),createdAt:new Date().toISOString(),name:'涓€椁愭柟妗?,...t});save();render();};
$('#add-food-button').onclick=()=>dialog('娣诲姞椋熸潗','<label class="form-field">鍚嶇О<input name="name" required></label><label class="form-field">鐑噺锛坘cal锛?input name="kcal" type="number" min="0" required></label><label class="form-field">铔嬬櫧璐紙g锛?input name="protein" type="number" min="0" value="0" required></label>',f=>{state.meals.unshift({id:crypto.randomUUID(),date:today(),createdAt:new Date().toISOString(),name:f.get('name'),kcal:Number(f.get('kcal')),protein:Number(f.get('protein'))});save();render();});
$('#add-weight-button').onclick=()=>dialog('璁板綍浣撻噸','<label class="form-field">浣撻噸锛坘g锛?input name="value" type="number" min="20" max="350" step="0.1" required autofocus></label><label class="form-field">鏃ユ湡<input name="date" type="date" value="'+today()+'" required></label>',f=>{state.weights.push({id:crypto.randomUUID(),date:f.get('date'),value:Number(f.get('value'))});state.weights.sort((a,b)=>a.date.localeCompare(b.date));save();render();});
$('#height-input').onchange=e=>{state.height=Number(e.target.value)||null;save();renderTrends();};
$('#add-expense-button').onclick=()=>dialog('璁颁竴绗?,'<label class="form-field">椤圭洰<input name="name" required autofocus></label><label class="form-field">绫诲瀷<select name="type"><option value="expense">鑺遍攢</option><option value="income">瀛橀挶/鏀跺叆</option></select></label><label class="form-field">閲戦锛堝厓锛?input name="amount" type="number" min="0.01" step="0.01" required></label><label class="form-field">鍒嗙被<select name="category"><option>椋熸潗</option><option>琛ュ墏</option><option>鍏朵粬</option></select></label><label class="form-field">鏃ユ湡<input name="date" type="date" value="'+today()+'" required></label>',f=>{state.expenses.unshift({id:crypto.randomUUID(),name:f.get('name'),type:f.get('type'),amount:Number(f.get('amount')),category:f.get('category'),date:f.get('date')});save();render();});
function drawTimer(){const s=timer.seconds, list=state.exercises||[], current=list[timer.exerciseIndex]||{name:'璁粌瀹屾垚',target:'淇濆瓨璁板綍'};$('#timer-display').textContent=`${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;$('#timer-toggle').textContent=timer.running?'鏆傚仠':'寮€濮?;$('#timer-state').textContent=timer.running?'璁粌璁℃椂涓?:'鍑嗗寮€濮?;$('#exercise-name').textContent=`绗?${timer.exerciseIndex+1} 椤癸細${current.name}`;$('#exercise-detail').textContent=`鐩爣 ${current.target} 路 鍏?${$('#rounds-input').value||3} 杞甡;}
$('#timer-toggle').onclick=()=>{timer.running=!timer.running;if(timer.running)timer.interval=setInterval(()=>{timer.seconds++;drawTimer();},1000);else clearInterval(timer.interval);drawTimer();};$('#reset-timer').onclick=()=>{timer.running=false;clearInterval(timer.interval);timer.seconds=0;timer.exerciseIndex=0;drawTimer();};$('#next-exercise').onclick=()=>{timer.exerciseIndex=(timer.exerciseIndex+1)%Math.max(1,(state.exercises||[]).length);timer.seconds=0;drawTimer();};$('#complete-workout').onclick=()=>{const rounds=Math.max(1,Number($('#rounds-input').value)||3);state.workouts.unshift({id:crypto.randomUUID(),date:today(),createdAt:new Date().toISOString(),rounds,rest:Number($('#rest-input').value)||0,exercises:state.exercises||[],duration:timer.seconds});save();timer.running=false;clearInterval(timer.interval);timer.seconds=0;timer.exerciseIndex=0;drawTimer();render();};
$('#export-button').onclick=()=>{const blob=new Blob([JSON.stringify(state,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`楗璁粌鏈?${today()}.json`;a.click();URL.revokeObjectURL(url);};
let syncTimer;
function serverUrl(){return $('#server-url-input').value.trim().replace(/\/$/,'');}
function setSyncStatus(message){$('#sync-status').textContent=message;}
function scheduleSync(){clearTimeout(syncTimer);if(serverUrl())syncTimer=setTimeout(pushToServer,700);}
async function pushToServer(){const url=serverUrl();if(!url)return;try{setSyncStatus('姝ｅ湪鍚屾鍒扮數鑴戔€?);const response=await fetch(`${url}/api/state`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(state)});if(!response.ok)throw new Error();localStorage.setItem('diet-training-server',url);setSyncStatus('宸插悓姝ュ埌鐢佃剳');}catch{setSyncStatus('鐢佃剳鏈嶅姟鍣ㄤ笉鍙敤锛涜褰曚粛淇濆瓨鍦ㄦ湰鏈?);}}
async function pullFromServer(){const url=serverUrl();if(!url){setSyncStatus('璇峰厛濉啓鐢佃剳鏈嶅姟鍣ㄥ湴鍧€');return;}try{setSyncStatus('姝ｅ湪浠庣數鑴戣鍙栤€?);const response=await fetch(`${url}/api/state`);if(!response.ok)throw new Error();const payload=await response.json();if(!payload.state||typeof payload.state!=='object')throw new Error();state=payload.state;localStorage.setItem('diet-training-state',JSON.stringify(state));localStorage.setItem('diet-training-server',url);render();setSyncStatus('宸蹭粠鐢佃剳璇诲彇');}catch{setSyncStatus('鏃犳硶杩炴帴鐢佃剳鏈嶅姟鍣?);}}
$('#server-url-input').value=localStorage.getItem('diet-training-server')||'http://192.168.1.5:8787';
$('#server-url-input').onchange=()=>{localStorage.setItem('diet-training-server',serverUrl());configureNativeAutoSync();setSyncStatus('鍦板潃宸蹭繚瀛橈紱Android 灏嗗湪 Wi鈥慒i 涓嬭嚜鍔ㄥ悓姝?);};
$('#push-server-button')?.remove();
$('#pull-server-button')?.remove();
// Keep every local change durable on the computer server, including a final save when the page closes.
window.addEventListener('pagehide',()=>{const url=serverUrl();if(url)fetch(`${url}/api/state`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(state),keepalive:true}).catch(()=>{});});
scheduleSync();
state.games ||= []; state.savings ||= []; state.exercises ||= [{name:'娣辫共',target:'25鈥?0 娆?},{name:'淇崸鎾?,target:'10鈥?5 娆?},{name:'骞虫澘鏀拺',target:'45鈥?0 绉?},{name:'鍗疯吂',target:'25鈥?0 娆?}]; state.mealPlans ||= [{id:'default-meal',name:'涓€椁愭柟妗?,items:state.draftFoods}]; state.workoutPlans ||= [{id:'default-workout',name:'鑷噸寰幆',items:state.exercises}]; state.activeMealPlan ||= 'default-meal'; state.activeWorkoutPlan ||= 'default-workout'; state.weights.forEach(x=>x.id ||= crypto.randomUUID());
// Versioned defaults: update only bundled plans, never historical records or custom plans.
const PLAN_UPDATE_VERSION=2;
if((state.planUpdateVersion||0)<PLAN_UPDATE_VERSION){
  let defaultMeal=state.mealPlans.find(x=>x.id==='default-meal');
  if(!defaultMeal){defaultMeal={id:'default-meal',name:'\u51cf\u8102\u57fa\u7840\u914d\u65b9',items:clonePlanItems(latestFoods)};state.mealPlans.unshift(defaultMeal);}
  else {defaultMeal.name='\u51cf\u8102\u57fa\u7840\u914d\u65b9';defaultMeal.items=clonePlanItems(latestFoods);}
  let defaultWorkout=state.workoutPlans.find(x=>x.id==='default-workout');
  if(!defaultWorkout){defaultWorkout={id:'default-workout',name:'\u51cf\u8102\u529b\u91cf\u5faa\u73af',items:clonePlanItems(latestExercises)};state.workoutPlans.unshift(defaultWorkout);}
  else {defaultWorkout.name='\u51cf\u8102\u529b\u91cf\u5faa\u73af';defaultWorkout.items=clonePlanItems(latestExercises);}
  if(state.activeMealPlan==='default-meal')state.draftFoods=defaultMeal.items;
  if(state.activeWorkoutPlan==='default-workout')state.exercises=defaultWorkout.items;
  state.planUpdateVersion=PLAN_UPDATE_VERSION;
  save();
}
function removeRecord(type,id){state[type]=state[type].filter(x=>x.id!==id);save();render();}
function renderExtras(){const mp=$('#meal-plan-select'),wp=$('#workout-plan-select');if(mp)mp.innerHTML=state.mealPlans.map(x=>`<option value="${x.id}">${x.name}</option>`).join('');if(wp)wp.innerHTML=state.workoutPlans.map(x=>`<option value="${x.id}">${x.name}</option>`).join('');if(mp)mp.value=state.activeMealPlan;if(wp)wp.value=state.activeWorkoutPlan;const exercises=$('#exercise-list');if(exercises)exercises.innerHTML=state.exercises.map((x,i)=>`<p><span>${i+1}</span>${x.name}<b>${x.target}</b><button class="text-button" data-delete-exercise="${i}">鍒犻櫎</button></p>`).join('');const row=(x,type,label)=>`<div class="history-row"><div><p>${label} 路 ${x.name||x.date}</p><small>${x.date||''}</small></div><button class="text-button" data-delete="${type}:${x.id}">鍒犻櫎</button></div>`;$('#playing-games').innerHTML=state.games.filter(x=>x.status==='playing').map(x=>row(x,'games','馃幃')).join('')||'鏆傛棤姝ｅ湪鐜╃殑娓告垙';$('#finished-games').innerHTML=state.games.filter(x=>x.status==='finished').map(x=>row(x,'games','鉁?)).join('')||'鏆傛棤宸叉父鐜╂父鎴?;const all=[...state.meals.map(x=>row(x,'meals','馃嵔锔?)),...state.workouts.map(x=>row(x,'workouts','馃弮')),...state.weights.map(x=>row(x,'weights','鈿栵笍')),...state.expenses.map(x=>row(x,'expenses',x.type==='income'?'馃挵':'馃Ь'))];$('#record-list').innerHTML=all.join('')||'鏆傛棤璁板綍';const savings=$('#saving-list');if(savings)savings.innerHTML=state.savings.map(x=>`<div class="history-row"><div><p>馃幆 ${x.name}</p><small>鐩爣 楼${x.target}</small></div><button class="text-button" data-delete="savings:${x.id}">鍒犻櫎</button></div>`).join('')||'鏆傛棤瀛橀挶璁″垝';}
document.addEventListener('click',e=>{const id=e.target.dataset.delete;if(id){const [type,key]=id.split(':');removeRecord(type,key)}if(e.target.dataset.deleteExercise!==undefined){state.exercises.splice(Number(e.target.dataset.deleteExercise),1);save();renderExtras();}});
$('#add-exercise-button').onclick=()=>dialog('娣诲姞璁粌鍔ㄤ綔','<label class="form-field">鍔ㄤ綔鍚嶇О<input name="name" required></label><label class="form-field">鏁伴噺/鏃堕暱<input name="target" required placeholder="渚嬪 12 娆?></label>',f=>{state.exercises.push({name:f.get('name'),target:f.get('target')});save();render();});
$('#add-game-button').onclick=()=>dialog('娣诲姞娓告垙','<label class="form-field">娓告垙鍚嶇О<input name="name" required></label><label class="form-field">鐘舵€?select name="status"><option value="playing">姝ｅ湪娓哥帺</option><option value="finished">宸叉父鐜?/option></select></label>',f=>{state.games.unshift({id:crypto.randomUUID(),name:f.get('name'),status:f.get('status'),date:today()});save();render();});
$('#meal-plan-select').onchange=e=>{state.activeMealPlan=e.target.value;state.draftFoods=state.mealPlans.find(x=>x.id===e.target.value).items;save();render();};$('#workout-plan-select').onchange=e=>{state.activeWorkoutPlan=e.target.value;state.exercises=state.workoutPlans.find(x=>x.id===e.target.value).items;save();render();};$('#add-meal-plan').onclick=()=>dialog('鏂板缓楗鏂规','<label class="form-field">鏂规鍚嶇О<input name="name" required></label>',f=>{const x={id:crypto.randomUUID(),name:f.get('name'),items:JSON.parse(JSON.stringify(state.draftFoods))};state.mealPlans.push(x);state.activeMealPlan=x.id;state.draftFoods=x.items;save();render();});$('#add-workout-plan').onclick=()=>dialog('鏂板缓璁粌鏂规','<label class="form-field">鏂规鍚嶇О<input name="name" required></label>',f=>{const x={id:crypto.randomUUID(),name:f.get('name'),items:JSON.parse(JSON.stringify(state.exercises))};state.workoutPlans.push(x);state.activeWorkoutPlan=x.id;state.exercises=x.items;save();render();});
$('#add-saving-button').onclick=()=>dialog('娣诲姞瀛橀挶璁″垝','<label class="form-field">璁″垝鍚嶇О<input name="name" required></label><label class="form-field">鐩爣閲戦锛堝厓锛?input name="target" type="number" min="1" required></label>',f=>{state.savings.unshift({id:crypto.randomUUID(),name:f.get('name'),target:Number(f.get('target'))});save();render();});
$('#today-label').textContent=new Date().toLocaleDateString('zh-CN',{month:'long',day:'numeric',weekday:'long'});if('serviceWorker'in navigator)navigator.serviceWorker.register('sw.js');render();drawTimer();

// The profile button keeps settings out of the day-to-day recording flow.
const profileButton=document.createElement('button');
profileButton.id='profile-settings-button';
profileButton.className='profile-button';
profileButton.type='button';
profileButton.setAttribute('aria-label','鎵撳紑璁剧疆');
profileButton.title='璁剧疆';
profileButton.textContent='鎴?;
$('#export-button').before(profileButton);
profileButton.onclick=()=>dialog('璁剧疆',`<p class="settings-note">璁板綍浼氳嚜鍔ㄤ繚瀛樺湪鏈満锛涜繛鎺ョ數鑴戞湇鍔″櫒鏃朵細鍦ㄦ瘡娆¤褰曞悗鑷姩鍚屾銆?/p><label class="form-field">鐢佃剳鏈嶅姟鍣ㄥ湴鍧€<input name="serverUrl" type="url" value="${serverUrl()}" placeholder="http://192.168.1.5:8787"></label>`,f=>{
  const url=String(f.get('serverUrl')||'').trim().replace(/\/$/,'');
  $('#server-url-input').value=url;
  localStorage.setItem('diet-training-server',url);
  configureNativeAutoSync();
  if(url){scheduleSync();setSyncStatus('鑷姩鍚屾宸插紑鍚?);showToast('璁剧疆宸蹭繚瀛橈紝灏嗚嚜鍔ㄥ悓姝?);}
  else {setSyncStatus('浠呬繚瀛樺埌鏈満');showToast('璁剧疆宸蹭繚瀛橈紝璁板綍浠呬繚瀛樺湪鏈満');}
});
const syncCard=$('#server-url-input')?.closest('.settings-card');
if(syncCard){
  syncCard.querySelector('.button-row')?.remove();
  syncCard.querySelector('h3').textContent='鑷姩鍚屾';
  syncCard.querySelector('p').textContent='娣诲姞鎴栦慨鏀硅褰曞悗浼氳嚜鍔ㄥ悓姝ワ紱鍙湪椤堕儴澶村儚涓缃湇鍔″櫒鍦板潃銆?;
  syncCard.querySelector('label').hidden=true;
}
const profileStyles=document.createElement('style');
profileStyles.textContent=`.profile-button{width:38px;height:38px;border:0;border-radius:50%;background:linear-gradient(145deg,#27643b,#5c9b6d);color:#fff;font:700 14px/1 inherit;box-shadow:0 3px 9px rgba(23,101,52,.22);cursor:pointer;flex:0 0 auto}.profile-button:active{transform:scale(.94)}.settings-note{margin:0 0 14px;color:#66736a;font-size:13px;line-height:1.55}.app-toast{position:fixed;z-index:20;left:50%;bottom:calc(86px + env(safe-area-inset-bottom));transform:translate(-50%,12px);width:max-content;max-width:calc(100vw - 36px);padding:10px 14px;border-radius:12px;background:rgba(24,43,28,.92);color:#fff;font-size:13px;box-shadow:0 9px 24px rgba(18,35,22,.22);opacity:0;pointer-events:none;transition:opacity .2s ease,transform .2s ease}.app-toast.show{opacity:1;transform:translate(-50%,0)}`;
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
  const foodIndex=e.target.dataset.deleteFood;
  if(foodIndex!==undefined){
    state.draftFoods.splice(Number(foodIndex),1);
    save();render();
  }
  const exerciseIndex=e.target.dataset.editExercise;
  if(exerciseIndex!==undefined){
    const item=state.exercises[Number(exerciseIndex)];
    dialog('\u8bbe\u7f6e\u8bad\u7ec3\u6b21\u6570',`<label class="form-field">\u52a8\u4f5c<input value="${item.name}" disabled></label><label class="form-field">\u6b21\u6570<input name="reps" type="number" min="1" value="${(item.target.match(/\\d+/)||[''])[0]}" required></label>`,f=>{
      item.target=`${Number(f.get('reps'))} \u6b21`;
      save();render();
    });
  }
});
const originalScopedRecords=renderScopedRecords;
renderScopedRecords=function(){
  originalScopedRecords();
  // Food is managed as one editable list; meal-plan controls are intentionally hidden.
  $('#meal-plan-select').parentElement.hidden=true;
  $$('#meal-items .item-row').forEach((row,index)=>{
    if(row.querySelector('[data-delete-food]'))return;
    const button=document.createElement('button');
    button.className='text-button';
    button.type='button';
    button.textContent='\u5220\u9664';
    button.dataset.deleteFood=index;
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
importButton.className='icon-button';
importButton.type='button';
importButton.textContent='\u21e9';
importButton.setAttribute('aria-label','\u5bfc\u5165\u5907\u4efd');
const importFile=document.createElement('input');
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
  card.innerHTML=`<div class="section-heading"><div><h3>Android 鍋ュ悍鏁版嵁</h3><p>${available?'閫氳繃 Health Connect 璇诲彇宸叉巿鏉冪殑涓€鍔犲仴搴风瓑鏁版嵁婧愩€?:'浠?Android APK 鍙敤锛汼afari 缃戦〉鐗堜粛浣跨敤鎵嬪姩璁板綍銆?}</p></div><span class="tag">${available?'Health Connect':'鏈繛鎺?}</span></div>${snapshot?`<div class="health-metrics"><span>浠婃棩姝ユ暟 <b>${Number(snapshot.stepsToday||0).toLocaleString()}</b></span><span>娑堣€?<b>${fmt(snapshot.caloriesBurnedToday||0)} kcal</b></span><span>杩愬姩 <b>${snapshot.exerciseSessionsToday||0} 椤?/b></span></div>`:''}<button id="health-connect-sync" class="secondary full" type="button" ${available?'':'disabled'}>${snapshot?'閲嶆柊鍚屾 Health Connect':'杩炴帴骞跺悓姝?Health Connect'}</