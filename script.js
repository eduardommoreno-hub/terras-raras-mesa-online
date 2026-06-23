/* Terras Raras — Mesa Online
   v9.2 — frontend canônico.
   Fonte única carregada por index.html via /script.js.
*/
const API = location.origin;

let token = localStorage.tr_token || '';
let me = null;
let mode = 'login';
let state = null;
let currentRoom = null;
let ws = null;
let dragging = null;
let selectedNode = null;
let activePanelIndex = 0;
let aiInnerTab = 'ask';
let charsCache = [];

function qs(id){ return document.getElementById(id); }
function esc(s){ return String(s ?? '').replace(/[&<>\"]/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m])); }
function addMinutes(d,min){ return new Date(d.getTime()+min*60000); }
function toUTCISOFromPublicControls(prefix='create'){
  const mode=qs(prefix+'StartMode')?.value||'30';
  if(mode==='now') return new Date().toISOString();
  if(mode==='15'||mode==='30'||mode==='60') return addMinutes(new Date(), Number(mode)).toISOString();
  const val=qs(prefix+'StartAt')?.value;
  if(!val) return addMinutes(new Date(),30).toISOString();
  return new Date(val).toISOString();
}
function sessionStatusText(iso){
  if(!iso)return 'Sem horário definido';
  const diff=new Date(iso).getTime()-Date.now();
  if(diff<=-60000)return 'Horário alcançado';
  if(diff<=0)return 'Horário alcançado';
  const total=Math.floor(diff/1000), m=Math.floor(total/60), sec=total%60, h=Math.floor(m/60), mm=m%60;
  return h>0?`Começa em ${h}h ${mm}min`:`Começa em ${m}min ${String(sec).padStart(2,'0')}s`;
}
function sessionStatusLabel(status, iso){
  if(status==='active') return 'Sessão iniciada';
  if(status==='ended') return 'Sessão encerrada';
  const t=sessionStatusText(iso);
  return t==='Horário alcançado'?'Horário alcançado — aguardando a Mestre iniciar':t;
}
function localDateTimeValue(iso){
  const d=iso?new Date(iso):addMinutes(new Date(),30);
  const pad=n=>String(n).padStart(2,'0');
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function show(id){ document.querySelectorAll('.screen').forEach(s=>s.classList.remove('on')); qs(id)?.classList.add('on'); }
function msg(t,err=false){ let el=qs('authMsg'); if(el){el.textContent=t; el.className='msg '+(err?'err':'');} }

async function api(path, opts={}){
  opts.headers = Object.assign({'Content-Type':'application/json'}, opts.headers||{});
  if(token) opts.headers.Authorization = 'Bearer '+token;
  const r = await fetch(API+path, opts);
  const txt = await r.text();
  let data = {};
  try{ data = txt ? JSON.parse(txt) : {}; }catch(e){ data = {detail:txt}; }
  if(!r.ok) throw new Error(data.detail || 'Erro');
  return data;
}

/* ===== Auth / Hub ===== */
function drawAuth(){
  qs('tabLogin')?.classList.toggle('on',mode==='login');
  qs('tabReg')?.classList.toggle('on',mode==='reg');
  const body=qs('authBody');
  if(!body) return;
  body.innerHTML = mode==='login'
    ? `<label>Usuário</label><input id="u" autocomplete="username">
       <label>Senha</label><div class="passwordWrap"><input id="p" type="password" autocomplete="current-password" onkeydown="if(event.key==='Enter')doLogin()"><button type="button" class="eyeBtn" onclick="togglePassword()">Ver</button></div>
       <button id="loginBtn" class="btn" style="margin-top:14px" onclick="doLogin()">Entrar</button>`
    : `<label>Nome da jogadora</label><input id="u" autocomplete="username">
       <label>Senha</label><div class="passwordWrap"><input id="p" type="password" autocomplete="new-password" onkeydown="if(event.key==='Enter')doRegister()"><button type="button" class="eyeBtn" onclick="togglePassword()">Ver</button></div>
       <button id="registerBtn" class="btn" style="margin-top:14px" onclick="doRegister()">Pedir autorização</button>`;
  msg('');
}
function togglePassword(){ const p=qs('p'); if(!p)return; p.type=p.type==='password'?'text':'password'; const b=document.querySelector('.eyeBtn'); if(b)b.textContent=p.type==='password'?'Ver':'Ocultar'; }
async function doLogin(){
  const u=qs('u')?.value.trim()||'', p=qs('p')?.value||'', b=qs('loginBtn');
  if(!u||!p){ msg('Preencha usuário e senha.', true); return; }
  try{
    if(b){b.disabled=true;b.textContent='Entrando...'}
    msg('Conferindo login...');
    const d=await api('/auth/login',{method:'POST',body:JSON.stringify({username:u,password:p})});
    token=d.token; localStorage.tr_token=token; me=d.user;
    msg('Login confirmado. Carregando...');
    await loadHub();
  }catch(e){ localStorage.removeItem('tr_token'); token=''; me=null; msg('Login inválido ou erro: '+e.message,true); }
  finally{ if(b){b.disabled=false;b.textContent='Entrar'} }
}
async function doRegister(){
  const u=qs('u')?.value.trim()||'', p=qs('p')?.value||'', b=qs('registerBtn');
  if(!u||!p){ msg('Preencha nome e senha.', true); return; }
  try{
    if(b){b.disabled=true;b.textContent='Enviando...'}
    const d=await api('/auth/register',{method:'POST',body:JSON.stringify({username:u,password:p})});
    msg(d.message || 'Cadastro enviado.');
  }catch(e){ msg(e.message,true); }
  finally{ if(b){b.disabled=false;b.textContent='Pedir autorização'} }
}
const login=doLogin, register=doRegister;
function logout(){ localStorage.removeItem('tr_token'); token=''; me=null; currentRoom=null; if(ws)try{ws.close()}catch(e){}; show('login'); drawAuth(); }

async function boot(){
  drawAuth();
  if(token){
    try{ me=await api('/me'); await loadHub(); }
    catch(e){ logout(); }
  }
}
async function loadHub(){
  if(!me) me=await api('/me');
  const [rooms, chars, publicRooms] = await Promise.all([api('/rooms/mine'), api('/characters'), api('/rooms/public').catch(()=>[])]);
  charsCache = chars || [];
  show('hub');
  const up=qs('userPill'); if(up) up.textContent = me.username + (me.is_admin?' · admin':'');
  const roomsEl=qs('rooms');
  if(roomsEl){
    roomsEl.innerHTML = rooms.length ? rooms.map(r=>`<div class="room"><div class="grow"><b>${esc(r.name)}</b><br><span class="pill">${esc(r.code)}</span> <span style="color:var(--muted)">${roleName(r.role)} · ${r.players_count||0}/${r.token_capacity||"?"} totens</span></div><button class="btn small" onclick="openRoom('${r.id}')">Abrir</button><button class="btn small danger" onclick="leaveRoom('${r.id}', event)">Sair</button></div>`).join('') : '<p style="color:var(--muted)">Nenhuma mesa ainda.</p>';
  }
  renderPublicRooms(publicRooms);
  ensurePublicRoomCreateControls();
  const charsEl=qs('chars');
  if(charsEl){
    charsEl.innerHTML = charsCache.map(c=>`<div class="char"><div class="art">${c.avatar_svg||''}</div><div class="pad"><b>${esc(c.name)}</b><br><span style="color:var(--muted)">${esc(c.role)} · ${esc(c.zone)}</span><p>${esc(c.description)}</p></div></div>`).join('');
  }
  if(me.is_admin){ qs('adminBox')?.classList.remove('hidden'); loadPending(); loadSecurityLogs(); } else qs('adminBox')?.classList.add('hidden');
}

function ensurePublicRoomCreateControls(){
  const roleSelect=qs('createRole');
  if(!roleSelect || qs('roomVisibility'))return;
  const wrap=document.createElement('div');
  wrap.className='publicCreateBox';
  wrap.innerHTML=`<label>Tipo da sala</label>
    <select id="roomVisibility" onchange="toggleCreatePublicOptions()">
      <option value="closed" selected>Sala fechada</option>
      <option value="public">Sala pública</option>
    </select>
    <div id="createPublicOptions" class="hidden">
      <label>Início da sessão</label>
      <select id="createStartMode" onchange="toggleCreateStartAt()">
        <option value="now">Agora</option>
        <option value="15">Em 15 min</option>
        <option value="30" selected>Em 30 min</option>
        <option value="60">Em 1 hora</option>
        <option value="custom">Escolher horário</option>
      </select>
      <input id="createStartAt" type="datetime-local" class="hidden" style="margin-top:8px" value="${localDateTimeValue()}">
      <div class="aiHelp">Salvo em UTC; cada jogadora vê a contagem no próprio fuso.</div>
    </div>`;
  const help=roleSelect.parentElement?.querySelector('.roleHelp');
  if(help) help.after(wrap); else roleSelect.after(wrap);
}
function toggleCreatePublicOptions(){ qs('createPublicOptions')?.classList.toggle('hidden', qs('roomVisibility')?.value!=='public'); }
function toggleCreateStartAt(){ qs('createStartAt')?.classList.toggle('hidden', qs('createStartMode')?.value!=='custom'); }
function renderPublicRooms(publicRooms){
  let box=qs('publicRoomsBox');
  if(!box){
    const roomsEl=qs('rooms');
    if(!roomsEl)return;
    box=document.createElement('div');
    box.id='publicRoomsBox';
    box.className='publicRoomsBox';
    roomsEl.parentElement.appendChild(box);
  }
  const list=publicRooms||[];
  box.innerHTML=`<h2 class="title" style="margin-top:22px">Salas públicas</h2>`+
    (list.length?list.map(r=>`<div class="room publicRoomCard">
      <div class="grow"><b>${esc(r.name)}</b><br>
      <span class="pill">${esc(r.code)}</span>
      <span class="pill">${esc(r.players_count)}/${esc(r.token_capacity||"?")} totens</span>
      <br><span style="color:var(--muted)">Mestre: ${esc(r.master||'?')} · <span class="countdown" data-start="${esc(r.scheduled_start||'')}">${sessionStatusLabel(r.session_status,r.scheduled_start)}</span></span></div>
      <button class="btn small" onclick="${r.already_joined?`openRoom('${r.id}')`:`joinPublicRoom('${r.code}')`}">${r.already_joined?'Abrir':'Entrar'}</button>
    </div>`).join(''):'<p style="color:var(--muted)">Nenhuma sala pública no momento.</p>');
}
async function joinPublicRoom(code){
  const role=prompt('Entrar como: jogadora ou ajudante?', 'jogadora');
  const chosen=(role||'jogadora').toLowerCase().includes('ajud')?'ajudante':'participante';
  try{
    const r=await api('/rooms/join',{method:'POST',body:JSON.stringify({code,role:chosen})});
    openRoom(r.id);
  }catch(e){ alert(e.message); }
}
async function loadPending(){
  try{
    const p=await api('/admin/pending');
    const el=qs('pending'); if(el) el.innerHTML=p.length?p.map(u=>`<div class="pending"><b class="grow">${esc(u.username)}</b><button class="btn small" onclick="approve(${u.id})">Autorizar</button></div>`).join(''):'<p style="color:var(--muted)">Nenhum cadastro pendente.</p>';
  }catch(e){}
}

async function loadSecurityLogs(){
  const adminBox=qs('adminBox');
  if(!adminBox)return;
  let sec=qs('securityAdminBox');
  if(!sec){
    sec=document.createElement('div');
    sec.id='securityAdminBox';
    sec.innerHTML=`<h2 class="title" style="margin-top:22px">Alertas de segurança</h2><div id="securityLogs" class="adminList"></div>`;
    adminBox.appendChild(sec);
  }
  try{
    const logs=await api('/admin/security/logs');
    const el=qs('securityLogs');
    if(!el)return;
    el.innerHTML=logs.length?logs.slice(0,20).map(l=>`<div class="securityLog">
      <b>${esc(l.username||'?')}</b> <span class="pill">${esc(l.reason||'BLOQUEIO')}</span><br>
      <span style="color:var(--muted)">${esc(l.room_name||'sem sala')} · ${new Date(l.created_at).toLocaleString()} · reincidências: ${esc(l.repeat_count||1)}</span><br>
      <span style="color:var(--gold2)">IP:</span> ${esc(l.ip_address||'-')}<br>
      <span style="color:var(--muted)">Texto mascarado:</span> ${esc(l.masked_text||'')}
      <div class="securityActions">
        <button class="btn small ghost" onclick="securityAction(${l.id},'warn')">Advertir</button>
        <button class="btn small ghost" onclick="securityAction(${l.id},'mute')">Silenciar 10 min</button>
        <button class="btn small danger" onclick="securityAction(${l.id},'remove')">Remover da sala</button>
        <button class="btn small danger" onclick="securityAction(${l.id},'block-user')">Bloquear conta</button>
      </div>
    </div>`).join(''):'<p style="color:var(--muted)">Nenhuma tentativa bloqueada.</p>';
  }catch(e){}
}

async function securityAction(logId, action){
  const labels={
    warn:'advertir esta usuária',
    mute:'silenciar por 10 minutos',
    remove:'remover da sala',
    'block-user':'bloquear a conta'
  };
  if(['remove','block-user'].includes(action)){
    if(!confirm(`Confirmar ação de segurança: ${labels[action]}?`))return;
  }
  try{
    const r=await api(`/admin/security/${logId}/${action}`,{method:'POST'});
    alert('Ação aplicada: '+(r.action||action));
    await loadSecurityLogs();
  }catch(e){ alert(e.message); }
}
async function approve(id){ await api('/admin/approve/'+id,{method:'POST'}); loadPending(); }
async function createRoom(){
  const isPublic=qs('roomVisibility')?.value==='public';
  const scheduled_start=isPublic?toUTCISOFromPublicControls('create'):null;
  const r=await api('/rooms/create',{method:'POST',body:JSON.stringify({name:qs('roomName')?.value||'Terras Raras',role:qs('createRole')?.value||'mestre',is_public:isPublic,scheduled_start})});
  openRoom(r.id);
}
async function joinRoom(){
  try{
    const r=await api('/rooms/join',{method:'POST',body:JSON.stringify({code:qs('joinCode')?.value||'',role:qs('joinRole')?.value||'participante'})});
    openRoom(r.id);
  }catch(e){ alert(e.message); }
}
async function leaveRoom(id, ev){
  if(ev) ev.stopPropagation();
  if(!confirm('Deseja sair desta sala? Ela deixará de aparecer em Minhas mesas.'))return;
  await api(`/rooms/${id}/leave`,{method:'POST'});
  if(currentRoom===id){ if(ws)try{ws.close()}catch(e){}; currentRoom=null; }
  await loadHub();
}
async function leaveCurrentRoom(){ if(currentRoom) await leaveRoom(currentRoom); }

/* ===== Mapas ===== */
const FOREST_V9 = {
  nodes:[
    {id:'entrada',name:'Entrada da Floresta',x:12,y:78,type:'normal',desc:'O último ponto seguro antes das árvores fecharem o caminho. A névoa parece esperar uma decisão.',event:'O vento apaga uma lanterna por três segundos.',clue:'Pegadas pequenas seguem para a Trilha dos Sussurros.',secret:'A floresta reconhece nomes ditos em voz alta.',choices:'Entrar juntas; procurar marcas no chão; chamar pela floresta.'},
    {id:'trilha',name:'Trilha dos Sussurros',x:27,y:67,type:'normal',desc:'Folhas secas repetem nomes que ninguém disse em voz alta.',event:'Um sussurro imita a voz de uma das jogadoras.',clue:'As folhas apontam para o Marco das Sete Marcas.',secret:'O sussurro tenta separar o grupo.',choices:'Seguir em silêncio; responder ao sussurro; marcar o caminho.'},
    {id:'marco',name:'Marco das Sete Marcas',x:34,y:55,type:'ruins',desc:'Sete riscos antigos cortam uma pedra coberta de musgo.',event:'Uma das marcas brilha quando alguém encosta.',clue:'A quarta marca combina com o desenho da Cabana Vazia.',secret:'As sete marcas são etapas para liberar o portal.',choices:'Copiar as marcas; tocar outra marca; seguir para o poço.'},
    {id:'poco',name:'Poço das Vozes',x:41,y:48,type:'danger',desc:'Um poço coberto por raízes devolve vozes de pessoas que ainda não chegaram aqui.',event:'O poço responde uma pergunta com outra pergunta.',clue:'Uma voz diz: “a chave está onde ninguém mora”.',secret:'A pista aponta para a Cabana Vazia.',choices:'Fazer uma pergunta; jogar uma pedra; sair sem ouvir.'},
    {id:'ponte',name:'Ponte Quebrada',x:52,y:55,type:'danger',desc:'Madeira úmida cruza um vão escuro. Qualquer passo errado ecoa longe.',event:'A ponte range quando a segunda pessoa pisa.',clue:'Uma corda antiga está presa sob uma tábua.',secret:'A ponte testa cooperação, não força.',choices:'Atravessar uma por vez; reforçar com corda; procurar outro caminho.'},
    {id:'clareira',name:'Clareira Oculta',x:66,y:36,type:'hidden',desc:'Um círculo de luz verde onde pegadas aparecem e somem.',event:'Pegadas novas surgem ao redor do grupo.',clue:'As pegadas formam uma seta para o Lago do Espelho Escuro.',secret:'A clareira mostra caminhos possíveis, não necessariamente seguros.',choices:'Seguir as pegadas; apagar as pegadas; observar de longe.'},
    {id:'lago',name:'Lago do Espelho Escuro',x:79,y:44,type:'secret',desc:'A água parada reflete a floresta como se fosse noite, mesmo de dia.',event:'O reflexo mostra uma jogadora em outro local do mapa.',clue:'No reflexo, a Árvore dos Ossos segura algo brilhante.',secret:'O lago revela o próximo passo se ninguém tocar a água.',choices:'Olhar em silêncio; tocar a água; jogar um objeto no lago.'},
    {id:'cabana',name:'Cabana Vazia',x:57,y:78,type:'hidden',desc:'Uma cabana baixa, quase engolida por musgo. A porta está aberta, mas não há pegadas entrando.',event:'Há uma mesa posta para pessoas que ainda não chegaram.',clue:'Um desenho mostra o Portal com sete marcas ao redor.',secret:'A cabana é o “lugar onde ninguém mora”.',choices:'Entrar; observar janelas; levar o desenho.'},
    {id:'arvore',name:'Árvore dos Ossos',x:74,y:71,type:'danger',desc:'Raízes contorcidas guardam objetos de quem passou antes.',event:'Um objeto preso entre as raízes pulsa com luz fraca.',clue:'O objeto tem a mesma forma da quarta marca.',secret:'É a chave simbólica do portal.',choices:'Puxar juntas; pedir licença à árvore; cortar raízes.'},
    {id:'altar',name:'Altar das Raízes',x:68,y:58,type:'ruins',desc:'Pedras cobertas de raízes formam um pequeno altar circular.',event:'As raízes se movem quando a chave se aproxima.',clue:'Sete marcas aparecem em volta do altar.',secret:'Aqui a Mestre pode liberar a última etapa antes do portal.',choices:'Colocar a chave; repetir as marcas; recuar.'},
    {id:'ninho',name:'Ninho de Espinhos',x:82,y:54,type:'danger',desc:'Espinhos altos cercam um ninho vazio grande demais para qualquer pássaro comum.',event:'Os espinhos se fecham quando alguém corre.',clue:'Entre os espinhos há uma pena escura apontando para o Túnel das Raízes.',secret:'O perigo é ativado por pressa.',choices:'Passar devagar; abrir caminho; voltar.'},
    {id:'tunel',name:'Túnel das Raízes',x:88,y:66,type:'hidden',desc:'Raízes formam um arco baixo que desce para uma passagem escura.',event:'O túnel respira ar frio quando alguém se aproxima.',clue:'O ar frio vem da próxima zona.',secret:'Atalho para o portal quando a Mestre quiser acelerar.',choices:'Entrar; escutar primeiro; marcar a entrada.'},
    {id:'portal',name:'Portal da Próxima Zona',x:92,y:43,type:'portal',desc:'Um arco vivo pulsa como se respirasse. Ele parece fechado até a floresta aceitar a passagem.',event:'As sete marcas brilham quando o portal é liberado.',clue:'O portal abre apenas quando a Mestre marcar a liberação.',secret:'A liberação depende do ritmo da sessão, não de regra automática.',choices:'Tocar o arco; dizer os nomes; voltar ao altar.'}
  ],
  links:[['entrada','trilha'],['trilha','marco'],['marco','poco'],['poco','ponte'],['ponte','clareira'],['clareira','lago'],['ponte','cabana'],['cabana','arvore'],['arvore','altar'],['altar','ninho'],['ninho','tunel'],['tunel','portal'],['lago','portal'],['clareira','portal']]
};
const GENERIC_NODES=[
  {id:'inicio',name:'Chegada',x:14,y:68,type:'normal',desc:'Ponto de chegada da zona.'},
  {id:'trilha',name:'Caminho Principal',x:32,y:52,type:'normal',desc:'O caminho mais visível atravessa a zona.'},
  {id:'perigo',name:'Área de Perigo',x:50,y:38,type:'danger',desc:'Um local que exige cuidado.'},
  {id:'segredo',name:'Local Escondido',x:58,y:72,type:'hidden',desc:'Um ponto que revela pistas.'},
  {id:'desafio',name:'Desafio da Zona',x:76,y:55,type:'danger',desc:'O obstáculo central da zona.'},
  {id:'portal',name:'Portal da Próxima Zona',x:91,y:40,type:'portal',desc:'Saída para a próxima etapa.'}
];
function graph(){
  if(state?.map?.id==='floresta_negra') return FOREST_V9;
  return {nodes:GENERIC_NODES.map(n=>({...n})),links:[['inicio','trilha'],['trilha','perigo'],['trilha','segredo'],['segredo','desafio'],['perigo','desafio'],['desafio','portal']]};
}
function nodeById(id){ return graph().nodes.find(n=>n.id===id); }
function nodeGlyph(t){ return t==='danger'?'⚠':t==='portal'?'◆':t==='hidden'?'✦':t==='secret'?'◈':t==='ruins'?'◌':'●'; }
function nodeTypeText(t){ return t==='danger'?'Perigo':t==='portal'?'Portal':t==='hidden'?'Oculto':t==='secret'?'Segredo':t==='ruins'?'Ruínas':'Local'; }
function curvedPath(A,B,i){
  const mx=(A.x+B.x)/2, my=(A.y+B.y)/2, dx=B.x-A.x, dy=B.y-A.y;
  const curve=((i%2)?1:-1)*Math.min(8, Math.max(3, Math.hypot(dx,dy)/7));
  const cx=mx-dy/30*curve, cy=my+dx/30*curve;
  return `M ${A.x} ${A.y} Q ${cx} ${cy} ${B.x} ${B.y}`;
}
function overrideFor(n){
  const d=(state?.location_descriptions||[]).find(x=>x.map_id===state.map.id && x.location_id===n.id);
  return d ? {...n, desc:d.description, customDescription:true} : n;
}
function progressValue(key){ return !!(state?.progress_flags||[]).find(f=>f.map_id===state.map.id && f.key===key && f.value); }
function locKey(id,suffix){ return `loc:${id}:${suffix}`; }
function portalReleased(){ return progressValue('portal_released') || progressValue('portal:released') || progressValue('Liberou o Portal da Próxima Zona'); }

/* ===== Sala / WebSocket ===== */
async function openRoom(id){
  currentRoom=id;
  selectedNode=null;
  state=await api('/rooms/'+id);
  show('game');
  connectWS();
  await refreshCharacters();
  renderRoom();
}
function connectWS(){
  if(ws){ try{ws.onclose=null; ws.close()}catch(e){} }
  const proto=location.protocol==='https:'?'wss':'ws';
  ws=new WebSocket(`${proto}://${location.host}/ws/${currentRoom}`);
  ws.onopen=()=>{ const p=qs('roomCode'); if(p&&p.dataset.baseCode) p.textContent=p.dataset.baseCode; };
  ws.onmessage=e=>{
    const d=JSON.parse(e.data);
    if(d.type==='state'){ state=d.state; renderRoom(); }
    else if(d.type==='staff_chat_updated'){ renderStaffChat(); }
    else if(d.type==='room_deleted'){ if(currentRoom){ alert('Esta sala foi encerrada.'); currentRoom=null; show('hub'); loadHub(); } }
  };
  ws.onerror=()=>{ try{ws.close()}catch(e){} };
  ws.onclose=()=>{
    if(!currentRoom)return;
    const p=qs('roomCode');
    if(p){ p.dataset.baseCode=p.dataset.baseCode||p.textContent; p.textContent=(p.dataset.baseCode||'')+' · reconectando...'; }
    setTimeout(()=>{ if(currentRoom) connectWS(); },3000);
  };
}

/* ===== Permissões / papéis ===== */
function roleName(r){ return r==='mestre'?'Mestre':r==='ajudante'?'Ajudante da Mestre':'Jogadora'; }
function isStaff(){ return !!(state?.me && ['mestre','ajudante','admin'].includes(state.me.role)) || !!me?.is_admin; }
function isMasterRole(){ return !!(state?.me && state.me.role==='mestre') || !!me?.is_admin; }
async function changeMyRoomRole(){
  const r=qs('myRoomRole')?.value; if(!r)return;
  await api(`/rooms/${currentRoom}/role`,{method:'POST',body:JSON.stringify({role:r})});
  state=await api('/rooms/'+currentRoom); renderGame();
}

function roomVisibilityPrefix(prefix='room'){
  return prefix || 'room';
}
function roomVisibilityControlHTML(prefix, room, classes=''){
  prefix = roomVisibilityPrefix(prefix);
  const publicSelected = !!room.is_public;
  const closedSelected = !publicSelected;
  return `<div class="visibilityControls ${esc(classes)}" data-visibility-controls="${esc(prefix)}">
    <div class="forestCard" style="margin-top:10px"><b>Sala ${publicSelected?'pública':'fechada'}</b><span class="countdown" data-start="${esc(room.scheduled_start||'')}">${sessionStatusText(room.scheduled_start)}</span></div>
    <label>Visibilidade da sala</label>
    <div class="choiceRow roomVisibilityChoice">
      <button type="button" class="choiceBtn ${closedSelected?'on':''}" data-room-visibility-prefix="${esc(prefix)}" data-room-visibility="closed" onclick="setRoomVisibilityChoice('closed','${esc(prefix)}')">Fechada</button>
      <button type="button" class="choiceBtn ${publicSelected?'on':''}" data-room-visibility-prefix="${esc(prefix)}" data-room-visibility="public" onclick="setRoomVisibilityChoice('public','${esc(prefix)}')">Pública</button>
    </div>
    <select id="${esc(prefix)}PublicToggle" class="hidden"><option value="closed" ${closedSelected?'selected':''}>Fechada</option><option value="public" ${publicSelected?'selected':''}>Pública</option></select>
    <div class="visibilityHint">Escolha se a sala fica privada ou visível para entrada pública no hub.</div>
    <div id="${esc(prefix)}StartControls" class="${publicSelected?'':'hidden'}"><label>Início da sessão pública</label><select id="${esc(prefix)}StartMode" onchange="toggleRoomStartAt('${esc(prefix)}')"><option value="now">Agora</option><option value="15">Em 15 min</option><option value="30" selected>Em 30 min</option><option value="60">Em 1 hora</option><option value="custom">Escolher horário</option></select><input id="${esc(prefix)}StartAt" type="datetime-local" class="hidden" style="margin-top:8px" value="${localDateTimeValue(room.scheduled_start)}"></div>
    <button class="btn small" style="margin-top:10px;width:100%" onclick="saveRoomVisibility('${esc(prefix)}')">Salvar visibilidade</button>
  </div>`;
}
function syncRoomVisibilityChoice(prefix='room'){
  prefix = roomVisibilityPrefix(prefix);
  const value=qs(prefix+'PublicToggle')?.value||'closed';
  document.querySelectorAll(`[data-room-visibility-prefix="${prefix}"]`).forEach(btn=>btn.classList.toggle('on', btn.dataset.roomVisibility===value));
}
function setRoomVisibilityChoice(value, prefix='room'){
  prefix = roomVisibilityPrefix(prefix);
  const sel=qs(prefix+'PublicToggle');
  if(sel) sel.value=value;
  toggleRoomStartControls(prefix);
  syncRoomVisibilityChoice(prefix);
}
function toggleRoomStartControls(prefix='room'){
  prefix = roomVisibilityPrefix(prefix);
  const isPublic=(qs(prefix+'PublicToggle')?.value||'closed')==='public';
  qs(prefix+'StartControls')?.classList.toggle('hidden', !isPublic);
  syncRoomVisibilityChoice(prefix);
}
function toggleRoomStartAt(prefix='room'){
  prefix = roomVisibilityPrefix(prefix);
  qs(prefix+'StartAt')?.classList.toggle('hidden', qs(prefix+'StartMode')?.value!=='custom');
}
async function saveRoomVisibility(prefix='room'){
  prefix = roomVisibilityPrefix(prefix);
  const isPublic=qs(prefix+'PublicToggle')?.value==='public';
  const scheduled_start=isPublic?toUTCISOFromPublicControls(prefix):null;
  await api(`/rooms/${currentRoom}/visibility`,{method:'POST',body:JSON.stringify({is_public:isPublic,scheduled_start})});
  state=await api('/rooms/'+currentRoom);
  renderRoom();
  setTimeout(()=>refreshCountdowns(),30);
  alert(`Sala ${isPublic?'pública':'fechada'} salva com sucesso.`);
}
function renderRolePanel(){
  const side=qs('side'); if(!side||!state?.me)return;
  let box=qs('rolePanel');
  if(!box){ box=document.createElement('div'); box.id='rolePanel'; box.className='sideSection rolePanel'; side.prepend(box); }
  const r=state.me.role;
  const help=r==='mestre'?'Controle completo da sessão, mapa, diário e IA.':r==='ajudante'?'Acesso a IA, diário e bastidores.':'Participa da aventura e controla seu personagem.';
  const tokenInfo=`${state.room?.tokens_used||0}/${state.room?.token_capacity||"?"} totens em uso`;
  const room=state.room||{};
  const vis=isMasterRole()?roomVisibilityControlHTML('room', room, 'sideVisibilityControls'):'';
  box.innerHTML=`<h3 class="title">Função na mesa</h3><div class="forestCard"><b>Você está como: ${roleName(r)} <span class="roleBadge">${esc(r)}</span></b>${help}<br><span style="color:var(--muted)">${tokenInfo}</span></div><label>Alterar minha função</label><select id="myRoomRole"><option value="mestre" ${r==='mestre'?'selected':''}>Mestre</option><option value="ajudante" ${r==='ajudante'?'selected':''}>Ajudante da Mestre</option><option value="participante" ${r==='participante'?'selected':''}>Jogadora</option></select><button class="btn small ghost" style="margin-top:8px" onclick="changeMyRoomRole()">Aplicar função</button>${vis}`;
  syncRoomVisibilityChoice('room');
  toggleRoomStartControls('room');
  toggleRoomStartAt('room');
}


/* ===== Painel ===== */
function ensureStaffSection(){
  const side=qs('side'); if(!side)return;
  let sec=qs('staffSection');
  if(isStaff()){
    if(!sec){
      sec=document.createElement('div'); sec.id='staffSection'; sec.className='sideSection';
      sec.innerHTML=`<h3 class="title">Bastidores</h3><div id="staffChat" class="staffChat"></div><div class="row" style="margin-top:8px"><input id="staffText" placeholder="Mensagem só para Mestre/Ajudante..."><button class="btn small" onclick="sendStaffChat()">Enviar</button></div>`;
      const ai=qs('localAIBox'); side.insertBefore(sec, ai||null);
    }
  }else if(sec){ sec.remove(); }
}
function initPanelTabs(){
  const side=qs('side'); if(!side)return;
  side.querySelector('.panelTabs')?.remove();
  const sections=[...side.children].filter(x=>x.classList.contains('sideSection') && x.id!=='rolePanel');
  sections.forEach(s=>s.classList.add('tabPane'));
  const labels=sections.map(s=>{
    const title=s.querySelector('.title')?.textContent?.trim()||'Painel';
    if(s.id==='localAIBox')return 'IA';
    if(s.id==='staffSection')return 'Bastidores';
    return title.replace('Escolher personagem','Personagem').replace('Diário da Mestre','Diário');
  });
  const tabs=document.createElement('div'); tabs.className='panelTabs';
  tabs.innerHTML=labels.map((l,i)=>`<button onclick="openPanelTab(${i})">${esc(l)}</button>`).join('');
  const ref=sections[0]; if(ref) side.insertBefore(tabs, ref);
  if(activePanelIndex>=sections.length) activePanelIndex=0;
  openPanelTab(activePanelIndex);
}
function openPanelTab(i){
  activePanelIndex=i;
  const side=qs('side'); if(!side)return;
  const buttons=[...side.querySelectorAll('.panelTabs button')];
  const panes=[...side.querySelectorAll('.tabPane')];
  buttons.forEach((b,k)=>b.classList.toggle('on',k===i));
  panes.forEach((p,k)=>p.classList.toggle('on',k===i));
}
function toggleSide(){ const side=qs('side'), game=document.querySelector('.game'); if(!side)return; side.classList.toggle('closed'); game?.classList.toggle('panelClosed', side.classList.contains('closed')); }

/* ===== Render ===== */
async function refreshCharacters(){
  try{ charsCache=await api('/characters'); }catch(e){}
}

function ensureEndMapButton(){
  const box=qs('masterMapControls');
  if(!box || qs('endMapBtn'))return;
  const btn=document.createElement('button');
  btn.id='endMapBtn';
  btn.className='btn small danger';
  btn.style.marginTop='8px';
  btn.style.width='100%';
  btn.textContent='Encerrar mapa e abrir próxima zona';
  btn.onclick=endCurrentMap;
  box.appendChild(btn);
}


function renderRoom(){
  if(!state)return;
  show('game');
  if((state.room?.session_status||'waiting')==='waiting'){
    renderWaitingRoom();
  }else if(state.room?.session_status==='ended'){
    renderEndedRoom();
  }else{
    renderGame();
  }
}
function renderWaitingRoom(){
  const r=state.room||{};
  qs('gameTitle').textContent=r.name||'Sala de espera';
  qs('roomCode').textContent=r.code||'';
  const mapArea=qs('mapArea'), side=qs('side');
  if(mapArea){
    mapArea.innerHTML=`<div class="waitingLobby">
      <div class="waitingBackdrop"></div>
      <div class="waitingCard">
        <div class="waitingEyebrow">Terras Raras</div>
        <h1>${esc(r.name||'Sala de espera')}</h1>
        <div class="waitingCountdown countdown" data-start="${esc(r.scheduled_start||'')}">${sessionStatusLabel(r.session_status,r.scheduled_start)}</div>
        <p class="waitingIntro">A sessão ainda não começou. As jogadoras podem conversar, confirmar seus totens e aguardar a Mestre liberar o mapa.</p>
        <div class="waitingStats">
          <div class="waitingStat"><b>${esc(r.tokens_used||0)}/${esc(r.token_capacity||'?')}</b><span>totens ocupados</span></div>
          <div class="waitingStat"><b>${esc(r.tokens_available||0)}</b><span>vagas restantes</span></div>
          <div class="waitingStat"><b>${r.is_public?'Pública':'Fechada'}</b><span>visibilidade</span></div>
        </div>
        ${isMasterRole()?roomVisibilityControlHTML('mobileRoom', r, 'waitingMobileControls'):''}
        <div class="waitingActions">
          ${isMasterRole()?`<button class="btn startSessionBtn" onclick="startSessionNow()">Iniciar sessão agora</button>`:`<div class="waitingNotice">Aguardando a Mestre iniciar a sessão...</div>`}
        </div>
      </div>
    </div>`;
  }
  if(side){
    side.classList.remove('closed');
    side.innerHTML=`<div class="sideSection rolePanel" id="rolePanel"></div>
      <div class="sideSection"><h3 class="title">Jogadoras presentes</h3><div id="players" class="players"></div></div>
      <div class="sideSection"><h3 class="title">Escolher totem</h3><select id="charSelect"></select><button class="btn small" style="margin-top:8px" onclick="chooseChar()">Usar personagem</button></div>
      <div class="sideSection"><h3 class="title">Chat pré-jogo</h3><div id="chat" class="chat"></div><div class="row" style="margin-top:8px"><input id="chatText" placeholder="Mensagem..."><button class="btn small" onclick="sendChat()">Enviar</button></div></div>`;
  }
  if(qs('charSelect')){
    const myPlayer=(state.players||[]).find(p=>p.username===me?.username);
    const used=new Set((state.players||[]).filter(p=>!myPlayer||p.id!==myPlayer.id).map(p=>p.character?.id).filter(Boolean));
    qs('charSelect').innerHTML=(charsCache||[]).map(c=>`<option value="${c.id}" ${used.has(c.id)?'disabled':''} ${myPlayer?.character?.id===c.id?'selected':''}>${esc(c.name)} · ${esc(c.role)}${used.has(c.id)?' — em uso':''}</option>`).join('');
  }
  renderRolePanel();
  if(isMasterRole() && qs('mobileRoomPublicToggle')){
    syncRoomVisibilityChoice('mobileRoom');
    toggleRoomStartControls('mobileRoom');
    toggleRoomStartAt('mobileRoom');
  }
  renderPlayers();
  renderChat();
}
function renderEndedRoom(){
  qs('gameTitle').textContent=state.room?.name||'Sessão encerrada';
  qs('roomCode').textContent=state.room?.code||'';
  const mapArea=qs('mapArea'), side=qs('side');
  if(mapArea){
    mapArea.innerHTML=`<div class="waitingLobby"><div class="waitingCard"><h1>Sessão encerrada</h1><p>Esta aventura foi encerrada pela Mestre.</p><button class="btn" onclick="show('hub');loadHub()">Voltar ao Hub</button></div></div>`;
  }
  if(side){
    side.innerHTML=`<div class="sideSection"><h3 class="title">Chat</h3><div id="chat" class="chat"></div></div>`;
    renderChat();
  }
}
async function startSessionNow(){
  if(!currentRoom)return;
  if(!confirm('Iniciar a sessão agora e liberar o mapa para todas as jogadoras?'))return;
  try{
    await api(`/rooms/${currentRoom}/session/start`,{method:'POST'});
    state=await api('/rooms/'+currentRoom);
    renderRoom();
  }catch(e){ alert(e.message); }
}



function ensureGameScaffold(){
  const mapArea=qs('mapArea'), side=qs('side');
  if(mapArea && !qs('mapSvg')){
    mapArea.innerHTML=`<div id="mapSvg" class="mapSvg"></div><svg id="pathLayer" class="pathLayer" viewBox="0 0 100 100" preserveAspectRatio="none"></svg><div id="mapNodes" class="mapNodes"></div><div class="mapShade"></div><div id="tokens"></div><div class="mapHint">Clique nos pontos do mapa para revelar locais, mover tokens e gerar narração com IA local.</div>`;
  }
  if(side && !qs('locationBox')){
    side.innerHTML=`<div class="sideSection"><h3 class="title" id="mapName">Mapa</h3><p id="mapDesc" style="color:var(--muted)"></p><div id="masterMapControls" class="hidden"><label>Mudar zona/mapa</label><select id="mapSelect"></select><button class="btn small" style="margin-top:8px" onclick="changeMap()">Alterar mapa</button></div><div class="legend"><span>● local</span><span>● perigo</span><span>● portal</span><span>linha = caminho</span></div><div id="locationBox" class="locationBox"><b>Nenhum local selecionado</b><div class="locationMeta">Clique em um ponto do mapa para ver descrição, mover personagens e gerar narrativa daquele local.</div></div></div><div class="sideSection"><h3 class="title">Jogadoras</h3><div id="players" class="players"></div></div><div class="sideSection"><h3 class="title">Escolher personagem</h3><select id="charSelect"></select><button class="btn small" style="margin-top:8px" onclick="chooseChar()">Usar personagem</button></div><div class="sideSection"><h3 class="title">Chat</h3><div id="chat" class="chat"></div><div class="row" style="margin-top:8px"><input id="chatText" placeholder="Mensagem..."><button class="btn small" onclick="sendChat()">Enviar</button></div></div><div class="sideSection"><h3 class="title">Diário da Mestre</h3><div id="notes" class="notes"></div><div id="masterNotes" class="hidden"><label>Título</label><input id="noteTitle" value="Resumo da sessão"><label>Texto</label><textarea id="noteText" placeholder="Eventos importantes, fraquezas, itens, localização, pendências..."></textarea><button class="btn small" style="margin-top:8px" onclick="addNote()">Salvar nota</button></div></div><div class="sideSection hidden" id="localAIBox"><h3 class="title">IA Local · Zero API</h3><p style="color:var(--muted);font-size:14px;line-height:1.35">Ollama roda no seu computador. Mestre e Ajudante usam a IA em bastidor e publicam só o que aprovarem.</p><div class="aiTabs"><button id="aiTabAsk" class="on" onclick="showAIInnerTab('ask')">Perguntar</button><button id="aiTabFunctions" onclick="showAIInnerTab('functions')">Funções da Mestre</button><button id="aiTabResponses" onclick="showAIInnerTab('responses')">Respostas</button><button id="aiTabConfig" onclick="showAIInnerTab('config')">Configuração</button></div><div id="aiPaneAsk" class="aiPane on"><label>Pergunta / ação livre</label><textarea id="aiAction" placeholder="Ex.: O que devo falar para as participantes no início do jogo?"></textarea><div class="row" style="margin-top:8px"><button class="btn small" onclick="requestAIAndShow('narrative')">Narrar cena</button><button class="btn small ghost" onclick="requestAIAndShow('question')">Perguntar</button></div><div class="aiHelp">Use <b>Narrar cena</b> para texto pronto de jogo. Use <b>Perguntar</b> para pedir orientação, ideias, pistas e condução.</div></div><div id="aiPaneFunctions" class="aiPane"><div class="masterFunctionBox"><label>Escolha uma função</label><select id="masterFunction"><option value="opening">Início da sessão</option><option value="tension">Cena de tensão</option><option value="discovery">Cena de descoberta</option><option value="clue">Criar pista</option><option value="scare">Criar susto leve</option><option value="consequence">Criar consequência</option><option value="npc">Fala de NPC</option><option value="catchup">Resumo para quem chegou atrasada</option><option value="ending">Encerrar sessão com gancho</option><option value="improvise">Improvisar fuga do plano</option><option value="riddle">Criar enigma simples</option><option value="reward">Criar recompensa</option></select><label>Detalhe opcional para a IA considerar</label><textarea id="masterFunctionDetail" placeholder="Ex.: Elas estão na Ponte Quebrada e ainda não sabem que a floresta está viva."></textarea><button class="btn small" style="margin-top:8px;width:100%" onclick="generateMasterFunction()">Gerar função</button><div class="aiHelp">A função usa o modo de velocidade escolhido em Configuração. Por padrão fica rápido e curto.</div></div></div><div id="aiPaneResponses" class="aiPane"><div id="aiStatus" class="msg" style="font-size:14px"></div><h3 class="title" style="font-size:18px;margin-top:16px">Respostas da IA</h3><div id="aiJobs" class="aiJobs"></div></div><div id="aiPaneConfig" class="aiPane"><div class="aiConfigBox"><label>Velocidade / tamanho</label><select id="aiMode"><option value="short" selected>Rápida — curta</option><option value="normal">Normal</option><option value="detailed">Detalhada</option></select><div class="aiHelp">Modo <b>Rápida</b> usa prompt menor e limita a resposta para acelerar no seu PC.</div><div class="row" style="margin-top:8px"><button class="btn small ghost" onclick="requestAIAndShow('summary')">Resumir</button><button class="btn small ghost" onclick="requestAIAndShow('image_prompt')">Criar prompt de imagem</button></div></div></div></div>`;
  }
}

function renderGame(){
  ensureGameScaffold();
  if(!state)return;
  const r=state.room, m=state.map;
  qs('gameTitle').textContent=r.name;
  qs('roomCode').textContent=r.code;
  qs('mapSvg').innerHTML=m.image_svg||'';
  qs('mapName').textContent=m.name;
  qs('mapDesc').textContent=m.description||'';
  qs('masterMapControls')?.classList.toggle('hidden',!isMasterRole());
  qs('masterNotes')?.classList.toggle('hidden',!isStaff());
  qs('localAIBox')?.classList.toggle('hidden',!isStaff());
  ensureEndMapButton();
  if(qs('mapSelect')) qs('mapSelect').innerHTML=(state.maps||[]).map(x=>`<option value="${x.id}" ${x.id===m.id?'selected':''}>${x.zone_number}. ${esc(x.name)}</option>`).join('');
  if(qs('charSelect')){
    const myPlayer=(state.players||[]).find(p=>p.username===me?.username);
    const used=new Set((state.players||[]).filter(p=>!myPlayer||p.id!==myPlayer.id).map(p=>p.character?.id).filter(Boolean));
    qs('charSelect').innerHTML=(charsCache||[]).map(c=>`<option value="${c.id}" ${used.has(c.id)?'disabled':''} ${myPlayer?.character?.id===c.id?'selected':''}>${esc(c.name)} · ${esc(c.role)}${used.has(c.id)?' — em uso':''}</option>`).join('');
  }
  renderRolePanel();
  ensureStaffSection();
  initPanelTabs();
  renderMapGraph();
  renderTokens();
  renderPlayers();
  renderChat();
  renderNotes();
  renderLocationBox();
  renderAIJobs();
  renderStaffChat();
  renderWorkerStatus();
}
function renderMapGraph(){
  const g=graph(), layer=qs('pathLayer'), nodes=qs('mapNodes');
  if(!layer||!nodes)return;
  layer.innerHTML='<defs></defs>'+g.links.map(([a,b],i)=>{
    const A=nodeById(a),B=nodeById(b); if(!A||!B)return '';
    const cls=(A.type==='danger'||B.type==='danger')?'dangerTrail':(A.type==='hidden'||B.type==='hidden')?'hiddenTrail':'';
    const d=curvedPath(A,B,i);
    return `<path class="trailShadow" d="${d}"></path><path class="trailBase ${cls}" d="${d}"></path><path class="trailEdge" d="${d}"></path><path class="trailPebbles" d="${d}"></path>`;
  }).join('');
  nodes.innerHTML=g.nodes.map(n=>{
    const selected=selectedNode&&selectedNode.id===n.id;
    const closed=n.id==='portal' && !portalReleased();
    const cls=[n.type==='danger'?'danger':n.type==='portal'?'portal':n.type==='hidden'?'hiddenNode':n.type==='secret'?'secretNode':n.type==='ruins'?'ruinsNode':'',selected?'selected':'',closed?'locked':''].join(' ');
    return `<div class="mapNode ${cls}" style="left:${n.x}%;top:${n.y}%" onclick="selectMapNode('${n.id}')"><div class="nodeGlyph">${closed?'🔒':nodeGlyph(n.type)}</div><div class="mapNodeLabel">${esc(n.name)}</div></div>`;
  }).join('');
}
function renderTokens(){
  const box=qs('tokens'); if(!box)return;
  box.innerHTML=(state.players||[]).map(p=>{
    const ch=p.character, art=ch?.avatar_svg||'<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="48" fill="#d0a94a"/></svg>';
    return `<div class="token" style="left:${p.x}%;top:${p.y}%" onpointerdown="startDrag(event,${p.id})">${art}<div class="tokenName">${esc(ch?.name||p.username)}</div></div>`;
  }).join('');
}
function startDrag(ev,id){
  const p=(state.players||[]).find(x=>x.id===id);
  if(!p)return;
  if(!isMasterRole() && state.me?.id!==id)return;
  dragging=id; ev.preventDefault();
  window.onpointermove=dragMove; window.onpointerup=dragEnd;
}
function dragMove(ev){
  if(!dragging)return;
  const area=qs('mapArea').getBoundingClientRect();
  const x=Math.max(0,Math.min(100,(ev.clientX-area.left)/area.width*100));
  const y=Math.max(0,Math.min(100,(ev.clientY-area.top)/area.height*100));
  const p=(state.players||[]).find(x=>x.id===dragging); if(p){p.x=x;p.y=y;renderTokens();}
}
async function dragEnd(ev){
  if(!dragging)return;
  const id=dragging; dragging=null; window.onpointermove=null; window.onpointerup=null;
  const p=(state.players||[]).find(x=>x.id===id); if(!p)return;
  await api(`/rooms/${currentRoom}/move-token`,{method:'POST',body:JSON.stringify({player_id:id,x:p.x,y:p.y})});
}
function renderPlayers(){
  const box=qs('players'); if(!box)return;
  box.innerHTML=(state.players||[]).map(p=>{
    const staff=isMasterRole();
    return `<div class="player"><b>${esc(p.character?.name||p.username)}</b> <span class="pill">${roleName(p.role)}</span><br><span style="color:var(--muted)">${esc(p.username)}</span>
      <label>HP</label><input id="hp_${p.id}" type="number" value="${p.hp}" ${staff?'':'disabled'}><div class="meter"><div class="fill" style="width:${p.hp}%"></div></div>
      <label>Energia</label><input id="en_${p.id}" type="number" value="${p.energy}" ${staff?'':'disabled'}><div class="meter"><div class="fill energy" style="width:${p.energy}%"></div></div>
      ${staff?`<label>Fraqueza</label><input id="weak_${p.id}" value="${esc(p.weakness||'')}"><label>Notas</label><textarea id="pnotes_${p.id}">${esc(p.notes||'')}</textarea><label>Inventário</label><input id="inv_${p.id}" value="${esc(p.inventory||'')}"><button class="btn small" onclick="saveStats(${p.id})">Salvar</button>`:''}
    </div>`;
  }).join('');
}
async function saveStats(id){
  await api(`/rooms/${currentRoom}/stats`,{method:'POST',body:JSON.stringify({player_id:id,hp:+qs('hp_'+id).value,energy:+qs('en_'+id).value,weakness:qs('weak_'+id)?.value||'',notes:qs('pnotes_'+id)?.value||'',inventory:qs('inv_'+id)?.value||''})});
}
const saveNotes=saveStats;
function renderChat(){ const box=qs('chat'); if(box) box.innerHTML=(state.chat||[]).map(c=>`<div class="bubble"><b>${esc(c.username)}</b><br>${esc(c.text).replace(/\n/g,'<br>')}</div>`).join(''); }
async function sendChat(){
  const t=qs('chatText')?.value.trim(); if(!t)return;
  try{
    await api(`/rooms/${currentRoom}/chat`,{method:'POST',body:JSON.stringify({text:t})});
    qs('chatText').value='';
  }catch(e){ alert(e.message); }
}
function renderNotes(){ const box=qs('notes'); if(box) box.innerHTML=(state.notes||[]).map(n=>`<div class="note"><b>${esc(n.title)}</b><br>${esc(n.text).replace(/\n/g,'<br>')}</div>`).join(''); }
async function addNote(){ await api(`/rooms/${currentRoom}/notes`,{method:'POST',body:JSON.stringify({title:qs('noteTitle')?.value||'Nota',text:qs('noteText')?.value||''})}); if(qs('noteText'))qs('noteText').value=''; }

/* ===== Local / progresso ===== */
function selectMapNode(id){ selectedNode=overrideFor(nodeById(id)); renderMapGraph(); renderLocationBox(); openPanelTab(0); }
async function setProgress(key,value,label){ await api(`/rooms/${currentRoom}/progress`,{method:'POST',body:JSON.stringify({map_id:state.map.id,key,value,label})}); state=await api('/rooms/'+currentRoom); renderGame(); }
function progressChecklist(){
  if(!isStaff()||state.map.id!=='floresta_negra')return '';
  const items=[
    ['visitou_trilha','Visitou a Trilha dos Sussurros'],
    ['pista_poco','Encontrou a pista no Poço das Vozes'],
    ['desenho_cabana','Descobriu o desenho da Cabana Vazia'],
    ['arvore_resolvida','Resolveu o desafio da Árvore dos Ossos'],
    ['portal_released','Liberou o Portal da Próxima Zona']
  ];
  return `<div class="forestCard"><b>Progresso da zona</b><div class="progressGrid">${items.map(([k,l])=>`<label class="progressItem"><input type="checkbox" ${progressValue(k)?'checked':''} onchange="setProgress('${k}',this.checked,'${l.replace(/'/g,"\\'")}')">${l}</label>`).join('')}</div></div>`;
}
function renderLocationBox(){
  const box=qs('locationBox'); if(!box)return;
  if(!selectedNode){
    box.innerHTML=`<div class="locTitle">${esc(state?.map?.name||'Mapa')}</div><div class="locationMeta">Clique em um ponto do mapa para explorar locais, pistas, eventos e escolhas.</div>${progressChecklist()}`;
    return;
  }
  const n=overrideFor(selectedNode);
  const players=(state.players||[]).map(p=>`<option value="${p.id}">${esc(p.character?.name||p.username)} · ${esc(p.username)}</option>`).join('');
  const closed=n.id==='portal'&&!portalReleased();
  let html=`<div class="locTitle">${esc(n.name)} ${closed?'🔒':''}</div><span class="locType">${nodeTypeText(n.type)}</span><div class="locationMeta">${esc(n.desc)}</div>`;
  if(isStaff()){
    html+=`<div class="forestIntel">
      <div class="forestCard"><b>Evento pronto</b>${esc(n.event||'Use a IA para criar um evento deste local.')}</div>
      <div class="forestCard"><b>Pista</b>${esc(n.clue||'Sem pista definida.')}</div>
      <div class="forestCard forestSecret"><b>Segredo da Mestre</b>${esc(n.secret||'Sem segredo definido.')}</div>
      <div class="forestCard forestChoices"><b>Escolhas possíveis</b>${esc(n.choices||'Explorar; esperar; voltar.')}</div>
      <div class="forestCard"><b>Estado do local</b><div class="locStateActions">
        <button class="btn small ghost ${progressValue(locKey(n.id,'visited'))?'on':''}" onclick="setProgress('${locKey(n.id,'visited')}',${!progressValue(locKey(n.id,'visited'))},'${n.name} visitado')">Visitado</button>
        <button class="btn small ghost ${progressValue(locKey(n.id,'clue'))?'on':''}" onclick="setProgress('${locKey(n.id,'clue')}',${!progressValue(locKey(n.id,'clue'))},'Pista em ${n.name}')">Pista</button>
        <button class="btn small ghost ${progressValue(locKey(n.id,'resolved'))?'on':''}" onclick="setProgress('${locKey(n.id,'resolved')}',${!progressValue(locKey(n.id,'resolved'))},'${n.name} resolvido')">Resolvido</button>
      </div></div>
      ${n.id==='portal' && !portalReleased()?`<button class="btn small" onclick="setProgress('portal_released',true,'Liberou o Portal da Próxima Zona')">Liberar portal agora</button>`:''}
    </div>`;
  }
  html+=`<label>Mover token para este local</label><select id="targetPlayer">${players}</select><div class="locationActions">
    <button class="btn small" onclick="moveSelectedToNode()" ${isMasterRole()?'':'disabled'}>Mover token</button>
    <button class="btn small ghost" onclick="narrateSelectedNode()">Narrar local</button>
    ${isStaff()?`<button class="btn small ghost" onclick="generateLocalEvent()">Gerar evento</button><button class="btn small ghost" onclick="noteSelectedNode()">Enviar ao diário</button><button class="btn small ghost" onclick="imagePromptSelectedNode()">Prompt imagem</button>`:''}
  </div>${progressChecklist()}`;
  box.innerHTML=html;
}
async function moveSelectedToNode(){
  if(!selectedNode)return;
  const id=+qs('targetPlayer')?.value; if(!id)return;
  await api(`/rooms/${currentRoom}/move-token`,{method:'POST',body:JSON.stringify({player_id:id,x:selectedNode.x,y:selectedNode.y})});
}
function forestContext(n){return `Local: ${n.name}. Descrição: ${n.desc}. Evento: ${n.event||''}. Pista: ${n.clue||''}. Segredo da Mestre: ${n.secret||''}. Escolhas: ${n.choices||''}.`;}
function narrateSelectedNode(){ if(!selectedNode)return; qs('aiAction').value=`${forestContext(overrideFor(selectedNode))} Narre a chegada das personagens a este local. Use apenas o que pode ser dito às jogadoras. Termine com uma decisão objetiva.`; requestAIAndShow('narrative'); }
function generateLocalEvent(){ if(!selectedNode)return; qs('aiAction').value=`${forestContext(overrideFor(selectedNode))} Crie um evento rápido para este local, pronto para a Mestre usar agora. Não revele o segredo de forma direta.`; requestAIAndShow('location_event'); }
async function noteSelectedNode(){ if(!selectedNode)return; const n=overrideFor(selectedNode); qs('noteTitle').value=`Local: ${n.name}`; qs('noteText').value=`Descrição pública:\n${n.desc}\n\nEvento:\n${n.event||''}\n\nPista:\n${n.clue||''}\n\nSegredo:\n${n.secret||''}\n\nEscolhas:\n${n.choices||''}`; await addNote(); }
function imagePromptSelectedNode(){ if(!selectedNode)return; const n=overrideFor(selectedNode); qs('aiAction').value=`Crie prompt visual cinematográfico em inglês para o local ${n.name}, ${state.map.name}. Descrição: ${n.desc}. Sem texto na imagem.`; requestAIAndShow('image_prompt'); }

/* ===== Personagens / mapas ===== */
async function chooseChar(){
  const cid=qs('charSelect')?.value; if(!cid)return;
  try{
    await api(`/rooms/${currentRoom}/choose-character`,{method:'POST',body:JSON.stringify({room_id:currentRoom,character_id:cid})});
  }catch(e){ alert(e.message); }
}
async function changeMap(){ const mid=qs('mapSelect')?.value; if(!mid)return; selectedNode=null; await api(`/rooms/${currentRoom}/map`,{method:'POST',body:JSON.stringify({map_id:mid})}); }
async function endCurrentMap(){
  if(!currentRoom || !state?.map)return;
  if(!confirm(`Encerrar o mapa "${state.map.name}" e abrir a próxima zona?`))return;
  try{
    const d=await api(`/rooms/${currentRoom}/map/end`,{method:'POST'});
    if(!d.ok){
      alert(d.message||'Não há próxima zona disponível.');
      return;
    }
    selectedNode=null;
    state=await api('/rooms/'+currentRoom);
    renderGame();
    alert(d.message||'Próxima zona aberta.');
  }catch(e){ alert(e.message); }
}

/* ===== Bastidores ===== */
async function renderStaffChat(){
  const box=qs('staffChat'); if(!box||!isStaff()||!currentRoom)return;
  try{
    const msgs=await api(`/rooms/${currentRoom}/staff-chat`);
    box.innerHTML=msgs.map(m=>`<div class="staffBubble"><b>${esc(m.username)}</b><br>${esc(m.text).replace(/\n/g,'<br>')}</div>`).join('');
  }catch(e){}
}
async function sendStaffChat(){
  const t=qs('staffText')?.value.trim(); if(!t)return;
  try{
    await api(`/rooms/${currentRoom}/staff-chat`,{method:'POST',body:JSON.stringify({text:t})});
    qs('staffText').value='';
    renderStaffChat();
  }catch(e){ alert(e.message); }
}

/* ===== IA ===== */
function showAIInnerTab(tab){
  aiInnerTab=tab||'ask';
  ['ask','functions','responses','config'].forEach(t=>{
    qs('aiPane'+t.charAt(0).toUpperCase()+t.slice(1))?.classList.toggle('on',t===aiInnerTab);
    const id=t==='ask'?'aiTabAsk':t==='functions'?'aiTabFunctions':t==='responses'?'aiTabResponses':'aiTabConfig';
    qs(id)?.classList.toggle('on',t===aiInnerTab);
  });
}
function trOpenAIResponses(){
  const panes=[...document.querySelectorAll('.tabPane')];
  const idx=panes.findIndex(x=>x.id==='localAIBox');
  if(idx>=0) openPanelTab(idx);
  showAIInnerTab('responses');
}
function aiMode(){ return qs('aiMode')?.value || 'short'; }
function hasActiveAI(kind){ return (state?.ai_jobs||[]).find(j=>['pending','processing'].includes(j.status) && (!kind || j.job_type===kind)); }
function labelJob(t){ return t==='summary'?'Resumo':t==='image_prompt'?'Prompt de imagem':t==='question'?'Narração':t==='location_event'?'Evento do local':'Narração'; }
async function requestAIAndShow(kind){ trOpenAIResponses(); return requestAI(kind); }
async function requestAI(kind){
  const active=hasActiveAI(kind);
  const st=qs('aiStatus');
  if(active){
    trOpenAIResponses();
    if(st){st.textContent=`Já existe o pedido #${active.id} (${labelJob(active.job_type)}) aguardando o worker. Processe, cancele ou limpe pendentes antes de criar outro.`; st.className='msg err';}
    return;
  }
  trOpenAIResponses();
  const action=qs('aiAction')?.value.trim()||'Continue a cena atual com tensão e escolhas.';
  if(st){st.textContent='Pedido rápido enviado para a IA local...'; st.className='msg';}
  try{
    const d=await api(`/rooms/${currentRoom}/ai/request`,{method:'POST',body:JSON.stringify({action,job_type:kind,response_mode:aiMode()})});
    if(st) st.textContent='Pedido #'+d.job.id+' aguardando o worker local.';
    if(kind==='narrative'&&qs('aiAction')) qs('aiAction').value='';
    setTimeout(async()=>{try{state=await api('/rooms/'+currentRoom);renderGame();trOpenAIResponses();}catch(e){}},900);
  }catch(e){ if(st){st.textContent=e.message; st.className='msg err';} }
}
function masterFunctionPrompt(type, detail){
  const where=selectedNode?`Local selecionado: ${selectedNode.name}. ${selectedNode.desc}.`:'';
  const extra=detail?`Detalhe da Mestre: ${detail}`:'Sem detalhe adicional.';
  const map={
    opening:'Crie uma abertura da sessão, com fala pronta para as participantes e uma primeira pergunta: "o que vocês fazem?".',
    tension:'Crie uma cena de tensão leve, segura e cinematográfica.',
    discovery:'Crie uma cena de descoberta com uma pista útil.',
    clue:'Crie uma pista sutil, sem entregar tudo.',
    scare:'Crie um susto leve, sem terror pesado.',
    consequence:'Crie uma consequência interessante para uma escolha arriscada.',
    npc:'Crie uma fala curta de NPC misterioso.',
    catchup:'Resuma rapidamente para uma jogadora que chegou atrasada.',
    ending:'Crie um encerramento de sessão com gancho.',
    improvise:'Ajude a improvisar quando as jogadoras fugirem do plano.',
    riddle:'Crie um enigma simples e apropriado para crianças/adolescentes.',
    reward:'Crie uma recompensa narrativa ou item simples.'
  };
  return `${map[type]||map.opening}\n${where}\n${extra}`;
}
function generateMasterFunction(){
  const type=qs('masterFunction')?.value||'opening';
  const detail=qs('masterFunctionDetail')?.value.trim()||'';
  qs('aiAction').value=masterFunctionPrompt(type,detail);
  requestAIAndShow('question');
}
function renderAIJobs(){
  const box=qs('aiJobs'); if(!box)return;
  const list=state?.ai_jobs||[];
  if(!list.length){ box.innerHTML='<p class="aiPending">Nenhuma resposta da IA ainda.</p>'; return; }
  const card=j=>{
    let body='';
    if(j.status==='done'){
      body=`<label>Texto final editável</label><textarea id="aiEdit_${j.id}" class="aiResult">${esc(j.result||'')}</textarea><div class="aiActions"><button type="button" class="btn small aiPublishBtn" data-job-id="${j.id}" data-target="chat">Chat geral</button><button type="button" class="btn small ghost aiPublishBtn" data-job-id="${j.id}" data-target="staff">Bastidores</button><button type="button" class="btn small ghost aiPublishBtn" data-job-id="${j.id}" data-target="notes">Diário</button><button type="button" class="btn small ghost aiPublishBtn" data-job-id="${j.id}" data-target="location">Descrição do local</button></div>`;
    }else if(j.status==='error'){
      body=`<div class="err">${esc(j.error||'Erro no worker local')}</div>`;
    }else{
      body=`<div class="aiPending">${j.status==='processing'?'Worker processando...':'Aguardando o worker local...'}</div><div class="aiActions"><button class="btn small danger" onclick="cancelAI(${j.id})">Cancelar pedido</button></div>`;
    }
    return `<div class="aiJob"><div class="aiJobTop"><span class="aiBadge">#${j.id}</span><b>${labelJob(j.job_type)}</b><span class="grow"></span><span class="pill">${j.status}</span></div>${body}</div>`;
  };
  const active=list.filter(j=>['pending','processing'].includes(j.status));
  const done=list.filter(j=>j.status==='done');
  const errors=list.filter(j=>j.status==='error');
  box.innerHTML=(active.length?'<h4>Pendentes / processando</h4>'+active.map(card).join(''):'')+(done.length?'<h4>Concluídos</h4>'+done.map(card).join(''):'')+(errors.length?'<h4>Erros / cancelados</h4>'+errors.map(card).join(''):'');
}
async function publishAI(id,target){
  const st=qs('aiStatus');
  try{
    if(st){st.textContent='Publicando resposta...';st.className='msg';}
    const edited=qs('aiEdit_'+id);
    const payload={target};
    if(edited) payload.text=edited.value;
    if(target==='location'){
      if(!selectedNode){
        alert('Selecione um local do mapa antes de usar como descrição do local.');
        if(st){st.textContent='Selecione um local do mapa antes.';st.className='msg err';}
        return;
      }
      payload.map_id=state.map.id;
      payload.location_id=selectedNode.id;
      payload.location_name=selectedNode.name;
    }
    await api(`/rooms/${currentRoom}/ai/jobs/${id}/publish`,{
      method:'POST',
      body:JSON.stringify(payload)
    });
    state=await api('/rooms/'+currentRoom);
    renderGame();
    trOpenAIResponses();
    const msg=target==='chat'
      ?'Resposta enviada ao chat geral.'
      :target==='staff'
        ?'Resposta enviada aos bastidores.'
        :target==='notes'
          ?'Resposta salva no diário.'
          :'Descrição do local atualizada.';
    if(qs('aiStatus')){qs('aiStatus').textContent=msg;qs('aiStatus').className='msg';}
  }catch(e){
    alert('Erro ao publicar resposta: '+e.message);
    if(st){st.textContent=e.message;st.className='msg err';}
  }
}
async function cancelAI(id){ await api(`/rooms/${currentRoom}/ai/jobs/${id}/cancel`,{method:'POST'}); state=await api('/rooms/'+currentRoom); renderGame(); trOpenAIResponses(); }
async function clearPendingAI(){ await api(`/rooms/${currentRoom}/ai/clear-pending`,{method:'POST'}); state=await api('/rooms/'+currentRoom); renderGame(); trOpenAIResponses(); }
async function clearDoneAI(){ await api(`/rooms/${currentRoom}/ai/clear-done`,{method:'POST'}); state=await api('/rooms/'+currentRoom); renderGame(); trOpenAIResponses(); }
async function updateWorkerStatus(){
  const el=qs('workerStatus'); if(!el)return;
  try{
    const s=await api('/ai/worker/status');
    el.className='workerStatus '+(s.online?'online':'offline');
    el.innerHTML=`<span class="dot"></span><b>Worker IA:</b> ${s.online?'online':'offline'}<br><b>Modelo:</b> ${esc(s.model||'-')}<br><b>Ollama:</b> ${esc(s.ollama_url||'-')}`;
  }catch(e){el.className='workerStatus offline';el.innerHTML='<span class="dot"></span><b>Worker IA:</b> não foi possível verificar.';}
}
function renderWorkerStatus(){
  const pane=qs('aiPaneConfig'); if(!pane)return;
  if(!qs('workerStatus')){
    const div=document.createElement('div'); div.id='workerStatus'; div.className='workerStatus offline';
    pane.prepend(div);
    const tools=document.createElement('div'); tools.className='row'; tools.style.marginTop='8px';
    tools.innerHTML='<button class="btn small ghost" onclick="testLocalWorker()">Testar IA local</button><button class="btn small ghost" onclick="clearPendingAI()">Limpar pendentes</button><button class="btn small ghost" onclick="clearDoneAI()">Limpar concluídos</button>';
    pane.appendChild(tools);
  }
  updateWorkerStatus();
}
async function testLocalWorker(){ if(qs('aiAction'))qs('aiAction').value='Teste rápido: responda apenas "IA local conectada".'; await requestAIAndShow('summary'); setTimeout(updateWorkerStatus,1200); }


/* ===== v9.3.1 hotfix: botões da IA por listener global ===== */
document.addEventListener('click', function(ev){
  const btn = ev.target.closest('.aiPublishBtn');
  if(!btn) return;
  ev.preventDefault();
  ev.stopPropagation();
  const id = Number(btn.dataset.jobId);
  const target = btn.dataset.target;
  if(id && target) publishAI(id, target);
});

Object.assign(window, {
  publishAI,
  cancelAI,
  clearPendingAI,
  clearDoneAI,
  requestAI,
  requestAIAndShow,
  showAIInnerTab,
  openPanelTab,
  endCurrentMap,
  saveRoomVisibility,
  setRoomVisibilityChoice,
  startSessionNow,
  joinPublicRoom,
  toggleCreatePublicOptions,
  toggleCreateStartAt,
  toggleRoomStartControls,
  toggleRoomStartAt,
  securityAction,
  generateLocalEvent,
  narrateSelectedNode,
  imagePromptSelectedNode,
  noteSelectedNode
});


function refreshCountdowns(){
  document.querySelectorAll('.countdown').forEach(el=>{ el.textContent=sessionStatusText(el.dataset.start||''); });
}

setInterval(()=>{ refreshCountdowns(); },1000);
setInterval(()=>{ if(currentRoom&&isStaff()) updateWorkerStatus(); },5000);
boot();
