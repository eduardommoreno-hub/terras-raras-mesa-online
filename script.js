/* Terras Raras — Mesa Online
   v17.3 — Auditoria final da campanha e consolidação visual inicial.
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
let myAdventureCards = [];
let sentAdventureCards = [];
let currentAdventureCardId = null;
let masterEventsCache = [];
let allAdventureCards = [];
let adventureDiaryTimeline = [];
let adventureDiaryDraft = null;

function qs(id){ return document.getElementById(id); }
function isMountainMap(map){
  const id=String(map?.id||'').toLowerCase();
  const name=String(map?.name||'').toLowerCase();
  return id==='montanhas_arcaicas' || name.includes('montanhas arcaicas');
}
function isIceMap(map){
  const id=String(map?.id||'').toLowerCase();
  const name=String(map?.name||'').toLowerCase();
  return id==='gelo_eterno' || name.includes('gelo eterno');
}
function isAlexandriaMap(map){
  const id=String(map?.id||'').toLowerCase();
  const name=String(map?.name||'').toLowerCase();
  return id==='alexandria' || name.includes('alexandria');
}
function isStormMap(map){
  const id=String(map?.id||'').toLowerCase();
  const name=String(map?.name||'').toLowerCase();
  return id==='tempestade_deuses' || name.includes('tempestade dos deuses');
}
function isRaceMap(map){
  const id=String(map?.id||'').toLowerCase();
  const name=String(map?.name||'').toLowerCase();
  return id==='correr_ou_morrer' || name.includes('correr ou morrer');
}
function isVoidMap(map){
  const id=String(map?.id||'').toLowerCase();
  const name=String(map?.name||'').toLowerCase();
  return id==='o_vazio' || name.includes('o vazio');
}
function zoneNumberForMap(map){
  if(isMountainMap(map)) return 4;
  if(isIceMap(map)) return 5;
  if(isAlexandriaMap(map)) return 6;
  if(isStormMap(map)) return 7;
  if(isRaceMap(map)) return 8;
  if(isVoidMap(map)) return 9;
  return map?.zone_number||0;
}
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
    const el=qs('pending');
    if(el){
      el.innerHTML=`<div class="row" style="margin-bottom:8px"><button class="btn small" onclick="loadPending()">Atualizar cadastros</button><button class="btn small ghost" onclick="approveByName()">Autorizar por nome</button></div>` +
        (p.length?p.map(u=>`<div class="pending"><div class="grow"><b>${esc(u.username)}</b><br><span style="color:var(--muted);font-size:12px">aguardando autorização${u.created_at?' · '+new Date(u.created_at).toLocaleString():''}</span></div><button class="btn small" onclick="approve(${u.id})">Autorizar</button></div>`).join(''):'<p style="color:var(--muted)">Nenhum cadastro pendente. Clique em “Atualizar cadastros” depois que a jogadora terminar o cadastro.</p>');
    }
    await loadAdminUsers();
  }catch(e){
    const el=qs('pending');
    if(el) el.innerHTML=`<p class="err">Não consegui carregar cadastros pendentes: ${esc(e.message||e)}</p>`;
  }
}

async function loadAdminUsers(){
  const box=qs('adminUsersBox');
  if(!box) return;
  try{
    const users=await api('/admin/users');
    box.innerHTML=users.length?users.map(u=>`<div class="pending"><div class="grow"><b>${esc(u.username)}</b><br><span style="color:var(--muted);font-size:12px">${u.is_admin?'admin':(u.approved?'autorizada':'pendente')}${u.created_at?' · '+new Date(u.created_at).toLocaleString():''}</span></div>${(!u.approved&&!u.is_admin)?`<button class="btn small" onclick="approve(${u.id})">Autorizar</button>`:''}</div>`).join(''):'<p style="color:var(--muted)">Nenhum usuário encontrado.</p>';
  }catch(e){ box.innerHTML=`<p class="err">Não consegui carregar usuários: ${esc(e.message||e)}</p>`; }
}

async function approveByName(){
  const name=(prompt('Digite o nome de usuária exatamente como ela cadastrou:')||'').trim().toLowerCase();
  if(!name) return;
  try{ await api('/admin/approve-username/'+encodeURIComponent(name),{method:'POST'}); alert('Usuária autorizada: '+name); loadPending(); }
  catch(e){ alert(e.message||e); }
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
const CANDY_V10 = {
  nodes:[
    {id:'portao',name:'Portão Açucarado',x:10,y:72,type:'normal',desc:'Grades altas parecem feitas de açúcar antigo. O cheiro de baunilha é doce demais, e as barras cantam baixinho quando alguém toca nelas.',event:'As grades cantam uma rima com o nome de uma personagem e se abrem só o suficiente para o grupo passar junto.',clue:'No chão há pegadas de açúcar indo para a Esteira das Balas Perdidas.',secret:'O portão reconhece intenção: ele abre melhor quando o grupo decide entrar sem abandonar ninguém.',choices:'Tocar as grades; entrar de mãos dadas; procurar outro portão; perguntar à fábrica quem está ali.'},
    {id:'esteira',name:'Esteira das Balas Perdidas',x:25,y:62,type:'normal',desc:'Balas coloridas correm em esteiras que giram sem parar. Uma bala azul parece insistir em levar o grupo para uma direção errada.',event:'Uma bala pula para fora da esteira e tenta guiar as jogadoras por um atalho falso.',clue:'A bala azul tem carimbo da Sala dos Sabores Proibidos.',secret:'A esteira repete rotas antigas da fábrica; ela não mente por maldade, só segue ordens antigas.',choices:'Seguir a bala azul; parar a esteira; observar o padrão; pegar uma bala marcada.'},
    {id:'chocolate',name:'Tanque de Chocolate Escuro',x:38,y:72,type:'secret',desc:'Um tanque imenso de chocolate escuro borbulha devagar. O reflexo mostra coisas que não estão no lugar certo.',event:'O reflexo mostra a Confeiteira sozinha no topo da fábrica, como se esperasse alguém há muito tempo.',clue:'No chocolate aparece a frase: “Nem todo monstro sabe que está assustando.”',secret:'Este é o primeiro sinal de que a Confeiteira não é vilã; ela está presa a uma função antiga.',choices:'Olhar em silêncio; mexer o chocolate; jogar uma bala no tanque; copiar a frase refletida.'},
    {id:'moldes',name:'Câmara dos Moldes de Açúcar',x:34,y:47,type:'hidden',desc:'Prateleiras guardam moldes de bonecos de açúcar. Um deles lembra uma das personagens, mas está incompleto e sem rosto.',event:'Um molde se move sozinho e abre espaço para uma pequena chave de açúcar.',clue:'A chave tem gosto amargo e o símbolo de um doce chamado Mentira Amarga.',secret:'Os moldes não são pessoas presas; são tentativas antigas da fábrica de copiar alegria, sem entender sentimentos verdadeiros.',choices:'Pegar a chave; quebrar o molde; perguntar por que ele não tem rosto; deixar tudo como está.'},
    {id:'tunel',name:'Túnel Colorido das Memórias',x:48,y:38,type:'hidden',desc:'Paredes coloridas cantam músicas quase conhecidas. A saída parece mudar conforme o que cada personagem pensa.',event:'Cada personagem ouve uma lembrança de sua própria aventura, mas uma frase está trocada.',clue:'A frase trocada é: “alegria fabricada não abre portal”.',secret:'O túnel confunde memória para testar se o grupo percebe o que é verdadeiro e o que foi inventado.',choices:'Andar em silêncio; cantar junto; fechar os olhos; seguir a lembrança mais verdadeira.'},
    {id:'sabores',name:'Sala dos Sabores Proibidos',x:60,y:51,type:'danger',desc:'Prateleiras guardam doces com rótulos estranhos: Coragem Emprestada, Saudade Doce, Segredo Guardado e Mentira Amarga.',event:'O doce Mentira Amarga racha quando alguém tenta esconder a verdade da personagem.',clue:'Se uma personagem diz uma verdade segura sobre si mesma, o papel do doce revela: “A Confeiteira não aprisiona crianças. Ela aprisiona sentimentos esquecidos.”',secret:'A Mentira Amarga é a peça central da zona. Ela prova que a fábrica ficou doente tentando criar alegria falsa.',choices:'Tocar a Mentira Amarga; guardar o doce; misturar com Coragem Emprestada; levar o rótulo para a Confeiteira.'},
    {id:'forno',name:'Forno dos Biscoitos Falantes',x:73,y:65,type:'danger',desc:'Um forno enorme solta fumaça em formato de rostos sorridentes. Os biscoitos assam sozinhos e fazem perguntas em charadas.',event:'Um biscoito pergunta: “O que fica mais leve quando é dividido, mas mais pesado quando é escondido?”',clue:'Resposta sugerida: “um segredo”. Ao acertar, surge uma seta para o Depósito Esquecido.',secret:'O forno testa honestidade sem expor ninguém; qualquer resposta sincera pode funcionar se fizer sentido.',choices:'Responder à charada; esperar outro biscoito falar; apagar parte do fogo; levar um biscoito como pista.'},
    {id:'deposito',name:'Depósito Esquecido',x:82,y:48,type:'ruins',desc:'Caixas antigas têm nomes de cidades que não existem. Uma caixa range toda vez que alguém mente ou exagera.',event:'Uma caixa com o nome “Cidade do Quase” se abre sozinha e mostra engrenagens cobertas de açúcar.',clue:'As engrenagens pertencem à Sala dos Mecanismos.',secret:'A caixa reage à mentira porque foi feita com o mesmo açúcar da Mentira Amarga.',choices:'Abrir caixas; falar apenas verdades da personagem; pegar as engrenagens; procurar etiquetas repetidas.'},
    {id:'jardim',name:'Jardim de Açúcar Vivo',x:69,y:30,type:'secret',desc:'Flores de caramelo crescem em vasos brilhantes. Abelhas de mel vivo voam em círculos, protegendo uma flor que nunca foi colhida.',event:'A flor central se inclina para quem carrega a Mentira Amarga.',clue:'A Flor Nunca Colhida pode adoçar a Mentira Amarga sem apagar a verdade.',secret:'A flor simboliza alegria verdadeira: ela não força ninguém a sorrir, só torna a verdade suportável.',choices:'Colher a flor com cuidado; pedir licença às abelhas; observar o mel; levar a flor para a Confeiteira.'},
    {id:'mecanismos',name:'Sala dos Mecanismos',x:83,y:28,type:'danger',desc:'Engrenagens gigantes fazem a fábrica respirar. No centro há um coração mecânico batendo em ritmo errado.',event:'Uma engrenagem trava e a fábrica inteira soluça como se estivesse triste.',clue:'O coração não precisa ser destruído; precisa lembrar para que foi criado.',secret:'Desligar tudo resolve rápido, mas consertar o coração libera uma saída mais bonita e muda a reação da Confeiteira.',choices:'Desligar uma engrenagem; consertar com as peças do Depósito; usar a Flor Nunca Colhida; chamar a Confeiteira.'},
    {id:'torre',name:'Torre de Observação',x:56,y:20,type:'hidden',desc:'Do alto, dá para ver a fábrica inteira. Por um segundo, também parece que alguém olha de volta do outro lado do vidro.',event:'No vidro aparece uma silhueta com chapéu de confeiteira, mas ela levanta a mão como quem pede calma.',clue:'A silhueta aponta para a Câmara da Confeiteira, não para uma armadilha.',secret:'A Confeiteira quer ser encontrada, mas teme que o grupo tente destruí-la.',choices:'Acenar de volta; observar o mapa; descer em silêncio; deixar uma mensagem no vidro.'},
    {id:'confeiteira',name:'Câmara da Confeiteira',x:47,y:18,type:'ruins',desc:'Uma sala circular cheia de receitas antigas. No centro, a Confeiteira espera sentada, cansada, com olhos de glacê brilhando.',event:'A Confeiteira pergunta: “Vocês vieram desligar minha fábrica ou me ensinar o que eu esqueci?”',clue:'Ela aceita ouvir se o grupo trouxer a Mentira Amarga adoçada pela Flor Nunca Colhida ou uma verdade dita com coragem.',secret:'Ela foi criada para fabricar alegria, mas esqueceu que alegria não nasce de mentira, medo ou aparência.',choices:'Negociar; oferecer a Mentira Amarga; mostrar a flor; prometer não destruir; pedir passagem.'},
    {id:'portal',name:'Portal de Caramelo',x:91,y:16,type:'portal',desc:'Um arco de caramelo endurecido bloqueia a saída. Ele só amolece quando a Confeiteira aceita que o grupo passou com intenção boa.',event:'O caramelo derrete em fios dourados e forma uma ponte para a próxima zona.',clue:'O portal abre quando a Mestre marcar a liberação depois da conversa com a Confeiteira.',secret:'A melhor resolução é convencer ou libertar a Confeiteira, não vencer uma batalha.',choices:'Tocar o arco; esperar o caramelo amolecer; agradecer à Confeiteira; atravessar juntas.'}
  ],
  links:[['portao','esteira'],['esteira','chocolate'],['esteira','moldes'],['moldes','tunel'],['tunel','sabores'],['sabores','forno'],['forno','deposito'],['deposito','mecanismos'],['sabores','jardim'],['jardim','mecanismos'],['jardim','torre'],['torre','confeiteira'],['mecanismos','confeiteira'],['confeiteira','portal']]
};

const CITY_V11 = {
  nodes:[
    {id:'entrada',name:'Entrada da Cidade',x:9,y:72,type:'normal',desc:'Um arco de pedra marca a chegada. Acima dele, um relógio sem ponteiros mostra uma sombra parada no lugar exato onde algo foi esquecido.',event:'Quando o grupo passa pelo arco, todos ouvem um tique-taque único, mas nenhum relógio se move.',clue:'No chão há marcas apontando para a Praça dos Ponteiros.',secret:'A cidade não está morta; ela está segurando a respiração desde o Minuto Perdido.',choices:'Entrar juntas; observar o arco; procurar marcas no chão; chamar por alguém.'},
    {id:'praca',name:'Praça dos Ponteiros',x:22,y:58,type:'normal',desc:'A praça central é coberta por ponteiros soltos. Alguns parecem pequenos galhos de metal, outros vibram quando alguém chega perto.',event:'Um ponteiro quebrado gira sozinho e aponta para uma janela acesa na Rua das Janelas Acesas.',clue:'Todos os ponteiros param em 03:17.',secret:'03:17 é o minuto apagado. Ninguém na cidade consegue dizer o que aconteceu nele.',choices:'Pegar o ponteiro; alinhar os ponteiros; seguir a direção indicada; perguntar por que todos param em 03:17.'},
    {id:'janelas',name:'Rua das Janelas Acesas',x:35,y:68,type:'hidden',desc:'Casas silenciosas têm janelas acesas, mas nenhuma silhueta aparece por dentro. As luzes piscam como se respondessem a perguntas.',event:'Uma janela desenha no vidro a frase: “o minuto não sumiu; ele foi escondido”.',clue:'A luz aponta para a Estação Sem Trem.',secret:'As janelas guardam lembranças de moradores que não conseguem terminar o pensamento.',choices:'Bater em uma porta; seguir a luz; copiar a frase; apagar e acender uma janela.'},
    {id:'estacao',name:'Estação Sem Trem',x:52,y:76,type:'ruins',desc:'A plataforma está vazia. O painel de horários mostra partidas impossíveis: ontem, amanhã, nunca e 03:17.',event:'Um apito sem trem atravessa a estação, mas o som vem um segundo atrasado.',clue:'Há um bilhete incompleto com destino “Portal do Amanhã”.',secret:'O trem não desapareceu; ele está preso no intervalo entre dois segundos.',choices:'Guardar o bilhete; esperar o trem; seguir os trilhos; perguntar ao painel o que falta.'},
    {id:'torre',name:'Torre do Relógio Central',x:48,y:45,type:'danger',desc:'A torre domina a cidade. O relógio central é enorme, rachado, e seus números estão fora de ordem.',event:'A torre treme e todos os relógios da cidade tentam andar por um segundo.',clue:'No mostrador existe um espaço vazio entre 03:16 e 03:18.',secret:'A torre sabe onde o Minuto Perdido foi escondido, mas só responde a lembranças recuperadas.',choices:'Subir a torre; tocar o vidro; reorganizar os números; ouvir o silêncio entre os segundos.'},
    {id:'mercado',name:'Mercado das Horas',x:66,y:63,type:'secret',desc:'Barracas antigas vendem ampulhetas, calendários, sinos pequenos e relógios que contam memórias em vez de tempo.',event:'Um vendedor invisível deixa uma ampulheta com areia parada em cima do balcão.',clue:'A etiqueta diz: “a lembrança pesa quando ninguém quer carregá-la”.',secret:'O mercado oferece ferramentas para lembrar, mas nunca entrega respostas prontas.',choices:'Pegar a ampulheta; virar a ampulheta; deixar uma lembrança em troca; procurar a Chave do Relojoeiro.'},
    {id:'escola',name:'Escola do Sino Mudo',x:76,y:47,type:'hidden',desc:'A escola está intacta. No pátio, um sino balança sem fazer som. As carteiras têm nomes riscados e uma lição interrompida.',event:'O sino balança três vezes, mas só uma personagem sente o som no peito.',clue:'No quadro está escrito: “ninguém esquece sozinho”.',secret:'O Sino Mudo só toca quando o grupo decide lembrar junto, sem culpar ninguém.',choices:'Balançar o sino; ler o quadro; procurar cadernos; dizer uma lembrança boa em voz alta.'},
    {id:'fonte',name:'Fonte do Minuto Perdido',x:58,y:31,type:'danger',desc:'A fonte não jorra água. Ela derrama pequenos reflexos de cenas incompletas: uma mão soltando outra, uma porta fechando, um relógio caindo.',event:'A água parada mostra a cidade inteira no instante de 03:17.',clue:'Uma imagem revela a Oficina do Relojoeiro aberta.',secret:'A fonte não acusa; ela mostra que o minuto foi escondido para evitar tristeza.',choices:'Olhar o reflexo; tocar a água; perguntar o que aconteceu; seguir a imagem da oficina.'},
    {id:'oficina',name:'Oficina do Relojoeiro',x:74,y:28,type:'secret',desc:'Engrenagens cobrem paredes e mesas. Ferramentas antigas estão organizadas ao redor de um relógio desmontado.',event:'Uma chave pequena gira sozinha dentro de uma gaveta trancada.',clue:'A Chave do Relojoeiro tem a marca 03:17.',secret:'O Relojoeiro tentou proteger a cidade apagando o minuto, mas prendeu todos no esquecimento.',choices:'Abrir a gaveta; consertar o relógio; procurar o diário do Relojoeiro; levar a chave à torre.'},
    {id:'biblioteca',name:'Biblioteca dos Calendários',x:39,y:24,type:'normal',desc:'Prateleiras guardam calendários de anos que ainda não chegaram. Algumas páginas têm dias repetidos.',event:'Um calendário abre sozinho na página do dia em que os relógios pararam.',clue:'A margem diz: “a última lembrança mora onde ninguém quer voltar”.',secret:'A biblioteca liga o Minuto Perdido à Casa da Última Lembrança.',choices:'Ler a página; arrancar a data; copiar a frase; procurar mapas da cidade.'},
    {id:'beco',name:'Beco dos Ecos',x:23,y:33,type:'hidden',desc:'As paredes repetem frases ditas antes das jogadoras chegarem. Algumas vozes parecem jovens; outras parecem da própria cidade.',event:'Um eco diz: “não foi culpa sua” e depois desaparece.',clue:'O eco aponta para a Casa da Última Lembrança.',secret:'O beco guarda o medo de lembrar, não uma ameaça real.',choices:'Responder ao eco; ficar em silêncio; seguir a voz; pedir que o beco repita a frase.'},
    {id:'casa',name:'Casa da Última Lembrança',x:15,y:18,type:'danger',desc:'A casa tem uma porta azul e uma maçaneta fria. Dentro, cada cômodo mostra um pedaço de uma lembrança que a cidade preferiu esquecer.',event:'A lembrança se completa: alguém tentou impedir uma despedida e o relógio caiu exatamente às 03:17.',clue:'Para libertar o minuto, é preciso aceitar que lembrar também pode curar.',secret:'O objetivo não é achar culpados; é devolver à cidade a coragem de seguir.',choices:'Abrir a porta azul; juntar os pedaços da lembrança; perdoar a cidade; levar a lembrança para a torre.'},
    {id:'portal',name:'Portal do Amanhã',x:89,y:18,type:'portal',desc:'Um arco luminoso feito de números, ponteiros e folhas de calendário. Ele pulsa devagar, esperando que o tempo volte a andar.',event:'Quando o Minuto Perdido é libertado, os ponteiros giram e o portal se abre sem pressa.',clue:'O portal só reconhece uma cidade que aceita o próprio passado.',secret:'O portal é a saída para a próxima zona e também o primeiro relógio que volta a funcionar.',choices:'Atravessar juntas; agradecer à cidade; guardar o Ponteiro Quebrado; olhar para trás uma última vez.'}
  ],
  links:[['entrada','praca'],['praca','janelas'],['janelas','estacao'],['praca','torre'],['torre','mercado'],['mercado','escola'],['torre','fonte'],['fonte','oficina'],['fonte','biblioteca'],['biblioteca','beco'],['beco','casa'],['oficina','portal'],['casa','portal']]
};

const MOUNTAIN_V12 = {
  nodes:[
    {id:'passagem',name:'Passagem dos Ventos Antigos',x:9,y:74,type:'normal',desc:'Um corredor natural entre paredões altos. O vento passa como se contasse uma história antiga em uma língua feita de assobios.',event:'Uma rajada desenha no pó o contorno de uma grande pata, depois apaga tudo devagar.',clue:'As marcas do vento apontam para a Ponte de Pedra Suspensa.',secret:'O vento não quer assustar; ele tenta avisar que a montanha protege algo vivo.',choices:'Escutar o vento; seguir as marcas; caminhar em grupo; marcar a entrada.'},
    {id:'ponte',name:'Ponte de Pedra Suspensa',x:22,y:61,type:'danger',desc:'Uma ponte estreita liga dois picos. Lá embaixo, nuvens escondem o fundo, e cristais pequenos vibram nas bordas.',event:'A ponte vibra quando alguém pisa com pressa, mas se acalma quando o grupo atravessa no mesmo ritmo.',clue:'Um cristal solto guarda o som de um rugido distante.',secret:'A ponte responde à cooperação, não à coragem individual.',choices:'Atravessar juntas; amarrar uma corda; escutar os cristais; procurar caminho mais baixo.'},
    {id:'fosseis',name:'Caverna dos Fósseis Luminosos',x:35,y:72,type:'secret',desc:'O interior da caverna brilha em azul suave. Fósseis presos nas paredes parecem formar constelações de criaturas que viveram antes dos mapas.',event:'Um fóssil de asa acende quando uma personagem se aproxima e projeta uma sombra de pterodáctilo no teto.',clue:'Os fósseis apontam para o Vale das Pegadas Gigantes.',secret:'Os fósseis não são troféus: são memórias da montanha.',choices:'Copiar os desenhos; tocar o fóssil aceso; seguir a direção da sombra; perguntar à caverna o que ela lembra.'},
    {id:'pegadas',name:'Vale das Pegadas Gigantes',x:47,y:62,type:'normal',desc:'O vale é largo e silencioso. Pegadas enormes atravessam o chão úmido, mas nenhuma delas parece recente ou antiga: parecem existir fora do tempo comum.',event:'Uma pegada se enche de luz e mostra uma cena: uma criatura grande protegendo algo pequeno durante uma tempestade.',clue:'A criatura não atacava; ela guardava o caminho para o Santuário do Coração de Pedra.',secret:'A guardiã arcaica foi confundida com ameaça porque era grande demais para ser compreendida.',choices:'Entrar em uma pegada; seguir o rastro; desenhar o formato; procurar sinais de filhotes ou ninhos.'},
    {id:'ninho',name:'Ninho do Pterodáctilo Azul',x:61,y:76,type:'hidden',desc:'No alto de uma rocha inclinada há um ninho de galhos brancos e penas azuis. O céu parece mais perto aqui.',event:'Uma pena azul cai devagar e não toca o chão até alguém fazer uma pergunta gentil.',clue:'A pena vibra na mesma nota dos cristais sonoros.',secret:'O pterodáctilo azul observa o grupo como mensageiro da montanha, não como inimigo.',choices:'Guardar a pena; chamar pelo pterodáctilo; observar o céu; deixar um sinal de respeito.'},
    {id:'lago',name:'Lago Congelado das Imagens',x:72,y:60,type:'secret',desc:'Um lago raso, coberto por gelo transparente, reflete cenas que talvez tenham acontecido há milhares de anos.',event:'No gelo aparece uma criança antiga oferecendo uma pedra brilhante a uma criatura enorme.',clue:'A pedra brilhante tem o formato do Coração de Pedra.',secret:'O medo antigo nasceu quando as pessoas esqueceram o pacto de proteção.',choices:'Olhar sem pisar; tocar o gelo; desenhar a cena; seguir para as ruínas.'},
    {id:'ruinas',name:'Ruínas do Povo da Montanha',x:60,y:43,type:'ruins',desc:'Casas baixas de pedra cercam uma praça quebrada. Símbolos de asas, pegadas e cristais aparecem em todas as paredes.',event:'Uma parede solta poeira e revela a frase: “o grande guardião escuta a canção da pedra”.',clue:'A Canção da Pedra pode estar na Mina dos Cristais Sonoros.',secret:'O povo da montanha não foi destruído pela guardiã; ele partiu depois de esquecer como falar com ela.',choices:'Ler os símbolos; procurar instrumentos; seguir para a mina; reconstruir a frase.'},
    {id:'mina',name:'Mina dos Cristais Sonoros',x:75,y:38,type:'hidden',desc:'Cristais crescem como sinos presos ao chão. Cada passo cria uma nota baixa, e algumas notas parecem responder umas às outras.',event:'Três cristais tocam sozinhos e formam uma pequena melodia calma.',clue:'A melodia é a Canção dos Cristais, capaz de acalmar o rugido.',secret:'A música não controla a guardiã; apenas mostra que o grupo veio para entender.',choices:'Repetir a melodia; escolher três cristais; guardar o som em uma carta; levar a canção à Garganta do Rugido.'},
    {id:'garganta',name:'Garganta do Rugido',x:86,y:49,type:'danger',desc:'Uma fenda imensa corta a montanha. De dentro dela vem um rugido grave, mais triste do que furioso.',event:'O rugido faz pequenas pedras flutuarem por um segundo e depois cair sem machucar ninguém.',clue:'O rugido acompanha o ritmo da Canção dos Cristais.',secret:'A guardiã está presa embaixo da pedra, tentando proteger o coração da montanha.',choices:'Responder com a canção; chamar pela guardiã; procurar uma descida segura; voltar para buscar ajuda.'},
    {id:'abrigo',name:'Abrigo dos Exploradores Perdidos',x:44,y:37,type:'normal',desc:'Um abrigo de madeira velha guarda mochilas antigas, mapas incompletos e anotações de exploradores que desistiram antes de entender a montanha.',event:'Um mapa rasgado mostra uma escadaria que sobe até as nuvens.',clue:'Os exploradores escreveram: “não era monstro; era aviso”.',secret:'Os exploradores fugiram por medo e espalharam a lenda errada.',choices:'Ler os diários; juntar o mapa; levar a frase; seguir para a escadaria.'},
    {id:'escadaria',name:'Escadaria até as Nuvens',x:31,y:25,type:'ruins',desc:'Degraus de pedra sobem em zigue-zague até uma plataforma coberta por nuvens claras. Cada degrau tem um símbolo diferente.',event:'Os símbolos brilham apenas quando as jogadoras sobem sem deixar ninguém para trás.',clue:'No último degrau está o símbolo do Santuário do Coração de Pedra.',secret:'A escadaria testa paciência e união.',choices:'Subir juntas; decifrar símbolos; esperar quem ficou atrás; cantar a melodia dos cristais.'},
    {id:'santuario',name:'Santuário do Coração de Pedra',x:52,y:16,type:'secret',desc:'Um círculo de pedras gigantes cerca um cristal escuro e pulsante. O chão vibra como batimento cardíaco lento.',event:'O Coração de Pedra pulsa quando a pena azul, a canção dos cristais e a lembrança das pegadas se aproximam.',clue:'A guardiã só precisa ser reconhecida como protetora para o caminho se abrir.',secret:'Este é o centro emocional do mapa: compreender antes de vencer.',choices:'Tocar o coração; cantar a canção; chamar a guardiã de protetora; pedir passagem.'},
    {id:'portal',name:'Portal de Pedra Viva',x:89,y:18,type:'portal',desc:'Duas rochas antigas se inclinam uma para a outra, formando um arco vivo. Musgo luminoso desenha asas e pegadas em volta da passagem.',event:'Quando o Coração de Pedra desperta, o arco respira fundo e se abre para a próxima zona.',clue:'O portal reconhece quem atravessa com respeito pela montanha.',secret:'A saída aparece quando a Mestre marcar a liberação do portal.',choices:'Atravessar juntas; agradecer à guardiã; guardar a pena azul; olhar uma última vez para as montanhas.'}
  ],
  links:[['passagem','ponte'],['ponte','fosseis'],['fosseis','pegadas'],['pegadas','ninho'],['pegadas','lago'],['lago','ruinas'],['ruinas','mina'],['mina','garganta'],['ruinas','abrigo'],['abrigo','escadaria'],['escadaria','santuario'],['garganta','santuario'],['santuario','portal'],['ninho','portal']]
};

const ICE_V13 = {
  nodes:[
    {id:'portao',name:'Portão da Neve Silenciosa',x:8,y:70,type:'normal',desc:'Um arco de gelo azul marca a entrada da zona. A neve cai sem som, como se o mundo inteiro esperasse uma música começar.',event:'Quando o grupo atravessa, os flocos param no ar por um segundo e formam pequenas notas musicais.',clue:'As notas apontam para o Lago dos Reflexos Congelados.',secret:'O silêncio da entrada não é ameaça; é respeito pela Canção Congelada.',choices:'Entrar juntas; observar os flocos; cantar baixinho; seguir as notas.'},
    {id:'lago',name:'Lago dos Reflexos Congelados',x:20,y:58,type:'secret',desc:'Um lago transparente reflete as personagens, mas os reflexos parecem lembrar coisas que elas ainda não descobriram.',event:'Um reflexo levanta a mão antes da personagem real e aponta para a floresta de cristal.',clue:'No gelo aparece o desenho de três pinheiros e uma clave musical.',secret:'O lago mostra possibilidades, não destino fixo.',choices:'Perguntar ao reflexo; desenhar o símbolo; tocar o gelo; seguir para os pinheiros.'},
    {id:'pinheiros',name:'Floresta dos Pinheiros de Cristal',x:35,y:69,type:'hidden',desc:'Pinheiros transparentes tilintam quando o vento passa. Cada galho parece uma pequena harpa congelada.',event:'Três árvores tocam notas diferentes, mas uma delas treme como se faltasse coragem.',clue:'A nota mais baixa aponta para a Caverna do Sopro Azul.',secret:'A floresta ensina que a canção só funciona quando ninguém tenta tocar sozinha.',choices:'Repetir as notas; tocar juntas; guardar uma agulha de cristal; seguir o som baixo.'},
    {id:'caverna',name:'Caverna do Sopro Azul',x:49,y:60,type:'normal',desc:'Uma caverna azul respira devagar. O ar sai em nuvens brilhantes, formando palavras que desaparecem antes de serem lidas.',event:'O sopro escreve no ar: “o gelo protege o que ainda pode cantar”.',clue:'A frase indica que a Vila Soterrada não foi abandonada sem motivo.',secret:'O frio guarda uma memória frágil para que ela não quebre.',choices:'Entrar na caverna; seguir a respiração; copiar a frase; perguntar o que está sendo protegido.'},
    {id:'ponte',name:'Ponte de Gelo Fino',x:62,y:74,type:'danger',desc:'Uma ponte quase transparente atravessa uma fenda clara. Ela parece frágil, mas brilha quando o grupo anda com paciência.',event:'A ponte estala quando alguém corre, mas fica firme quando as personagens dão as mãos ou combinam o ritmo.',clue:'No centro da ponte há marcas apontando para a Vila Soterrada pela Neve.',secret:'A ponte não mede força; mede cuidado.',choices:'Atravessar devagar; amarrar uma corda; cantar o ritmo dos passos; procurar outra passagem.'},
    {id:'vila',name:'Vila Soterrada pela Neve',x:73,y:60,type:'ruins',desc:'Telhados aparecem por baixo da neve. Lanternas apagadas pendem nas portas, e uma praça pequena guarda bancos quase cobertos.',event:'Uma lanterna se acende sozinha e projeta a sombra de pessoas cantando em roda.',clue:'A sombra aponta para a Torre da Aurora Fria.',secret:'A vila não foi destruída: seus moradores adormeceram a própria canção para protegê-la.',choices:'Acender as lanternas; escavar com cuidado; ouvir a praça; seguir a sombra.'},
    {id:'torre',name:'Torre da Aurora Fria',x:65,y:42,type:'secret',desc:'Uma torre fina se ergue no gelo. No topo, luzes de aurora se movem como fitas coloridas presas ao céu.',event:'As luzes descem por um instante e mostram cinco cores, mas uma delas está apagada.',clue:'A cor apagada corresponde à nota perdida da Canção Congelada.',secret:'A torre guarda a ordem da canção, mas não pode cantar sozinha.',choices:'Subir a torre; contar as cores; chamar a aurora; anotar a cor apagada.'},
    {id:'pegadas',name:'Campo das Pegadas Brancas',x:82,y:47,type:'hidden',desc:'Pegadas brancas atravessam a neve, quase invisíveis. Algumas são pequenas, outras enormes, mas todas seguem em curvas gentis.',event:'As pegadas formam um círculo e param diante de uma gruta escondida.',clue:'O círculo é igual ao símbolo dos Sinos de Gelo.',secret:'Uma criatura de neve guiou viajantes perdidos sem ser vista.',choices:'Seguir as pegadas; agradecer à presença invisível; entrar no círculo; procurar a gruta.'},
    {id:'sinos',name:'Gruta dos Sinos de Gelo',x:86,y:30,type:'secret',desc:'Sinos de gelo pendem do teto. Eles não se mexem, mas cada um parece guardar uma voz antiga.',event:'Um sino toca sem movimento quando alguém decide escutar antes de perguntar.',clue:'O som revela uma nota que falta na Câmara da Canção Congelada.',secret:'Os sinos guardam vozes de quem teve medo de esquecer.',choices:'Ouvir em silêncio; tocar um sino; repetir a nota; levar o som para a câmara.'},
    {id:'jardim',name:'Jardim das Estátuas de Neve',x:52,y:36,type:'normal',desc:'Estátuas de neve representam pessoas sorrindo, dançando e segurando instrumentos. Nenhuma parece triste; apenas interrompida.',event:'Uma estátua move levemente os dedos, como se estivesse esperando a próxima nota da música.',clue:'O instrumento da estátua aponta para o Palácio do Inverno Antigo.',secret:'As estátuas são lembranças preservadas, não pessoas presas.',choices:'Limpar a neve; imitar o gesto; tocar música; seguir o instrumento apontado.'},
    {id:'palacio',name:'Palácio do Inverno Antigo',x:36,y:26,type:'ruins',desc:'Um palácio de gelo antigo guarda salões vazios e cortinas imóveis. No chão, mosaicos mostram uma canção virando aurora.',event:'As portas se abrem quando três pistas sonoras são lembradas na ordem certa.',clue:'O mosaico mostra que a canção termina no Portal da Aurora.',secret:'O palácio foi construído para proteger a música até que alguém pudesse ouvi-la sem medo.',choices:'Ler o mosaico; ordenar as notas; procurar a câmara; chamar pela Canção Congelada.'},
    {id:'camara',name:'Câmara da Canção Congelada',x:54,y:15,type:'danger',desc:'No centro da câmara há um cristal enorme. Dentro dele, linhas de luz parecem uma partitura presa no gelo.',event:'O cristal pulsa quando as notas recolhidas se aproximam, mas racha se alguém tenta forçar a abertura.',clue:'A canção se liberta com escuta, ordem e cuidado.',secret:'Este é o centro emocional do mapa: libertar sem quebrar.',choices:'Cantar a sequência; tocar o sino pequeno; pedir licença ao cristal; aquecer com amizade.'},
    {id:'portal',name:'Portal da Aurora',x:90,y:16,type:'portal',desc:'Um arco de gelo e luz se abre para o céu colorido. A passagem parece feita de música congelada virando manhã.',event:'Quando a Canção Congelada é libertada, o portal se ilumina em azul, rosa e dourado.',clue:'O portal abre quando a Mestre marcar a liberação depois da canção completa.',secret:'A próxima zona chama pelo conhecimento antigo de Alexandria.',choices:'Atravessar juntas; agradecer ao gelo; guardar a última nota; olhar a aurora uma vez mais.'}
  ],
  links:[['portao','lago'],['lago','pinheiros'],['pinheiros','caverna'],['caverna','ponte'],['ponte','vila'],['vila','torre'],['torre','pegadas'],['pegadas','sinos'],['sinos','camara'],['pinheiros','jardim'],['jardim','palacio'],['palacio','camara'],['camara','portal'],['torre','portal']]
};


const ALEXANDRIA_V14 = {
  nodes:[
    {id:'porto',name:'Porto das Areias Douradas',x:8,y:70,type:'normal',desc:'Barcos pequenos repousam sobre areia fina, como se o mar tivesse recuado para deixar a cidade aparecer. Ao longe, cúpulas douradas brilham sob um céu cheio de estrelas mesmo durante o dia.',event:'Uma concha no chão repete uma pergunta em voz baixa: “o que você procura quando não sabe o nome da resposta?”',clue:'A concha aponta para a Avenida dos Mapas Vivos.',secret:'Alexandria só abre seus caminhos para quem aceita perguntar antes de afirmar.',choices:'Guardar a concha; perguntar à areia; seguir as marcas no chão; observar o farol ao longe.'},
    {id:'mapas',name:'Avenida dos Mapas Vivos',x:20,y:58,type:'normal',desc:'Tapetes e mapas pendem entre colunas. As linhas desenhadas se mexem devagar, criando caminhos que ainda não existem.',event:'Um mapa dobra uma de suas pontas e desenha a silhueta da Biblioteca Infinita.',clue:'O caminho desenhado passa por três símbolos: estrela, pena e lâmpada.',secret:'Os mapas não mostram lugares. Eles mostram perguntas que ainda precisam ser feitas.',choices:'Seguir o mapa que se mexe; copiar os símbolos; pedir um caminho seguro; procurar quem desenhou a rota.'},
    {id:'mercado',name:'Mercado das Palavras Raras',x:35,y:69,type:'hidden',desc:'Barracas coloridas vendem palavras escritas em vidros, pedaços de pergaminho, tinta brilhante e perguntas enroladas como fitas.',event:'Uma palavra engarrafada acende quando alguém chega perto: “curiosidade”.',clue:'A palavra curiosidade abre uma pequena gaveta no Salão das Perguntas.',secret:'A palavra certa não dá poder sobre os outros; ela abre escuta.',choices:'Comprar uma palavra; trocar por uma pergunta; libertar a palavra do vidro; procurar a gaveta indicada.'},
    {id:'biblioteca',name:'Biblioteca Infinita',x:50,y:58,type:'ruins',desc:'A biblioteca parece pequena por fora, mas por dentro suas estantes sobem como muralhas. Escadas mudam de lugar e livros respiram devagar.',event:'Um livro sem título cai aberto no chão e mostra uma página em branco esperando uma pergunta.',clue:'A página só revela texto quando a pergunta começa com “por que” ou “como”.',secret:'A biblioteca não responde curiosidade apressada. Ela ensina a formular perguntas melhores.',choices:'Escrever uma pergunta; procurar livros vivos; subir uma escada; pedir ajuda à biblioteca.'},
    {id:'salao',name:'Salão das Perguntas',x:63,y:47,type:'secret',desc:'Um salão circular guarda portas com pontos de interrogação gravados. Algumas perguntas brilham; outras estão apagadas há séculos.',event:'Uma porta pergunta: “qual resposta fica menor quando alguém tenta mandar nela?”',clue:'A resposta segura é “a verdade”. Isso aponta para o Espelho do Conhecimento Gentil.',secret:'As portas testam humildade, não inteligência.',choices:'Responder juntas; pedir uma pista; escolher outra porta; ouvir a pergunta antes de tentar vencer.'},
    {id:'espelho',name:'Espelho do Conhecimento Gentil',x:75,y:60,type:'secret',desc:'Um espelho alto reflete as personagens lendo livros que ainda não encontraram. O vidro brilha como água parada.',event:'O espelho mostra uma personagem ajudando outra a entender uma pista, e a imagem fica mais nítida quando o grupo coopera.',clue:'A luz refletida segue para a Casa dos Astrônomos Mirins.',secret:'Conhecimento em Alexandria cresce quando é compartilhado, não guardado.',choices:'Olhar em dupla; descrever o reflexo; perguntar o que o espelho quer ensinar; seguir o raio de luz.'},
    {id:'astronomos',name:'Casa dos Astrônomos Mirins',x:83,y:43,type:'hidden',desc:'Telescópios pequenos apontam para estrelas desenhadas no teto. Há almofadas, cadernos e mapas celestes feitos por crianças antigas.',event:'Um telescópio se vira sozinho e mostra uma estrela em forma de farol.',clue:'A estrela-farol indica que o Farol de Alexandria está apagado por falta da Pergunta Perdida.',secret:'As crianças antigas sabiam que perguntar era uma forma de coragem.',choices:'Olhar pelo telescópio; desenhar a estrela; ler os cadernos; procurar a Pergunta Perdida.'},
    {id:'jardim',name:'Jardim dos Papiros Cantores',x:68,y:30,type:'normal',desc:'Papiros altos balançam sem vento e cantam sílabas soltas. Cada folha tem uma frase incompleta.',event:'Três papiros cantam juntos: “quem pergunta com cuidado…” e esperam o grupo completar.',clue:'A frase completa aponta para o Labirinto das Estantes.',secret:'Os papiros guardam a forma da pergunta, não sua resposta.',choices:'Completar a frase; cantar com os papiros; colher uma folha caída; seguir o som.'},
    {id:'labirinto',name:'Labirinto das Estantes',x:48,y:32,type:'danger',desc:'Estantes formam corredores que mudam quando alguém corre ou tenta decorar tudo à força. Quando o grupo caminha com calma, as lombadas dos livros brilham.',event:'Uma estante fecha um caminho apressado, mas abre outro quando alguém lê o título em voz alta.',clue:'O título brilhante é “O Farol só acende para a pergunta certa”.',secret:'O labirinto recompensa paciência, cooperação e escuta.',choices:'Ler os títulos; marcar o caminho; andar juntas; pedir ao labirinto um caminho para o farol.'},
    {id:'observatorio',name:'Observatório das Estrelas de Vidro',x:31,y:28,type:'ruins',desc:'Uma torre baixa guarda estrelas de vidro penduradas por fios quase invisíveis. Elas refletem mapas, rostos e letras antigas.',event:'Uma estrela de vidro se parte em luz, sem machucar ninguém, e revela o desenho de uma chave em forma de pergunta.',clue:'A chave pertence à Câmara da Pergunta Perdida.',secret:'A estrela não quebra por violência; ela se abre quando o grupo aceita não saber tudo.',choices:'Juntar a luz; procurar a chave; alinhar as estrelas; perguntar qual porta ela abre.'},
    {id:'camara',name:'Câmara da Pergunta Perdida',x:18,y:18,type:'danger',desc:'No centro há um pedestal vazio cercado de letras flutuantes. As letras fogem quando alguém tenta agarrá-las, mas se aproximam quando alguém fala com sinceridade.',event:'As letras formam aos poucos a pergunta: “para que serve saber, se ninguém escuta?”',clue:'Levar essa pergunta ao Farol de Alexandria é a chave para acendê-lo.',secret:'A Pergunta Perdida não é para vencer. É para lembrar que conhecimento deve cuidar.',choices:'Ler a pergunta em voz alta; guardar em uma carta; prometer escutar; levar a pergunta ao farol.'},
    {id:'farol',name:'Farol de Alexandria',x:52,y:14,type:'secret',desc:'O farol antigo fica no ponto mais alto da cidade. Sua luz está apagada, mas o vidro da torre guarda reflexos de todas as zonas já visitadas.',event:'Quando a Pergunta Perdida é dita com cuidado, o farol acende uma luz dourada que aponta para as nuvens da próxima zona.',clue:'A luz revela o caminho para a Tempestade dos Deuses.',secret:'O farol une memória, curiosidade e responsabilidade. Ele só ilumina quando o grupo entende por que pergunta.',choices:'Dizer a Pergunta Perdida; lembrar as zonas anteriores; acender a luz; olhar o céu que responde.'},
    {id:'portal',name:'Portal das Estrelas Escritas',x:90,y:18,type:'portal',desc:'Um arco feito de livros abertos, areia dourada e estrelas pequenas. As páginas viram sozinhas, formando uma passagem para o céu distante.',event:'Quando o Farol acende, as páginas param na mesma frase: “a próxima resposta vive na tempestade”.',clue:'O portal abre quando a Mestre marcar que o Farol das Perguntas Perdidas foi aceso.',secret:'A próxima zona é a Tempestade dos Deuses, mas a passagem deve manter tom de aventura segura.',choices:'Atravessar juntas; guardar a Pergunta Perdida; agradecer à biblioteca; olhar Alexandria uma última vez.'}
  ],
  links:[['porto','mapas'],['mapas','mercado'],['mercado','biblioteca'],['biblioteca','salao'],['salao','espelho'],['espelho','astronomos'],['astronomos','farol'],['salao','jardim'],['jardim','labirinto'],['labirinto','observatorio'],['observatorio','camara'],['camara','farol'],['farol','portal'],['astronomos','portal']]
};


const STORM_V15 = {
  nodes:[
    {id:'portal_entrada',name:'Portal das Nuvens Abertas',x:8,y:72,type:'normal',desc:'O portal de Alexandria se desfaz em páginas de luz e o grupo pisa em uma ilha de nuvens macias. O céu inteiro parece respirar, mas a tempestade gira ao longe sem descanso.',event:'Um relâmpago dourado cruza o céu sem fazer barulho e desenha uma seta para a Ponte dos Ventos.',clue:'A tempestade não quer machucar; ela está desorganizada e precisa encontrar calma.',secret:'A zona testa equilíbrio, cooperação e coragem tranquila, não força bruta.',choices:'Observar a tempestade; seguir a seta; tocar a nuvem com cuidado; chamar o grupo para caminhar junto.'},
    {id:'ponte_ventos',name:'Ponte dos Ventos Cruzados',x:20,y:58,type:'normal',desc:'Uma ponte feita de ar visível liga duas ilhas flutuantes. Correntes de vento passam em sentidos diferentes, empurrando capas, cabelos e pensamentos apressados.',event:'A ponte fica firme quando as jogadoras dão passos no mesmo ritmo.',clue:'O vento responde melhor a grupo unido do que a pressa individual.',secret:'A ponte é o primeiro ensinamento do Raio Calmo: equilíbrio nasce de ritmo compartilhado.',choices:'Atravessar de mãos dadas; contar passos; pedir ao vento uma passagem; voltar e procurar outro caminho.'},
    {id:'ilha_tambores',name:'Ilha dos Tambores de Trovão',x:36,y:68,type:'hidden',desc:'Tambores enormes repousam sobre pedras redondas. Eles vibram sozinhos, mas o som é mais parecido com coração do que com ameaça.',event:'Três batidas ecoam: forte, fraca, forte. Depois os tambores esperam uma resposta.',clue:'A sequência correta acalma uma parte da tempestade.',secret:'Os trovões desta zona são linguagem. Eles pedem escuta, não medo.',choices:'Repetir as batidas; inventar uma resposta; ouvir antes de tocar; procurar marcas nos tambores.'},
    {id:'jardim_chuva',name:'Jardim da Chuva Suspensa',x:52,y:74,type:'secret',desc:'Gotas de chuva ficam paradas no ar como contas de vidro. Dentro de cada gota existe uma pequena imagem de lugares já visitados.',event:'Uma gota mostra o Farol de Alexandria apontando para uma nuvem em forma de mão aberta.',clue:'A mão aberta indica que a tempestade se acalma com gesto de cuidado, não com confronto.',secret:'A chuva guarda memórias da Jornada e prepara o grupo para usar aprendizados antigos.',choices:'Tocar uma gota; procurar a lembrança certa; agradecer ao farol; seguir a nuvem em forma de mão.'},
    {id:'torre_raios',name:'Torre dos Raios Adormecidos',x:68,y:61,type:'danger',desc:'Uma torre fina feita de metal antigo guarda raios enrolados como fitas luminosas. Eles se mexem devagar, como cobras de luz dormindo.',event:'Um raio pequeno acorda e ilumina símbolos de sol, mar e vento na parede.',clue:'Os símbolos precisam ser equilibrados antes de subir ao templo.',secret:'O perigo aqui é a impaciência: tocar tudo rápido demais faz a luz se embaralhar.',choices:'Ler os símbolos; esperar o raio acalmar; escolher uma fita de luz; chamar ajuda da Mestre.'},
    {id:'nuvem_azul',name:'Nuvem Azul de Poseidon',x:82,y:70,type:'normal',desc:'Uma nuvem azul-escura parece feita de ondas. Ela carrega conchas, espuma leve e pequenos reflexos de mar, mesmo estando muito acima do chão.',event:'A nuvem derrama uma chuva curta que desenha no ar a palavra “respeito”.',clue:'O mar do céu quer ser ouvido como parte do equilíbrio.',secret:'Poseidon é tratado como força antiga da água e movimento, sem disputa religiosa.',choices:'Escutar a chuva; recolher uma gota azul; perguntar o que falta; seguir o reflexo de espuma.'},
    {id:'degraus_relampago',name:'Degraus de Relâmpago Manso',x:74,y:45,type:'danger',desc:'Degraus brilhantes aparecem e desaparecem entre as nuvens. Cada degrau surge depois de um clarão, mas o clarão é quente e seguro como luz de lanterna.',event:'Os degraus só permanecem quando alguém fala uma escolha com calma.',clue:'O caminho para o templo precisa de palavras firmes e tranquilas.',secret:'O Raio Calmo começa a nascer quando o grupo escolhe sem gritar.',choices:'Subir uma de cada vez; falar uma escolha; esperar o próximo clarão; marcar o ritmo dos degraus.'},
    {id:'observatorio_nuvens',name:'Observatório das Nuvens Antigas',x:57,y:42,type:'ruins',desc:'Um observatório circular flutua entre nuvens lentas. Instrumentos antigos medem vento, chuva, luz e silêncio.',event:'Um ponteiro aponta para “calma” e depois para “coragem”.',clue:'Calma e coragem precisam andar juntas para alcançar o Templo do Céu Partido.',secret:'O observatório revela que controlar a tempestade não é o objetivo; equilibrá-la é.',choices:'Ajustar o ponteiro; olhar pela lente; medir o silêncio; anotar a direção.'},
    {id:'biblioteca_ceu',name:'Biblioteca dos Ventos Escritos',x:40,y:46,type:'secret',desc:'Fitas de ar atravessam estantes sem livros. As histórias estão escritas no próprio vento e só aparecem quando alguém respira devagar.',event:'Uma frase surge no ar: “o céu esqueceu a calma porque ninguém escutou todos os lados”.',clue:'É preciso reunir água, vento e luz antes de chamar o Raio Calmo.',secret:'A biblioteca liga Alexandria à Tempestade: perguntas boas viram escuta boa.',choices:'Ler o vento; respirar junto; guardar a frase; procurar os três sinais.'},
    {id:'templo_ceu',name:'Templo do Céu Partido',x:26,y:30,type:'ruins',desc:'Um templo branco flutua rachado no meio da tempestade. Metade recebe chuva; metade recebe sol; no centro, o vento gira sem escolher lado.',event:'As colunas vibram quando três sinais aparecem juntos: gota azul, fita de luz e sopro de vento.',clue:'Os três sinais abrem a Câmara do Raio Calmo.',secret:'O templo não quer que uma força vença a outra. Ele quer que todas encontrem lugar.',choices:'Unir os sinais; tocar as colunas; pedir equilíbrio; entrar no centro do templo.'},
    {id:'camara_raio',name:'Câmara do Raio Calmo',x:44,y:20,type:'danger',desc:'No coração do templo há um raio pequeno, branco e dourado, preso dentro de uma esfera transparente. Ele pulsa como se estivesse esperando uma canção sem palavras.',event:'A esfera mostra cenas de pressa, medo e disputa se transformando em cooperação.',clue:'O Raio Calmo desperta quando o grupo escolhe uma ação conjunta.',secret:'O raio é a peça central da zona. Ele não destrói: ilumina o caminho para acalmar o céu.',choices:'Fazer uma promessa em grupo; unir os itens; respirar juntas; pedir que o raio guie a tempestade.'},
    {id:'olho_tempestade',name:'Olho da Tempestade Serena',x:63,y:18,type:'secret',desc:'No centro do furacão existe um silêncio redondo. As nuvens giram em volta, mas ali dentro o ar fica leve, azul e quase musical.',event:'Quando o Raio Calmo é levado ao centro, os trovões diminuem e a chuva vira brilho.',clue:'A tempestade só abre passagem quando entende que não precisa escolher entre força e calma.',secret:'Este é o clímax emocional da zona: acolher todas as forças do céu.',choices:'Erguer o Raio Calmo; falar o que aprenderam; convidar a tempestade a descansar; observar a abertura do portal.'},
    {id:'portal',name:'Portal da Corrida Celeste',x:91,y:24,type:'portal',desc:'Um arco de vento e luz se abre entre nuvens alinhadas. Do outro lado, há um caminho em movimento, como se a próxima zona pedisse rapidez e união.',event:'O portal pulsa no ritmo dos tambores: forte, fraco, forte, e depois se estabiliza em luz clara.',clue:'O portal abre quando a Mestre marcar que a Tempestade dos Deuses foi acalmada.',secret:'A próxima zona é Correr ou Morrer, mas será tratada como corrida cooperativa segura, sem horror pesado.',choices:'Atravessar juntas; agradecer ao céu; guardar o ritmo dos tambores; olhar a tempestade agora tranquila.'}
  ],
  links:[['portal_entrada','ponte_ventos'],['ponte_ventos','ilha_tambores'],['ilha_tambores','jardim_chuva'],['jardim_chuva','torre_raios'],['torre_raios','nuvem_azul'],['torre_raios','degraus_relampago'],['degraus_relampago','observatorio_nuvens'],['observatorio_nuvens','biblioteca_ceu'],['biblioteca_ceu','templo_ceu'],['templo_ceu','camara_raio'],['camara_raio','olho_tempestade'],['olho_tempestade','portal'],['nuvem_azul','olho_tempestade']]
};

const RACE_V16 = {
  nodes:[
    {id:"portal_entrada",name:"Portal da Corrida Celeste",x:7,y:70,type:"normal",desc:"O portal da tempestade se fecha atrás do grupo e deixa no chão uma pista brilhante, como uma estrada que acabou de acordar.",event:"A trilha pulsa em três batidas rápidas e depois espera o grupo respirar junto.",clue:"O caminho só continua quando todas caminham na mesma direção.",secret:"Esta zona não testa medo: testa união, ritmo e escolha coletiva.",choices:"Respirar juntas; observar a pista; combinar um sinal do grupo; dar o primeiro passo."},
    {id:"estrada_acorda",name:"Estrada que Acorda",x:18,y:61,type:"normal",desc:"Pedras achatadas se levantam uma por vez, formando uma estrada que aparece apenas alguns metros à frente.",event:"Quando alguém corre sozinha, as pedras ficam apagadas. Quando o grupo decide junto, elas brilham.",clue:"A estrada responde a decisões compartilhadas.",secret:"A zona quer ensinar urgência sem abandonar ninguém.",choices:"Caminhar no mesmo ritmo; escolher uma líder temporária; marcar as pedras; esperar quem ficou para trás."},
    {id:"ponte_passos",name:"Ponte dos Passos Rápidos",x:30,y:72,type:"danger",desc:"Uma ponte estreita de placas móveis cruza um vale de luz. As placas giram devagar, como se pedissem atenção.",event:"Três placas viram ao mesmo tempo e revelam símbolos de pegadas pequenas.",clue:"Pisar em sequência, não em força, estabiliza a ponte.",secret:"A ponte premia coordenação e comunicação simples.",choices:"Contar até três; atravessar de mãos dadas; observar o padrão; mandar uma personagem testar com cuidado."},
    {id:"mercado_atalhos",name:"Mercado dos Atalhos",x:39,y:55,type:"hidden",desc:"Bancas coloridas oferecem caminhos em garrafas, setas dobradas e mapas que prometem chegar mais rápido.",event:"Uma seta dourada tenta vender um atalho que deixa uma personagem para trás.",clue:"O melhor atalho é aquele que o grupo inteiro consegue seguir.",secret:"Nem todo caminho rápido é caminho bom.",choices:"Comprar uma seta; rejeitar o atalho; perguntar o preço; procurar o mapa mais lento."},
    {id:"relogio_areia",name:"Relógio de Areia Gigante",x:52,y:67,type:"secret",desc:"Uma ampulheta do tamanho de uma torre derrama areia luminosa. Cada grão faz um som pequeno ao cair.",event:"A areia para por um segundo quando alguém diz: “ninguém fica para trás”.",clue:"O relógio mede cuidado, não velocidade.",secret:"O tempo desta zona se dobra quando o grupo age com lealdade.",choices:"Virar a ampulheta; escrever na areia; fazer uma promessa; guardar um grão luminoso."},
    {id:"tunel_folego",name:"Túnel do Fôlego Curto",x:62,y:50,type:"danger",desc:"Um túnel estreito ecoa passos e respiração. A saída parece perto, mas se afasta quando alguém entra em pânico.",event:"O eco repete a respiração mais rápida do grupo até alguém acalmar o ritmo.",clue:"Respirar junto abre o túnel.",secret:"A dificuldade é emocional e segura: acalmar, não vencer pela força.",choices:"Parar e respirar; cantar baixo; seguir uma lanterna; voltar e entrar juntas."},
    {id:"praca_decisoes",name:"Praça das Decisões Rápidas",x:49,y:39,type:"normal",desc:"Cinco caminhos saem da praça, mas as placas mudam de lugar quando ninguém escolhe.",event:"Uma placa pergunta: “qual escolha ajuda mais o grupo agora?”",clue:"A resposta certa depende da cooperação, não da sorte.",secret:"A praça deve gerar conversa rápida entre as jogadoras.",choices:"Votar; escutar a personagem mais atenta; seguir o caminho mais seguro; criar um plano de dois passos."},
    {id:"rio_pedras",name:"Rio das Pedras Saltantes",x:70,y:70,type:"danger",desc:"Um rio de luz atravessa a estrada. Pedras surgem na superfície e afundam depois de alguns segundos.",event:"As pedras aparecem em pares, como se pedissem que ninguém atravesse sozinha.",clue:"Duas personagens juntas fazem as pedras durarem mais.",secret:"A travessia reforça parceria.",choices:"Atravessar em duplas; jogar uma corda; contar o ritmo das pedras; procurar um ponto mais calmo."},
    {id:"oficina_trilhos",name:"Oficina dos Trilhos Móveis",x:78,y:53,type:"hidden",desc:"Trilhos de metal claro se mexem no chão, montando e desmontando caminhos como brinquedos inteligentes.",event:"Uma pequena chave pula para fora de uma caixa e aponta para três trilhos desalinhados.",clue:"Alinhar os trilhos cria passagem para o Labirinto das Setas.",secret:"A oficina permite pausa criativa no meio da urgência.",choices:"Alinhar trilhos; seguir a chave; pedir ajuda à IA local; transformar trilho em ponte."},
    {id:"labirinto_setas",name:"Labirinto das Setas",x:66,y:33,type:"secret",desc:"Setas luminosas nas paredes apontam para muitas direções ao mesmo tempo. Algumas parecem querer confundir, outras parecem proteger.",event:"Uma seta azul só aparece quando uma personagem pergunta para outra se ela está pronta.",clue:"A seta azul é o caminho cooperativo.",secret:"O labirinto deve parecer rápido, mas resolver com cuidado.",choices:"Seguir a seta azul; ignorar setas vermelhas; marcar o caminho; deixar uma pista para quem vier atrás."},
    {id:"torre_sinal",name:"Torre do Último Sinal",x:82,y:34,type:"ruins",desc:"Uma torre fina toca o céu. No topo, uma luz pisca como se tentasse avisar que o caminho final está desaparecendo.",event:"A luz pisca no ritmo escolhido pelo grupo durante a travessia.",clue:"O sinal final abre a Linha do Fim do Caminho.",secret:"A torre reconhece padrões criados pelas jogadoras.",choices:"Repetir o ritmo; acender a torre; chamar todas pelo nome; olhar o caminho final."},
    {id:"fim_caminho",name:"Linha do Fim do Caminho",x:88,y:18,type:"secret",desc:"Uma linha brilhante corta o chão. Depois dela, a estrada se desfaz em pequenos pontos de luz que sobem para o escuro.",event:"A linha pergunta sem voz: “vocês chegaram rápido ou chegaram juntas?”",clue:"A resposta abre o portal final.",secret:"O clímax da zona é valorizar união acima de velocidade.",choices:"Responder juntas; lembrar quem ajudou quem; cruzar no mesmo passo; preparar-se para a última zona."},
    {id:"portal",name:"Portal da Última Luz",x:94,y:39,type:"portal",desc:"Um portal estreito feito de estrada, estrela e silêncio. Do outro lado não há paisagem definida, apenas uma luz pequena esperando no vazio.",event:"Quando o grupo cruza a linha unido, o portal se abre sem pressa e mostra a última zona: O Vazio.",clue:"O portal abre quando a Mestre marcar que o grupo chegou junto ao fim do caminho.",secret:"A próxima zona será final e emocional: recuperar a Última Luz das Terras Raras.",choices:"Atravessar juntas; guardar o último sinal; olhar para trás; prometer não soltar o grupo."}
  ],
  links:[["portal_entrada", "estrada_acorda"], ["estrada_acorda", "ponte_passos"], ["ponte_passos", "mercado_atalhos"], ["mercado_atalhos", "relogio_areia"], ["relogio_areia", "tunel_folego"], ["tunel_folego", "praca_decisoes"], ["praca_decisoes", "rio_pedras"], ["rio_pedras", "oficina_trilhos"], ["oficina_trilhos", "labirinto_setas"], ["labirinto_setas", "torre_sinal"], ["torre_sinal", "fim_caminho"], ["fim_caminho", "portal"], ["praca_decisoes", "labirinto_setas"], ["mercado_atalhos", "oficina_trilhos"]]
};


const VOID_V17 = {
  nodes:[
    {id:"portal_entrada",name:"Portal da Última Luz",x:7,y:69,type:"normal",desc:"O portal da corrida se fecha em silêncio. O chão parece feito de poeira de estrela, e uma pequena luz flutua à frente como se esperasse ser reconhecida.",event:"A luz pisca uma vez para cada zona já atravessada e depois aponta para o Caminho Sem Cor.",clue:"O Vazio não é inimigo; ele é o lugar onde histórias esquecidas ficam esperando alguém lembrar.",secret:"O mapa final deve reunir a memória emocional de toda a campanha, sem vilão gráfico ou terror pesado.",choices:"Seguir a luz; chamar o grupo pelo nome; lembrar a primeira aventura; caminhar juntas."},
    {id:"caminho_sem_cor",name:"Caminho Sem Cor",x:18,y:58,type:"normal",desc:"Uma estrada pálida atravessa o escuro. As cores aparecem por poucos segundos quando alguém cita algo vivido em outra zona.",event:"Uma folha da Floresta Negra surge no chão e recupera um verde suave ao ser tocada.",clue:"Cada lembrança verdadeira devolve uma cor ao caminho.",secret:"Primeira retomada: Floresta Negra e a ideia de que nem toda sombra é inimiga.",choices:"Lembrar a floresta; tocar a folha; contar uma escolha antiga; seguir o brilho verde."},
    {id:"jardim_doces_apagados",name:"Jardim dos Doces Apagados",x:29,y:72,type:"hidden",desc:"Doces sem cor flutuam como balões quietos. Eles não parecem tristes; parecem receitas esperando ingredientes.",event:"Um doce escuro recupera um brilho dourado quando alguém diz uma verdade gentil.",clue:"A sinceridade da Fábrica dos Doces Pesadelos reacende parte do Vazio.",secret:"Retoma a Mentira Amarga e a Confeiteira sem transformar a cena em medo.",choices:"Dizer uma verdade gentil; guardar um doce aceso; lembrar a Flor Nunca Colhida; seguir o aroma doce."},
    {id:"relogio_sem_som",name:"Relógio Sem Som",x:42,y:61,type:"secret",desc:"Um relógio enorme flutua sem ponteiros. No centro dele há um espaço vazio exatamente onde um minuto deveria morar.",event:"O som de um tique-taque volta por um instante quando o grupo fala sobre o Minuto Perdido.",clue:"Aceitar lembranças difíceis devolve tempo ao Vazio.",secret:"Retoma a Cidade dos Relógios e a ideia de seguir sem apagar o passado.",choices:"Chamar o Minuto Perdido; tocar o centro do relógio; lembrar 03:17; escutar o silêncio."},
    {id:"pedra_que_pulsa",name:"Pedra que Pulsa",x:55,y:75,type:"normal",desc:"Uma pedra grande e escura bate como um coração lento. Musgo luminoso cresce em pequenas linhas na sua superfície.",event:"A pedra fica morna quando alguém lembra que a guardiã arcaica queria proteger, não assustar.",clue:"Compreender antes de julgar reacende a parte antiga das Terras Raras.",secret:"Retoma as Montanhas Arcaicas e o Coração de Pedra.",choices:"Encostar a mão; repetir a Canção dos Cristais; agradecer à guardiã; seguir o musgo."},
    {id:"cristal_mudo",name:"Cristal Mudo",x:66,y:57,type:"danger",desc:"Um cristal de gelo escuro guarda uma nota presa. Ele parece frágil, como se pudesse rachar com pressa ou gritos.",event:"A nota aparece quando o grupo fala baixo e completa uma pequena melodia juntos.",clue:"Nem tudo que está em silêncio está perdido; às vezes está protegido.",secret:"Retoma o Gelo Eterno e a Canção Congelada.",choices:"Cantar baixo; tocar o Sino de Gelo; esperar a nota aparecer; proteger o cristal."},
    {id:"biblioteca_sem_paginas",name:"Biblioteca Sem Páginas",x:50,y:40,type:"secret",desc:"Estantes vazias formam corredores no escuro. Os livros não desapareceram; suas páginas viraram estrelas pequenas no teto.",event:"Uma estrela desce e forma a pergunta: “o que você escolhe lembrar para iluminar quem vem depois?”",clue:"A pergunta certa devolve páginas à biblioteca.",secret:"Retoma Alexandria e o Farol das Perguntas Perdidas.",choices:"Responder em grupo; guardar a pergunta; pedir que uma estrela guie; abrir um livro invisível."},
    {id:"ceu_sem_trovao",name:"Céu Sem Trovão",x:73,y:40,type:"hidden",desc:"Um pedaço de céu flutua dentro do Vazio. Nuvens giram devagar, sem som, como se tivessem esquecido seu ritmo.",event:"Três batidas suaves aparecem no ar: forte, fraca, forte. O Raio Calmo brilha dentro de uma nuvem pequena.",clue:"Equilíbrio também precisa ser lembrado.",secret:"Retoma a Tempestade dos Deuses e o Raio Calmo.",choices:"Repetir o ritmo; chamar o Raio Calmo; respirar como no olho da tempestade; tocar a nuvem."},
    {id:"estrada_parada",name:"Estrada Parada",x:82,y:60,type:"danger",desc:"Uma estrada curta termina no nada. Setas azuis estão apagadas e uma linha brilhante espera uma resposta.",event:"A linha pergunta: “vocês chegaram rápido ou chegaram juntas?” e só acende quando o grupo responde junto.",clue:"A união da Corrida reacende o caminho final.",secret:"Retoma Correr ou Morrer e prepara a transição para o centro do Vazio.",choices:"Responder juntas; chamar quem ficou atrás; acender a seta azul; cruzar no mesmo passo."},
    {id:"espelho_da_jornada",name:"Espelho da Jornada Inteira",x:36,y:26,type:"secret",desc:"Um espelho circular mostra cenas de todas as zonas: floresta, fábrica, cidade, montanha, gelo, Alexandria, céu e estrada.",event:"As cenas se misturam e formam uma única imagem: as personagens caminhando juntas desde o começo.",clue:"A Última Luz nasce quando a Jornada inteira é lembrada como uma história só.",secret:"Este é o ponto de recapitulação emocional para a Mestre antes do final.",choices:"Contar a cena favorita; escolher uma lembrança de cada mapa; agradecer às companheiras; seguir para o centro."},
    {id:"coracao_do_vazio",name:"Coração do Vazio",x:63,y:24,type:"ruins",desc:"No centro há um círculo quase apagado. Pequenos fragmentos de luz giram como vaga-lumes cansados.",event:"Cada fragmento mostra um símbolo: folha, doce, ponteiro, pedra, cristal, livro, raio e seta.",clue:"Os oito símbolos precisam ser reunidos para reacender a Última Luz.",secret:"Não é combate final; é montagem de sentido e memória.",choices:"Unir os símbolos; pedir que cada jogadora escolha um; falar uma promessa; proteger a luz pequena."},
    {id:"ultima_luz",name:"A Última Luz",x:77,y:20,type:"portal",desc:"Uma luz pequena, quente e firme aparece no centro do escuro. Ela não explode nem vence o Vazio: ela o preenche com histórias lembradas.",event:"Quando os símbolos se unem, a Última Luz cresce e revela que o Vazio era apenas uma página esperando ser escrita.",clue:"A campanha se conclui quando o grupo escolhe que lembrança quer levar das Terras Raras.",secret:"Final emocional da campanha principal. A Mestre pode encerrar com agradecimento e gancho para novas aventuras.",choices:"Reacender a luz; dizer uma lembrança final; abrir o caminho de volta; encerrar a campanha juntas."},
    {id:"portal_final",name:"Portal do Recomeço",x:92,y:36,type:"portal",desc:"Um portal claro se abre dentro da Última Luz. Do outro lado não há ameaça: há uma mesa, mapas em branco e espaço para novas histórias.",event:"A luz mostra todas as zonas como estrelas conectadas. As Terras Raras estão acesas outra vez.",clue:"Este portal encerra a campanha principal e permite começar novas jornadas no futuro.",secret:"Use como epílogo, não como nova zona obrigatória.",choices:"Atravessar; olhar as zonas acesas; guardar um símbolo final; prometer novas histórias."}
  ],
  links:[["portal_entrada","caminho_sem_cor"],["caminho_sem_cor","jardim_doces_apagados"],["jardim_doces_apagados","relogio_sem_som"],["relogio_sem_som","pedra_que_pulsa"],["pedra_que_pulsa","cristal_mudo"],["cristal_mudo","biblioteca_sem_paginas"],["biblioteca_sem_paginas","ceu_sem_trovao"],["ceu_sem_trovao","estrada_parada"],["estrada_parada","espelho_da_jornada"],["espelho_da_jornada","coracao_do_vazio"],["coracao_do_vazio","ultima_luz"],["ultima_luz","portal_final"],["biblioteca_sem_paginas","espelho_da_jornada"],["ceu_sem_trovao","coracao_do_vazio"]]
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
  if(state?.map?.id==='fabrica_doces') return CANDY_V10;
  if(state?.map?.id==='cidade_relogios') return CITY_V11;
  if(isMountainMap(state?.map)) return MOUNTAIN_V12;
  if(isIceMap(state?.map)) return ICE_V13;
  if(isAlexandriaMap(state?.map)) return ALEXANDRIA_V14;
  if(isStormMap(state?.map)) return STORM_V15;
  if(isRaceMap(state?.map)) return RACE_V16;
  if(isVoidMap(state?.map)) return VOID_V17;
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
  fetchAdventureCards(false);
  fetchMasterEvents(false);
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
    else if(d.type==='cards_updated'){ fetchAdventureCards(true); }
    else if(d.type==='master_events_updated'){ fetchMasterEvents(true); }
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

function ensureSidePanel(id,title,hidden=false){
  const side=qs('side');
  if(!side || qs(id)) return;
  const sec=document.createElement('div');
  sec.className='sideSection'+(hidden?' hidden':'');
  sec.id=id;
  sec.innerHTML=`<h3 class="title">${title}</h3><div id="${id.replace('Box','Content')}"></div>`;
  const ai=qs('localAIBox');
  if(ai) side.insertBefore(sec, ai); else side.appendChild(sec);
}
function ensureSidePanels(){
  ensureSidePanel('masterCentralBox','Central da Mestre',true);
  ensureSidePanel('journeyBox','Jornada');
  ensureSidePanel('adventureCardsBox','Cartas da Aventura');
  ensureSidePanel('inventoryBox','Inventário');
  ensureSidePanel('visualDiaryBox','Diário Visual');
  ensureSidePanel('missionsBox','Missões');
  ensureSidePanel('masterEventsBox','Eventos da Mestre',true);
  ensureSidePanel('masterLibraryBox','Biblioteca da Mestre',true);
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

function safeRender(label, fn){
  try{ return fn(); }
  catch(e){ console.error('Falha ao renderizar '+label, e); }
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

/* ===== v10.1 — abertura cinematográfica da sessão ===== */
function introConfigForMap(map){
  const id=map?.id||'';
  if(id==='fabrica_doces'){
    return {
      theme:'candy',
      title:'Fábrica dos Doces Pesadelos',
      kicker:'Episódio II',
      subtitle:'O segredo da Mentira Amarga',
      text:'O ar cheira a açúcar queimado. Engrenagens giram sozinhas, doces sussurram nas prateleiras e algo doce demais esconde um segredo amargo.',
      prompt:'Para abrir o Portal de Caramelo, talvez seja preciso dizer uma verdade que não cabe em embalagem nenhuma.'
    };
  }
  if(id==='cidade_relogios'){
    return {
      theme:'clock',
      title:'Cidade dos Relógios Parados',
      kicker:'Episódio III',
      subtitle:'O Minuto Perdido',
      text:'A cidade parece dormir de olhos abertos. Relógios imóveis observam as ruas vazias, janelas acendem sem ninguém dentro, e em cada esquina existe a sensação de que algo importante acabou de acontecer… mas ninguém consegue lembrar.',
      prompt:'Para abrir o Portal do Amanhã, talvez seja preciso devolver à cidade a lembrança que ela tentou esconder.'
    };
  }
  if(id==='montanhas_arcaicas' || String(map?.name||'').toLowerCase().includes('montanhas arcaicas')){
    return {
      theme:'mountain',
      title:'Montanhas Arcaicas',
      kicker:'Episódio IV',
      subtitle:'O Rugido Debaixo da Pedra',
      text:'As montanhas surgem como gigantes adormecidos. Cavernas brilham com fósseis antigos, ventos repetem histórias esquecidas e um rugido profundo parece vir debaixo da própria pedra.',
      prompt:'Para abrir o Portal de Pedra Viva, talvez seja preciso compreender aquilo que todos aprenderam a temer.'
    };
  }
  if(id==='gelo_eterno' || String(map?.name||'').toLowerCase().includes('gelo eterno')){
    return {
      theme:'ice',
      title:'Gelo Eterno',
      kicker:'Episódio V',
      subtitle:'A Canção Presa no Cristal',
      text:'O frio não morde: ele escuta. Cristais azuis guardam vozes antigas, pinheiros parecem feitos de vidro e uma canção esquecida espera calor, coragem e amizade para voltar a existir.',
      prompt:'Para abrir o Portal da Aurora, talvez seja preciso libertar a Canção Congelada sem quebrar aquilo que ela protege.'
    };
  }

  if(id==='alexandria' || String(map?.name||'').toLowerCase().includes('alexandria')){
    return {
      theme:'alexandria',
      title:'Alexandria',
      kicker:'Episódio VI',
      subtitle:'O Farol das Perguntas Perdidas',
      text:'A cidade dourada surge entre areia, mar e estrelas. Livros respiram atrás de portas antigas, mapas desenham caminhos que ainda não existem e um farol apagado espera a pergunta certa para voltar a iluminar o céu.',
      prompt:'Para abrir o Portal das Estrelas Escritas, talvez seja preciso descobrir que saber não é vencer: é aprender a escutar.'
    };
  }
  if(id==='tempestade_deuses' || String(map?.name||'').toLowerCase().includes('tempestade dos deuses')){
    return {
      theme:'storm',
      title:'Tempestade dos Deuses',
      kicker:'Episódio VII',
      subtitle:'O Céu que Esqueceu a Calma',
      text:'Acima das nuvens, ilhas flutuam entre vento, chuva e luz. Trovões falam como tambores antigos, e uma tempestade enorme gira sem descanso porque o céu esqueceu como encontrar equilíbrio.',
      prompt:'Para abrir o Portal da Corrida Celeste, talvez seja preciso despertar o Raio Calmo e ensinar a tempestade a respirar.'
    };
  }
  if(id==='correr_ou_morrer' || String(map?.name||'').toLowerCase().includes('correr ou morrer')){
    return {theme:'race',title:'Correr ou Morrer',kicker:'Episódio VIII',subtitle:'A Corrida Contra o Fim do Caminho',text:'O caminho desperta sob os pés. Pontes aparecem e desaparecem, setas luminosas mudam de direção e a estrada parece pedir rapidez — mas só aceita quem não deixa ninguém para trás.',prompt:'Para abrir o Portal da Última Luz, talvez seja preciso provar que chegar junto importa mais do que chegar primeiro.'};
  }
  if(id==='o_vazio' || String(map?.name||'').toLowerCase().includes('o vazio')){
    return {theme:'void',title:'O Vazio',kicker:'Episódio IX',subtitle:'A Última Luz das Terras Raras',text:'Depois do Portal da Última Luz, quase nada existe: chão sem forma, estrelas apagadas e ecos de todas as zonas anteriores. O Vazio não quer destruir as Terras Raras — ele nasceu quando as histórias começaram a ser esquecidas.',prompt:'Para reacender a Última Luz, talvez seja preciso lembrar a Jornada inteira e escolher que história continuará viva.'};
  }
  if(id==='floresta_negra'){
    return {
      theme:'forest',
      title:'Floresta Negra',
      kicker:'Episódio I',
      subtitle:'A trilha que observa de volta',
      text:'A névoa se move entre as árvores como se estivesse viva. Cada passo estala no chão úmido, e a floresta parece lembrar nomes que ninguém disse em voz alta.',
      prompt:'O primeiro portal só se revela para quem percebe que nem toda sombra é inimiga.'
    };
  }
  return {
    theme:'default',
    title:map?.name||'Terras Raras',
    kicker:'Nova zona',
    subtitle:'A aventura continua',
    text:map?.description||'Um novo caminho se abre diante das jogadoras.',
    prompt:'Respirem fundo. A próxima escolha pode mudar o rumo da sessão.'
  };
}
function sessionIntroKey(){
  const roomId=state?.room?.id||currentRoom||'room';
  const mapId=state?.map?.id||'map';
  return `tr_intro_seen_${roomId}_${mapId}`;
}
function shouldShowSessionIntro(){
  if(!state || (state.room?.session_status||'waiting')!=='active') return false;
  if(!state.map) return false;
  try{ return sessionStorage.getItem(sessionIntroKey())!=='1'; }catch(e){ return !document.body.dataset.introSeen; }
}
function renderSessionIntro(){
  if(!shouldShowSessionIntro()) return;
  document.querySelector('.sessionIntroOverlay')?.remove();
  const cfg=introConfigForMap(state.map);
  const overlay=document.createElement('div');
  overlay.className=`sessionIntroOverlay ${cfg.theme}`;
  overlay.innerHTML=`<div class="sessionIntroBg"></div>
    <div class="sessionIntroCard">
      <div class="sessionIntroKicker">${esc(cfg.kicker)}</div>
      <h1>${esc(cfg.title)}</h1>
      <h2>${esc(cfg.subtitle)}</h2>
      <p>${esc(cfg.text)}</p>
      <div class="sessionIntroPrompt">${esc(cfg.prompt)}</div>
      <div class="sessionIntroActions">
        <button class="btn sessionIntroBtn" onclick="closeSessionIntro()">Começar aventura</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);
  setTimeout(()=>overlay.classList.add('on'),30);
}
function closeSessionIntro(){
  const key=sessionIntroKey();
  try{ sessionStorage.setItem(key,'1'); }catch(e){ document.body.dataset.introSeen='1'; }
  const overlay=document.querySelector('.sessionIntroOverlay');
  if(overlay){
    overlay.classList.remove('on');
    setTimeout(()=>overlay.remove(),260);
  }
}

function ensureGameScaffold(){
  const mapArea=qs('mapArea'), side=qs('side');
  if(mapArea && !qs('mapSvg')){
    mapArea.innerHTML=`<div id="mapSvg" class="mapSvg"></div><svg id="pathLayer" class="pathLayer" viewBox="0 0 100 100" preserveAspectRatio="none"></svg><div id="mapNodes" class="mapNodes"></div><div class="mapShade"></div><div id="tokens"></div><div class="mapHint">Clique nos pontos do mapa para revelar locais, mover tokens e gerar narração com IA local.</div>`;
  }
  if(side && !qs('locationBox')){
    side.innerHTML=`<div class="sideSection"><h3 class="title" id="mapName">Mapa</h3><p id="mapDesc" style="color:var(--muted)"></p><div id="masterMapControls" class="hidden"><label>Mudar zona/mapa</label><select id="mapSelect"></select><button class="btn small" style="margin-top:8px" onclick="changeMap()">Alterar mapa</button></div><div class="legend"><span>● local</span><span>● perigo</span><span>● portal</span><span>linha = caminho</span></div><div id="locationBox" class="locationBox"><b>Nenhum local selecionado</b><div class="locationMeta">Clique em um ponto do mapa para ver descrição, mover personagens e gerar narrativa daquele local.</div></div></div><div class="sideSection"><h3 class="title">Jogadoras</h3><div id="players" class="players"></div></div><div class="sideSection"><h3 class="title">Escolher personagem</h3><select id="charSelect"></select><button class="btn small" style="margin-top:8px" onclick="chooseChar()">Usar personagem</button></div><div class="sideSection"><h3 class="title">Chat</h3><div id="chat" class="chat"></div><div class="row" style="margin-top:8px"><input id="chatText" placeholder="Mensagem..."><button class="btn small" onclick="sendChat()">Enviar</button></div></div><div class="sideSection"><h3 class="title">Diário da Mestre</h3><div id="notes" class="notes"></div><div id="masterNotes" class="hidden"><label>Título</label><input id="noteTitle" value="Resumo da sessão"><label>Texto</label><textarea id="noteText" placeholder="Eventos importantes, fraquezas, itens, localização, pendências..."></textarea><button class="btn small" style="margin-top:8px" onclick="addNote()">Salvar nota</button></div></div><div class="sideSection hidden" id="masterCentralBox"><h3 class="title">Central da Mestre</h3><div id="masterCentralContent"></div></div><div class="sideSection" id="journeyBox"><h3 class="title">Jornada</h3><div id="journeyContent"></div></div><div class="sideSection" id="adventureCardsBox"><h3 class="title">Cartas da Aventura</h3><div id="adventureCardsContent"></div></div><div class="sideSection" id="inventoryBox"><h3 class="title">Inventário</h3><div id="inventoryContent"></div></div><div class="sideSection" id="visualDiaryBox"><h3 class="title">Diário Visual</h3><div id="visualDiaryContent"></div></div><div class="sideSection" id="missionsBox"><h3 class="title">Missões</h3><div id="missionsContent"></div></div><div class="sideSection hidden" id="masterEventsBox"><h3 class="title">Eventos da Mestre</h3><div id="masterEventsContent"></div></div><div class="sideSection hidden" id="localAIBox"><h3 class="title">IA Local · Zero API</h3><p style="color:var(--muted);font-size:14px;line-height:1.35">Ollama roda no seu computador. Mestre e Ajudante usam a IA em bastidor e publicam só o que aprovarem.</p><div class="aiTabs"><button id="aiTabAsk" class="on" onclick="showAIInnerTab('ask')">Perguntar</button><button id="aiTabFunctions" onclick="showAIInnerTab('functions')">Funções da Mestre</button><button id="aiTabResponses" onclick="showAIInnerTab('responses')">Respostas</button><button id="aiTabConfig" onclick="showAIInnerTab('config')">Configuração</button></div><div id="aiPaneAsk" class="aiPane on"><label>Pergunta / ação livre</label><textarea id="aiAction" placeholder="Ex.: O que devo falar para as participantes no início do jogo?"></textarea><div class="row" style="margin-top:8px"><button class="btn small" onclick="requestAIAndShow('narrative')">Narrar cena</button><button class="btn small ghost" onclick="requestAIAndShow('question')">Perguntar</button></div><div class="aiHelp">Use <b>Narrar cena</b> para texto pronto de jogo. Use <b>Perguntar</b> para pedir orientação, ideias, pistas e condução.</div></div><div id="aiPaneFunctions" class="aiPane"><div class="masterFunctionBox"><label>Escolha uma função</label><select id="masterFunction"><option value="opening">Início da sessão</option><option value="tension">Cena de tensão</option><option value="discovery">Cena de descoberta</option><option value="clue">Criar pista</option><option value="scare">Criar susto leve</option><option value="consequence">Criar consequência</option><option value="npc">Fala de NPC</option><option value="catchup">Resumo para quem chegou atrasada</option><option value="ending">Encerrar sessão com gancho</option><option value="improvise">Improvisar fuga do plano</option><option value="riddle">Criar enigma simples</option><option value="reward">Criar recompensa</option></select><label>Detalhe opcional para a IA considerar</label><textarea id="masterFunctionDetail" placeholder="Ex.: Elas estão na Ponte Quebrada e ainda não sabem que a floresta está viva."></textarea><button class="btn small" style="margin-top:8px;width:100%" onclick="generateMasterFunction()">Gerar função</button><div class="aiHelp">A função usa o modo de velocidade escolhido em Configuração. Por padrão fica rápido e curto.</div></div></div><div id="aiPaneResponses" class="aiPane"><div id="aiStatus" class="msg" style="font-size:14px"></div><h3 class="title" style="font-size:18px;margin-top:16px">Respostas da IA</h3><div id="aiJobs" class="aiJobs"></div></div><div id="aiPaneConfig" class="aiPane"><div class="aiConfigBox"><label>Velocidade / tamanho</label><select id="aiMode"><option value="short" selected>Rápida — curta</option><option value="normal">Normal</option><option value="detailed">Detalhada</option></select><div class="aiHelp">Modo <b>Rápida</b> usa prompt menor e limita a resposta para acelerar no seu PC.</div><div class="row" style="margin-top:8px"><button class="btn small ghost" onclick="requestAIAndShow('summary')">Resumir</button><button class="btn small ghost" onclick="requestAIAndShow('image_prompt')">Criar prompt de imagem</button></div></div></div></div>`;
  }
}

function renderGame(){
  ensureGameScaffold();
  ensureSidePanels();
  if(!state)return;
  const r=state.room, m=state.map;
  const area=qs('mapArea');
  if(area){ area.classList.toggle('iceMap',isIceMap(m)); area.classList.toggle('mountainMap',isMountainMap(m)); area.classList.toggle('alexandriaMap',isAlexandriaMap(m)); area.classList.toggle('stormMap',isStormMap(m)); area.classList.toggle('raceMap',isRaceMap(m)); area.classList.toggle('voidMap',isVoidMap(m)); }
  qs('gameTitle').textContent=r.name;
  qs('roomCode').textContent=r.code;
  qs('mapSvg').innerHTML=m.image_svg||'';
  qs('mapName').textContent=m.name;
  qs('mapDesc').textContent=m.description||'';
  qs('masterMapControls')?.classList.toggle('hidden',!isMasterRole());
  qs('masterNotes')?.classList.toggle('hidden',!isStaff());
  qs('localAIBox')?.classList.toggle('hidden',!isStaff());
  qs('masterEventsBox')?.classList.toggle('hidden',!isStaff());
  qs('masterCentralBox')?.classList.toggle('hidden',!isStaff());
  qs('masterLibraryBox')?.classList.toggle('hidden',!isStaff());
  ensureEndMapButton();
  if(qs('mapSelect')) qs('mapSelect').innerHTML=(state.maps||[]).map(x=>`<option value="${x.id}" ${x.id===m.id?'selected':''}>${zoneNumberForMap(x)}. ${esc(x.name)}</option>`).join('');
  if(qs('charSelect')){
    const myPlayer=(state.players||[]).find(p=>p.username===me?.username);
    const used=new Set((state.players||[]).filter(p=>!myPlayer||p.id!==myPlayer.id).map(p=>p.character?.id).filter(Boolean));
    qs('charSelect').innerHTML=(charsCache||[]).map(c=>`<option value="${c.id}" ${used.has(c.id)?'disabled':''} ${myPlayer?.character?.id===c.id?'selected':''}>${esc(c.name)} · ${esc(c.role)}${used.has(c.id)?' — em uso':''}</option>`).join('');
  }
  safeRender('painel de função', renderRolePanel);
  safeRender('bastidores', ensureStaffSection);
  safeRender('abas', initPanelTabs);
  safeRender('mapa', renderMapGraph);
  safeRender('totens', renderTokens);
  safeRender('jogadoras', renderPlayers);
  safeRender('chat', renderChat);
  safeRender('diário da mestre', renderNotes);
  safeRender('local selecionado', renderLocationBox);
  safeRender('cartas', renderAdventureCards);
  safeRender('inventário', renderInventoryVisual);
  safeRender('diário visual', renderVisualDiary);
  safeRender('missões', renderMissions);
  safeRender('eventos da mestre', renderMasterEvents);
  safeRender('central da mestre', renderMasterCentral);
  safeRender('biblioteca da mestre', renderMasterLibrary);
  safeRender('jornada', renderJourney);
  safeRender('respostas da IA', renderAIJobs);
  safeRender('chat de bastidores', renderStaffChat);
  safeRender('status do worker', renderWorkerStatus);
  safeRender('abertura cinematográfica', renderSessionIntro);
}

/* ===== v11.1 — modelos de cartas por mapa ===== */
function cardTemplatesForMap(mapId){
  const common=[
    {kind:'mensagem',title:'Mensagem da Mestre',origin:state?.map?.name||'Terras Raras',text:'Uma mensagem especial para conduzir a cena com cuidado e imaginação.'},
    {kind:'recompensa',title:'Pequena recompensa',origin:state?.map?.name||'Terras Raras',text:'Uma recompensa simbólica por uma escolha criativa, cooperativa ou corajosa.'},
    {kind:'pista',title:'Pista descoberta',origin:state?.map?.name||'',text:'Uma pista importante foi revelada. A Mestre pode adaptar este texto para o momento da cena.'}
  ];


  if(mapId==='o_vazio' || isVoidMap(state?.map)){
    return [
      {kind:"pista",title:"Folha da Primeira Sombra",origin:"Caminho Sem Cor",text:"Uma folha da Floresta Negra recupera a cor quando alguém lembra que nem toda sombra era inimiga.\n\nPista: o Vazio se ilumina com lembranças verdadeiras."},
      {kind:"item",title:"Doce de Verdade Gentil",origin:"Jardim dos Doces Apagados",text:"Um doce sem cor volta a brilhar quando uma verdade é dita com cuidado.\n\nUso narrativo: pode reacender um símbolo apagado sem forçar ninguém."},
      {kind:"pista",title:"Eco das 03:17",origin:"Relógio Sem Som",text:"Um tique-taque curto lembra o Minuto Perdido.\n\nPista: aceitar o passado devolve tempo ao caminho final."},
      {kind:"item",title:"Fragmento do Coração de Pedra",origin:"Pedra que Pulsa",text:"Uma pedrinha morna pulsa como o Coração de Pedra.\n\nUso narrativo: ajuda o grupo a compreender antes de julgar."},
      {kind:"item",title:"Nota da Canção Congelada",origin:"Cristal Mudo",text:"Uma nota delicada que só aparece quando o grupo fala baixo.\n\nUso narrativo: protege memórias frágeis dentro do Vazio."},
      {kind:"pista",title:"Pergunta da Biblioteca Sem Páginas",origin:"Biblioteca Sem Páginas",text:"Uma estrela forma a pergunta: “o que você escolhe lembrar para iluminar quem vem depois?”\n\nPista: a resposta deve ser construída em grupo."},
      {kind:"recompensa",title:"Raio Calmo Final",origin:"Céu Sem Trovão",text:"Um raio pequeno ilumina sem assustar. Ele lembra que força e calma podem existir juntas."},
      {kind:"missao",title:"Reunir os Oito Símbolos",origin:"Coração do Vazio",text:"Folha, doce, ponteiro, pedra, cristal, livro, raio e seta precisam formar uma única lembrança.\n\nMissão: reacender a Última Luz das Terras Raras."},
      {kind:"mensagem",title:"Portal do Recomeço",origin:"Portal do Recomeço",text:"As Terras Raras estão acesas outra vez. O portal final não apaga a aventura: ele guarda espaço para novas histórias."}
    ].concat(common);
  }


  if(mapId==='correr_ou_morrer' || isRaceMap(state?.map)){
    return [
      {kind:"pista",title:"Ritmo do Caminho Vivo",origin:"Estrada que Acorda",text:"As pedras da estrada brilham quando o grupo decide junto.\n\nPista: nesta zona, velocidade sem união apaga o caminho."},
      {kind:"item",title:"Grão de Areia Luminosa",origin:"Relógio de Areia Gigante",text:"Um único grão que parou quando alguém prometeu não deixar ninguém para trás.\n\nUso narrativo: pode dar um segundo extra para uma escolha importante."},
      {kind:"item",title:"Seta Azul Cooperativa",origin:"Labirinto das Setas",text:"Uma seta pequena que só aponta quando uma personagem pergunta se a outra está pronta.\n\nUso narrativo: revela o caminho mais seguro em momentos de pressa."},
      {kind:"pista",title:"Mensagem da Linha Final",origin:"Linha do Fim do Caminho",text:"A linha brilhante pergunta: “vocês chegaram rápido ou chegaram juntas?”\n\nPista: a resposta certa abre o Portal da Última Luz."},
      {kind:"missao",title:"Chegar Juntas ao Fim do Caminho",origin:"Praça das Decisões Rápidas",text:"A estrada desaparece para quem corre sozinha e aparece para quem decide em grupo.\n\nMissão: atravessar a zona sem abandonar nenhuma personagem."},
      {kind:"recompensa",title:"Sinal do Grupo Unido",origin:"Torre do Último Sinal",text:"A torre guarda o ritmo criado pelas jogadoras. Esse sinal pode chamar o grupo de volta ao foco quando a pressa atrapalhar."},
      {kind:"mensagem",title:"Portal da Última Luz",origin:"Portal da Última Luz",text:"O portal se abre para uma paisagem quase sem forma. Do outro lado, uma pequena luz espera no escuro.\n\nA próxima zona chama: O Vazio."}
    ].concat(common);
  }

  if(mapId==='alexandria' || isAlexandriaMap(state?.map)){
    return {
      title:'Biblioteca de Alexandria',
      intro:'Conteúdo pronto para conduzir a Zona 6 com biblioteca antiga, farol, mapas vivos, perguntas boas e curiosidade segura.',
      items:[
        {title:'Página em Branco Perguntadora',origin:'Biblioteca Infinita',text:'Uma página que só revela caminhos quando a pergunta começa com “como” ou “por que”.'},
        {title:'Mapa Vivo de Alexandria',origin:'Avenida dos Mapas Vivos',text:'As linhas se mexem devagar e desenham uma rota segura até o próximo símbolo.'},
        {title:'Lâmpada do Farol Antigo',origin:'Farol das Perguntas Perdidas',text:'Uma pequena lâmpada dourada que acende quando o grupo formula uma pergunta verdadeira.'},
        {title:'Pena da Escriba',origin:'Casa da Escriba de Areia',text:'Escreve no ar por alguns segundos. Serve para registrar perguntas importantes sem perder o ritmo da cena.'},
        {title:'Chave de Pergunta',origin:'Labirinto das Estantes',text:'Não abre fechaduras comuns. Abre portas que estavam esperando a pergunta certa.'},
        {title:'Estrela de Vidro',origin:'Observatório das Estrelas Baixas',text:'Mostra uma constelação pequena apontando para o Farol.'},
        {title:'Bússola das Dúvidas Boas',origin:'Porto das Garrafas Mensageiras',text:'Gira quando alguém tenta responder rápido demais e estabiliza quando o grupo pensa junto.'},
        {title:'Selo das Estrelas Escritas',origin:'Portal das Estrelas Escritas',text:'Marca final de Alexandria. Brilha quando o Farol aceita a pergunta do grupo.'}
      ],
      npcs:[
        {title:'Nura, Guardiã dos Mapas',role:'NPC de apoio',text:'Cuida dos mapas vivos e ensina que nem todo caminho aparece antes da pergunta certa.'},
        {title:'Escriba de Areia',role:'NPC sábia',text:'Escreve histórias que o vento pode apagar, por isso pede às jogadoras que escolham bem suas palavras.'},
        {title:'Livro Sem Título',role:'Objeto vivo',text:'Um livro tímido que quer ganhar nome. Responde melhor quando o grupo faz perguntas gentis.'},
        {title:'Faroleiro das Perguntas',role:'Guardião seguro',text:'Não bloqueia por maldade. Ele protege o Farol para que sua luz não seja desperdiçada.'},
        {title:'Gato das Estantes',role:'Companheiro temporário',text:'Anda por prateleiras impossíveis e derruba apenas os livros que o grupo precisa notar.'},
        {title:'Constelação Baixa',role:'Voz do cenário',text:'Pequenas estrelas perto do chão que formam desenhos quando as jogadoras conectam ideias.'}
      ],
      riddles:[
        {title:'A Pergunta que Abre',text:'A porta da biblioteca não pede senha. Ela só abre quando alguém pergunta algo que começa com “como podemos ajudar?”.'},
        {title:'Três Símbolos do Mapa',text:'O mapa vivo mostra estrela, pena e lâmpada. O grupo precisa visitar ou nomear os três para chegar ao Farol.'},
        {title:'Livro Sem Nome',text:'O livro só revela a pista quando recebe um título escolhido pelo grupo, baseado no que aprenderam até ali.'},
        {title:'Escada que Muda',text:'A escada da biblioteca muda quando alguém tenta subir sozinho. Quando duas personagens combinam o caminho, ela fica parada.'},
        {title:'Farol sem Resposta Pronta',text:'O Farol não acende com uma resposta. Ele acende com uma pergunta honesta sobre o que a próxima zona precisa.'},
        {title:'Garrafas Mensageiras',text:'Três garrafas trazem mensagens. A correta não é a mais brilhante, mas a que faz o grupo pensar junto.'}
      ],
      phrases:[
        'A areia dourada se move em linhas finas, como se a cidade estivesse escrevendo enquanto o grupo caminha.',
        'A biblioteca respira baixo, e cada estante parece guardar uma pergunta que ainda não foi feita.',
        'No alto do Farol, uma luz apagada observa o céu como quem espera uma palavra exata.',
        'Um mapa se dobra sozinho e aponta para um caminho que não existia um segundo antes.',
        'As estrelas estão tão baixas que parecem ouvir a conversa do grupo.',
        'O livro cai aberto sem fazer barulho, mostrando uma página vazia que parece cheia de possibilidades.',
        'Alexandria não exige que as jogadoras saibam tudo. Ela só pede que tenham coragem de perguntar.'
      ],
      hooks:[
        {title:'Gancho de próxima sessão',text:'Quando a sessão pausa, o Farol pisca uma vez e desenha no céu uma nuvem em forma de templo: a Tempestade dos Deuses está chamando.'},
        {title:'Gancho do livro vivo',text:'O Livro Sem Título escreve sozinho uma frase: “uma boa pergunta pode acalmar até o céu”.'},
        {title:'Gancho do mapa dobrado',text:'O mapa vivo dobra uma ponta e revela ilhas flutuantes desenhadas com tinta de estrela.'},
        {title:'Gancho da escolha',text:'O Faroleiro pergunta: “vocês querem uma resposta rápida ou uma pergunta que leve vocês mais longe?”'}
      ]
    };
  }

  if(mapId==='tempestade_deuses' || isStormMap(state?.map)){
    return [
      {kind:'pista',title:'Ritmo dos Tambores',origin:'Ilha dos Tambores de Trovão',text:'Três batidas ecoam no céu: forte, fraca, forte.\n\nPista: os trovões desta zona são linguagem. Escutar antes de agir acalma o caminho.'},
      {kind:'item',title:'Gota Azul de Poseidon',origin:'Nuvem Azul de Poseidon',text:'Uma gota azul que não cai. Dentro dela há reflexos de ondas e nuvens.\n\nUso narrativo: representa a água do céu e pode ser unida aos outros sinais no Templo do Céu Partido.'},
      {kind:'item',title:'Fita de Luz Adormecida',origin:'Torre dos Raios Adormecidos',text:'Uma fita luminosa enrolada com cuidado. Ela brilha quando alguém toma uma decisão calma.\n\nUso narrativo: ajuda a formar o caminho até a Câmara do Raio Calmo.'},
      {kind:'pista',title:'Frase do Vento Escrito',origin:'Biblioteca dos Ventos Escritos',text:'No ar surge a frase: “o céu esqueceu a calma porque ninguém escutou todos os lados”.\n\nPista: a tempestade precisa de equilíbrio, não de vitória.'},
      {kind:'missao',title:'Despertar o Raio Calmo',origin:'Câmara do Raio Calmo',text:'No coração do templo há um raio pequeno e dourado, preso em uma esfera transparente.\n\nMissão: despertar o Raio Calmo por meio de uma escolha conjunta do grupo.'},
      {kind:'recompensa',title:'Brilho da Tempestade Serena',origin:'Olho da Tempestade Serena',text:'A chuva vira brilho e os trovões baixam a voz. O grupo sente que coragem também pode ser tranquila.'},
      {kind:'mensagem',title:'Portal da Corrida Celeste',origin:'Portal da Corrida Celeste',text:'O portal se abre no ritmo dos tambores. Do outro lado, o caminho se move e pede rapidez, união e atenção.\n\nA próxima zona chama: Correr ou Morrer.'}
    ].concat(common);
  }

  if(mapId==='alexandria' || isAlexandriaMap(state?.map)){
    return [
      {kind:'pista',title:'Concha da Primeira Pergunta',origin:'Porto das Areias Douradas',text:'Uma concha pequena repete a pergunta: “o que você procura quando não sabe o nome da resposta?”\n\nPista: Alexandria responde melhor a perguntas sinceras do que a certezas apressadas.'},
      {kind:'item',title:'Mapa Vivo de Alexandria',origin:'Avenida dos Mapas Vivos',text:'Um mapa que muda devagar quando alguém faz uma pergunta cuidadosa.\n\nUso narrativo: pode apontar o próximo local sem revelar a resposta completa.'},
      {kind:'item',title:'Palavra Rara: Curiosidade',origin:'Mercado das Palavras Raras',text:'Uma palavra brilhante guardada em vidro. Quando libertada, abre gavetas e caminhos que estavam fechados por pressa.'},
      {kind:'pista',title:'Página em Branco',origin:'Biblioteca Infinita',text:'Uma página que só revela texto quando a pergunta começa com “por que” ou “como”.\n\nPista: o segredo da zona está na pergunta certa, não na resposta rápida.'},
      {kind:'missao',title:'Encontrar a Pergunta Perdida',origin:'Câmara da Pergunta Perdida',text:'As letras flutuantes formam aos poucos uma pergunta antiga: “para que serve saber, se ninguém escuta?”\n\nMissão: levar essa pergunta ao Farol de Alexandria.'},
      {kind:'item',title:'Estrela de Vidro',origin:'Observatório das Estrelas de Vidro',text:'Uma estrela transparente que guarda o desenho de uma chave em forma de pergunta.\n\nUso narrativo: abre passagem para a Câmara da Pergunta Perdida.'},
      {kind:'recompensa',title:'Luz do Farol',origin:'Farol de Alexandria',text:'Uma luz dourada envolve o grupo por um instante. Ela lembra que conhecimento compartilhado ilumina mais do que conhecimento guardado.'},
      {kind:'mensagem',title:'Portal das Estrelas Escritas',origin:'Portal das Estrelas Escritas',text:'As páginas do portal viram sozinhas e param na frase: “a próxima resposta vive na tempestade”.\n\nA próxima zona chama pelas nuvens da Tempestade dos Deuses.'}
    ].concat(common);
  }
  if(mapId==='gelo_eterno' || isIceMap(state?.map)){
    return [
      {kind:'item',title:'Floco de Neve Cantante',origin:'Portão da Neve Silenciosa',text:'Um floco grande demais para derreter. Quando alguém fala com calma, ele vibra como uma nota musical quase esquecida.\n\nUso narrativo: pode indicar se uma escolha está aproximando o grupo da Canção Congelada.'},
      {kind:'pista',title:'Reflexo que Não Imita',origin:'Lago dos Reflexos Congelados',text:'No lago, o reflexo de uma personagem não copia seus movimentos. Ele aponta para a Torre da Aurora Fria e desenha uma pequena clave no gelo.\n\nPista: a resposta não está no que se vê, mas no que se escuta.'},
      {kind:'item',title:'Agulha de Pinheiro de Cristal',origin:'Floresta dos Pinheiros de Cristal',text:'Uma agulha transparente, fria e delicada. Ela brilha quando escuta música ou palavras gentis.\n\nUso narrativo: pode abrir passagem em locais onde o gelo parece fechado demais.'},
      {kind:'pista',title:'Sopro Azul',origin:'Caverna do Sopro Azul',text:'Um vento azul sai da caverna e forma letras no ar: “nem todo silêncio é ausência; às vezes é cuidado”.\n\nPista: o gelo protege uma memória frágil.'},
      {kind:'item',title:'Sino Pequeno de Gelo',origin:'Gruta dos Sinos de Gelo',text:'Um sino que não toca quando é sacudido, apenas quando alguém decide ouvir antes de agir.\n\nUso narrativo: pode revelar a nota que falta para completar a Canção Congelada.'},
      {kind:'missao',title:'Encontrar a nota perdida',origin:'Câmara da Canção Congelada',text:'A Canção Congelada está incompleta. Uma nota ficou presa entre medo e lembrança. O grupo precisa descobri-la sem quebrar o cristal central.'},
      {kind:'recompensa',title:'Brilho da Aurora',origin:'Torre da Aurora Fria',text:'Um brilho suave envolve o grupo por um instante. Ele não aquece o mundo inteiro, mas lembra que amizade também é uma forma de calor.'},
      {kind:'mensagem',title:'O Portal da Aurora responde',origin:'Portal da Aurora',text:'O portal solta luz azul e dourada. Ele ainda espera a última nota, mas já reconhece que as jogadoras chegaram com cuidado.'}
    ].concat(common);
  }
  if(mapId==='cidade_relogios'){
    return [
      {kind:'item',title:'Ponteiro Quebrado',origin:'Praça dos Ponteiros',text:'Um ponteiro antigo, frio ao toque, marcado com o horário 03:17. Quando alguém segura, ele vibra como se tentasse apontar para uma lembrança esquecida.\n\nUso narrativo: pode indicar a direção da próxima pista quando a cidade fica em silêncio.'},
      {kind:'pista',title:'Bilhete das 03:17',origin:'Estação Sem Trem',text:'Um bilhete incompleto com destino ao Portal do Amanhã. No canto, há uma frase quase apagada: “o trem não partiu; o minuto é que ficou preso”.\n\nPista: algo entre 03:16 e 03:18 precisa ser recuperado.'},
      {kind:'item',title:'Chave do Relojoeiro',origin:'Oficina do Relojoeiro',text:'Uma chave pequena, feita de bronze escuro, com a marca 03:17 gravada no cabo. Ela não abre portas comuns; abre mecanismos que escondem lembranças.\n\nUso narrativo: pode destravar uma gaveta, um relógio antigo ou a entrada da Torre do Relógio Central.'},
      {kind:'pista',title:'Sino Mudo',origin:'Escola do Sino Mudo',text:'O sino balança sem fazer som, mas uma das personagens sente a vibração no peito. A mensagem não vem pelos ouvidos, vem pela lembrança.\n\nPista: “ninguém esquece sozinho”.'},
      {kind:'item',title:'Ampulheta Parada',origin:'Mercado das Horas',text:'Uma ampulheta com areia dourada que não cai. Quando uma verdade é dita, um único grão se move.\n\nUso narrativo: mede sinceridade, não tempo.'},
      {kind:'missao',title:'Última Lembrança',origin:'Casa da Última Lembrança',text:'A cidade escondeu uma lembrança para não sentir tristeza. Mas uma cidade que não lembra também não consegue seguir em frente.\n\nMissão: recuperar a Última Lembrança sem procurar culpados.'},
      {kind:'pista',title:'Minuto Perdido',origin:'Fonte do Minuto Perdido',text:'O reflexo da fonte mostra o instante de 03:17. Não parece uma ameaça. Parece um pedido de ajuda.\n\nPista: o minuto não foi destruído; ele foi guardado onde ninguém queria voltar.'},
      {kind:'recompensa',title:'Portal do Amanhã',origin:'Portal do Amanhã',text:'Quando o Minuto Perdido é aceito, os relógios começam a andar. O Portal do Amanhã se abre devagar, como se a cidade finalmente respirasse.\n\nRecompensa: passagem liberada para a próxima zona.'}
    ];
  }
  if(mapId==='montanhas_arcaicas' || isMountainMap(state?.map)){
    return [
      {kind:'pista',title:'Pena do Pterodáctilo Azul',origin:'Ninho do Pterodáctilo Azul',text:'Uma pena azul que demora a cair, como se o vento estivesse segurando uma pergunta.\n\nPista: a montanha responde melhor a gestos gentis do que a gritos.'},
      {kind:'item',title:'Cristal Sonoro',origin:'Mina dos Cristais Sonoros',text:'Um cristal pequeno que guarda três notas suaves.\n\nUso narrativo: pode repetir a Canção dos Cristais para acalmar o rugido sem controlar ninguém.'},
      {kind:'pista',title:'Mapa dos Exploradores Perdidos',origin:'Abrigo dos Exploradores Perdidos',text:'Um mapa rasgado mostra a Escadaria até as Nuvens e uma frase sublinhada: “não era monstro; era aviso”.'},
      {kind:'item',title:'Fragmento do Coração de Pedra',origin:'Santuário do Coração de Pedra',text:'Uma pedrinha morna que pulsa devagar.\n\nUso narrativo: lembra ao grupo que a guardiã arcaica protege, não persegue.'},
      {kind:'missao',title:'Canção dos Cristais',origin:'Mina dos Cristais Sonoros',text:'Três notas precisam ser lembradas juntas.\n\nMissão: levar a canção até a Garganta do Rugido e escutar antes de agir.'},
      {kind:'mensagem',title:'O Rugido Debaixo da Pedra',origin:'Garganta do Rugido',text:'O rugido não parece raiva. Parece alguém chamando por ajuda do jeito que consegue.'},
      {kind:'recompensa',title:'Bênção da Guardiã Arcaica',origin:'Portal de Pedra Viva',text:'A montanha reconheceu o grupo. Por uma cena futura, a Mestre pode permitir que uma personagem perceba quando um perigo é, na verdade, um pedido de cuidado.'},
      {kind:'pista',title:'Portal de Pedra Viva',origin:'Portal de Pedra Viva',text:'Musgo luminoso forma asas e pegadas no arco.\n\nPista: o portal só abre quando o Coração de Pedra desperta.'},
      {kind:'item',title:'Fóssil Luminoso',origin:'Caverna dos Fósseis Luminosos',text:'Um fóssil pequeno que brilha quando alguém fala baixo perto dele.\n\nUso narrativo: revela memórias antigas da montanha em imagens seguras e bonitas.'},
      {kind:'item',title:'Semente de Pedra Viva',origin:'Portal de Pedra Viva',text:'Uma semente de rocha coberta por musgo verde-dourado. Ela não cresce em terra comum; cresce quando o grupo entende uma verdade antiga.'},
      {kind:'mensagem',title:'Recado da Guardiã',origin:'Santuário do Coração de Pedra',text:'A montanha não pede coragem para vencer. Ela pede cuidado para compreender.'}
    ];
  }
  if(mapId==='fabrica_doces'){
    return [
      {kind:'pista',title:'Mentira Amarga',origin:'Sala dos Sabores Proibidos',text:'Um doce escuro e brilhante, embrulhado em papel dourado. No rótulo está escrito: “Só prove se tiver coragem de dizer a verdade.”\n\nPista: A Confeiteira não aprisiona crianças. Ela aprisiona sentimentos esquecidos.'},
      {kind:'item',title:'Flor Nunca Colhida',origin:'Jardim de Açúcar Vivo',text:'Uma flor feita de caramelo claro, com pétalas finas como vidro doce.\n\nUso narrativo: pode ser oferecida à Confeiteira como prova de intenção boa.'},
      {kind:'pista',title:'Receita Esquecida da Confeiteira',origin:'Depósito Esquecido',text:'Ingredientes legíveis: uma verdade difícil, uma lembrança doce, uma escolha gentil e uma flor nunca colhida.\n\nPista: O Portal de Caramelo não abre com força. Ele abre com sinceridade.'}
    ];
  }

  if(mapId==='floresta_negra'){
    return [
      {kind:'pista',title:'Desenho da Cabana Vazia',origin:'Cabana Vazia',text:'Um desenho infantil mostra a floresta com olhos entre as árvores. No canto, alguém escreveu: “ela observa, mas nem sempre quer assustar”.'},
      {kind:'pista',title:'Sussurro das Árvores',origin:'Trilha dos Sussurros',text:'As árvores repetem nomes que ninguém disse em voz alta.\n\nPista: a floresta responde melhor quando o grupo caminha junto.'},
      {kind:'item',title:'Pedra da Escolha',origin:'Árvore dos Ossos',text:'Uma pedra pequena, pesada demais para o tamanho. Ela esquenta quando alguém precisa escolher entre medo e cuidado.'}
    ];
  }
  return common;
}

function cardKindMeta(kind){
  const map={
    pista:{label:'Pista',icon:'✦',theme:'clue'},
    item:{label:'Item',icon:'⬢',theme:'item'},
    missao:{label:'Missão',icon:'✧',theme:'mission'},
    mensagem:{label:'Mensagem Especial',icon:'✉',theme:'message'},
    recompensa:{label:'Recompensa',icon:'★',theme:'reward'}
  };
  return map[kind]||map.pista;
}
function cardStatusText(card){
  if(card.saved_at) return 'guardada';
  if(card.seen_at) return 'lida';
  return 'nova';
}
async function fetchAdventureCards(openOverlay=true){
  if(!currentRoom || !token) return;
  try{
    myAdventureCards=await api(`/rooms/${currentRoom}/cards/my`);
    sentAdventureCards=isStaff()?await api(`/rooms/${currentRoom}/cards/sent`):[];
    allAdventureCards=isStaff()?await api(`/rooms/${currentRoom}/cards/all`):[];
    renderAdventureCards();
    renderInventoryVisual();
    if(openOverlay) maybeOpenAdventureCardOverlay();
  }catch(e){}
}
function toggleCardTargetMode(){ qs('cardTargetPlayerWrap')?.classList.toggle('hidden', qs('cardTargetMode')?.value!=='one'); }
function renderAdventureCards(){
  const box=qs('adventureCardsContent'); if(!box) return;
  const inbox=(myAdventureCards||[]).slice(0,10);
  const unseen=inbox.filter(c=>!c.seen_at).length;
  const saved=inbox.filter(c=>!!c.saved_at).length;
  const targetPlayers=(state?.players||[]).filter(p=>p.username!==me?.username && p.role==='participante');
  const templates=cardTemplatesForMap(state?.map?.id);
  const templateOptions=templates.map((t,i)=>`<option value="${i}">${esc(t.title)} · ${esc(cardKindMeta(t.kind).label)}</option>`).join('');
  const defaultTemplate=templates[0]||{kind:'pista',title:'Pista descoberta',origin:state?.map?.name||'',text:''};
  const compose=isMasterRole()?`<div class="cardComposer"><div class="staffMini">Envie pistas, itens e mensagens especiais. Use modelos prontos do mapa ou escreva livremente.</div><label>Modelos rápidos do mapa</label><div class="row"><select id="cardTemplateSelect">${templateOptions}</select><button class="btn small ghost" onclick="loadCardTemplate()">Carregar modelo</button></div><label>Tipo</label><select id="cardKind"><option value="pista" ${defaultTemplate.kind==='pista'?'selected':''}>Pista</option><option value="item" ${defaultTemplate.kind==='item'?'selected':''}>Item</option><option value="missao" ${defaultTemplate.kind==='missao'?'selected':''}>Missão</option><option value="mensagem" ${defaultTemplate.kind==='mensagem'?'selected':''}>Mensagem Especial</option><option value="recompensa" ${defaultTemplate.kind==='recompensa'?'selected':''}>Recompensa</option></select><label>Título</label><input id="cardTitle" value="${esc(defaultTemplate.title)}"><label>Origem / local</label><input id="cardOrigin" value="${esc(defaultTemplate.origin)}"><label>Texto</label><textarea id="cardText" placeholder="Descreva a pista, item ou mensagem que será enviada para a jogadora.">${esc(defaultTemplate.text)}</textarea><label>Destinatário</label><select id="cardTargetMode" onchange="toggleCardTargetMode()"><option value="all">Todas as jogadoras</option><option value="one">Uma jogadora específica</option></select><div id="cardTargetPlayerWrap" class="hidden"><label>Jogadora</label><select id="cardTargetUser">${targetPlayers.map(p=>`<option value="${p.id}">${esc(p.username)}${p.character?.name?` · ${esc(p.character.name)}`:''}</option>`).join('')||'<option value="">Sem jogadoras disponíveis</option>'}</select></div><button class="btn small" style="margin-top:10px;width:100%" onclick="sendAdventureCard()">Enviar carta</button></div>`:'';
  const inboxHTML=inbox.length?inbox.map(c=>{ const meta=cardKindMeta(c.kind); return `<div class="adventureCardListItem ${meta.theme}"><div class="adventureCardListTop"><span class="miniBadge">${meta.icon} ${meta.label}</span><span class="cardStatus ${cardStatusText(c)}">${cardStatusText(c)}</span></div><b>${esc(c.title)}</b><div class="adventureCardOrigin">${esc(c.origin||'Sem origem')}</div><div class="adventureCardPreview">${esc((c.text||'').slice(0,100))}${(c.text||'').length>100?'…':''}</div><div class="securityActions"><button class="btn small ghost" onclick="openAdventureCard(${c.id})">Abrir</button>${c.saved_at?'':'<button class="btn small ghost" onclick="saveAdventureCard('+c.id+')">Guardar</button>'}</div></div>`; }).join(''):'<div class="permissionHint">Nenhuma carta recebida ainda.</div>';
  const sentHTML=isMasterRole()?`<div class="staffMini" style="margin-top:12px">Últimas cartas enviadas</div>${(sentAdventureCards||[]).slice(0,6).map(c=>{ const meta=cardKindMeta(c.kind); return `<div class="sentCardItem"><b>${meta.icon} ${esc(c.title)}</b><br><span style="color:var(--muted)">Para ${esc(c.recipient_username)} · ${esc(c.origin||'sem origem')}</span></div>`; }).join('')||'<div class="permissionHint">Nenhuma carta enviada ainda.</div>'}`:'';
  box.innerHTML=`${compose}<div class="forestCard" style="margin-top:${isMasterRole()?12:0}px"><b>Inventário de cartas</b><span style="color:var(--muted)">${unseen} nova(s) · ${saved} guardada(s)</span></div><div class="adventureCardInbox">${inboxHTML}</div>${sentHTML}`;
  toggleCardTargetMode();
}

async function sendAdventureCard(){
  const kind=qs('cardKind')?.value||'pista';
  const title=(qs('cardTitle')?.value||'').trim();
  const text=(qs('cardText')?.value||'').trim();
  const origin=(qs('cardOrigin')?.value||'').trim();
  const target=qs('cardTargetMode')?.value||'all';
  const target_user_id=target==='one'?Number(qs('cardTargetUser')?.value||0):null;
  if(!title||!text){ alert('Preencha o título e o texto da carta.'); return; }
  const res=await api(`/rooms/${currentRoom}/cards/send`,{method:'POST',body:JSON.stringify({kind,title,text,origin,target,target_user_id})});
  if(qs('cardText')) qs('cardText').value='';
  if(qs('cardTitle')) qs('cardTitle').value='';
  if(qs('cardOrigin')) qs('cardOrigin').value=state?.map?.name||'';
  await fetchAdventureCards(false);
  alert(`Carta enviada com sucesso para ${res.count} jogadora(s).`);
}
async function markAdventureCardSeen(id){
  await api(`/rooms/${currentRoom}/cards/${id}/seen`,{method:'POST'});
  myAdventureCards=myAdventureCards.map(c=>c.id===id?{...c,seen_at:new Date().toISOString()}:c);
}
async function saveAdventureCard(id){
  await api(`/rooms/${currentRoom}/cards/${id}/save`,{method:'POST'});
  await fetchAdventureCards(false);
  closeAdventureCardOverlay();
}
function maybeOpenAdventureCardOverlay(){
  if(document.querySelector('.adventureCardOverlay')) return;
  const next=(myAdventureCards||[]).find(c=>!c.seen_at);
  if(next) openAdventureCard(next.id,true);
}
async function openAdventureCard(id, auto=false){
  const card=(myAdventureCards||[]).find(c=>c.id===Number(id));
  if(!card) return;
  currentAdventureCardId=card.id;
  if(!card.seen_at){
    try{ await markAdventureCardSeen(card.id); }catch(e){}
  }
  const meta=cardKindMeta(card.kind);
  document.querySelector('.adventureCardOverlay')?.remove();
  const overlay=document.createElement('div');
  overlay.className=`adventureCardOverlay ${meta.theme}`;
  overlay.innerHTML=`<div class="adventureCardGlow"></div><div class="adventureCardFrame"><div class="adventureCardStamp">${meta.icon}</div><div class="adventureCardKicker">Carta da Aventura · ${esc(meta.label)}</div><h2>${esc(card.title)}</h2><div class="adventureCardOrigin">${esc(card.origin||'Sem origem')}</div><div class="adventureCardText">${esc(card.text||'').split('\n').join('<br>')}</div><div class="adventureCardActions"><button class="btn" onclick="saveAdventureCard(${card.id})">Guardar no inventário</button><button class="btn small ghost" onclick="closeAdventureCardOverlay()">Fechar</button></div></div>`;
  document.body.appendChild(overlay);
  setTimeout(()=>overlay.classList.add('on'),20);
  await fetchAdventureCards(false);
}

function closeAdventureCardOverlay(){
  const overlay=document.querySelector('.adventureCardOverlay');
  if(!overlay) return;
  overlay.classList.remove('on');
  setTimeout(()=>overlay.remove(),180);
  currentAdventureCardId=null;
}







/* ===== v11.2 — Jornada entre Zonas ===== */
function journeyTheme(mapId){
  const themes={
    floresta_negra:{icon:'🌲',short:'Floresta',tone:'forest'},
    fabrica_doces:{icon:'🍬',short:'Fábrica',tone:'candy'},
    cidade_relogios:{icon:'🕰️',short:'Cidade',tone:'clock'},
    montanhas_arcaicas:{icon:'⛰️',short:'Montanhas',tone:'mountain'},
    gelo_eterno:{icon:'❄️',short:'Gelo',tone:'ice'},
    alexandria:{icon:'📜',short:'Alexandria',tone:'alexandria'},
    tempestade_deuses:{icon:'⛈️',short:'Tempestade',tone:'storm'},
    correr_ou_morrer:{icon:'🏁',short:'Corrida',tone:'race'},
    o_vazio:{icon:'●',short:'Vazio',tone:'void'}
  };
  return themes[mapId]||{icon:'◆',short:'Zona',tone:'default'};
}
function journeySortedMaps(){
  return (state?.maps||[]).slice().sort((a,b)=>zoneNumberForMap(a)-zoneNumberForMap(b));
}
function journeyStatus(map){
  const active=state?.room?.active_map_id===map.id;
  const currentZone=zoneNumberForMap(state?.map)||1;
  if(active) return 'current';
  const zn=zoneNumberForMap(map);
  if(zn<currentZone) return 'done';
  if(zn===currentZone+1) return 'next';
  return 'locked';
}
function journeyStatusText(status){
  return {done:'concluída',current:'zona atual',next:'próxima',locked:'bloqueada'}[status]||status;
}
function journeyProgressPercent(){
  const maps=journeySortedMaps();
  if(!maps.length) return 0;
  const currentIndex=Math.max(0,maps.findIndex(m=>m.id===state?.room?.active_map_id));
  return Math.round((currentIndex)/(Math.max(1,maps.length-1))*100);
}
function renderJourney(){
  const box=qs('journeyContent');
  if(!box || !state?.maps || !state?.map) return;
  const maps=journeySortedMaps();
  const currentIndex=Math.max(0,maps.findIndex(m=>m.id===state.room.active_map_id));
  const current=maps[currentIndex]||state.map;
  const next=maps[currentIndex+1];
  const pct=journeyProgressPercent();
  const compact=maps.map((m,i)=>{
    const st=journeyStatus(m), th=journeyTheme(m.id);
    return `<div class="journeyNode ${st} ${th.tone}" title="${esc(m.name)}">
      <div class="journeyDot">${st==='locked'?'🔒':th.icon}</div>
      <div class="journeyNodeLabel">${i+1}</div>
    </div>`;
  }).join('');
  const cards=maps.map((m,i)=>{
    const st=journeyStatus(m), th=journeyTheme(m.id);
    const canOpen=isMasterRole() && st!=='locked';
    const action=canOpen?`<button class="btn small ghost" onclick="journeyChangeMap('${m.id}')">${st==='current'?'Reabrir':'Ir para zona'}</button>`:(isMasterRole()&&st==='next'?`<button class="btn small" onclick="journeyAdvance()">Liberar próxima</button>`:'');
    return `<div class="journeyCard ${st} ${th.tone}">
      <div class="journeyCardIcon">${st==='locked'?'🔒':th.icon}</div>
      <div class="journeyCardBody"><div class="journeyCardTop"><span>Zona ${zoneNumberForMap(m)}</span><span>${journeyStatusText(st)}</span></div><b>${esc(m.name)}</b><p>${esc(m.description||'')}</p>${action}</div>
    </div>`;
  }).join('');
  box.innerHTML=`<div class="journeyHeader">
      <div><div class="centralKicker">Campanha Terras Raras</div><h4>${esc(current?.name||'Jornada')}</h4><p>${next?`Próxima zona: ${esc(next.name)}`:'Todas as zonas conhecidas foram alcançadas.'}</p></div>
      ${isMasterRole()?'<button class="btn small" onclick="journeyAdvance()">Avançar zona</button>':''}
    </div>
    <div class="journeyRail"><div class="journeyRailLine"><div style="width:${pct}%"></div></div><div class="journeyNodes">${compact}</div></div>
    <div class="journeyHint">${state.map.id==='cidade_relogios'?'O Portal do Amanhã aponta para a próxima etapa da campanha.':(state.map.id==='montanhas_arcaicas'?'O Portal de Pedra Viva aponta para o frio do Gelo Eterno.':(state.map.id==='gelo_eterno'?'O Portal da Aurora aponta para Alexandria, onde o conhecimento antigo espera.':(state.map.id==='alexandria'?'O Portal das Estrelas Escritas aponta para a Tempestade dos Deuses.':(state.map.id==='tempestade_deuses'?'O Portal da Corrida Celeste aponta para Correr ou Morrer.':(state.map.id==='correr_ou_morrer'?'O Portal da Última Luz aponta para O Vazio, a última zona da campanha.':(state.map.id==='o_vazio'?'A Última Luz conclui a campanha principal das Terras Raras.':'Quando a Mestre encerrar o mapa atual, a próxima zona será liberada.'))))))}</div>
    <div class="journeyList">${cards}</div>`;
}
async function journeyChangeMap(mapId){
  if(!isMasterRole()) return;
  try{
    await api(`/rooms/${currentRoom}/map`,{method:'POST',body:JSON.stringify({map_id:mapId})});
    selectedNode=null;
    state=await api('/rooms/'+currentRoom);
    renderRoom();
    showZoneUnlocked(state.map);
  }catch(e){ alert(e.message); }
}
async function journeyAdvance(){
  if(!currentRoom || !state?.map)return;
  if(!confirm(`Liberar a próxima zona depois de "${state.map.name}"?`))return;
  try{
    const d=await api(`/rooms/${currentRoom}/map/end`,{method:'POST'});
    if(!d.ok){
      alert(d.message||'Não há próxima zona disponível.');
      return;
    }
    selectedNode=null;
    state=await api('/rooms/'+currentRoom);
    renderRoom();
    showZoneUnlocked(state.map);
  }catch(e){ alert(e.message); }
}
function showZoneUnlocked(map){
  if(!map) return;
  const th=journeyTheme(map.id);
  document.querySelector('.zoneUnlockedOverlay')?.remove();
  const overlay=document.createElement('div');
  overlay.className=`zoneUnlockedOverlay ${th.tone}`;
  overlay.innerHTML=`<div class="zoneUnlockedGlow"></div><div class="zoneUnlockedCard"><div class="zoneUnlockedIcon">${th.icon}</div><div class="centralKicker">Nova zona liberada</div><h2>${esc(map.name)}</h2><p>${esc(map.description||'A jornada continua.')}</p><button class="btn" onclick="closeZoneUnlocked()">Entrar na zona</button></div>`;
  document.body.appendChild(overlay);
  setTimeout(()=>overlay.classList.add('on'),20);
}
function closeZoneUnlocked(){
  const overlay=document.querySelector('.zoneUnlockedOverlay');
  if(!overlay) return;
  overlay.classList.remove('on');
  setTimeout(()=>overlay.remove(),180);
}

/* ===== v10.7 — Central da Mestre ===== */
function centralOpenPanel(label){
  const tabs=[...document.querySelectorAll('.panelTabs button')];
  const idx=tabs.findIndex(b=>b.textContent.trim()===label || b.textContent.trim().includes(label));
  if(idx>=0) openPanelTab(idx);
}
function centralMainMission(){
  const defs=missionDefinitionsForMap(state?.map?.id);
  return defs.find(m=>m.type==='main')||defs[0];
}
function centralPendingMissions(){
  return missionDefinitionsForMap(state?.map?.id).filter(m=>m.type!=='main' && !missionDone(m));
}
function centralSavedCards(){
  return (allAdventureCards||[]).filter(c=>!!c.saved_at);
}
function centralUnstoredCards(){
  return (allAdventureCards||[]).filter(c=>!c.saved_at);
}
function centralInventoryCount(){
  return (state?.players||[]).reduce((sum,p)=>sum+inventoryLines(p).length,0);
}
function centralLatestEvent(){
  return (masterEventsCache||[])[0]||null;
}
function centralActionEvent(kind='descoberta'){
  centralOpenPanel('Eventos da Mestre');
  setTimeout(()=>quickMasterEvent(kind),60);
}
function centralActionCard(){
  centralOpenPanel('Cartas da Aventura');
  setTimeout(()=>{
    if(qs('cardKind')) qs('cardKind').value='pista';
    if(qs('cardTitle')) qs('cardTitle').value=state?.map?.id==='fabrica_doces'?'Nova pista da Fábrica':(state?.map?.id==='cidade_relogios'?'Nova pista da Cidade':(state?.map?.id==='montanhas_arcaicas'?'Nova pista das Montanhas':'Nova pista da Floresta'));
    if(qs('cardOrigin')) qs('cardOrigin').value=selectedNode?.name || state?.map?.name || '';
    if(qs('cardText')) qs('cardText').value='A Mestre pode escrever aqui uma pista curta, bonita e fácil de entender.';
  },60);
}
function centralActionItem(){
  centralOpenPanel('Inventário');
  setTimeout(()=>{ if(qs('inventoryNewItem')){ qs('inventoryNewItem').value=''; qs('inventoryNewItem').focus(); } },80);
}
function centralActionMission(){
  centralOpenPanel('Missões');
}
function centralActionDiary(){
  centralOpenPanel('Diário Visual');
  setTimeout(()=>fetchAdventureDiary(),80);
}
function centralActionNote(){
  centralOpenPanel('Diário');
  setTimeout(()=>{ if(qs('noteTitle')) qs('noteTitle').value='Momento importante'; if(qs('noteText')) qs('noteText').focus(); },80);
}
function centralActionAI(){
  centralOpenPanel('IA');
  setTimeout(()=>{
    if(qs('aiAction')) qs('aiAction').value=`Ajude a Mestre a conduzir a próxima cena no mapa ${state?.map?.name||''}. Local selecionado: ${selectedNode?.name||'nenhum'}. Sugira uma ação curta, segura e criativa.`;
  },80);
}

/* ===== v12.1 — Biblioteca de Conteúdo da Mestre ===== */
function masterLibraryForMap(mapId){
  if(mapId==='montanhas_arcaicas' || isMountainMap(state?.map)){
    return {
      title:'Biblioteca das Montanhas Arcaicas',
      intro:'Conteúdo pronto para conduzir a Zona 4 com ritmo, segurança e clima cinematográfico.',
      items:[
        {title:'Fóssil Luminoso',origin:'Caverna dos Fósseis Luminosos',text:'Brilha quando alguém fala baixo. Mostra uma memória antiga sem assustar as jogadoras.'},
        {title:'Pena Azul do Pterodáctilo',origin:'Ninho do Pterodáctilo Azul',text:'Cai devagar no ar. Serve como sinal de confiança e aproximação calma.'},
        {title:'Cristal Sonoro',origin:'Mina dos Cristais Sonoros',text:'Guarda três notas suaves. Pode acalmar o rugido e abrir uma conversa com a montanha.'},
        {title:'Fragmento do Coração de Pedra',origin:'Santuário do Coração de Pedra',text:'Pedra morna que pulsa devagar. Lembra que a guardiã protege algo importante.'},
        {title:'Mapa dos Exploradores Perdidos',origin:'Abrigo dos Exploradores Perdidos',text:'Mostra atalhos, uma escadaria nas nuvens e a frase: “não era monstro; era aviso”.'},
        {title:'Semente de Pedra Viva',origin:'Portal de Pedra Viva',text:'Pequena semente de rocha e musgo. Pode ser usada como chave simbólica do portal.'}
      ],
      npcs:[
        {title:'Exploradora Lina',role:'NPC de apoio',text:'Uma exploradora jovem que se perdeu seguindo mapas antigos. Ela sabe pedir ajuda e incentiva cooperação.'},
        {title:'Reloeiro das Rochas',role:'NPC misterioso',text:'Um artesão que escuta o tempo dentro das pedras. Fala devagar e entrega pistas em forma de som.'},
        {title:'Filhote de Pterodáctilo Azul',role:'Companheiro temporário',text:'Curioso e assustado. Aproxima-se quando o grupo demonstra cuidado e paciência.'},
        {title:'Guardiã Arcaica',role:'Presença central',text:'Criatura antiga vista como monstro. Na verdade, protege o Coração de Pedra e teme que ele seja ferido.'},
        {title:'Eco da Montanha',role:'Voz do cenário',text:'Repete frases do grupo com pequenas mudanças, ajudando as jogadoras a perceber pistas.'}
      ],
      riddles:[
        {title:'Sequência dos Cristais',text:'Três cristais tocam notas diferentes. As jogadoras precisam repetir a sequência na ordem em que a montanha respirou.'},
        {title:'Pegada que não ameaça',text:'A pegada gigante aponta para longe do grupo, não para ele. O enigma é perceber que a criatura estava protegendo a passagem.'},
        {title:'Fóssil Incompleto',text:'Três pedaços de fóssil formam uma asa. Quando montados, revelam a direção do Ninho do Pterodáctilo Azul.'},
        {title:'Eco sem gritar',text:'O eco só responde quando alguém fala baixo. Se gritarem, ele devolve confusão; se sussurrarem, devolve pista.'},
        {title:'Ponte em ritmo de grupo',text:'A Ponte de Pedra Suspensa fica firme quando todas combinam o passo. O desafio é cooperação, não velocidade.'}
      ],
      phrases:[
        'O vento passa entre as pedras como se estivesse tentando lembrar uma canção muito antiga.',
        'As montanhas não parecem vazias. Parecem estar escutando cada passo do grupo.',
        'Um brilho azul corre pelo fóssil, como se uma memória tivesse acabado de acordar.',
        'O rugido atravessa a pedra, mas não soa como raiva. Parece um pedido antigo de ajuda.',
        'Lá no alto, o portal pulsa devagar, como um coração feito de musgo e rocha.',
        'A sombra enorme cruza o céu e, por um instante, todas percebem que grande não significa mau.'
      ],
      hooks:[
        {title:'Gancho de próxima sessão',text:'Quando o grupo dorme ou pausa a jornada, três notas de cristal ecoam sozinhas. No mapa dos exploradores, uma nova trilha aparece marcada em azul.'},
        {title:'Gancho de escolha difícil',text:'A guardiã deixa claro que o portal pode abrir, mas só se alguém prometer proteger a memória da montanha na próxima zona.'},
        {title:'Gancho de mistério leve',text:'A Semente de Pedra Viva brota por um segundo e aponta para uma região gelada que ainda não aparece por completo no mapa.'}
      ]
    };
  }

  if(mapId==='gelo_eterno' || isIceMap(state?.map)){
    return {
      title:'Biblioteca do Gelo Eterno',
      intro:'Conteúdo pronto para conduzir a Zona 5 com beleza, mistério leve, escuta e a Canção Congelada.',
      items:[
        {title:'Cristal de Aurora',origin:'Torre da Aurora Fria',text:'Guarda uma luz azul e rosa. Brilha quando uma personagem percebe uma pista sem forçar o gelo.'},
        {title:'Sino de Gelo',origin:'Gruta dos Sinos de Gelo',text:'Só toca quando alguém fica em silêncio por um instante. Revela uma nota da Canção Congelada.'},
        {title:'Floco de Memória',origin:'Lago dos Reflexos Congelados',text:'Mostra uma lembrança curta e segura quando repousa na palma da mão.'},
        {title:'Chave de Neve Azul',origin:'Vila Soterrada pela Neve',text:'Abre portas cobertas por gelo antigo, mas apenas quando o grupo escolhe entrar junto.'},
        {title:'Fragmento da Canção Congelada',origin:'Câmara da Canção Congelada',text:'Uma nota presa em cristal. Pode completar a melodia sem quebrar o cristal central.'},
        {title:'Mapa da Vila Soterrada',origin:'Vila Soterrada pela Neve',text:'Mostra ruas cobertas de neve e marca com brilho a passagem para o Palácio do Inverno Antigo.'},
        {title:'Lágrima de Cristal',origin:'Jardim das Estátuas de Neve',text:'Não é triste: é uma gota de lembrança guardada. Derrete quando alguém fala com cuidado.'},
        {title:'Lanterna do Inverno Antigo',origin:'Palácio do Inverno Antigo',text:'Ilumina apenas o próximo passo, lembrando que a aventura não precisa revelar tudo de uma vez.'}
      ],
      npcs:[
        {title:'Niva, a menina da neve',role:'NPC de apoio',text:'Conhece atalhos pequenos e fala como quem aprendeu a escutar o vento. Ajuda sem resolver tudo pelo grupo.'},
        {title:'Guardião da Aurora',role:'Guardião seguro',text:'Figura alta feita de luz fria. Não ameaça; testa se o grupo sabe pedir passagem com respeito.'},
        {title:'Raposa Branca Silenciosa',role:'Companheira temporária',text:'Aparece e some entre os pinheiros. Guia as jogadoras quando elas observam em vez de correr.'},
        {title:'Coral dos Cristais',role:'Voz do cenário',text:'Vários cristais que cantam juntos. Cada nota responde a uma escolha gentil do grupo.'},
        {title:'Velha Contadora do Inverno',role:'NPC narradora',text:'Guarda histórias da vila soterrada e explica que algumas memórias congelam para não se perder.'},
        {title:'Pequeno Sino Perdido',role:'Objeto vivo',text:'Um sininho tímido que quer voltar para a gruta. Ele vibra quando a nota correta está próxima.'}
      ],
      riddles:[
        {title:'Ordem dos Sinos',text:'Três sinos de gelo tocam notas diferentes. As jogadoras precisam repetir a sequência ouvindo primeiro, sem pressa.'},
        {title:'Memória Aquecida',text:'Uma lembrança congelada só aparece quando alguém diz uma palavra gentil sobre a aventura do grupo.'},
        {title:'Reflexo Verdadeiro',text:'O lago mostra três reflexos. O correto é o que não imita o movimento, mas aponta para a próxima nota.'},
        {title:'Pegadas que Somem',text:'As pegadas desaparecem quando alguém corre. Se o grupo andar junto, elas voltam a brilhar.'},
        {title:'Três Notas da Canção',text:'A Canção Congelada precisa de três notas: uma do vento, uma dos cristais e uma escolhida pelo grupo.'}
      ],
      phrases:[
        'A neve cai tão devagar que parece escolher onde vai pousar.',
        'Dentro do cristal, uma luz se move como se estivesse tentando lembrar uma música.',
        'O vento frio não empurra o grupo para trás; ele parece pedir que todas escutem melhor.',
        'A aurora dobra o céu em cores suaves, como uma cortina abrindo para uma resposta antiga.',
        'O gelo range baixo, mas não parece quebrar. Parece respirar.',
        'Uma nota delicada atravessa o silêncio e por um segundo todas entendem que o frio também pode proteger.'
      ],
      hooks:[
        {title:'Gancho de próxima sessão',text:'Quando a sessão pausa, a aurora muda de cor e desenha no céu a silhueta distante de uma biblioteca antiga.'},
        {title:'Gancho da nota perdida',text:'O Pequeno Sino Perdido toca sozinho uma única vez. No chão, surge a palavra: “Alexandria”.'},
        {title:'Gancho de escolha segura',text:'A Canção Congelada quase se completa, mas uma nota precisa ser escolhida pelas próprias jogadoras na próxima cena.'}
      ]
    };
  }


  if(mapId==='alexandria' || isAlexandriaMap(state?.map)){
    return {
      title:'Biblioteca de Alexandria',
      intro:'Conteúdo pronto para conduzir a Zona 6 com biblioteca antiga, farol, mapas vivos, perguntas boas e curiosidade segura.',
      items:[
        {title:'Página em Branco Perguntadora',origin:'Biblioteca Infinita',text:'Uma página que só revela caminhos quando a pergunta começa com “como” ou “por que”.'},
        {title:'Mapa Vivo de Alexandria',origin:'Avenida dos Mapas Vivos',text:'As linhas se mexem devagar e desenham uma rota segura até o próximo símbolo.'},
        {title:'Lâmpada do Farol Antigo',origin:'Farol das Perguntas Perdidas',text:'Uma pequena lâmpada dourada que acende quando o grupo formula uma pergunta verdadeira.'},
        {title:'Pena da Escriba',origin:'Casa da Escriba de Areia',text:'Escreve no ar por alguns segundos. Serve para registrar perguntas importantes sem perder o ritmo da cena.'},
        {title:'Chave de Pergunta',origin:'Labirinto das Estantes',text:'Não abre fechaduras comuns. Abre portas que estavam esperando a pergunta certa.'},
        {title:'Estrela de Vidro',origin:'Observatório das Estrelas Baixas',text:'Mostra uma constelação pequena apontando para o Farol.'},
        {title:'Bússola das Dúvidas Boas',origin:'Porto das Garrafas Mensageiras',text:'Gira quando alguém tenta responder rápido demais e estabiliza quando o grupo pensa junto.'},
        {title:'Selo das Estrelas Escritas',origin:'Portal das Estrelas Escritas',text:'Marca final de Alexandria. Brilha quando o Farol aceita a pergunta do grupo.'}
      ],
      npcs:[
        {title:'Nura, Guardiã dos Mapas',role:'NPC de apoio',text:'Cuida dos mapas vivos e ensina que nem todo caminho aparece antes da pergunta certa.'},
        {title:'Escriba de Areia',role:'NPC sábia',text:'Escreve histórias que o vento pode apagar, por isso pede às jogadoras que escolham bem suas palavras.'},
        {title:'Livro Sem Título',role:'Objeto vivo',text:'Um livro tímido que quer ganhar nome. Responde melhor quando o grupo faz perguntas gentis.'},
        {title:'Faroleiro das Perguntas',role:'Guardião seguro',text:'Não bloqueia por maldade. Ele protege o Farol para que sua luz não seja desperdiçada.'},
        {title:'Gato das Estantes',role:'Companheiro temporário',text:'Anda por prateleiras impossíveis e derruba apenas os livros que o grupo precisa notar.'},
        {title:'Constelação Baixa',role:'Voz do cenário',text:'Pequenas estrelas perto do chão que formam desenhos quando as jogadoras conectam ideias.'}
      ],
      riddles:[
        {title:'A Pergunta que Abre',text:'A porta da biblioteca não pede senha. Ela só abre quando alguém pergunta algo que começa com “como podemos ajudar?”.'},
        {title:'Três Símbolos do Mapa',text:'O mapa vivo mostra estrela, pena e lâmpada. O grupo precisa visitar ou nomear os três para chegar ao Farol.'},
        {title:'Livro Sem Nome',text:'O livro só revela a pista quando recebe um título escolhido pelo grupo, baseado no que aprenderam até ali.'},
        {title:'Escada que Muda',text:'A escada da biblioteca muda quando alguém tenta subir sozinho. Quando duas personagens combinam o caminho, ela fica parada.'},
        {title:'Farol sem Resposta Pronta',text:'O Farol não acende com uma resposta. Ele acende com uma pergunta honesta sobre o que a próxima zona precisa.'},
        {title:'Garrafas Mensageiras',text:'Três garrafas trazem mensagens. A correta não é a mais brilhante, mas a que faz o grupo pensar junto.'}
      ],
      phrases:[
        'A areia dourada se move em linhas finas, como se a cidade estivesse escrevendo enquanto o grupo caminha.',
        'A biblioteca respira baixo, e cada estante parece guardar uma pergunta que ainda não foi feita.',
        'No alto do Farol, uma luz apagada observa o céu como quem espera uma palavra exata.',
        'Um mapa se dobra sozinho e aponta para um caminho que não existia um segundo antes.',
        'As estrelas estão tão baixas que parecem ouvir a conversa do grupo.',
        'O livro cai aberto sem fazer barulho, mostrando uma página vazia que parece cheia de possibilidades.',
        'Alexandria não exige que as jogadoras saibam tudo. Ela só pede que tenham coragem de perguntar.'
      ],
      hooks:[
        {title:'Gancho de próxima sessão',text:'Quando a sessão pausa, o Farol pisca uma vez e desenha no céu uma nuvem em forma de templo: a Tempestade dos Deuses está chamando.'},
        {title:'Gancho do livro vivo',text:'O Livro Sem Título escreve sozinho uma frase: “uma boa pergunta pode acalmar até o céu”.'},
        {title:'Gancho do mapa dobrado',text:'O mapa vivo dobra uma ponta e revela ilhas flutuantes desenhadas com tinta de estrela.'},
        {title:'Gancho da escolha',text:'O Faroleiro pergunta: “vocês querem uma resposta rápida ou uma pergunta que leve vocês mais longe?”'}
      ]
    };
  }

  if(mapId==='tempestade_deuses' || isStormMap(state?.map)){
    return {
      title:'Biblioteca da Tempestade dos Deuses',
      intro:'Conteúdo pronto para conduzir a Zona 7 com ilhas flutuantes, equilíbrio, vento, luz e cooperação segura.',
      items:[
        {title:'Fita de Luz Adormecida',origin:'Nuvem Azul de Descanso',text:'Uma fita luminosa que só brilha quando alguém fala com calma. Ajuda a lembrar que pressa não é coragem.'},
        {title:'Tambor Pequeno de Trovão',origin:'Ilha dos Tambores de Trovão',text:'Repete ritmos simples: forte, fraco, forte. Serve para conversar com os trovões sem assustar ninguém.'},
        {title:'Gota da Chuva Suspensa',origin:'Jardim da Chuva Suspensa',text:'Uma gota que não cai. Dentro dela aparece uma lembrança da Jornada quando o grupo observa com atenção.'},
        {title:'Sopro Guardado',origin:'Ponte dos Ventos Cruzados',text:'Um vento preso em concha de nuvem. Pode empurrar suavemente uma ponte, uma porta ou uma ideia difícil.'},
        {title:'Chave do Céu Partido',origin:'Templo do Céu Partido',text:'Pequena chave com três símbolos: água, vento e luz. Abre passagens quando as forças trabalham juntas.'},
        {title:'Fragmento do Raio Calmo',origin:'Câmara do Raio Calmo',text:'Luz branca e dourada que ilumina sem ferir. Lembra que a tempestade precisa de equilíbrio, não de vitória.'},
        {title:'Mapa das Ilhas Flutuantes',origin:'Observatório das Nuvens Antigas',text:'Mostra as ilhas do céu mudando de lugar. A rota segura aparece quando o grupo escolhe um ritmo conjunto.'},
        {title:'Pulseira de Nuvem Serena',origin:'Olho da Tempestade Serena',text:'Fica leve no pulso quando o céu se acalma. Pode marcar uma personagem como guardiã temporária da calma.'}
      ],
      npcs:[
        {title:'Ari, Mensageira de Vento',role:'NPC de apoio',text:'Uma menina feita de ar e luz que ensina o grupo a respirar no ritmo do céu. Ela mostra caminhos, mas não resolve as escolhas.'},
        {title:'Tamborim, o Trovão Pequeno',role:'Companheiro temporário',text:'Um trovãozinho curioso que se comunica por batidas. Quer ser ouvido sem assustar.'},
        {title:'Guardião do Raio Calmo',role:'Guardião seguro',text:'Figura de luz dourada que testa se o grupo entende cooperação. Não ataca; pede uma escolha conjunta.'},
        {title:'Nuvem Azul de Descanso',role:'NPC-cenário',text:'Uma nuvem macia que oferece pausa, abrigo e uma pista quando as jogadoras param para conversar.'},
        {title:'Bibliotecária dos Ventos',role:'NPC misteriosa',text:'Guarda frases escritas no ar. Ela só revela a próxima frase quando alguém escuta todos os lados.'},
        {title:'Coral das Gotas Suspensas',role:'Voz do cenário',text:'Gotas de chuva que cantam lembranças das zonas anteriores e ajudam a reunir água, vento e luz.'}
      ],
      riddles:[
        {title:'Ritmo dos Tambores',text:'Os tambores fazem a sequência forte, fraco, forte. As jogadoras precisam repetir juntas, sem acelerar.'},
        {title:'Três Símbolos do Céu',text:'Água, vento e luz aparecem separados. O enigma é levar os três ao mesmo lugar sem escolher um como vencedor.'},
        {title:'Ponte que Escuta Passos',text:'A Ponte dos Ventos fica instável quando cada uma anda em ritmo diferente. Ela firma quando o grupo combina o passo.'},
        {title:'Frase do Vento Escrito',text:'Uma frase aparece incompleta no ar: “o céu esqueceu a calma porque...”. As jogadoras completam com uma resposta de escuta.'},
        {title:'Olho que Não Corre',text:'O Olho da Tempestade Serena só abre passagem se o grupo entrar devagar e escolher uma ação conjunta.'},
        {title:'Raio que Ilumina',text:'O Raio Calmo não pode ser puxado à força. Ele desperta quando as jogadoras unem água, vento, luz e uma promessa simples.'}
      ],
      phrases:[
        'O céu inteiro gira, mas no meio da tempestade existe um silêncio pequeno esperando ser encontrado.',
        'Os trovões não parecem brigar. Parecem tentar falar todos ao mesmo tempo.',
        'Uma gota de chuva fica parada diante do grupo, refletindo todas as zonas que já foram atravessadas.',
        'A nuvem sob os pés fica firme quando todas respiram no mesmo ritmo.',
        'O Raio Calmo pulsa como uma estrela pequena que aprendeu a não machucar.',
        'O vento passa entre as personagens e leva embora a pressa, deixando só a coragem tranquila.',
        'No alto, o Portal da Corrida Celeste acende por um segundo, como se estivesse treinando para abrir.'
      ],
      hooks:[
        {title:'Gancho de próxima sessão',text:'Quando a sessão pausa, o Portal da Corrida Celeste mostra por um instante uma estrada em movimento, como se o próximo mapa estivesse correndo antes delas chegarem.'},
        {title:'Gancho do ritmo perdido',text:'O Tamborim toca sozinho a sequência forte, fraco, forte. Depois acrescenta uma quarta batida que ninguém conhece ainda.'},
        {title:'Gancho da escolha do céu',text:'A tempestade se acalma, mas uma nuvem deixa no ar a pergunta: “vocês conseguem manter a calma quando tudo começar a se mover?”'},
        {title:'Gancho de memória da Jornada',text:'Uma gota suspensa mostra rapidamente a Floresta, a Fábrica, a Cidade, as Montanhas, o Gelo e Alexandria. Todas as zonas parecem torcer pelo grupo.'}
      ]
    };
  }


  if(mapId==='correr_ou_morrer' || isRaceMap(state?.map)){
    return {
      title:'Biblioteca de Correr ou Morrer',
      intro:'Conteúdo pronto para conduzir a Zona 8 com urgência segura, estrada viva, ritmo de grupo e cooperação sem abandonar ninguém.',
      items:[
        {title:'Grão de Areia Luminosa',origin:'Relógio de Areia Gigante',text:'Brilha quando o grupo usa o tempo com cuidado em vez de pressa.'},
        {title:'Seta Azul Cooperativa',origin:'Campo das Setas Contrárias',text:'Aponta para o caminho que todas conseguem atravessar juntas.'},
        {title:'Cadarço de Ritmo',origin:'Ponte dos Passos Rápidos',text:'Ajuda a marcar passos combinados para atravessar placas móveis.'},
        {title:'Apito do Fôlego Calmo',origin:'Túnel do Fôlego Curto',text:'Produz um som baixo que lembra as personagens de respirar juntas.'},
        {title:'Mapa da Estrada Viva',origin:'Estrada que Acorda',text:'Só mostra alguns metros à frente, ensinando que o grupo não precisa resolver tudo de uma vez.'},
        {title:'Pedra de Pausa',origin:'Praça das Decisões Rápidas',text:'Quando colocada no chão, cria um segundo de calma para o grupo escolher sem pânico.'},
        {title:'Lanterna da Linha Final',origin:'Linha do Fim do Caminho',text:'Ilumina a chegada sem transformar a corrida em competição.'},
        {title:'Chave da Última Luz',origin:'Portal da Última Luz',text:'Chave simbólica que abre a passagem final quando todas chegam juntas.'}
      ],
      npcs:[
        {title:'Lumi, Corredora de Luz',role:'NPC guia',text:'Corre ao lado do grupo, mas sempre volta para buscar quem ficou para trás.'},
        {title:'Marcador de Passos',role:'Objeto vivo',text:'Pequeno aparelho que conta o ritmo do grupo e vibra quando alguém está isolado.'},
        {title:'Guarda da Ponte Móvel',role:'Guardião seguro',text:'Não impede a passagem; apenas pede que o grupo prove que consegue atravessar sem se separar.'},
        {title:'Sombra do Atalho',role:'Tentação narrativa',text:'Mostra caminhos rápidos demais. Serve para ensinar que nem todo atalho é bom para o grupo.'},
        {title:'Menina do Último Sinal',role:'NPC de apoio',text:'Acende sinais na estrada e avisa que chegar junto vale mais do que chegar primeiro.'},
        {title:'Eco da Linha Final',role:'Voz do cenário',text:'Repete a frase escolhida pelo grupo para manter o ritmo até o portal.'}
      ],
      riddles:[
        {title:'Passos em Conjunto',text:'A ponte só estabiliza quando as jogadoras contam juntas: um, dois, três, vai.'},
        {title:'Setas Contrárias',text:'Três setas apontam direções diferentes. A correta é a que não separa o grupo.'},
        {title:'Relógio que Mede Cuidado',text:'O relógio de areia acelera quando alguém entra em pânico e desacelera quando todas respiram juntas.'},
        {title:'Túnel do Fôlego',text:'A saída do túnel aparece quando cada jogadora diz uma palavra curta de incentivo.'},
        {title:'Atalho Brilhante',text:'O atalho parece lindo, mas apaga as pegadas de quem ficou para trás. A solução é escolher o caminho mais justo.'},
        {title:'Último Sinal',text:'A torre final acende quando o grupo repete o ritmo criado durante a travessia.'}
      ],
      phrases:[
        'A estrada aparece poucos passos à frente, como se confiasse que o grupo saberá decidir junto.',
        'As pedras brilham sob os pés quando ninguém fica para trás.',
        'O vento passa rápido, mas não empurra. Ele convida o grupo a encontrar um ritmo comum.',
        'Uma seta azul surge no chão e espera todas olharem antes de apontar o caminho.',
        'A areia luminosa cai devagar por um segundo, dando ao grupo a chance de respirar.',
        'A linha final não parece uma chegada individual. Parece uma porta que só abre para uma equipe.',
        'Correr, aqui, não significa abandonar o cuidado. Significa escolher rápido sem esquecer ninguém.'
      ],
      hooks:[
        {title:'Gancho de próxima sessão',text:'Quando a sessão pausa, a Linha Final acende ao longe e uma pequena luz além dela pisca como uma estrela quase apagada.'},
        {title:'Gancho do atalho',text:'A Sombra do Atalho oferece um caminho rápido, mas a Seta Azul aponta para quem ficou um passo atrás.'},
        {title:'Gancho do ritmo do grupo',text:'O Marcador de Passos grava o ritmo criado pelas jogadoras. Esse ritmo poderá reacender uma luz no mapa final.'},
        {title:'Gancho da Última Luz',text:'Ao abrir o portal, o grupo ouve uma frase baixa: “o último lugar não precisa ser vencido; precisa ser lembrado”.'}
      ]
    };
  }

  if(mapId==='o_vazio' || (state?.map?.name||'').toLowerCase().includes('vazio')){
    return {
      title:'Biblioteca do O Vazio',
      intro:'Conteúdo pronto para conduzir a Zona 9, fechar a campanha com emoção, segurança e memória da jornada inteira.',
      items:[
        {title:'Centelha da Última Luz',origin:'A Última Luz',text:'Uma pequena luz quente que cabe na palma da mão. Brilha quando o grupo lembra algo bonito de uma zona anterior.'},
        {title:'Página em Branco das Terras Raras',origin:'Biblioteca Sem Páginas',text:'Uma página que só aparece quando alguém decide escrever o que quer levar da aventura.'},
        {title:'Estrela Apagada',origin:'Céu Sem Estrelas',text:'Parece escura no começo, mas acende quando uma personagem divide uma lembrança com o grupo.'},
        {title:'Fio de Caminho Lembrado',origin:'Estrada que Quase Some',text:'Um fio luminoso que mostra que o caminho percorrido não desapareceu; ele virou parte da história.'},
        {title:'Símbolo das Nove Zonas',origin:'Espelho da Jornada Inteira',text:'Um pequeno emblema com marcas da floresta, doce, relógio, pedra, gelo, livro, céu, estrada e luz.'},
        {title:'Chave do Recomeço',origin:'Portal do Recomeço',text:'Não abre uma porta comum. Abre a possibilidade de uma nova aventura quando a campanha termina.'},
        {title:'Eco Gentil do Grupo',origin:'Câmara dos Ecos Bons',text:'Repete uma frase boa dita por alguma jogadora em sessões anteriores, ajudando o final a ficar pessoal.'},
        {title:'Lanterna das Histórias Lembradas',origin:'Caminho das Lembranças',text:'Ilumina cenas antigas da jornada sem prender ninguém ao passado. Serve para recapitular antes do final.'}
      ],
      npcs:[
        {title:'Guardiã da Última Luz',role:'Presença final segura',text:'Uma figura calma feita de brilho suave. Ela não julga o grupo; pergunta o que elas querem proteger nas Terras Raras.'},
        {title:'Eco das Primeiras Pegadas',role:'Voz da Jornada',text:'Uma voz que lembra o começo da aventura e mostra como as personagens cresceram desde a Floresta Negra.'},
        {title:'Pequena Estrela Perdida',role:'Companheira temporária',text:'Uma estrelinha tímida que acha que não brilha mais. Acende quando as jogadoras a incluem na história.'},
        {title:'Escriba Sem Páginas',role:'NPC de encerramento',text:'Guarda livros invisíveis e pede que o grupo conte o final com suas próprias palavras.'},
        {title:'O Vazio Silencioso',role:'Cenário vivo',text:'Não é vilão. É o espaço onde histórias esquecidas esperam ser lembradas com cuidado.'},
        {title:'Memória da Mestre',role:'Ferramenta narrativa',text:'Uma presença simbólica que permite à Mestre trazer de volta cartas, itens e escolhas importantes das zonas anteriores.'}
      ],
      riddles:[
        {title:'Nove Luzes da Jornada',text:'Cada jogadora escolhe uma lembrança de uma zona. Quando as lembranças são ditas, nove pontos de luz formam o caminho até o centro.'},
        {title:'A Página que Espera',text:'A página em branco não aceita resposta certa ou errada. Ela só se preenche quando o grupo escolhe uma frase final para a campanha.'},
        {title:'Estrela que Não Brilha Sozinha',text:'Uma estrela apagada só acende quando duas personagens lembram juntas de um momento de cooperação.'},
        {title:'O Eco Gentil',text:'O eco repete frases do grupo. A pista aparece quando as jogadoras respondem com uma frase de coragem, amizade ou cuidado.'},
        {title:'Símbolo Incompleto',text:'O símbolo final tem oito marcas e falta a nona. A nona marca é criada pelo grupo, representando o que aprenderam.'},
        {title:'Portal do Recomeço',text:'O portal não abre com chave física. Ele abre quando todas escolhem uma memória para guardar e uma esperança para levar adiante.'}
      ],
      phrases:[
        'O escuro não parece vazio de verdade. Parece uma página esperando a primeira palavra.',
        'Uma estrela pequena pisca longe, como se tivesse reconhecido o som dos passos do grupo.',
        'As lembranças das zonas anteriores flutuam no ar como lanternas que ninguém precisa segurar sozinho.',
        'O silêncio do Vazio não assusta. Ele escuta.',
        'A Última Luz cresce devagar, iluminando primeiro os rostos das personagens e depois o caminho inteiro.',
        'Por um instante, a Floresta, a Fábrica, a Cidade, as Montanhas, o Gelo, Alexandria, a Tempestade e a Corrida parecem respirar juntas.',
        'O portal final não chama com pressa. Ele espera o grupo terminar a história do jeito certo.',
        'A luz não vence o Vazio como uma batalha. Ela o transforma em lugar de recomeço.'
      ],
      hooks:[
        {title:'Gancho de epílogo',text:'Depois que a Última Luz acende, cada personagem vê uma pequena porta com seu próprio símbolo. Atrás dela pode existir uma aventura futura.'},
        {title:'Gancho de nova campanha',text:'O Portal do Recomeço se abre por um segundo e mostra um mapa totalmente novo, ainda sem nome, esperando ser desenhado.'},
        {title:'Gancho emocional',text:'A Pequena Estrela Perdida escolhe acompanhar o grupo por mais um tempo, para lembrar que nenhuma história boa termina de verdade.'},
        {title:'Gancho da Mestre',text:'A página final pede uma frase escrita pela própria mesa: “Nas Terras Raras, nós aprendemos que...”'},
        {title:'Gancho de celebração',text:'Quando a sessão termina, a Última Luz se divide em pequenas faíscas e cada jogadora recebe uma como lembrança da campanha.'}
      ]
    };
  }


  return {
    title:'Biblioteca da Mestre',intro:'Conteúdo de apoio aparece completo para Montanhas Arcaicas, Gelo Eterno, Alexandria, Tempestade dos Deuses, Correr ou Morrer e O Vazio. A campanha principal está fechada em conteúdo.',
    items:[],npcs:[],riddles:[],phrases:['Descreva o cenário pelos sentidos: som, luz, cheiro, textura e uma escolha clara.'],hooks:[]
  };
}
function libraryCardHTML(kind, item, i){
  return `<div class="libraryTile ${kind}"><div class="libraryTop"><b>${esc(item.title||item)}</b><span>${esc(item.origin||item.role||kind)}</span></div><p>${esc(item.text||item)}</p><div class="libraryActions"><button class="btn small ghost" onclick="libraryToEvent('${kind}',${i})">Evento</button><button class="btn small ghost" onclick="libraryToCard('${kind}',${i})">Carta</button>${kind==='items'?`<button class="btn small ghost" onclick="libraryToItem(${i})">Item</button>`:''}</div></div>`;
}
function renderMasterLibrary(){
  const box=qs('masterLibraryContent');
  if(!box || !isStaff()) return;
  const lib=masterLibraryForMap(state?.map?.id);
  const items=lib.items.map((x,i)=>libraryCardHTML('items',x,i)).join('');
  const npcs=lib.npcs.map((x,i)=>libraryCardHTML('npcs',x,i)).join('');
  const riddles=lib.riddles.map((x,i)=>libraryCardHTML('riddles',x,i)).join('');
  const phrases=lib.phrases.map((x,i)=>libraryCardHTML('phrases',x,i)).join('');
  const hooks=lib.hooks.map((x,i)=>libraryCardHTML('hooks',x,i)).join('');
  box.innerHTML=`<div class="libraryHero"><div class="centralKicker">v17.3 · campanha auditada</div><h4>${esc(lib.title)}</h4><p>${esc(lib.intro)}</p></div>
    <div class="libraryQuick"><button class="btn small" onclick="libraryFillMapScene()">Cena pronta do mapa</button><button class="btn small ghost" onclick="libraryPromptAI()">Pedir variação à IA</button></div>
    <label>Itens prontos</label><div class="libraryGrid">${items||'<div class="permissionHint">Sem itens específicos para este mapa.</div>'}</div>
    <label>NPCs seguros</label><div class="libraryGrid">${npcs||'<div class="permissionHint">Sem NPCs específicos para este mapa.</div>'}</div>
    <label>Enigmas simples</label><div class="libraryGrid">${riddles||'<div class="permissionHint">Sem enigmas específicos para este mapa.</div>'}</div>
    <label>Frases cinematográficas</label><div class="libraryGrid">${phrases}</div>
    <label>Ganchos de próxima sessão</label><div class="libraryGrid">${hooks||'<div class="permissionHint">Sem ganchos específicos para este mapa.</div>'}</div>`;
}
function libraryGet(kind,i){
  const lib=masterLibraryForMap(state?.map?.id);
  const arr=lib[kind]||[];
  const raw=arr[Number(i)];
  if(!raw) return null;
  return typeof raw==='string'?{title:'Frase cinematográfica',origin:state?.map?.name||'Terras Raras',text:raw}:raw;
}
function libraryToEvent(kind,i){
  const item=libraryGet(kind,i); if(!item) return;
  centralOpenPanel('Eventos da Mestre');
  const mapKind=kind==='npcs'?'npc':kind==='riddles'?'escolha':kind==='items'?'item':kind==='hooks'?'ambiente':'descoberta';
  setTimeout(()=>{
    if(qs('masterEventKind')) qs('masterEventKind').value=mapKind;
    if(qs('masterEventTitle')) qs('masterEventTitle').value=item.title||`Cena de ${state?.map?.name||'Terras Raras'}`;
    if(qs('masterEventText')) qs('masterEventText').value=item.text||'';
    if(qs('masterEventSensory')) qs('masterEventSensory').value=(kind==='phrases')?'Som do vento, brilho nas pedras e silêncio atento.':'Detalhe visual, som suave e sensação de escolha segura.';
    if(qs('masterEventChoice')) qs('masterEventChoice').value='Investigar com calma, conversar, observar melhor ou seguir juntas.';
  },60);
}
function libraryToCard(kind,i){
  const item=libraryGet(kind,i); if(!item) return;
  centralOpenPanel('Cartas da Aventura');
  setTimeout(()=>{
    if(qs('cardKind')) qs('cardKind').value=kind==='items'?'item':kind==='riddles'?'missao':kind==='hooks'?'mensagem':'pista';
    if(qs('cardTitle')) qs('cardTitle').value=item.title||`Carta de ${state?.map?.name||'Terras Raras'}`;
    if(qs('cardOrigin')) qs('cardOrigin').value=item.origin||state?.map?.name||'Terras Raras';
    if(qs('cardText')) qs('cardText').value=item.text||'';
  },60);
}
function libraryToItem(i){
  const item=libraryGet('items',i); if(!item) return;
  centralOpenPanel('Inventário');
  setTimeout(()=>{ if(qs('inventoryNewItem')) qs('inventoryNewItem').value=item.title; },60);
}
function libraryFillMapScene(){ libraryToEvent('phrases',0); }
function libraryFillMountainScene(){ libraryFillMapScene(); }
function libraryPromptAI(){
  const lib=masterLibraryForMap(state?.map?.id);
  if(qs('aiAction')) qs('aiAction').value=`Crie uma variação curta, segura e cinematográfica para a Mestre usar em ${state?.map?.name||'Terras Raras'}. Use este material da biblioteca como base: ${lib.phrases.slice(0,3).join(' / ')}. Traga: título, acontecimento, percepção sensorial e escolha aberta.`;
  centralOpenPanel('IA');
}

function renderMasterCentral(){
  const box=qs('masterCentralContent');
  if(!box || !isStaff() || !state?.room) return;
  const main=centralMainMission();
  const mainPct=main?missionProgress(main):0;
  const pending=centralPendingMissions();
  const next=pending[0];
  const latest=centralLatestEvent();
  const cardsPending=centralUnstoredCards().length;
  const cardsSaved=centralSavedCards().length;
  const itemsCount=centralInventoryCount();
  const playersCount=(state.players||[]).length;
  const sessionStatus=(state.room.session_status||'waiting')==='active'?'ativa':(state.room.session_status||'waiting')==='waiting'?'em espera':'encerrada';
  box.innerHTML=`<div class="centralHero">
      <div>
        <div class="centralKicker">Visão rápida da sessão</div>
        <h4>${esc(state.room.name||'Mesa')}</h4>
        <p>${esc(state.map?.name||'Mapa')} · sessão ${esc(sessionStatus)} · ${playersCount} jogadora(s)</p>
      </div>
      <button class="btn small" onclick="openConductionMode()">Modo condução</button>
    </div>
    <div class="centralGrid">
      <div class="centralCard"><span>Local selecionado</span><b>${esc(selectedNode?.name||'Nenhum')}</b></div>
      <div class="centralCard"><span>Totens</span><b>${esc(String(state.room.tokens_used||0))}/${esc(String(state.room.token_capacity||'?'))}</b></div>
      <div class="centralCard"><span>Cartas guardadas</span><b>${cardsSaved}</b></div>
      <div class="centralCard"><span>Itens em jogo</span><b>${itemsCount}</b></div>
    </div>
    <div class="centralMission">
      <div class="missionTop"><span>Missão principal</span><span>${mainPct}%</span></div>
      <b>${esc(main?.title||'Sem missão')}</b>
      <p>${esc(main?.text||'')}</p>
      <div class="missionBar"><div style="width:${mainPct}%"></div></div>
    </div>
    <div class="centralNext">
      <b>Próximo objetivo sugerido</b>
      <p>${next?esc(next.title+' — '+next.text):'Todos os objetivos essenciais deste mapa foram concluídos ou ainda não há objetivo pendente.'}</p>
    </div>
    <label>Ações rápidas</label>
    <div class="centralActionGrid">
      <button class="btn small" onclick="centralActionEvent('descoberta')">Disparar evento</button>
      <button class="btn small" onclick="centralActionCard()">Enviar carta</button>
      <button class="btn small" onclick="centralActionItem()">Entregar item</button>
      <button class="btn small ghost" onclick="centralActionMission()">Marcar missão</button>
      <button class="btn small ghost" onclick="centralActionNote()">Salvar nota</button>
      <button class="btn small ghost" onclick="centralActionAI()">Pedir ajuda da IA</button>
      <button class="btn small ghost" onclick="centralOpenPanel('Biblioteca da Mestre')">Biblioteca</button>
      <button class="btn small ghost" onclick="centralActionDiary()">Diário visual</button>
      <button class="btn small ghost" onclick="generateAdventureSummary(); centralOpenPanel('Diário Visual')">Gerar resumo</button>
    </div>
    <label>Pendências da sessão</label>
    <div class="centralPending">
      <div><b>${pending.length}</b><span>missões pendentes</span></div>
      <div><b>${cardsPending}</b><span>cartas ainda não guardadas</span></div>
      <div><b>${latest?esc(latest.title):'Nenhum'}</b><span>último evento</span></div>
    </div>`;
}
function openConductionMode(){
  const main=centralMainMission();
  const pending=centralPendingMissions();
  const next=pending[0];
  document.querySelector('.conductionOverlay')?.remove();
  const overlay=document.createElement('div');
  overlay.className='conductionOverlay';
  overlay.innerHTML=`<div class="conductionPanel">
    <div class="centralKicker">Modo condução da Mestre</div>
    <h2>${esc(state?.map?.name||'Terras Raras')}</h2>
    <div class="conductionFocus">
      <span>Missão principal</span>
      <b>${esc(main?.title||'Sem missão')}</b>
      <div class="missionBar"><div style="width:${missionProgress(main||{})}%"></div></div>
    </div>
    <div class="conductionFocus">
      <span>Próximo objetivo</span>
      <b>${next?esc(next.title):'Sem pendência essencial'}</b>
      <p>${next?esc(next.text):'Use este momento para recapitular, abrir um portal ou encerrar com gancho.'}</p>
    </div>
    <div class="conductionButtons">
      <button class="btn" onclick="closeConductionMode();centralActionEvent('susto')">Susto leve</button>
      <button class="btn" onclick="closeConductionMode();centralActionEvent('descoberta')">Descoberta</button>
      <button class="btn" onclick="closeConductionMode();centralActionCard()">Carta rápida</button>
      <button class="btn" onclick="closeConductionMode();centralActionAI()">IA</button>
      <button class="btn ghost" onclick="closeConductionMode();centralActionNote()">Nota</button>
      <button class="btn ghost" onclick="closeConductionMode()">Fechar</button>
    </div>
  </div>`;
  document.body.appendChild(overlay);
  setTimeout(()=>overlay.classList.add('on'),20);
}
function closeConductionMode(){
  const overlay=document.querySelector('.conductionOverlay');
  if(!overlay) return;
  overlay.classList.remove('on');
  setTimeout(()=>overlay.remove(),180);
}

/* ===== v10.6 — Diário Visual da Aventura ===== */
function diaryKindMeta(kind, subkind){
  const map={
    session:{label:'Sessão',icon:'☀',theme:'session'},
    master_event:{label:'Evento da Mestre',icon:'⚡',theme:'event'},
    card:{label:'Carta recebida',icon:'✦',theme:'card'},
    saved_card:{label:'Carta guardada',icon:'⬢',theme:'saved'},
    note:{label:'Nota',icon:'✎',theme:'note'},
    mission:{label:'Missão concluída',icon:'✓',theme:'mission'},
    inventory:{label:'Item no inventário',icon:'◆',theme:'inventory'}
  };
  return map[kind]||map.note;
}
function diaryDateText(iso){
  if(!iso) return '';
  try{
    const d=new Date(iso);
    return d.toLocaleString('pt-BR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'});
  }catch(e){return '';}
}
async function fetchAdventureDiary(){
  if(!currentRoom || !token) return;
  try{
    const res=await api(`/rooms/${currentRoom}/diary/timeline`);
    adventureDiaryTimeline=res.entries||[];
    renderVisualDiary();
  }catch(e){}
}
function renderVisualDiary(){
  const box=qs('visualDiaryContent');
  if(!box) return;
  const entries=(adventureDiaryTimeline||[]).slice(-18).reverse();
  const staffActions=isStaff()?`<div class="diaryActions"><button class="btn small" onclick="generateAdventureSummary()">Gerar resumo da sessão</button><button class="btn small ghost" onclick="fetchAdventureDiary()">Atualizar diário</button></div>`:'<button class="btn small ghost" style="width:100%;margin-bottom:8px" onclick="fetchAdventureDiary()">Atualizar diário</button>';
  const draftHTML=adventureDiaryDraft && isStaff()?`<div class="diaryDraft"><label>Título do resumo</label><input id="diarySummaryTitle" value="${esc(adventureDiaryDraft.title||'Resumo da sessão')}"><label>Resumo editável</label><textarea id="diarySummaryText">${esc(adventureDiaryDraft.text||'')}</textarea><div class="diaryActions"><button class="btn small" onclick="saveAdventureSummary()">Salvar no diário</button><button class="btn small ghost" onclick="copyAdventureSummaryToAI()">Usar como recapitulação IA</button></div></div>`:'';
  const entriesHTML=entries.length?entries.map(e=>{
    const meta=diaryKindMeta(e.kind,e.subkind);
    return `<div class="diaryEntry ${meta.theme}"><div class="diaryIcon">${meta.icon}</div><div class="diaryBody"><div class="diaryTop"><span>${meta.label}</span><span>${diaryDateText(e.created_at)}</span></div><b>${esc(e.title||'Registro')}</b><p>${esc(e.text||'').replace(/\n/g,'<br>')}</p>${e.actor?`<small>por ${esc(e.actor)}</small>`:''}</div></div>`;
  }).join(''):'<div class="permissionHint">O diário visual ainda não tem registros. Ele será preenchido com eventos, cartas, missões, itens e notas.</div>';
  box.innerHTML=`<div class="forestCard"><b>Linha do tempo</b><span style="color:var(--muted)">${(adventureDiaryTimeline||[]).length} registro(s) da aventura</span></div>${staffActions}${draftHTML}<div class="diaryTimeline">${entriesHTML}</div>`;
}
async function generateAdventureSummary(){
  try{
    adventureDiaryDraft=await api(`/rooms/${currentRoom}/diary/summary-draft`);
    renderVisualDiary();
  }catch(e){ alert(e.message); }
}
async function saveAdventureSummary(){
  const title=(qs('diarySummaryTitle')?.value||'Resumo da sessão').trim();
  const text=(qs('diarySummaryText')?.value||'').trim();
  if(!text){ alert('O resumo está vazio.'); return; }
  await api(`/rooms/${currentRoom}/notes`,{method:'POST',body:JSON.stringify({title,text})});
  adventureDiaryDraft=null;
  state=await api('/rooms/'+currentRoom);
  await fetchAdventureDiary();
  renderRoom();
  alert('Resumo salvo no diário da aventura.');
}
function copyAdventureSummaryToAI(){
  const text=(qs('diarySummaryText')?.value||'').trim();
  if(qs('aiAction')) qs('aiAction').value=`Transforme este resumo em uma recapitulação curta, cinematográfica e segura para abrir a próxima sessão:\n\n${text}`;
  const idx=[...document.querySelectorAll('.panelTabs button')].findIndex(b=>b.textContent.trim()==='IA');
  if(idx>=0) openPanelTab(idx);
}

/* ===== v10.5 — Inventário visual por personagem ===== */
function inventoryLines(player){
  return String(player?.inventory||'').split(/\n+/).map(x=>x.trim()).filter(Boolean);
}
function setInventoryLines(player, lines){
  return [...new Set(lines.map(x=>String(x||'').trim()).filter(Boolean))].join('\n');
}
function myRoomPlayer(){
  return (state?.players||[]).find(p=>p.username===me?.username) || state?.me;
}
function cardsForPlayer(player){
  if(!player) return [];
  const username=player.username;
  const source=isStaff()?allAdventureCards:myAdventureCards;
  return (source||[]).filter(c=>c.recipient_username===username && c.saved_at);
}
function renderInventoryVisual(){
  const box=qs('inventoryContent');
  if(!box || !state?.players) return;
  if(isStaff()){
    const players=state.players||[];
    const selectedId=Number(qs('inventoryPlayerSelect')?.value || players[0]?.id || 0);
    const selected=players.find(p=>p.id===selectedId) || players[0];
    const playerOptions=players.map(p=>`<option value="${p.id}" ${selected?.id===p.id?'selected':''}>${esc(p.character?.name||p.username)} · ${esc(p.username)}</option>`).join('');
    const items=inventoryLines(selected);
    const savedCards=cardsForPlayer(selected);
    box.innerHTML=`<div class="inventoryControl">
      <label>Personagem / jogadora</label><select id="inventoryPlayerSelect" onchange="renderInventoryVisual()">${playerOptions}</select>
      <div class="inventoryHero"><div class="inventoryAvatar">${selected?.character?.avatar_svg||''}</div><div><b>${esc(selected?.character?.name||selected?.username||'Personagem')}</b><br><span>${esc(selected?.character?.role||'Jogadora')}</span><br><small>${esc(selected?.username||'')}</small></div></div>
      <label>Entregar item</label><input id="inventoryNewItem" placeholder="Ex.: Chave de Açúcar Queimado"><button class="btn small" style="margin-top:8px;width:100%" onclick="addInventoryItem()">Entregar item</button>
      <label style="margin-top:12px">Itens atuais</label>
      <div class="inventoryGrid">${items.length?items.map((it,i)=>`<div class="inventoryTile"><div class="inventoryIcon">⬢</div><b>${esc(it)}</b><button class="btn small ghost" onclick="removeInventoryItem(${i})">Remover</button></div>`).join(''):'<div class="permissionHint">Sem itens registrados.</div>'}</div>
      <label style="margin-top:12px">Cartas guardadas por ela</label>
      <div class="inventoryGrid">${savedCards.length?savedCards.map(c=>`<div class="inventoryTile card"><div class="inventoryIcon">✦</div><b>${esc(c.title)}</b><span>${esc(c.origin||'Carta')}</span><button class="btn small ghost" onclick="cardToInventoryItem(${selected.id},'${esc(String(c.title).replace(/'/g,"&#39;"))}')">Virar item</button></div>`).join(''):'<div class="permissionHint">Nenhuma carta guardada ainda.</div>'}</div>
    </div>`;
  }else{
    const p=myRoomPlayer();
    const items=inventoryLines(p);
    const savedCards=cardsForPlayer(p);
    box.innerHTML=`<div class="inventoryHero"><div class="inventoryAvatar">${p?.character?.avatar_svg||''}</div><div><b>${esc(p?.character?.name||p?.username||'Minha personagem')}</b><br><span>${esc(p?.character?.role||'Jogadora')}</span></div></div>
      <label>Meus itens</label><div class="inventoryGrid">${items.length?items.map(it=>`<div class="inventoryTile"><div class="inventoryIcon">⬢</div><b>${esc(it)}</b><button class="btn small ghost" onclick="useInventoryItem('${esc(String(it).replace(/'/g,"&#39;"))}')">Usar na cena</button></div>`).join(''):'<div class="permissionHint">Você ainda não recebeu itens especiais.</div>'}</div>
      <label style="margin-top:12px">Minhas cartas guardadas</label><div class="inventoryGrid">${savedCards.length?savedCards.map(c=>`<div class="inventoryTile card"><div class="inventoryIcon">✦</div><b>${esc(c.title)}</b><span>${esc(c.origin||'Carta')}</span><button class="btn small ghost" onclick="openAdventureCard(${c.id})">Abrir</button></div>`).join(''):'<div class="permissionHint">Guarde cartas para reler aqui.</div>'}</div>`;
  }
}
async function addInventoryItem(){
  const playerId=Number(qs('inventoryPlayerSelect')?.value||0);
  const item=(qs('inventoryNewItem')?.value||'').trim();
  const p=(state?.players||[]).find(x=>x.id===playerId);
  if(!p||!item){ alert('Escolha uma jogadora e escreva o item.'); return; }
  const inventory=setInventoryLines(p,[...inventoryLines(p),item]);
  await api(`/rooms/${currentRoom}/inventory/add`,{method:'POST',body:JSON.stringify({player_id:playerId,item})});
  state=await api('/rooms/'+currentRoom);
  renderRoom();
}
async function removeInventoryItem(index){
  const playerId=Number(qs('inventoryPlayerSelect')?.value||0);
  const p=(state?.players||[]).find(x=>x.id===playerId);
  if(!p) return;
  const lines=inventoryLines(p);
  lines.splice(index,1);
  await api(`/rooms/${currentRoom}/inventory/remove`,{method:'POST',body:JSON.stringify({player_id:playerId,index})});
  state=await api('/rooms/'+currentRoom);
  renderRoom();
}
async function cardToInventoryItem(playerId,title){
  const p=(state?.players||[]).find(x=>x.id===Number(playerId));
  if(!p) return;
  await api(`/rooms/${currentRoom}/inventory/add`,{method:'POST',body:JSON.stringify({player_id:p.id,item:title})});
  state=await api('/rooms/'+currentRoom);
  renderRoom();
}
function useInventoryItem(item){
  const input=qs('chatText');
  if(input){
    input.value=`Minha personagem quer usar: ${item}`;
    input.focus();
  }
  const idx=[...document.querySelectorAll('.panelTabs button')].findIndex(b=>b.textContent.trim()==='Chat');
  if(idx>=0) openPanelTab(idx);
}
/* ===== v10.4 — Eventos da Mestre + Caixa Criativa ===== */
function masterEventMeta(kind){
  const map={
    susto:{label:'Susto leve',icon:'⚡',theme:'scare'},
    descoberta:{label:'Descoberta',icon:'✦',theme:'discovery'},
    consequencia:{label:'Consequência',icon:'◆',theme:'consequence'},
    ambiente:{label:'Ambiente',icon:'◌',theme:'ambient'},
    npc:{label:'NPC aparece',icon:'☽',theme:'npc'},
    portal:{label:'Portal reage',icon:'✧',theme:'portal'},
    item:{label:'Objeto brilha',icon:'⬢',theme:'item'},
    perigo:{label:'Perigo se aproxima',icon:'⚠',theme:'danger'},
    escolha:{label:'Momento de escolha',icon:'◇',theme:'choice'},
    livre:{label:'Livre',icon:'✎',theme:'free'}
  };
  return map[kind]||map.livre;
}
function quickMasterEvent(kind){
  const cityPresets={
    susto:['Todos os relógios tremem','Por um segundo, todos os relógios da cidade vibram ao mesmo tempo. Nenhum ponteiro anda, mas todas sentem que a cidade tentou lembrar alguma coisa.','Tique-taque curto, vidro tremendo, ar frio nas mãos.','Vocês procuram de onde veio a vibração ou seguem para o próximo local?'],
    descoberta:['Uma janela acende sozinha','Uma janela distante se acende sem ninguém por perto. No vidro, aparece por alguns segundos o desenho de um ponteiro quebrado.','Luz amarela, poeira no ar, reflexo de números no chão.','Vocês seguem a luz ou investigam o lugar onde estão?'],
    consequencia:['O ponteiro anda um segundo','Um ponteiro parado se move exatamente um segundo e volta para 03:17. A cidade parece prender a respiração.','Som seco de engrenagem, sombra mudando de lugar, silêncio depois.','O grupo tenta repetir o movimento ou procura o que mudou no cenário?'],
    ambiente:['A rua repete o mesmo instante','A rua fica quieta e, por um momento, as mesmas folhas passam duas vezes pelo mesmo lugar. O tempo não está andando direito aqui.','Vento repetido, passos ecoando duas vezes, luz parada.','Vocês quebram a repetição ou observam o padrão?'],
    npc:['O Relojoeiro deixa um sinal','Uma pequena engrenagem aparece no chão, girando sem tocar em nada. Parece um recado de alguém que não quer aparecer ainda.','Metal frio, brilho de bronze, cheiro de oficina antiga.','Vocês pegam a engrenagem ou perguntam quem deixou o sinal?'],
    portal:['O Portal do Amanhã pulsa','Ao longe, o Portal do Amanhã solta um brilho curto. Ele ainda não abre, mas reconheceu algum avanço das jogadoras.','Luz dourada, números flutuando, calor leve no ar.','O que ainda falta lembrar para o portal abrir?'],
    item:['A Ampulheta Parada chama atenção','Uma ampulheta aparece sobre uma superfície próxima. A areia não cai, mas um grão se move quando alguém fala com sinceridade.','Areia dourada parada, vidro frio, som quase inaudível.','Quem segura a ampulheta e o que decide dizer?'],
    perigo:['O eco se aproxima','Um eco repete: “não foi culpa sua”. A frase vem de longe, depois de perto, depois de dentro da própria rua.','Voz baixa, parede vibrando, sombra longa sem dono.','Vocês respondem ao eco ou seguem para a Casa da Última Lembrança?'],
    escolha:['O minuto espera uma escolha','A cidade fica imóvel. A cena parece pedir uma decisão: continuar evitando a lembrança ou encarar o que aconteceu às 03:17.','Silêncio total, relógios observando, respiração das personagens em destaque.','Vocês procuram a verdade ou tentam abrir o portal sem lembrar?']
  };
  const mountainPresets={
    susto:['Pedrinhas começam a flutuar','Pequenas pedras sobem alguns centímetros do chão quando o rugido ecoa ao longe. Elas caem devagar, sem machucar ninguém.','Vibração grave, poeira brilhando, vento frio entre as rochas.','Vocês seguem o som ou procuram abrigo para escutar melhor?'],
    descoberta:['Um fóssil acende','Um fóssil na parede da caverna brilha em azul e revela a sombra de uma asa antiga apontando para o vale.','Luz azul suave, parede úmida, sombra enorme no teto.','Vocês copiam o desenho ou seguem a direção da sombra?'],
    consequencia:['A ponte responde ao ritmo','A ponte de pedra vibra quando alguém se apressa, mas fica firme quando o grupo combina os passos.','Pedra rangendo, cristais tilintando, vento empurrando de leve.','Vocês atravessam juntas ou procuram outro caminho?'],
    ambiente:['O vento conta uma memória','O vento passa entre as rochas e desenha no pó uma cena antiga: uma criatura enorme protegendo algo pequeno.','Assobio longo, poeira formando imagens, cheiro de chuva distante.','Vocês perguntam ao vento o que aconteceu ou seguem a imagem?'],
    npc:['O pterodáctilo azul aparece','Uma sombra cruza o céu. Um pterodáctilo azul pousa longe, deixa uma pena cair e espera sem atacar.','Bater de asas, pena azul flutuando, silêncio respeitoso.','Vocês se aproximam com calma ou observam de longe?'],
    portal:['O Portal de Pedra Viva pulsa','Musgo luminoso se acende no arco de pedra. O portal ainda não abriu, mas reconheceu um gesto de compreensão.','Brilho verde-dourado, rocha morna, som de coração lento.','O que ainda falta para despertar o Coração de Pedra?'],
    item:['Um cristal guarda uma nota','Um cristal pequeno vibra sozinho e repete três notas suaves, como se ensinasse uma canção esquecida.','Som claro, luz azul, sensação de calma no peito.','Quem tenta repetir a melodia?'],
    perigo:['O rugido pede escuta','Um rugido profundo atravessa a garganta da montanha. Ele parece menos uma ameaça e mais um pedido que ninguém entendeu.','Som grave, chão tremendo, pedrinhas saltando.','Vocês respondem com a canção ou chamam pela guardiã?'],
    escolha:['Medo ou compreensão','A montanha fica quieta. A cena pede uma escolha: tratar a guardiã como monstro ou tentar entender o que ela protege.','Silêncio alto, vento parado, coração da pedra pulsando.','Vocês avançam com cuidado ou recuam para juntar mais pistas?']
  };
  const icePresets={
    susto:['O gelo canta baixinho','Um som muito fino atravessa a neve, como se alguém tivesse tocado uma taça de cristal ao longe. Nada ameaça o grupo, mas todas percebem que a zona ouviu alguma coisa.','Som cristalino, neve parada no ar, frio leve nas mãos.','Vocês seguem o som ou ficam em silêncio para ouvir melhor?'],
    descoberta:['Um reflexo aponta o caminho','No gelo, um reflexo que não pertence a ninguém desenha uma nota musical e aponta para longe.','Brilho azul no chão, respiração visível, desenho surgindo no gelo.','Vocês copiam a nota ou seguem imediatamente a direção indicada?'],
    consequencia:['Uma nota volta para o cristal','Depois de uma escolha do grupo, uma nota luminosa sai do ar e entra no cristal central. A Canção Congelada ficou um pouco mais completa.','Luz suave, eco musical, sensação de alívio no peito.','O grupo procura a próxima nota ou tenta entender o que essa nota significa?'],
    ambiente:['A neve para de cair','Por alguns segundos, a neve fica suspensa no ar. O silêncio parece respeitoso, como se o mapa esperasse uma decisão gentil.','Flocos imóveis, luz azulada, som quase ausente.','Vocês falam com o gelo ou caminham sem quebrar o silêncio?'],
    npc:['Uma presença de neve guia o grupo','Uma pequena figura feita de neve aparece entre os pinheiros. Ela não fala, mas deixa pegadas claras na direção de uma gruta.','Passos leves, neve brilhante, olhar curioso e tranquilo.','Vocês seguem a presença ou deixam um presente de amizade?'],
    portal:['O Portal da Aurora acende uma cor','O arco de gelo no horizonte brilha em uma cor nova. O portal ainda não abriu, mas reconheceu uma nota da canção.','Luz azul e dourada, ar menos frio, som de coral distante.','Qual nota ainda falta para completar a Canção Congelada?'],
    item:['Um sino pequeno aparece','Um sino de gelo surge pendurado em um galho. Ele não toca quando balança, mas vibra quando alguém promete ouvir antes de agir.','Vidro frio, brilho branco, vibração suave.','Quem guarda o sino e quando ele deve ser usado?'],
    perigo:['A ponte estala sob o medo','A ponte de gelo faz um estalo longo quando alguém se apressa. Ao respirar com calma, ela volta a brilhar por baixo dos pés.','Estalo fino, vento baixo, coração acelerando e depois acalmando.','Vocês atravessam juntas no ritmo da canção ou procuram outro caminho?'],
    escolha:['Quebrar ou libertar','O cristal da canção pulsa diante do grupo. A cena pede uma escolha: forçar a saída ou libertar a música com cuidado.','Luz dentro do cristal, silêncio alto, aurora distante.','Vocês cantam a sequência com paciência ou tentam abrir o cristal à força?']
  };

  const alexandriaPresets={
    susto:['Um livro respira sozinho','Um livro antigo se abre e fecha como se estivesse respirando. Não assusta por maldade; parece tentar chamar atenção para uma página ainda em branco.','Papel antigo, poeira dourada, som de páginas virando devagar.','Vocês leem a página ou perguntam o que o livro quer mostrar?'],
    descoberta:['Um mapa desenha novo caminho','No chão, linhas douradas surgem como tinta viva e desenham um caminho que não estava ali. O traço termina em um ponto de interrogação.','Areia brilhando, tinta dourada, cheiro de pergaminho novo.','Vocês seguem o mapa ou tentam entender a pergunta primeiro?'],
    consequencia:['A porta muda a pergunta','Depois de uma resposta apressada, a porta do Salão das Perguntas apaga suas letras e escreve outra pergunta mais simples.','Luz baixa, letras se reorganizando, silêncio paciente.','Vocês respondem de novo com calma ou pedem uma pista?'],
    ambiente:['As estrelas aparecem de dia','O céu claro de Alexandria se enche de pequenas estrelas visíveis. Elas piscam na mesma direção do farol apagado.','Brilho no céu, vento quente, sombra das colunas no chão.','Vocês seguem as estrelas ou procuram um mapa celeste?'],
    npc:['A Bibliotecária de Areia aparece','Uma figura feita de areia dourada e lenço azul surge entre as estantes. Ela não entrega respostas; oferece uma pergunta melhor.','Areia movendo em silêncio, voz calma, perfume de papiro.','Vocês aceitam a pergunta dela ou explicam o que já descobriram?'],
    portal:['O Farol tenta acender','No alto da cidade, o Farol de Alexandria solta um brilho curto. Ele ainda não abriu o portal, mas reconheceu uma pergunta sincera.','Luz dourada, estrelas pequenas, som de páginas virando.','Qual pergunta ainda falta levar ao farol?'],
    item:['Uma estrela de vidro cai','Uma estrela de vidro desce do teto e pousa sem quebrar. Dentro dela há uma chave em forma de ponto de interrogação.','Vidro frio, brilho suave, reflexo de letras antigas.','Quem guarda a estrela e qual porta ela deve abrir?'],
    perigo:['O labirinto fecha o atalho','As estantes se movem e fecham um caminho quando alguém tenta correr. Um título brilha e sugere: “leia antes de avançar”.','Madeira rangendo, páginas tremendo, passos abafados.','Vocês param para ler ou procuram outro corredor?'],
    escolha:['Saber ou escutar','A Câmara da Pergunta Perdida fica silenciosa. A cena pede uma escolha: usar conhecimento para vencer ou para escutar melhor.','Letras flutuantes, pedestal vazio, luz dourada no chão.','Vocês respondem sozinhas ou constroem a pergunta juntas?']
  };

  const stormPresets={
    susto:['Um trovão fala baixo','Um trovão distante ecoa como tambor, mas não ameaça. Ele parece chamar o grupo para ouvir o ritmo antes de avançar.','Som profundo, vento circular, luz dourada nas nuvens.','Vocês repetem o ritmo ou procuram de onde veio o som?'],
    descoberta:['A chuva revela um sinal','Gotas ficam suspensas no ar e desenham três símbolos: água, vento e luz. Eles brilham na direção do Templo do Céu Partido.','Chuva parada, brilho azul, cheiro de ar limpo.','Qual símbolo vocês procuram primeiro?'],
    consequencia:['O vento muda de lado','Depois da escolha do grupo, o vento para de empurrar e começa a guiar. Um caminho de nuvens se forma por alguns segundos.','Cabelo balançando, nuvem firme sob os pés, silêncio de surpresa.','Vocês seguem agora ou marcam o caminho para voltar depois?'],
    ambiente:['A tempestade abre um olho calmo','As nuvens giram ao redor de um círculo azul. Dentro dele, tudo fica silencioso e leve.','Céu azul no centro, trovões baixos, ar fresco.','Vocês entram no silêncio ou observam de fora?'],
    npc:['Uma mensageira de vento aparece','Uma pequena figura feita de ar e luz surge sobre a ponte. Ela não dá respostas, apenas mostra como respirar no ritmo do céu.','Véu de vento, voz suave, luz nos pés.','Vocês seguem o ritmo dela ou fazem uma pergunta?'],
    portal:['O Portal da Corrida Celeste pulsa','O arco de vento e luz aparece por um instante. Ele ainda não abriu, mas reconheceu que a tempestade está mais calma.','Luz clara, ritmo de tambor, nuvens alinhadas.','O que ainda falta equilibrar antes de atravessar?'],
    item:['Uma fita de luz pousa no chão','Uma fita luminosa cai devagar e se enrola como pulseira. Ela só brilha quando alguém fala com calma.','Luz morna, som de faísca pequena, vento tranquilo.','Quem guarda a fita e quando ela deve ser usada?'],
    perigo:['Os degraus somem depressa','Os degraus de relâmpago aparecem e somem rápido demais quando o grupo se apressa. Ao desacelerar, eles voltam a ficar firmes.','Clarões curtos, vento forte, coração acelerado.','Vocês tentam correr ou encontram um ritmo conjunto?'],
    escolha:['Força ou equilíbrio','O Raio Calmo pulsa diante do grupo. A cena pede uma escolha: tentar mandar na tempestade ou convidá-la a se equilibrar.','Esfera transparente, luz branca e dourada, silêncio no centro do céu.','Vocês escolhem controlar ou cooperar?']
  };


  const racePresets={
    susto:['A estrada some por um segundo','O caminho à frente pisca e desaparece por um instante, mas volta quando o grupo para de correr separado.','Luz no chão, vento rápido, silêncio curto.','Vocês respiram juntas ou tentam avançar mesmo assim?'],
    descoberta:['Uma seta azul aparece','Entre muitas setas confusas, uma seta azul surge quando uma personagem ajuda outra a escolher.','Brilho azul, som de passo leve, ar fresco.','Vocês seguem a seta azul ou investigam as outras?'],
    consequencia:['O atalho cobra um preço','Um atalho se abre, mas deixa claro que só uma parte do grupo passaria por ele. A zona espera uma decisão.','Placas tremendo, areia luminosa, sensação de pressa.','Vocês aceitam o atalho ou procuram um caminho para todas?'],
    ambiente:['A estrada acelera','As pedras do chão começam a surgir mais rápido. O cenário não ameaça, mas pede atenção e ritmo.','Pedras acendendo, poeira dourada, coração animado.','Qual ritmo o grupo escolhe para continuar unido?'],
    npc:['Um corredor de luz aparece','Uma pequena figura feita de brilho corre ao lado do grupo e aponta para quem ficou um passo atrás.','Rastro luminoso, voz suave, passos rápidos.','Vocês seguem o corredor ou param para entender o aviso?'],
    portal:['O Portal da Última Luz responde','No fim do caminho, uma luz pequena aparece e desaparece. Ela não chama a mais rápida; chama o grupo inteiro.','Luz distante, estrada estreita, silêncio importante.','O que falta para chegarem juntas ao portal?'],
    item:['Um grão de areia para no ar','Um grão luminoso fica parado diante do grupo, como se oferecesse um segundo extra para pensar.','Areia dourada, som pequeno, brilho quente.','Quem guarda esse segundo e quando ele deve ser usado?'],
    perigo:['As placas giram depressa','As placas da ponte giram rápido demais quando alguém tenta passar sem combinar. Elas desaceleram ao ouvir contagem conjunta.','Metal claro, vento na lateral, placas virando.','Vocês contam juntas ou procuram outro caminho?'],
    escolha:['Rápido ou junto','A estrada apresenta dois caminhos: um curto para poucas pessoas e um mais longo para todas. A zona espera uma decisão do grupo.','Duas trilhas, luz dividida, silêncio de escolha.','Vocês escolhem chegar primeiro ou chegar juntas?']
  };

  const voidPresets={
    susto:['Uma estrela apaga e volta','Uma estrela pequena desaparece por um instante, mas reacende quando o grupo chama uma lembrança boa da Jornada.','Escuro macio, brilho distante, silêncio atento.','Qual lembrança vocês usam para reacender a estrela?'],
    descoberta:['Um símbolo antigo aparece','No chão surgem oito marcas: folha, doce, ponteiro, pedra, cristal, livro, raio e seta. Elas brilham fracas, esperando serem reunidas.','Marcas luminosas, ar calmo, sensação de final importante.','Qual símbolo vocês reconhecem primeiro?'],
    consequencia:['O Vazio ganha uma cor','Depois da escolha do grupo, uma faixa de cor atravessa o cenário e transforma um pedaço do caminho em memória viva.','Cor surgindo no escuro, brilho suave, eco de risada distante.','Vocês seguem a cor ou procuram de onde ela veio?'],
    ambiente:['As zonas anteriores ecoam','Por alguns segundos, o Vazio mostra árvores, doces, relógios, montanhas, gelo, livros, nuvens e estrada na mesma paisagem.','Imagens sobrepostas, luz baixa, som de páginas e vento.','Qual zona chama mais atenção agora?'],
    npc:['Um Eco da Jornada se aproxima','Uma presença feita de luz pequena aparece. Ela fala com vozes misturadas de todas as zonas e pergunta o que o grupo deseja guardar.','Voz suave, contorno luminoso, passos sem peso.','Vocês respondem juntas ou cada uma oferece uma lembrança?'],
    portal:['A Última Luz pulsa','No centro do Vazio, uma luz pequena pulsa devagar. Ela não pede pressa; pede que a Jornada seja lembrada com carinho.','Calor leve, círculo de luz, silêncio bonito.','O que ainda falta lembrar antes de reacender a luz?'],
    item:['Um fragmento de história cai','Um pedacinho de luz cai como uma página rasgada. Ele mostra uma cena antiga da campanha e espera ser colocado no lugar certo.','Página brilhante, poeira de estrela, memória breve.','Quem reconhece essa cena e onde ela se encaixa?'],
    perigo:['O caminho esquece uma parte','Um trecho do caminho fica transparente quando o grupo tenta avançar sem conversar. Ele volta a aparecer quando todas escolhem juntas.','Chão sumindo devagar, luz fraca, respiração suspensa.','Vocês param para decidir ou tentam seguir no improviso?'],
    escolha:['Guardar ou esquecer','O Coração do Vazio oferece uma escolha: deixar uma lembrança descansar ou levá-la como luz para novas aventuras.','Símbolos girando, luz baixa, sensação de despedida.','O que vocês escolhem guardar das Terras Raras?']
  };


  const genericPresets={
    susto:['Algo mudou no ar','Um som pequeno demais para ser normal ecoa perto das jogadoras. Por um instante, tudo parece prender a respiração.','Som baixo, luz tremendo, cheiro estranho no ar.','Vocês investigam ou seguem em frente?'],
    descoberta:['Nova descoberta','Um detalhe que parecia comum revela uma pista escondida. A aventura acabou de mudar de direção.','Brilho suave, marca antiga, sensação de segredo revelado.','Quem vai olhar mais de perto?'],
    consequencia:['Uma consequência aparece','A escolha feita há pouco provoca uma reação no cenário. Nada quebra a segurança do jogo, mas o caminho fica diferente.','Movimento lento, engrenagens rangendo, folhas ou doces se mexendo.','O grupo aceita a consequência ou tenta contornar?'],
    ambiente:['O ambiente se transforma','A luz, o cheiro e os sons mudam de uma vez, como se o próprio mapa estivesse respondendo.','Mudança de cor, vento leve, cheiro marcante.','O que essa mudança quer indicar?'],
    npc:['Alguém aparece','Uma presença surge no limite da cena. Ela não ataca; observa, espera e talvez queira falar.','Silhueta, passos leves, voz distante.','Vocês chamam essa presença ou se escondem?'],
    portal:['O portal reage','O portal vibra por um segundo, como se tivesse escutado uma verdade importante.','Brilho no arco, calor leve, som de caramelo ou raízes.','O que ainda falta para ele abrir?'],
    item:['Um objeto chama atenção','Um objeto próximo começa a brilhar, pedir cuidado ou revelar que não estava ali por acaso.','Reflexo dourado, textura estranha, pequeno som mágico.','Quem pega o objeto primeiro?'],
    perigo:['Perigo se aproxima','Algo se aproxima sem pressa. Não é hora de pânico, mas é hora de decidir rápido.','Passos, sombra longa, cheiro mais forte.','Vocês correm, conversam ou procuram proteção?'],
    escolha:['Momento de escolha','A cena fica quieta. O jogo parece esperar uma decisão sincera do grupo.','Silêncio, olhar das personagens, sensação de caminho dividido.','Qual caminho vocês escolhem?']
  };
  const presets=state?.map?.id==='cidade_relogios'?cityPresets:(state?.map?.id==='montanhas_arcaicas'?mountainPresets:(state?.map?.id==='gelo_eterno'?icePresets:(state?.map?.id==='alexandria'?alexandriaPresets:(state?.map?.id==='tempestade_deuses'?stormPresets:(state?.map?.id==='correr_ou_morrer'?racePresets:(state?.map?.id==='o_vazio'?voidPresets:genericPresets))))));
  const p=presets[kind]||presets.descoberta;
  if(qs('masterEventKind')) qs('masterEventKind').value=kind;
  if(qs('masterEventTitle')) qs('masterEventTitle').value=p[0];
  if(qs('masterEventText')) qs('masterEventText').value=p[1];
  if(qs('masterEventSensory')) qs('masterEventSensory').value=p[2];
  if(qs('masterEventChoice')) qs('masterEventChoice').value=p[3];
}

async function fetchMasterEvents(openOverlay=true){
  if(!currentRoom || !token) return;
  try{
    masterEventsCache=await api(`/rooms/${currentRoom}/master-events`);
    renderMasterEvents();
    if(openOverlay) maybeOpenMasterEventOverlay();
  }catch(e){}
}
function renderMasterEvents(){
  const box=qs('masterEventsContent');
  if(!box || !isStaff()) return;
  const recent=(masterEventsCache||[]).slice(0,8);
  const quickKinds=['susto','descoberta','consequencia','ambiente','npc','portal','item','perigo','escolha'];
  const quickHTML=`<div class="quickEventGrid">${quickKinds.map(k=>{const m=masterEventMeta(k);return `<button class="quickEventBtn ${m.theme}" onclick="quickMasterEvent('${k}')"><span>${m.icon}</span>${m.label}</button>`;}).join('')}</div>`;
  const recentHTML=recent.length?recent.map(e=>{const m=masterEventMeta(e.kind);return `<div class="masterEventItem ${m.theme}"><div class="missionTop"><span class="missionBadge">${m.icon} ${m.label}</span><span>${e.visibility==='private'?'só mestre':'mostrado'}</span></div><b>${esc(e.title)}</b><p>${esc((e.text||'').slice(0,140))}${(e.text||'').length>140?'…':''}</p></div>`;}).join(''):'<div class="permissionHint">Nenhum evento criado ainda.</div>';
  box.innerHTML=`<div class="staffMini">Botões rápidos dão ritmo. As caixas criativas ajudam a Mestre inventar detalhes próprios.</div>
    <label>Eventos rápidos</label>${quickHTML}
    <div class="masterEventComposer">
      <label>Tipo do evento</label><select id="masterEventKind"><option value="susto">Susto leve</option><option value="descoberta">Descoberta</option><option value="consequencia">Consequência</option><option value="ambiente">Mudança de ambiente</option><option value="npc">NPC aparece</option><option value="portal">Portal reage</option><option value="item">Objeto brilha</option><option value="perigo">Perigo se aproxima</option><option value="escolha">Momento de escolha</option><option value="livre">Livre</option></select>
      <label>Título do evento</label><input id="masterEventTitle" placeholder="Ex.: O cheiro de açúcar queimado aumentou">
      <label>O que aconteceu?</label><textarea id="masterEventText" placeholder="Descreva o acontecimento principal em poucas frases."></textarea>
      <label>Como as jogadoras percebem?</label><textarea id="masterEventSensory" placeholder="Som, cheiro, luz, movimento, sensação..."></textarea>
      <label>Qual escolha isso abre?</label><textarea id="masterEventChoice" placeholder="Ex.: investigar, seguir em frente, conversar, recuar..."></textarea>
      <div class="eventActionGrid"><button class="btn small" onclick="sendMasterEvent('public')">Mostrar para jogadoras</button><button class="btn small ghost" onclick="sendMasterEvent('private')">Salvar só para Mestre</button><button class="btn small ghost" onclick="eventToCardDraft()">Transformar em carta</button><button class="btn small ghost" onclick="askAIForEvent()">Pedir ajuda da IA</button></div>
    </div>
    <label>Últimos eventos</label><div class="masterEventList">${recentHTML}</div>`;
}
async function sendMasterEvent(visibility='public'){
  const kind=qs('masterEventKind')?.value||'livre';
  const title=(qs('masterEventTitle')?.value||'').trim();
  const text=(qs('masterEventText')?.value||'').trim();
  const sensory=(qs('masterEventSensory')?.value||'').trim();
  const choice=(qs('masterEventChoice')?.value||'').trim();
  if(!title||!text){ alert('Preencha o título e o que aconteceu.'); return; }
  await api(`/rooms/${currentRoom}/master-events`,{method:'POST',body:JSON.stringify({kind,title,text,sensory,choice,visibility})});
  if(visibility==='public') alert('Evento mostrado para as jogadoras.');
  else alert('Evento salvo só para Mestre.');
  ['masterEventTitle','masterEventText','masterEventSensory','masterEventChoice'].forEach(id=>{if(qs(id))qs(id).value='';});
  await fetchMasterEvents(false);
}
function eventToCardDraft(){
  const title=(qs('masterEventTitle')?.value||'').trim();
  const text=(qs('masterEventText')?.value||'').trim();
  const sensory=(qs('masterEventSensory')?.value||'').trim();
  const choice=(qs('masterEventChoice')?.value||'').trim();
  const kind=qs('masterEventKind')?.value||'livre';
  const cardKind = kind==='item'?'item':kind==='escolha'?'missao':kind==='descoberta'?'pista':'mensagem';
  if(qs('cardKind')) qs('cardKind').value=cardKind;
  if(qs('cardTitle')) qs('cardTitle').value=title||'Evento revelado';
  if(qs('cardOrigin')) qs('cardOrigin').value=state?.map?.name||'Evento da Mestre';
  if(qs('cardText')) qs('cardText').value=[text,sensory?`Como vocês percebem: ${sensory}`:'',choice?`Escolha aberta: ${choice}`:''].filter(Boolean).join('\n\n');
  const idx=[...document.querySelectorAll('.panelTabs button')].findIndex(b=>b.textContent.trim()==='Cartas da Aventura');
  if(idx>=0) openPanelTab(idx);
}
function askAIForEvent(){
  const kind=qs('masterEventKind')?.value||'livre';
  const title=(qs('masterEventTitle')?.value||'').trim();
  const text=(qs('masterEventText')?.value||'').trim();
  const prompt=`Crie um evento curto e seguro para a Mestre disparar agora no mapa ${state?.map?.name||''}. Tipo: ${kind}. Ideia inicial: ${title} ${text}. Traga: título, o que aconteceu, como as jogadoras percebem e qual escolha isso abre.`;
  if(qs('aiAction')) qs('aiAction').value=prompt;
  const idx=[...document.querySelectorAll('.panelTabs button')].findIndex(b=>b.textContent.trim()==='IA');
  if(idx>=0) openPanelTab(idx);
  requestAIAndShow('question');
}
function masterEventSeenKey(id){ return `tr_master_event_seen_${currentRoom}_${id}`; }
function maybeOpenMasterEventOverlay(){
  if(document.querySelector('.masterEventOverlay')) return;
  const ev=(masterEventsCache||[]).slice().reverse().find(e=>e.visibility==='public' && sessionStorage.getItem(masterEventSeenKey(e.id))!=='1');
  if(ev) openMasterEventOverlay(ev.id);
}
function openMasterEventOverlay(id){
  const ev=(masterEventsCache||[]).find(e=>e.id===Number(id));
  if(!ev) return;
  sessionStorage.setItem(masterEventSeenKey(ev.id),'1');
  const meta=masterEventMeta(ev.kind);
  document.querySelector('.masterEventOverlay')?.remove();
  const overlay=document.createElement('div');
  overlay.className=`masterEventOverlay ${meta.theme}`;
  overlay.innerHTML=`<div class="masterEventGlow"></div><div class="masterEventFrame"><div class="masterEventIcon">${meta.icon}</div><div class="masterEventKicker">Evento da Mestre · ${esc(meta.label)}</div><h2>${esc(ev.title)}</h2><p>${esc(ev.text||'')}</p>${ev.sensory?`<div class="masterEventSensory"><b>Como vocês percebem</b><br>${esc(ev.sensory)}</div>`:''}${ev.choice?`<div class="masterEventChoice"><b>Escolha aberta</b><br>${esc(ev.choice)}</div>`:''}<button class="btn" onclick="closeMasterEventOverlay()">Continuar</button></div>`;
  document.body.appendChild(overlay);
  setTimeout(()=>overlay.classList.add('on'),20);
}
function closeMasterEventOverlay(){
  const overlay=document.querySelector('.masterEventOverlay');
  if(!overlay) return;
  overlay.classList.remove('on');
  setTimeout(()=>overlay.remove(),180);
}

/* ===== v10.3 — Sistema de Missões ===== */
function missionDefinitionsForMap(mapId){
  if(mapId==='fabrica_doces'){
    return [
      {
        key:'mission:fabrica:principal',
        type:'main',
        title:'Abrir o Portal de Caramelo',
        text:'Descobrir por que a fábrica continua funcionando sozinha e convencer a Confeiteira a permitir a passagem.',
        depends:['fabrica:viva','fabrica:mentira_amarga','fabrica:confeiteira_nao_vila','fabrica:flor_nunca_colhida','fabrica:coracao_mecanico','portal_released']
      },
      {key:'fabrica:viva',type:'story',title:'Descobrir que a fábrica está viva',text:'Perceber que as máquinas, os doces e os corredores respondem às escolhas das jogadoras.'},
      {key:'fabrica:mentira_amarga',type:'clue',title:'Ativar a Mentira Amarga',text:'Encontrar o doce que reage à sinceridade e revela que a alegria falsa prende.'},
      {key:'fabrica:confeiteira_nao_vila',type:'clue',title:'Entender a Confeiteira',text:'Descobrir que ela não é vilã; está presa à missão de fabricar alegria.'},
      {key:'fabrica:flor_nunca_colhida',type:'item',title:'Encontrar a Flor Nunca Colhida',text:'Pegar a flor de caramelo sem quebrar o Jardim de Açúcar Vivo.'},
      {key:'fabrica:coracao_mecanico',type:'choice',title:'Acalmar ou consertar o coração mecânico',text:'Escolher entre desligar, consertar ou acalmar o coração da fábrica.'},
      {key:'portal_released',type:'portal',title:'Liberar o Portal de Caramelo',text:'Conseguir que o caramelo amoleça quando a Confeiteira aceita a passagem.'}
    ];
  }
  if(mapId==='cidade_relogios'){
    return [
      {
        key:'mission:cidade:principal',
        type:'main',
        title:'Libertar o Minuto Perdido',
        text:'Descobrir o que aconteceu às 03:17, recuperar a última lembrança e fazer os relógios da cidade voltarem a andar.',
        depends:['cidade:praca_ponteiros','cidade:bilhete_0317','cidade:sino_mudo','cidade:oficina_relojoeiro','cidade:ultima_lembranca','portal_released']
      },
      {key:'cidade:praca_ponteiros',type:'story',title:'Investigar a Praça dos Ponteiros',text:'Descobrir que todos os relógios pararam em 03:17.'},
      {key:'cidade:bilhete_0317',type:'clue',title:'Encontrar o Bilhete das 03:17',text:'Ler o bilhete incompleto na Estação Sem Trem.'},
      {key:'cidade:sino_mudo',type:'clue',title:'Ouvir o Sino Mudo',text:'Perceber que o sino não faz som, mas ainda assim transmite uma lembrança.'},
      {key:'cidade:oficina_relojoeiro',type:'item',title:'Entrar na Oficina do Relojoeiro',text:'Encontrar a chave, o diário ou a pista que explica por que o minuto foi escondido.'},
      {key:'cidade:ultima_lembranca',type:'choice',title:'Recuperar a Última Lembrança',text:'Aceitar que lembrar pode curar a cidade, sem transformar a cena em culpa ou medo.'},
      {key:'portal_released',type:'portal',title:'Abrir o Portal do Amanhã',text:'Libertar o Minuto Perdido e permitir que o tempo volte a andar.'}
    ];
  }
  if(mapId==='montanhas_arcaicas' || isMountainMap(state?.map)){
    return [
      {
        key:'mission:montanhas:principal',
        type:'main',
        title:'Despertar o Coração de Pedra',
        text:'Descobrir por que as Montanhas Arcaicas rugem, compreender a guardiã esquecida e abrir o Portal de Pedra Viva.',
        depends:['montanhas:ventos_antigos','montanhas:fossil_luminoso','montanhas:pegadas_gigantes','montanhas:ninho_azul','montanhas:cancao_cristais','montanhas:guardia_compreendida','portal_released']
      },
      {key:'montanhas:ventos_antigos',type:'story',title:'Atravessar a Passagem dos Ventos Antigos',text:'Escutar o aviso da montanha e seguir sem separar o grupo.'},
      {key:'montanhas:fossil_luminoso',type:'clue',title:'Encontrar o primeiro fóssil luminoso',text:'Perceber que os fósseis guardam memórias, não ameaças.'},
      {key:'montanhas:pegadas_gigantes',type:'clue',title:'Descobrir a origem das pegadas gigantes',text:'Entender que a criatura grande protegia algo pequeno.'},
      {key:'montanhas:ninho_azul',type:'item',title:'Encontrar o Ninho do Pterodáctilo Azul',text:'Receber ou observar a pena azul como sinal de confiança.'},
      {key:'montanhas:cancao_cristais',type:'item',title:'Recuperar a Canção dos Cristais',text:'Aprender a melodia capaz de acalmar o rugido e abrir conversa com a montanha.'},
      {key:'montanhas:guardia_compreendida',type:'choice',title:'Compreender a guardiã arcaica',text:'Reconhecer que a guardiã não é vilã: ela protege o Coração de Pedra.'},
      {key:'portal_released',type:'portal',title:'Abrir o Portal de Pedra Viva',text:'Despertar o Coração de Pedra e atravessar para a próxima zona.'}
    ];
  }


  if(mapId==='o_vazio' || isVoidMap(state?.map)){
    return [
      {key:'mission:vazio:principal',type:'main',title:'Reacender a Última Luz das Terras Raras',text:'Reunir as lembranças das oito zonas anteriores, compreender que o Vazio nasceu do esquecimento e concluir a campanha reacendendo a Última Luz.',depends:['vazio:floresta','vazio:fabrica','vazio:cidade','vazio:montanhas','vazio:gelo','vazio:alexandria','vazio:tempestade','vazio:corrida','portal_released']},
      {key:'vazio:floresta',type:'story',title:'Lembrar a Floresta Negra',text:'Recuperar a folha verde e a lição de que nem toda sombra é inimiga.'},
      {key:'vazio:fabrica',type:'clue',title:'Reacender o Doce de Verdade',text:'Trazer a sinceridade da Fábrica dos Doces Pesadelos para dentro do Vazio.'},
      {key:'vazio:cidade',type:'clue',title:'Ouvir o Eco das 03:17',text:'Aceitar que lembrar pode curar e devolver tempo à Jornada.'},
      {key:'vazio:montanhas',type:'item',title:'Tocar a Pedra que Pulsa',text:'Reconhecer a guardiã arcaica e o Coração de Pedra como símbolos de compreensão.'},
      {key:'vazio:gelo',type:'item',title:'Libertar a Nota do Cristal Mudo',text:'Cantar baixo para proteger a memória frágil do Gelo Eterno.'},
      {key:'vazio:alexandria',type:'choice',title:'Responder à Pergunta Final',text:'Decidir o que o grupo escolhe lembrar para iluminar quem vem depois.'},
      {key:'vazio:tempestade',type:'choice',title:'Chamar o Raio Calmo',text:'Reunir equilíbrio e calma antes do final.'},
      {key:'vazio:corrida',type:'portal',title:'Acender a Seta Azul Final',text:'Confirmar que o grupo chegou junto, não apenas rápido.'},
      {key:'portal_released',type:'portal',title:'Abrir o Portal do Recomeço',text:'Reacender a Última Luz e concluir a campanha principal das Terras Raras.'}
    ];
  }


  if(mapId==='correr_ou_morrer' || isRaceMap(state?.map)){
    return [
      {key:'mission:correr:principal',type:'main',title:'Chegar ao Fim do Caminho Antes que Ele Desapareça',text:'Atravessar a zona em ritmo de cooperação, resolver escolhas rápidas sem abandonar ninguém e abrir o Portal da Última Luz.',depends:['correr:estrada_acorda','correr:ponte_passos','correr:relogio_areia','correr:tunel_folego','correr:seta_azul','correr:ultimo_sinal','portal_released']},
      {key:'correr:estrada_acorda',type:'story',title:'Acordar a Estrada Viva',text:'Descobrir que o caminho aparece melhor quando o grupo decide junto.'},
      {key:'correr:ponte_passos',type:'clue',title:'Atravessar a Ponte dos Passos Rápidos',text:'Usar contagem e ritmo conjunto para estabilizar as placas móveis.'},
      {key:'correr:relogio_areia',type:'item',title:'Receber o Grão de Areia Luminosa',text:'Entender que o relógio mede cuidado, não velocidade.'},
      {key:'correr:tunel_folego',type:'story',title:'Acalmar o Fôlego no Túnel',text:'Respirar juntas para abrir a saída do Túnel do Fôlego Curto.'},
      {key:'correr:seta_azul',type:'choice',title:'Escolher a Seta Azul Cooperativa',text:'Rejeitar atalhos que separam o grupo e seguir a rota que todas conseguem atravessar.'},
      {key:'correr:ultimo_sinal',type:'portal',title:'Acender a Torre do Último Sinal',text:'Repetir o ritmo criado pelo grupo e revelar a Linha do Fim do Caminho.'},
      {key:'portal_released',type:'portal',title:'Abrir o Portal da Última Luz',text:'Chegar juntas ao fim do caminho e seguir para O Vazio.'}
    ];
  }
  if(mapId==='gelo_eterno' || isIceMap(state?.map)){
    return [
      {
        key:'mission:gelo:principal',
        type:'main',
        title:'Libertar a Canção Congelada',
        text:'Descobrir as notas presas no gelo, entender por que a canção foi protegida e abrir o Portal da Aurora sem quebrar o cristal central.',
        depends:['gelo:portao_neve','gelo:reflexo_lago','gelo:notas_pinheiros','gelo:sopro_azul','gelo:sinos_gelo','gelo:cancao_completa','portal_released']
      },
      {key:'gelo:portao_neve',type:'story',title:'Atravessar o Portão da Neve Silenciosa',text:'Entrar na zona percebendo que o silêncio do gelo é parte da aventura.'},
      {key:'gelo:reflexo_lago',type:'clue',title:'Entender o reflexo do lago',text:'Descobrir que o Lago dos Reflexos Congelados mostra pistas, não ameaças.'},
      {key:'gelo:notas_pinheiros',type:'clue',title:'Tocar as notas dos pinheiros de cristal',text:'Encontrar as primeiras notas da Canção Congelada na floresta transparente.'},
      {key:'gelo:sopro_azul',type:'story',title:'Ouvir o Sopro Azul',text:'Compreender que o gelo protege uma memória frágil.'},
      {key:'gelo:sinos_gelo',type:'item',title:'Ouvir os Sinos de Gelo',text:'Receber a nota que falta por meio da escuta cuidadosa.'},
      {key:'gelo:cancao_completa',type:'choice',title:'Completar a Canção Congelada',text:'Escolher libertar a música com cuidado, sem forçar o cristal.'},
      {key:'portal_released',type:'portal',title:'Abrir o Portal da Aurora',text:'Libertar a Canção Congelada e seguir para Alexandria.'}
    ];
  }


  if(mapId==='alexandria' || isAlexandriaMap(state?.map)){
    return {
      title:'Biblioteca de Alexandria',
      intro:'Conteúdo pronto para conduzir a Zona 6 com biblioteca antiga, farol, mapas vivos, perguntas boas e curiosidade segura.',
      items:[
        {title:'Página em Branco Perguntadora',origin:'Biblioteca Infinita',text:'Uma página que só revela caminhos quando a pergunta começa com “como” ou “por que”.'},
        {title:'Mapa Vivo de Alexandria',origin:'Avenida dos Mapas Vivos',text:'As linhas se mexem devagar e desenham uma rota segura até o próximo símbolo.'},
        {title:'Lâmpada do Farol Antigo',origin:'Farol das Perguntas Perdidas',text:'Uma pequena lâmpada dourada que acende quando o grupo formula uma pergunta verdadeira.'},
        {title:'Pena da Escriba',origin:'Casa da Escriba de Areia',text:'Escreve no ar por alguns segundos. Serve para registrar perguntas importantes sem perder o ritmo da cena.'},
        {title:'Chave de Pergunta',origin:'Labirinto das Estantes',text:'Não abre fechaduras comuns. Abre portas que estavam esperando a pergunta certa.'},
        {title:'Estrela de Vidro',origin:'Observatório das Estrelas Baixas',text:'Mostra uma constelação pequena apontando para o Farol.'},
        {title:'Bússola das Dúvidas Boas',origin:'Porto das Garrafas Mensageiras',text:'Gira quando alguém tenta responder rápido demais e estabiliza quando o grupo pensa junto.'},
        {title:'Selo das Estrelas Escritas',origin:'Portal das Estrelas Escritas',text:'Marca final de Alexandria. Brilha quando o Farol aceita a pergunta do grupo.'}
      ],
      npcs:[
        {title:'Nura, Guardiã dos Mapas',role:'NPC de apoio',text:'Cuida dos mapas vivos e ensina que nem todo caminho aparece antes da pergunta certa.'},
        {title:'Escriba de Areia',role:'NPC sábia',text:'Escreve histórias que o vento pode apagar, por isso pede às jogadoras que escolham bem suas palavras.'},
        {title:'Livro Sem Título',role:'Objeto vivo',text:'Um livro tímido que quer ganhar nome. Responde melhor quando o grupo faz perguntas gentis.'},
        {title:'Faroleiro das Perguntas',role:'Guardião seguro',text:'Não bloqueia por maldade. Ele protege o Farol para que sua luz não seja desperdiçada.'},
        {title:'Gato das Estantes',role:'Companheiro temporário',text:'Anda por prateleiras impossíveis e derruba apenas os livros que o grupo precisa notar.'},
        {title:'Constelação Baixa',role:'Voz do cenário',text:'Pequenas estrelas perto do chão que formam desenhos quando as jogadoras conectam ideias.'}
      ],
      riddles:[
        {title:'A Pergunta que Abre',text:'A porta da biblioteca não pede senha. Ela só abre quando alguém pergunta algo que começa com “como podemos ajudar?”.'},
        {title:'Três Símbolos do Mapa',text:'O mapa vivo mostra estrela, pena e lâmpada. O grupo precisa visitar ou nomear os três para chegar ao Farol.'},
        {title:'Livro Sem Nome',text:'O livro só revela a pista quando recebe um título escolhido pelo grupo, baseado no que aprenderam até ali.'},
        {title:'Escada que Muda',text:'A escada da biblioteca muda quando alguém tenta subir sozinho. Quando duas personagens combinam o caminho, ela fica parada.'},
        {title:'Farol sem Resposta Pronta',text:'O Farol não acende com uma resposta. Ele acende com uma pergunta honesta sobre o que a próxima zona precisa.'},
        {title:'Garrafas Mensageiras',text:'Três garrafas trazem mensagens. A correta não é a mais brilhante, mas a que faz o grupo pensar junto.'}
      ],
      phrases:[
        'A areia dourada se move em linhas finas, como se a cidade estivesse escrevendo enquanto o grupo caminha.',
        'A biblioteca respira baixo, e cada estante parece guardar uma pergunta que ainda não foi feita.',
        'No alto do Farol, uma luz apagada observa o céu como quem espera uma palavra exata.',
        'Um mapa se dobra sozinho e aponta para um caminho que não existia um segundo antes.',
        'As estrelas estão tão baixas que parecem ouvir a conversa do grupo.',
        'O livro cai aberto sem fazer barulho, mostrando uma página vazia que parece cheia de possibilidades.',
        'Alexandria não exige que as jogadoras saibam tudo. Ela só pede que tenham coragem de perguntar.'
      ],
      hooks:[
        {title:'Gancho de próxima sessão',text:'Quando a sessão pausa, o Farol pisca uma vez e desenha no céu uma nuvem em forma de templo: a Tempestade dos Deuses está chamando.'},
        {title:'Gancho do livro vivo',text:'O Livro Sem Título escreve sozinho uma frase: “uma boa pergunta pode acalmar até o céu”.'},
        {title:'Gancho do mapa dobrado',text:'O mapa vivo dobra uma ponta e revela ilhas flutuantes desenhadas com tinta de estrela.'},
        {title:'Gancho da escolha',text:'O Faroleiro pergunta: “vocês querem uma resposta rápida ou uma pergunta que leve vocês mais longe?”'}
      ]
    };
  }

  if(mapId==='tempestade_deuses' || isStormMap(state?.map)){
    return [
      {
        key:'mission:tempestade:principal',
        type:'main',
        title:'Acalmar a Tempestade dos Deuses',
        text:'Explorar as ilhas acima das nuvens, reunir sinais de água, vento e luz, despertar o Raio Calmo e abrir o Portal da Corrida Celeste.',
        depends:['tempestade:ponte_ventos','tempestade:tambores','tempestade:chuva_suspensa','tempestade:simbolos','tempestade:raio_calmo','tempestade:olho_sereno','portal_released']
      },
      {key:'tempestade:ponte_ventos',type:'story',title:'Atravessar a Ponte dos Ventos Cruzados',text:'Descobrir que a travessia fica segura quando o grupo caminha no mesmo ritmo.'},
      {key:'tempestade:tambores',type:'clue',title:'Ouvir os Tambores de Trovão',text:'Perceber que os trovões são linguagem e repetir a sequência forte, fraca, forte.'},
      {key:'tempestade:chuva_suspensa',type:'clue',title:'Ler a Chuva Suspensa',text:'Encontrar nas gotas memórias da Jornada e a pista da mão aberta.'},
      {key:'tempestade:simbolos',type:'item',title:'Reunir água, vento e luz',text:'Levar os três sinais ao Templo do Céu Partido para equilibrar a tempestade.'},
      {key:'tempestade:raio_calmo',type:'choice',title:'Despertar o Raio Calmo',text:'Escolher uma ação conjunta que ilumine sem machucar e sem impor uma única força.'},
      {key:'tempestade:olho_sereno',type:'portal',title:'Entrar no Olho da Tempestade Serena',text:'Levar o Raio Calmo ao centro e permitir que o céu volte a respirar.'},
      {key:'portal_released',type:'portal',title:'Abrir o Portal da Corrida Celeste',text:'Acalmar a Tempestade dos Deuses e seguir para Correr ou Morrer.'}
    ];
  }

  if(mapId==='alexandria' || isAlexandriaMap(state?.map)){
    return [
      {
        key:'mission:alexandria:principal',
        type:'main',
        title:'Acender o Farol das Perguntas Perdidas',
        text:'Explorar Alexandria, encontrar a Pergunta Perdida e acender o farol antigo para abrir o Portal das Estrelas Escritas.',
        depends:['alexandria:porto','alexandria:mapa_vivo','alexandria:biblioteca','alexandria:salao_perguntas','alexandria:pergunta_perdida','alexandria:farol_aceso','portal_released']
      },
      {key:'alexandria:porto',type:'story',title:'Chegar ao Porto das Areias Douradas',text:'Entender que Alexandria se abre para quem faz perguntas sinceras.'},
      {key:'alexandria:mapa_vivo',type:'clue',title:'Seguir o Mapa Vivo',text:'Encontrar os símbolos que levam à Biblioteca Infinita.'},
      {key:'alexandria:biblioteca',type:'story',title:'Entrar na Biblioteca Infinita',text:'Descobrir que a página em branco só responde a perguntas bem formuladas.'},
      {key:'alexandria:salao_perguntas',type:'clue',title:'Abrir o Salão das Perguntas',text:'Responder com humildade a uma porta que testa escuta, não inteligência.'},
      {key:'alexandria:pergunta_perdida',type:'choice',title:'Encontrar a Pergunta Perdida',text:'Formar a pergunta: “para que serve saber, se ninguém escuta?”'},
      {key:'alexandria:farol_aceso',type:'portal',title:'Acender o Farol de Alexandria',text:'Levar a Pergunta Perdida ao farol e iluminar o caminho para o portal.'},
      {key:'portal_released',type:'portal',title:'Abrir o Portal das Estrelas Escritas',text:'Atravessar para a Tempestade dos Deuses.'}
    ];
  }
  if(mapId==='floresta_negra'){
    return [
      {
        key:'mission:floresta:principal',
        type:'main',
        title:'Encontrar o Portal da Próxima Zona',
        text:'Atravessar a Floresta Negra, reunir as pistas certas e liberar o caminho para além das raízes.',
        depends:['Visitou Trilha dos Sussurros','Encontrou pista no Poço das Vozes','Descobriu desenho da Cabana Vazia','Resolveu Árvore dos Ossos','portal_released']
      },
      {key:'Visitou Trilha dos Sussurros',type:'story',title:'Seguir a Trilha dos Sussurros',text:'Ouvir os primeiros sinais de que a floresta observa quem entra.'},
      {key:'Encontrou pista no Poço das Vozes',type:'clue',title:'Encontrar a pista no Poço das Vozes',text:'Descobrir uma mensagem escondida onde a água parece responder.'},
      {key:'Descobriu desenho da Cabana Vazia',type:'clue',title:'Descobrir o desenho da Cabana Vazia',text:'Encontrar o desenho infantil que mostra que alguém esteve ali antes.'},
      {key:'Resolveu Árvore dos Ossos',type:'choice',title:'Resolver o enigma da Árvore dos Ossos',text:'Escolher o caminho certo sem transformar o susto em desespero.'},
      {key:'portal_released',type:'portal',title:'Liberar o Portal da Próxima Zona',text:'Abrir a saída para o próximo mapa.'}
    ];
  }
  return [
    {key:'mission:generic:explore',type:'main',title:'Explorar a nova zona',text:'Descobrir o objetivo principal deste mapa.',depends:['portal_released']},
    {key:'portal_released',type:'portal',title:'Liberar o portal',text:'Encontrar a condição de saída desta zona.'}
  ];
}

function missionTypeMeta(type){
  const map={
    main:{label:'Principal',icon:'✦'},
    story:{label:'História',icon:'◌'},
    clue:{label:'Pista',icon:'🔎'},
    item:{label:'Item',icon:'⬢'},
    choice:{label:'Escolha',icon:'◆'},
    portal:{label:'Portal',icon:'✧'}
  };
  return map[type]||map.story;
}
function missionDone(m){
  if(m.depends?.length){
    return m.depends.every(k=>progressValue(k));
  }
  return progressValue(m.key);
}
function missionProgress(m){
  if(!m.depends?.length) return missionDone(m)?100:0;
  const total=m.depends.length||1;
  const done=m.depends.filter(k=>progressValue(k)).length;
  return Math.round(done/total*100);
}
function renderMissions(){
  const box=qs('missionsContent');
  if(!box || !state?.map) return;
  const missions=missionDefinitionsForMap(state.map.id);
  const main=missions.find(m=>m.type==='main')||missions[0];
  const secondary=missions.filter(m=>m!==main);
  const doneCount=secondary.filter(missionDone).length;
  const total=secondary.length||1;
  const pct=Math.round(doneCount/total*100);
  const mainDone=missionDone(main);
  const mainMeta=missionTypeMeta(main.type);
  const mainHTML=`<div class="missionMain ${mainDone?'done':''}">
    <div class="missionTop"><span class="missionBadge">${mainMeta.icon} ${mainMeta.label}</span><span>${mainDone?'concluída':'em andamento'}</span></div>
    <h4>${esc(main.title)}</h4>
    <p>${esc(main.text)}</p>
    <div class="missionBar"><div style="width:${missionProgress(main)}%"></div></div>
  </div>`;
  const listHTML=secondary.map(m=>{
    const meta=missionTypeMeta(m.type), done=missionDone(m), p=missionProgress(m);
    const actions=isMasterRole() && !m.depends?.length ? `<button class="btn small ghost" onclick="setMissionDone('${esc(m.key)}',${done?'false':'true'},'${esc(m.title)}')">${done?'Desmarcar':'Marcar'}</button>` : '';
    const autoHint=m.depends?.length ? '<span class="missionAuto">automática</span>' : '';
    return `<div class="missionItem ${done?'done':''}">
      <div class="missionTop"><span class="missionBadge">${meta.icon} ${meta.label}</span><span>${done?'feito':'pendente'}</span></div>
      <b>${esc(m.title)}</b>
      <p>${esc(m.text)}</p>
      <div class="missionBar small"><div style="width:${p}%"></div></div>
      <div class="missionActions">${actions}${autoHint}</div>
    </div>`;
  }).join('');
  box.innerHTML=`<div class="forestCard"><b>Progresso da zona</b><span style="color:var(--muted)">${doneCount}/${total} objetivos essenciais · ${pct}%</span><div class="missionBar"><div style="width:${pct}%"></div></div></div>${mainHTML}<div class="missionList">${listHTML}</div>`;
}
async function setMissionDone(key,value,label){
  await setProgress(key,value,label);
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
      ${staff?`<label>Fraqueza</label><input id="weak_${p.id}" value="${esc(p.weakness||'')}"><label>Notas</label><textarea id="pnotes_${p.id}">${esc(p.notes||'')}</textarea><label>Inventário</label><input id="inv_${p.id}" value="${esc(p.inventory||'')}"><div class="row" style="margin-top:8px"><button class="btn small" onclick="saveStats(${p.id})">Salvar</button><button class="btn small danger" onclick="kickPlayer(${p.id},'${esc(String(p.username||'jogadora').replace(/'/g,"&#39;"))}')">Remover da sala</button></div>`:''}
    </div>`;
  }).join('');
}

async function kickPlayer(id,name){
  if(!isMasterRole()) return;
  if(state?.me?.id===id){ alert('Use sair da sala para remover a própria Mestre.'); return; }
  if(!confirm(`Remover ${name||'esta jogadora'} da sala?`)) return;
  try{
    await api(`/rooms/${currentRoom}/players/${id}/kick`,{method:'POST'});
    state=await api('/rooms/'+currentRoom);
    renderRoom();
  }catch(e){ alert(e.message); }
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
async function addNote(){ await api(`/rooms/${currentRoom}/notes`,{method:'POST',body:JSON.stringify({title:qs('noteTitle')?.value||'Nota',text:qs('noteText')?.value||''})}); if(qs('noteText'))qs('noteText').value=''; state=await api('/rooms/'+currentRoom); await fetchAdventureDiary(); renderRoom(); }

/* ===== Local / progresso ===== */
function selectMapNode(id){ selectedNode=overrideFor(nodeById(id)); renderMapGraph(); renderLocationBox(); openPanelTab(0); }
async function setProgress(key,value,label){ await api(`/rooms/${currentRoom}/progress`,{method:'POST',body:JSON.stringify({map_id:state.map.id,key,value,label})}); state=await api('/rooms/'+currentRoom); renderGame(); }
function progressChecklist(){
  if(!isStaff())return '';
  let items=[];
  if(state.map.id==='floresta_negra'){
    items=[
      ['visitou_trilha','Visitou a Trilha dos Sussurros'],
      ['pista_poco','Encontrou a pista no Poço das Vozes'],
      ['desenho_cabana','Descobriu o desenho da Cabana Vazia'],
      ['arvore_resolvida','Resolveu o desafio da Árvore dos Ossos'],
      ['portal_released','Liberou o Portal da Próxima Zona']
    ];
  }else if(state.map.id==='fabrica_doces'){
    items=[
      ['fabrica_viva','Descobriu que a fábrica está viva'],
      ['mentira_amarga','Ativou a Mentira Amarga'],
      ['confeiteira_nao_vila','Entendeu que a Confeiteira não é vilã'],
      ['flor_nunca_colhida','Encontrou a Flor Nunca Colhida'],
      ['coracao_consertado','Consertou ou acalmou o coração mecânico'],
      ['portal_released','Confeiteira aceitou abrir o Portal de Caramelo']
    ];
  }else if(state.map.id==='cidade_relogios'){
    items=[
      ['cidade:praca_ponteiros','Investigou a Praça dos Ponteiros'],
      ['cidade:bilhete_0317','Encontrou o Bilhete das 03:17'],
      ['cidade:sino_mudo','Ouviu o Sino Mudo'],
      ['cidade:oficina_relojoeiro','Entrou na Oficina do Relojoeiro'],
      ['cidade:ultima_lembranca','Recuperou a Última Lembrança'],
      ['portal_released','Abriu o Portal do Amanhã']
    ];
  }
  else if(state.map.id==='gelo_eterno'){
    items=[
      ['gelo:portao_neve','Atravessou o Portão da Neve Silenciosa'],
      ['gelo:reflexo_lago','Entendeu o reflexo do lago'],
      ['gelo:notas_pinheiros','Tocou as notas dos pinheiros de cristal'],
      ['gelo:sinos_gelo','Ouviu os Sinos de Gelo'],
      ['gelo:cancao_completa','Completou a Canção Congelada'],
      ['portal_released','Abriu o Portal da Aurora']
    ];
  }

  else if(state.map.id==='tempestade_deuses'){
    items=[
      ['tempestade:ponte_ventos','Atravessou a Ponte dos Ventos Cruzados'],
      ['tempestade:tambores','Ouviu os Tambores de Trovão'],
      ['tempestade:chuva_suspensa','Leu a Chuva Suspensa'],
      ['tempestade:simbolos','Reuniu água, vento e luz'],
      ['tempestade:raio_calmo','Despertou o Raio Calmo'],
      ['tempestade:olho_sereno','Entrou no Olho da Tempestade Serena'],
      ['correr:ultimo_sinal','Acendeu a Torre do Último Sinal'],
      ['portal_released','Abriu o Portal da Corrida Celeste']
    ];
  }

  else if(state.map.id==='alexandria'){
    items=[
      ['alexandria:porto','Chegou ao Porto das Areias Douradas'],
      ['alexandria:mapa_vivo','Seguiu o Mapa Vivo'],
      ['alexandria:biblioteca','Entrou na Biblioteca Infinita'],
      ['alexandria:salao_perguntas','Abriu o Salão das Perguntas'],
      ['alexandria:pergunta_perdida','Encontrou a Pergunta Perdida'],
      ['alexandria:farol_aceso','Acendeu o Farol de Alexandria'],
      ['portal_released','Abriu o Portal das Estrelas Escritas']
    ];
  }

  else if(state.map.id==='correr_ou_morrer'){
    items=[
      ['correr:estrada_acorda','Acordou a Estrada Viva'],
      ['correr:ponte_passos','Atravessou a Ponte dos Passos Rápidos'],
      ['correr:relogio_areia','Recebeu o Grão de Areia Luminosa'],
      ['correr:tunel_folego','Acalmou o Fôlego no Túnel'],
      ['correr:seta_azul','Escolheu a Seta Azul Cooperativa'],
      ['correr:ultimo_sinal','Acendeu a Torre do Último Sinal'],
      ['portal_released','Abriu o Portal da Última Luz']
    ];
  }
  else if(state.map.id==='o_vazio'){
    items=[
      ['vazio:floresta','Lembrou a Floresta Negra'],
      ['vazio:fabrica','Reacendeu o Doce de Verdade'],
      ['vazio:cidade','Ouviu o Eco das 03:17'],
      ['vazio:montanhas','Tocou a Pedra que Pulsa'],
      ['vazio:gelo','Libertou a Nota do Cristal Mudo'],
      ['vazio:alexandria','Respondeu à Pergunta Final'],
      ['vazio:tempestade','Chamou o Raio Calmo'],
      ['vazio:corrida','Acendeu a Seta Azul Final'],
      ['portal_released','Abriu o Portal do Recomeço']
    ];
  }

  if(!items.length)return '';
  return `<div class="forestCard"><b>Progresso da zona</b><div class="progressGrid">${items.map(([k,l])=>`<label class="progressItem"><input type="checkbox" ${progressValue(k)?'checked':''} onchange="setProgress('${k}',this.checked,'${l.replace(/'/g,"\'")}')">${l}</label>`).join('')}</div></div>`;
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
      ${n.type==='portal' && !portalReleased()?`<button class="btn small" onclick="setProgress('portal_released',true,state.map.id==='cidade_relogios'?'Abriu o Portal do Amanhã':(state.map.id==='montanhas_arcaicas'?'Despertou o Coração de Pedra e abriu o Portal de Pedra Viva':(state.map.id==='gelo_eterno'?'Libertou a Canção Congelada e abriu o Portal da Aurora':(state.map.id==='alexandria'?'Acendeu o Farol de Alexandria e abriu o Portal das Estrelas Escritas':(state.map.id==='tempestade_deuses'?'Acalmou a Tempestade dos Deuses e abriu o Portal da Corrida Celeste':(state.map.id==='correr_ou_morrer'?'Chegou ao fim do caminho e abriu o Portal da Última Luz':(state.map.id==='o_vazio'?'Reacendeu a Última Luz e abriu o Portal do Recomeço':(state.map.id==='fabrica_doces'?'Confeiteira aceitou abrir o Portal de Caramelo':'Liberou o Portal da Próxima Zona'))))))))">Liberar portal agora</button>`:''}
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
  journeyAdvance();
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
  closeSessionIntro,
  openAdventureCard,
  closeAdventureCardOverlay,
  saveAdventureCard,
  sendAdventureCard,
  toggleCardTargetMode,
  loadCardTemplate,
  setMissionDone,
  quickMasterEvent,
  sendMasterEvent,
  eventToCardDraft,
  askAIForEvent,
  closeMasterEventOverlay,
  addInventoryItem,
  removeInventoryItem,
  cardToInventoryItem,
  useInventoryItem,
  renderInventoryVisual,
  fetchAdventureDiary,
  generateAdventureSummary,
  saveAdventureSummary,
  copyAdventureSummaryToAI,
  renderMasterCentral,
  renderMasterLibrary,
  libraryToEvent,
  libraryToCard,
  libraryToItem,
  libraryFillMountainScene,
  libraryFillMapScene,
  libraryPromptAI,
  centralActionEvent,
  centralActionCard,
  centralActionItem,
  centralActionMission,
  centralActionDiary,
  centralActionNote,
  centralActionAI,
  openConductionMode,
  closeConductionMode,
  renderJourney,
  journeyAdvance,
  journeyChangeMap,
  showZoneUnlocked,
  closeZoneUnlocked,
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
