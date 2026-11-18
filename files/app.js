(function () {
 'use strict';
 const scenes=window.GAME_DATA.scenes,E=window.GameEngine,main=document.querySelector('#main');
 const dialog=document.querySelector('#dialog'),dialogContent=document.querySelector('#dialog-content');
 const img=name=>'files/images/'+name+'.png';
 const esc=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const icons={arrow:'M5 12h14m-6-6 6 6-6 6',map:'m3 5 6-2 6 2 6-2v16l-6 2-6-2-6 2V5Zm6-2v16m6-14v16',book:'M3 4h6c2 0 3 1 3 2 0-1 1-2 3-2h6v15h-6c-2 0-3 1-3 2 0-1-1-2-3-2H3V4Zm9 2v15',eye:'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Zm10-3a3 3 0 1 0 0 6 3 3 0 0 0 0-6',check:'m5 12 4 4L19 6',home:'m3 10 9-7 9 7v11h-6v-7H9v7H3V10'};
 const icon=name=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${icons[name]||icons.arrow}"/></svg>`;
 let progress=E.fresh(scenes.length),storageOK=true,view='home';
 try {progress=E.normalize(JSON.parse(localStorage.getItem(E.KEY)),scenes);} catch (_) {storageOK=false;}
 let session={scene:progress.current,cursor:0,feedback:null,wrong:null,inspect:null,reveal:false,panel:'scene'};
 let mapPage=0,notePage=0,aboutPage=0;
 const size=()=>({w:window.innerWidth||1366,h:window.innerHeight||768});
 const compact=()=>size().w<1100||size().h<740;
 function pageLimit(type){const {w,h}=size();return type==='map'?(w<600&&h<700?2:w>=1100&&h>=800?8:4):w<600?(h<720?1:2):w<1100?(h<650?2:4):(h<900?4:8);}
 function pager(action,page,pages){return `<div class="pager"><button class="button small quiet" data-action="${action}" data-index="${page-1}" ${page===0?'disabled':''}>← Назад</button><span>Страница ${page+1} из ${pages}</span><button class="button small quiet" data-action="${action}" data-index="${page+1}" ${page>=pages-1?'disabled':''}>Дальше →</button></div>`;}
 function save(){try{localStorage.setItem(E.KEY,JSON.stringify(progress));storageOK=true;}catch(_){storageOK=false;}updateStatus();}
 function countDone(){return scenes.filter((s,i)=>E.complete(progress,scenes,i)).length;}
 function updateStatus(){document.querySelector('#note-count').textContent=countDone()+'/8';document.querySelector('#save-status').textContent=storageOK?'Прогресс сохраняется в этом браузере':'Сохранение недоступно · прогресс только в открытой игре';}
 function setView(next){view=next;render();main.focus({preventScroll:true});window.scrollTo({top:0,behavior:'instant'});}
 function openScene(index,replay=false){
  index=Math.max(0,Math.min(scenes.length-1,index));progress.current=index;
  session={scene:index,cursor:replay?0:progress.steps[index],feedback:null,wrong:null,inspect:null,reveal:false,panel:'scene'};
  if(session.cursor>=scenes[index].tasks.length)session.panel='question';
  prepareEntry();save();setView('game');
 }
 function sprite(name,pose=1){
  const cols=name==='anna'?2:3,x=(pose%cols)*100/(cols-1),y=pose>=cols?100:0;
  const label=name==='mira'?'Мира':name==='lev'?'Лев':'Анна Сергеевна';
  const task=view==='game'?scenes[session.scene].tasks[session.cursor]:null;
  const speaking=task?.speaker===label;
  return `<span class="sprite ${name}" style="--x:${x}%;--y:${y}%" role="img" aria-label="${label}" ${speaking?`data-speaking="${name}"`:''}>${speaking?'<span class="talk-bubble" aria-hidden="true"><i></i><i></i><i></i></span>':''}</span>`;
 }
 function cast(index,visual,home=false){
  if(visual==='bus-interior') return `<div class="solo bus-lev">${sprite('lev',5)}</div><div class="solo bus-anna">${sprite('anna',3)}</div><div class="solo bus-mira">${sprite('mira',5)}</div>`;
  const atCrossing=index===6&&visual==='arrival-clear';
  return `<div class="cast ${home?'home-cast':''} ${atCrossing?'arrival-at-crossing':''}">${sprite('mira',atCrossing?0:1)}${sprite('lev',atCrossing?0:1)}${sprite('anna',atCrossing?2:0)}</div>`;
 }
 function layer(name,style,alt,extra=''){return `<img class="layer ${extra}" src="${img(name)}" alt="${esc(alt)}" style="${style}" draggable="false">`;}
 function prepareEntry(){
  const task=scenes[session.scene].tasks[session.cursor];
  session.entry=task&&['drive-approach','signal-turn','crossing-blocked','bus-board'].includes(task.visual)?{key:task.visual,started:Date.now(),phase:'entering'}:null;
 }
 function enteringLayer(name,style,alt,direction){
  const entry=session.entry;
  if(!entry||entry.phase!=='entering')return layer(name,style,alt);
  return `<img class="layer vehicle-entry entry-${direction}" data-entry="${entry.key}" src="${img(name)}" alt="${esc(alt)}" style="${style};animation-delay:-${Math.max(0,Date.now()-entry.started)}ms" draggable="false">`;
 }
 function foreground(background,index,visual){
  const paths=window.SCENE_FOREGROUND?.[background]||[];
  const id='foreground-'+index;
  const fixtures=index===5&&visual!=='bus-interior'?fixture('busStop','stop'):index===6?fixture('arrivalStop','stop'):'';
  return (paths.length?`<svg class="scene-foreground" viewBox="0 0 1683 935" aria-hidden="true"><defs><clipPath id="${id}">${paths.map(d=>`<path d="${d}"/>`).join('')}</clipPath></defs><image href="${img(background)}" width="1683" height="935" clip-path="url(#${id})"/></svg>`:'')+(fixtures?`<svg class="scene-foreground" viewBox="0 0 1683 935" aria-hidden="true">${fixtures}</svg>`:'');
 }
 function departingLayer(name,style,alt,key,direction){
  const motion=session.motion;
  if(motion?.key!==key||motion.phase!=='leaving')return '';
  const elapsed=Math.max(0,Date.now()-motion.started);
  return `<img class="layer vehicle-departure departure-${direction}" data-motion="${key}" src="${img(name)}" alt="${esc(alt)}" style="${style};animation-delay:-${elapsed}ms" draggable="false">`;
 }
 function zebra(x,top,bottom,farWidth=150,nearWidth=200){
  let result='';
  for(let y=top+7;y<bottom-5;y+=28){const t=(y-top)/(bottom-top),w=farWidth+(nearWidth-farWidth)*t;result+=`<path d="M${x-w/2} ${y}h${w}v13h-${w}Z" fill="#fff9e8"/>`;}
  return result;
 }
 function fixture(key,type='crossing'){
  const p=window.SCENE_ELEMENTS[key];
  const shape=type==='stop'?stopSign(0,-155):crossingSign(0,-110);
  return `<g data-element="${key}" transform="translate(${p.x} ${p.y}) scale(${p.size})">${shape}</g>`;
 }
 function crossingSign(x,y){return `<g transform="translate(${x} ${y})"><path d="M0 0v110" stroke="#5b6e70" stroke-width="6"/><rect x="-25" y="-55" width="50" height="50" rx="2" fill="#2465a0" stroke="#fff9ec" stroke-width="2"/><path d="m0-49 21 38h-42Z" fill="#fff9ec"/><g stroke="#203d4b" stroke-width="3" fill="none"><path d="m-9-15 18 0m-20-5h22"/><circle cx="1" cy="-36" r="3" fill="#203d4b" stroke="none"/><path d="m1-31-3 8 7 5m-7-5-7 7m10-13 7 5m-8-5-6 4"/></g></g>`;}
 function stopSign(x,y){return `<g transform="translate(${x} ${y})"><path d="M0 0v155" stroke="#5e7175" stroke-width="6"/><rect x="-24" y="-15" width="48" height="74" rx="2" fill="#2465a0" stroke="#fff9ec" stroke-width="2"/><rect x="-18" y="-8" width="36" height="46" fill="#fff9ec"/><rect x="-12" y="2" width="24" height="26" rx="4" fill="#203d4b"/><path d="M-8 9H8v9H-8Z" fill="#fff9ec"/><circle cx="-7" cy="31" r="3" fill="#203d4b"/><circle cx="7" cy="31" r="3" fill="#203d4b"/></g>`;}
 function pedLight(green){const p=window.SCENE_ELEMENTS.signalLight;const color=green?'#64c18f':'#ea7357';return `<g transform="translate(${p.x} ${p.y-195*p.size}) scale(${p.size})"><path d="M0 95v100" stroke="#38505a" stroke-width="6"/><rect x="-22" y="-6" width="44" height="95" rx="8" fill="#233c49" stroke="#fff9ed" stroke-width="2"/><circle cx="0" cy="18" r="17" fill="#142833"/><circle cx="0" cy="64" r="17" fill="#142833"/><g stroke="${!green?color:'#5c4b46'}" fill="${!green?color:'#5c4b46'}" stroke-width="3" stroke-linecap="round"><circle cx="0" cy="9" r="3" stroke="none"/><path d="M0 15v12m-7-9 4-3h6l4 3M-3 27v5m6-5v5" fill="none"/></g><g stroke="${green?color:'#375148'}" fill="${green?color:'#375148'}" stroke-width="3" stroke-linecap="round"><circle cx="2" cy="52" r="3" stroke="none"/><path d="m1 58-3 10 7 6m-7-6-7 7m10-15 7 4m-7-5-6 4" fill="none"/></g></g>`;}
 function roadMarkup(index,visual,resolved){
  let r='';
  if(index===3){r+=zebra(750,465,685,135,195)+fixture('signalNear')+fixture('signalFar')+pedLight(visual!=='signal-red');if(visual==='signal-turn'&&!resolved)r+='<path d="M1030 342V470Q1030 533 840 550" fill="none" stroke="#527c91" stroke-width="7" stroke-dasharray="16 12"/>';}
  if(index===4){r+=`<path d="M0 598H1683" stroke="#fff9e8" stroke-width="4" stroke-dasharray="40 30"/>`+zebra(680,480,719,160,185)+fixture('crossingNear')+fixture('crossingFar');r+='<path d="M450 550H300l25-18m-25 18 25 18M450 665H300l25-18m-25 18 25 18" fill="none" stroke="#fff9e8" stroke-width="5"/>';}
  if(index===5&&visual!=='bus-interior')r+=fixture('busStop','stop');
  if(index===6){r+=zebra(310,490,647,145,190)+fixture('arrivalNear')+fixture('arrivalFar')+fixture('arrivalStop','stop');}
  if(index===7){r+=zebra(1395,450,588,160,190)+fixture('finalNear')+fixture('finalFar')+fixture('finalStop','stop');if(visual==='final-clear'&&resolved)r+='<path d="M345 700H655M655 700H1005L1395 650V435L1330 413" fill="none" stroke="#fffef3" stroke-width="16"/><path d="M345 700H655M655 700H1005L1395 650V435L1330 413" fill="none" stroke="#1a7667" stroke-width="7" stroke-dasharray="16 10"/>';}
  return `<svg class="road" viewBox="0 0 1683 935" aria-hidden="true">${r}</svg>`;
 }
 function hot(key,x,y,label){return `<button class="hotspot" style="left:${x}%;top:${y}%" data-action="inspect" data-key="${key}" aria-label="${esc(label)}">${icon('eye')}</button>`;}
 const inspections={
  map:['Пункт назначения','В этой истории команда идёт от школы в районную библиотеку. Маршрут нужно проверять на месте.'],
  van:['Фургон и обзор','Крупный кузов закрывает часть проезда. Мы не видим, свободен ли участок за ним. Для проверки не выходим на дорогу.'],
  path:['Пешеходная дорожка','Дорожка ведёт к крыльцу и здесь заканчивается. Герои остаются на пешеходной части, а не продолжают путь через проезд.'],
  drive:['Выезд из двора','Машина пересекает путь пешехода. Остановимся до выезда, проследим за машиной и проверим остальное движение.'],
  signal:['Пешеходный светофор','Здесь есть отдельные сигналы для пешеходов. Перед переходом проверяем свой сигнал и движение транспорта.'],
  lanes:['Две полосы','Полосы идут в одном направлении. Остановка машины в одной полосе не сообщает, что происходит в другой.'],
  shelter:['Место ожидания','Здесь есть тротуар. Ждём на нём, не подходя к самому краю проезжей части.'],
  bus:['Двери автобуса','К посадке приступают после полной остановки и открытия дверей. Сначала дают выйти пассажирам.'],
  rail:['Поручень','Если едешь стоя, держись за поручень и устойчиво поставь ноги. Это практический совет для поездки.'],
  crossing:['Обозначенный переход','До него идём по тротуару. У перехода ещё раз проверяем дорожную обстановку.'],
  library:['Районная библиотека','Наша цель — на другой стороне улицы. Видимая дверь не означает, что можно сразу идти напрямик через дорогу.']
 };
 function sceneHTML(index,visual,resolved=false,home=false){
  const s=scenes[index];let background=s.image,objects='',spots='',tag='';
  if(index===0){objects+='<svg class="board-label" viewBox="0 0 240 120" aria-hidden="true"><text x="9" y="35" font-size="23" font-weight="700">Школа →</text><text x="9" y="67" font-size="21">Районная</text><text x="9" y="94" font-size="21">библиотека</text></svg>';if(!home)spots+=hot('map',88,52,'Рассмотреть черновик маршрута');}
  if(index===1){objects+=layer('van','left:45.8%;top:20.6%;width:27.3%','Фургон у поворота проезда');spots+=hot('van',60,36,'Рассмотреть фургон и обзор')+hot('path',31,77,'Рассмотреть пешеходную дорожку');}
  if(index===2){objects+=enteringLayer('car-front','left:49%;top:30%;width:12%','Машина перед пересечением выезда с тротуаром','depth');spots+=hot('drive',56,60,'Рассмотреть пересечение тротуара с выездом');}
  if(index===3){if(visual==='signal-turn'){const style='left:29%;top:34.5%;width:30%';objects+=resolved?departingLayer('car-side',style,'Автомобиль проезжает влево и освобождает переход','signal','left'):enteringLayer('car-side',style,'Автомобиль завершает поворот и движется влево вдоль дороги','right');}spots+=hot('signal',58,30,'Рассмотреть пешеходный светофор');}
  if(index===4){
   const vanStyle='left:46%;top:36.1%;width:43%;z-index:3';
   const carStyle='left:59%;top:34.6%;width:25%;--departure-left:-400%';
   const first=visual==='crossing-blocked';
   objects+=!first&&resolved?departingLayer('car-side',carStyle,'Синяя машина проезжает влево и покидает кадр','crossing-car','left'):enteringLayer('car-side',carStyle,'Синяя машина в соседней полосе перед переходом','right');
   if(first)objects+=resolved?departingLayer('van-side',vanStyle,'Красный фургон продолжает путь влево и покидает кадр','crossing-van','left'):enteringLayer('van-side',vanStyle,'Фургон остановился перед зеброй в ближней полосе','right');
   spots+=hot('lanes',25,53,'Рассмотреть две полосы движения');
  }
  if(index===5){if(visual==='bus-interior'){background='interior';spots+=hot('rail',75.8,52,'Рассмотреть поручень');}else{if(visual==='bus-board')objects+=enteringLayer(resolved?'bus-open':'bus-closed','left:38%;top:31%;width:60%','Автобус на дороге у остановки','left');spots+=hot('shelter',23,62,'Рассмотреть место ожидания');if(visual==='bus-board')spots+=hot('bus',86,53,'Рассмотреть двери автобуса');}}
  if(index===6){if(visual==='arrival-bus'){const style='left:24%;top:33.5%;width:57%';objects+=resolved?departingLayer('bus-closed',style,'Автобус отъезжает вправо от остановки','bus','right'):layer('bus-closed',style,'Автобус стоит вдоль дороги и закрывает часть обзора улицы');}spots+=hot('crossing',18.5,65,'Найти обозначенный переход слева')+hot('library',64,34,'Рассмотреть библиотеку');}
  if(index===7){background='district-clean';objects+=layer('shelter','','Остановочный павильон','district-shelter');spots+=hot('drive',43,73,'Найти точку проверки перед выездом')+hot('crossing',83,65,'Найти переход справа')+hot('library',78,29,'Найти библиотеку');}
  return `<div class="scene" data-scene="${s.id}"><img class="backdrop" src="${img(background)}" alt="${esc(s.title)}" draggable="false">${roadMarkup(index,visual,resolved)}${objects}${foreground(background,index,visual)}${cast(index,visual,home)}${spots}${tag}</div>`;
 }
 function caption(index,visual,resolved){
  if(session.motion?.phase==='leaving'&&session.motion.key==='crossing-van')return 'Красный фургон проезжает влево. Герои остаются на тротуаре.';
  if(session.motion?.phase==='leaving'&&session.motion.key==='crossing-car')return 'Синяя машина проезжает влево. Герои ждут на тротуаре.';
  if(session.motion?.phase==='leaving')return session.motion.key==='signal'?'Машина проезжает влево. Герои ждут на тротуаре.':'Автобус отъезжает вправо. Герои остаются на тротуаре.';
  const captions={school:'Команда у школы. Пункт назначения — районная библиотека.',courtyard:'Герои на дорожке. Фургон закрывает часть проезда.','drive-approach':resolved?'Машина остановилась до пересечения с тротуаром.':'Машина приближается к пересечению с тротуаром.','drive-wait':'Машина стоит перед тротуаром и пропускает.','signal-red':'Пешеходный сигнал: КРАСНЫЙ. Герои на тротуаре.','signal-turn':resolved?'ЗЕЛЁНЫЙ. Автомобиль освободил переход.':'ЗЕЛЁНЫЙ. Автомобиль ещё завершает поворот.','signal-clear':'ЗЕЛЁНЫЙ. Переход свободен на учебном кадре.','crossing-blocked':resolved?'Фургон уехал. В соседней полосе остаётся синяя машина.':'Ближняя машина остановилась, соседняя полоса закрыта от взгляда.','crossing-reveal':resolved?'Обе машины проехали. Перед первым шагом снова проверим дорогу.':'Фургон уехал, но синяя машина ещё не пропустила нас. Герои на тротуаре.','bus-wait':'Ожидание на тротуаре. Автобус ещё не подъехал.','bus-board':resolved?'Автобус полностью остановился, двери открыты.':'Автобус подъезжает. Двери закрыты.','bus-interior':'Салон автобуса. При поездке стоя нужна надёжная опора.','arrival-bus':resolved?'Автобус уехал. Команда остаётся на тротуаре.':'Команда вышла на тротуар. Автобус закрывает часть обзора.','arrival-clear':'Автобус уехал, но дорожную обстановку всё равно нужно проверить.','final-exit':'Сначала — проверка перед выездом на нашей стороне улицы.','final-route':'Путь к обозначенному переходу проходит по тротуару.','final-clear':resolved?'Все точки проверки отмечены. Маршрут завершён.':'Перед переходом оцениваем движение во всех полосах.'};
  return captions[visual]||scenes[index].intro;
 }
 function miniRoute(){return `<div class="mini-route">${scenes.map((s,i)=>`<button class="route-mini ${E.complete(progress,scenes,i)?'done':''}" data-action="scene" data-index="${i}"><span class="num">${E.complete(progress,scenes,i)?'✓':'0'+(i+1)}</span><strong>${esc(s.short)}</strong></button>`).join('')}</div>`;}
 function homeHTML(){const done=countDone(),started=progress.steps.some(Boolean);return `<section class="hero"><div class="hero-copy"><div class="eyebrow">Маршрут с Мирой, Львом и Анной Сергеевной</div><h1 class="display">Дело о закрытом обзоре</h1><p>Поможем Мире и Льву проверить путь до библиотеки: заметить закрытый обзор, выбрать место ожидания и безопасное действие.</p><p class="hero-extra">Спокойно, внимательно, шаг за шагом. Без таймера и гонки за баллами.</p><div class="hero-actions"><button class="button primary" data-action="resume">${done===8?'К результату':started?'Продолжить маршрут':'Начать маршрут'} ${icon('arrow')}</button><button class="button" data-action="map">${icon('map')} Карта маршрута</button></div><div class="home-controls"><span>Можно вернуться к любому участку.</span><button class="text-button" data-action="reset">Сбросить прогресс</button></div></div><div class="hero-illustration"><div class="scene-viewport">${sceneHTML(0,'school',false,true)}</div></div></section><section class="home-bottom"><div class="section-line"><h2>Восемь остановок — один путь</h2><p>${done} из 8 заметок</p></div>${miniRoute()}</section>`;}
 function mapHTML(){const limit=pageLimit('map'),pages=Math.ceil(scenes.length/limit);mapPage=Math.min(mapPage,pages-1);return `<div class="page-heading"><div><div class="eyebrow">Наш маршрут</div><h1>Карта маршрута</h1><p>Все остановки доступны. Любой участок можно повторить.</p></div><button class="button primary" data-action="resume">Продолжить ${icon('arrow')}</button></div><section class="page-collection"><div class="route-grid">${scenes.slice(mapPage*limit,(mapPage+1)*limit).map((s,k)=>{const i=k+mapPage*limit;return `<button class="route-card" data-action="scene" data-index="${i}"><img src="${img(s.image)}" alt=""><div class="body"><div class="small-row"><span>ОСТАНОВКА 0${i+1}</span><span>${E.complete(progress,scenes,i)?'Проверено':progress.steps[i]+' / '+s.tasks.length}</span></div><h2>${esc(s.title)}</h2><div class="status" aria-hidden="true">${s.tasks.map((t,j)=>`<i class="${j<progress.steps[i]?'filled':''}"></i>`).join('')}</div></div></button>`;}).join('')}</div>${pager('map-page',mapPage,pages)}</section>`;}
 function notebookHTML(){const limit=pageLimit('notes'),pages=Math.ceil(scenes.length/limit);notePage=Math.min(notePage,pages-1);return `<div class="page-heading"><div><div class="eyebrow">Записная книжка команды</div><h1>Наши наблюдения</h1><p>Короткие заметки для общей карты.</p></div><span class="stamp">${icon('book')} ${countDone()} из 8</span></div><section class="page-collection"><div class="notebook-grid">${scenes.slice(notePage*limit,(notePage+1)*limit).map((s,k)=>{const i=k+notePage*limit;return E.complete(progress,scenes,i)?`<article class="note-card"><div class="eyebrow">Заметка 0${i+1}</div><h2>${esc(s.title)}</h2><p>${esc(s.note)}</p><button class="text-button" data-action="replay" data-index="${i}">Вернуться к ситуации</button></article>`:`<article class="note-card pending"><div class="eyebrow">Участок 0${i+1}</div><h2>${esc(s.title)}</h2><p>Наблюдение появится после проверки участка.</p><button class="text-button" data-action="scene" data-index="${i}">Открыть участок</button></article>`;}).join('')}</div>${pager('note-page',notePage,pages)}</section>`;}
 function gameHTML(){
  const i=session.scene,s=scenes[i],summary=session.cursor>=s.tasks.length&&!session.feedback;
  const t=summary?s.tasks[s.tasks.length-1]:s.tasks[Math.min(session.cursor,s.tasks.length-1)],resolved=!!session.feedback||summary;
  const selected=session.feedback?.id||session.wrong?.id;
  let panel='';
  if(summary){panel=`<div class="speaker">Запись для общей карты</div><h2>Участок проверен</h2><div class="scene-summary"><span class="note-number">Заметка 0${i+1}</span><p>${esc(s.note)}</p></div><button class="button primary" data-action="next-scene">${i===7?'К результату':'К следующей остановке'} ${icon('arrow')}</button><button class="text-button" data-action="replay" data-index="${i}">Повторить участок</button>`;}
  else{panel=`<div class="speaker">${esc(t.speaker)}</div><h2 id="question-title">${esc(t.prompt)}</h2><p class="context">${esc(t.context)}</p><button class="task-condition text-button" data-action="conditions">Условия ситуации</button><div class="options" role="group" aria-labelledby="question-title">${t.options.map((c,j)=>`<button class="option ${session.feedback&&c.id===selected?'correct':session.wrong&&c.id===selected?'wrong':''}" data-action="answer" data-id="${c.id}" ${session.feedback||session.entry?.phase==='entering'?'disabled':''}><span class="letter" aria-hidden="true">${session.feedback&&c.correct?'✓':['А','Б','В'][j]}</span><span>${esc(c.text)}</span></button>`).join('')}</div>`;
   if(session.feedback)panel+=`<div class="feedback" id="feedback" tabindex="-1" role="status"><strong>Добавим это наблюдение</strong><p>${esc(t.success)}</p><button class="button primary" data-action="next-task" ${session.motion?.phase==='leaving'?'disabled':''}>${session.cursor===s.tasks.length-1?'Записать и продолжить':'Следующий шаг'} ${icon('arrow')}</button></div>`;
   panel+='<p class="quiet-rule">Не торопись. Можно рассмотреть картинку и попробовать снова.</p>';
  }
  const pane=session.panel||'scene';
  return `<div class="game-shell"><div class="game-head"><div class="breadcrumb">Остановка 0${i+1} <b>· ${esc(s.title)}</b></div><nav class="scene-dots" aria-label="Остановки маршрута">${scenes.map((x,j)=>`<button class="${i===j?'active':E.complete(progress,scenes,j)?'done':''}" data-action="scene" data-index="${j}" aria-label="${j+1}. ${esc(x.title)}" ${i===j?'aria-current="step"':''}>${j+1}</button>`).join('')}</nav></div><div class="scene-topline"><h1>${esc(s.title)}</h1><span class="step-count">${summary?'Проверено':`Шаг ${session.cursor+1} из ${s.tasks.length}`}</span></div>${compact()?`<div class="game-tabs" role="tablist" aria-label="Вид задания"><button role="tab" aria-selected="${pane==='scene'}" aria-controls="scene-panel" data-action="scene-pane">1. Рассмотреть</button><button role="tab" aria-selected="${pane==='question'}" aria-controls="question-panel" data-action="question-pane">2. Ответить</button></div>`:''}<div class="game-layout pane-${pane}"><section id="scene-panel" class="scene-column" aria-label="Иллюстрация ситуации"><div class="scene-frame"><div class="scene-viewport">${sceneHTML(i,t.visual,resolved)}</div><div class="scene-caption"><span class="state-dot ${t.visual==='signal-red'?'red':''}" aria-hidden="true"></span><span>${esc(caption(i,t.visual,resolved))}</span></div></div><div class="scene-tools"><button class="button small quiet" data-action="observe">${icon('eye')} О ситуации</button>${i===1?`<button class="button small quiet" data-action="plan">${icon('map')} План двора</button>`:''}<button class="button small quiet" data-action="notebook">${icon('book')} Блокнот</button></div></section><section id="question-panel" class="question-panel ${session.feedback?'is-resolved':session.wrong?'has-retry':''}" aria-label="Задание">${panel}</section></div></div>`;
 }
 function endHTML(){const done=countDone();if(done<8)return `<div class="empty-state"><div class="eyebrow">Маршрут ещё продолжается</div><h1>В блокноте ${done} из 8 заметок</h1><p>Можно вернуться к любому участку. Все остановки доступны.</p><button class="button primary" data-action="resume">Продолжить маршрут ${icon('arrow')}</button></div>`;return `<section class="end-layout"><div><div class="stamp">${icon('check')} Маршрут проверен</div><h1>Библиотека найдена.<br>Наблюдения записаны.</h1><p>Восемь наблюдений готовы. Передадим в школу карту с местами, где нужно остановиться, проверить обзор и оценить движение.</p><div class="hero-actions"><button class="button primary" data-action="notebook">${icon('book')} Открыть все заметки</button><button class="button" data-action="map">Пройти участок ещё раз</button></div></div><img src="${img('library')}" alt="Районная библиотека — цель маршрута"></section><div class="end-notes">${scenes.map(s=>`<span>✓ ${esc(s.short)}</span>`).join('')}</div>`;}
 function render(){main.className=`view-${view} ${compact()?'compact':'wide'}`;main.innerHTML=view==='home'?homeHTML():view==='map'?mapHTML():view==='notebook'?notebookHTML():view==='end'?endHTML():gameHTML();updateStatus();}

 function showDialog(title,content){dialogContent.innerHTML=`<h2 id="dialog-title">${esc(title)}</h2>${content}`;if(typeof dialog.showModal==='function')dialog.showModal();else dialog.setAttribute('open','');}
 function about(){const pages=[
  '<p>Восемь остановок проходят вместе с Мирой, Львом и Анной Сергеевной. Рассмотри обстановку, нажми на значимые объекты и выбери действие.</p><p>На узком экране переключай виды «Рассмотреть» и «Ответить». Подсказки открываются поверх игры. Таймера и штрафов за повторную попытку нет.</p>',
  '<p>После каждого участка в блокноте появляется наблюдение. Все остановки доступны для повторения.</p><p>Заметки сохраняются в этом браузере, если сохранение доступно. Сброс затрагивает только данные этой игры и требует подтверждения. Игра работает без подключения к интернету.</p>',
  '<p>Упражнения относятся к показанным городским ситуациям. Держаться за поручень при поездке стоя — практический совет. Условия перехода, ожидания и посадки опираются на ПДД РФ.</p><div class="source-list"><span>ПДД РФ · обязанности пешеходов, пп. 4.1, 4.3–4.8</span><span>ПДД РФ · обязанности пассажиров, п. 5.1</span><span>ПДД РФ · сигналы, п. 6.5</span></div>'
 ];aboutPage=Math.max(0,Math.min(2,aboutPage));showDialog('Об игре',pages[aboutPage]+pager('about-page',aboutPage,pages.length));}

 function nextScene(){const i=session.scene;if(i<7)openScene(i+1);else setView('end');}
 document.addEventListener('click',event=>{
  const button=event.target.closest('button[data-action]');if(!button||button.disabled)return;
  const action=button.dataset.action;
  if(action==='home')setView('home');
  else if(action==='map')setView('map');
  else if(action==='notebook')setView('notebook');
  else if(action==='about'){aboutPage=0;about();}
  else if(action==='about-page'){aboutPage=Number(button.dataset.index);about();}
  else if(action==='map-page'){mapPage=Math.max(0,Number(button.dataset.index));render();}
  else if(action==='note-page'){notePage=Math.max(0,Number(button.dataset.index));render();}
  else if(action==='scene-pane'){session.panel='scene';if(session.motion)session.motion.returnToAnswers=false;render();}
  else if(action==='question-pane'){session.panel='question';if(session.entry?.phase==='entering')session.entry.phase='done';if(session.motion){session.motion.returnToAnswers=false;if(session.motion.phase==='leaving')session.motion.phase='gone';}render();}
  else if(action==='conditions'){const t=scenes[session.scene].tasks[Math.min(session.cursor,scenes[session.scene].tasks.length-1)];showDialog('Условия ситуации',`<p>${esc(t.context)}</p><button class="button primary" data-action="close-dialog">Понятно</button>`);}
  else if(action==='close-dialog')dialog.close();
  else if(action==='scene')openScene(Number(button.dataset.index));
  else if(action==='replay')openScene(Number(button.dataset.index),true);
  else if(action==='resume'){const next=E.next(progress,scenes);next<0?setView('end'):openScene(next);}
  else if(action==='answer'){
   if(session.feedback||session.entry?.phase==='entering')return;
   const task=scenes[session.scene].tasks[session.cursor],answer=task?.options.find(c=>c.id===button.dataset.id);if(!answer)return;
   if(answer.correct){session.feedback={id:answer.id};session.wrong=null;progress=E.mark(progress,scenes,session.scene,session.cursor);const key=({'signal-turn':'signal','arrival-bus':'bus','crossing-blocked':'crossing-van','crossing-reveal':'crossing-car'})[task.visual]||null;if(key){session.motion={key,phase:'leaving',started:Date.now(),returnToAnswers:compact()};if(compact())session.panel='scene';}save();}
   else session.wrong={id:answer.id,why:answer.why};
   render();if(session.wrong)showDialog('Рассмотрим ситуацию ещё раз',`<p>${esc(session.wrong.why)}</p><button class="button primary" data-action="retry">Вернуться к вариантам</button>`);else document.querySelector('#feedback')?.focus({preventScroll:true});
  }
  else if(action==='retry'){dialog.close();session.wrong=null;render();document.querySelector('.option')?.focus();}
  else if(action==='next-task'){if(!session.feedback||session.motion?.phase==='leaving')return;session.motion=null;session.cursor++;session.panel=session.cursor>=scenes[session.scene].tasks.length?'question':'scene';session.feedback=null;session.wrong=null;session.inspect=null;session.reveal=false;prepareEntry();render();main.focus({preventScroll:true});}
  else if(action==='next-scene')nextScene();
  else if(action==='observe'){showDialog('Ситуация',`<p>${esc(scenes[session.scene].intro)}</p><button class="button primary" data-action="close-dialog">Понятно</button>`);}
  else if(action==='inspect'){const info=inspections[button.dataset.key];if(info)showDialog(info[0],`<p>${esc(info[1])}</p><button class="button primary" data-action="close-dialog">Понятно</button>`);}
  else if(action==='plan')showDialog('План этого двора','<p>Дополнительная схема расположения объектов. Для ответа на задание читать план необязательно.</p><img class="plan-image" src="files/images/courtyard-plan.svg" alt="Выбранный план двора: дорожка заканчивается у крыльца, справа поворот проезда и детская площадка">');
  else if(action==='reset')showDialog('Начать маршрут заново?','<p>Будут удалены только заметки и прогресс этой игры в этом браузере. Рисунки и другие данные браузера сохранятся.</p><div class="actions"><button class="button primary" data-action="confirm-reset">Сбросить прогресс</button><button class="button" data-action="close-dialog">Оставить как есть</button></div>');
  else if(action==='confirm-reset'){progress=E.fresh(scenes.length);try{localStorage.removeItem(E.KEY);}catch(_){}dialog.close();session={scene:0,cursor:0,feedback:null,wrong:null,inspect:null,reveal:false,panel:'scene'};setView('home');save();}
 });
 document.addEventListener('animationend',event=>{const entry=event.target.dataset?.entry;if(entry&&session.entry?.key===entry&&session.entry.phase==='entering'){session.entry.phase='done';render();return;}const key=event.target.dataset?.motion;if(!key||session.motion?.key!==key||session.motion.phase!=='leaving')return;const back=session.motion.returnToAnswers;session.motion.phase='gone';if(back)session.panel='question';render();});
 dialog.addEventListener('click',event=>{if(event.target===dialog){const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dialog.close();}});
 document.addEventListener('error',event=>{if(event.target.tagName==='IMG'){event.target.alt='Не удалось открыть рисунок. Проверьте, что папка files находится рядом с index.html.';}},true);
 let layoutMode=[compact(),pageLimit('map'),pageLimit('notes')].join(':');
 if(window.addEventListener)window.addEventListener('resize',()=>{const next=[compact(),pageLimit('map'),pageLimit('notes')].join(':');if(next!==layoutMode){layoutMode=next;render();}});
 window.PedestrianGame={getProgress:()=>E.normalize(progress,scenes),getView:()=>view};
 render();
})();
