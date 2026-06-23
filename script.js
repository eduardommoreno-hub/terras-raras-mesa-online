
const API=location.origin;let token=localStorage.tr_token||'';let me=null;let mode='login';let state=null;let currentRoom=null;let ws=null;let dragging=null;
function qs(id){return document.getElementById(id)}function show(id){document.querySelectorAll('.screen').forEach(s=>s.classList.remove('on'));qs(id).classList.add('on')}function msg(t,err=false){qs('authMsg').textContent=t;qs('authMsg').className='msg '+(err?'err':'')}async function api(path,opts={}){opts.headers=Object.assign({'Content-Type':'application/json'},opts.headers||{});if(token)opts.headers.Authorization='Bearer '+token;let r=await fetch(API+path,opts);let txt=await r.text();let data=txt?JSON.parse(txt):{};if(!r.ok)throw new Error(data.detail||'Erro');return data}
function drawAuth(){qs('tabLogin').classList.toggle('on',mode==='login');qs('tabReg').classList.toggle('on',mode==='reg');qs('authBody').innerHTML=mode==='login'?`<label>Usuário</label><input id="u" autocomplete="username"><label>Senha</label><div class="passwordWrap"><input id="p" type="password" autocomplete="current-password" onkeydown="if(event.key==='Enter')login()"><button type="button" class="eyeBtn" onclick="togglePassword()">Ver</button></div><button id="loginBtn" class="btn" style="margin-top:14px" onclick="login()">Entrar</button>`:`<label>Nome da jogadora</label><input id="u" autocomplete="username"><label>Senha</label><div class="passwordWrap"><input id="p" type="password" autocomplete="new-password"><button type="button" class="eyeBtn" onclick="togglePassword()">Ver</button></div><button id="registerBtn" class="btn" style="margin-top:14px" onclick="register()">Pedir autorização</button>`;msg('')}
function togglePassword(){let p=qs('p');if(!p)return;p.type=p.type==='password'?'text':'password';let b=document.querySelector('.eyeBtn');if(b)b.textContent=p.type==='password'?'Ver':'Ocultar'}
async function login(){let u=qs('u')?.value.trim()||'';let p=qs('p')?.value||'';if(!u||!p){msg('Preencha usuário e senha.',true);return}let b=qs('loginBtn');try{if(b){b.disabled=true;b.textContent='Entrando...'}msg('Conferindo login...');let d=await api('/auth/login',{method:'POST',body:JSON.stringify({username:u,password:p})});token=d.token;localStorage.tr_token=token;me=d.user;msg('Login confirmado. Carregando...');await loadHub()}catch(e){localStorage.removeItem('tr_token');token='';me=null;msg('Login inválido ou erro: '+e.message,true)}finally{if(b){b.disabled=false;b.textContent='Entrar'}}}
async function register(){let u=qs('u')?.value.trim()||'';let p=qs('p')?.value||'';if(!u||!p){msg('Preencha nome e senha.',true);return}let b=qs('registerBtn');try{if(b){b.disabled=true;b.textContent='Enviando...'}let d=await api('/auth/register',{method:'POST',body:JSON.stringify({username:u,password:p})});msg(d.message)}catch(e){msg(e.message,true)}finally{if(b){b.disabled=false;b.textContent='Pedir autorização'}}}
function logout(){localStorage.removeItem('tr_token');token='';me=null;show('login');drawAuth()}async function boot(){drawAuth();if(token){try{me=await api('/me');await loadHub()}catch(e){logout()}}}
async function loadHub(){if(!me)me=await api('/me');let [rooms,chars]=await Promise.all([api('/rooms/mine'),api('/characters')]);show('hub');qs('userPill').textContent=me.username+(me.is_admin?' · admin':'');qs('rooms').innerHTML=rooms.length?rooms.map(r=>`<div class="room"><div class="grow"><b>${esc(r.name)}</b><br><span class="pill">${r.code}</span> <span style="color:var(--muted)">${r.role}</span></div><button class="btn small" onclick="openRoom('${r.id}')">Abrir</button><button class="btn small danger" onclick="leaveRoom('${r.id}', event)">Sair</button></div>`).join(''):'<p style="color:var(--muted)">Nenhuma mesa ainda.</p>';qs('chars').innerHTML=chars.map(c=>`<div class="char"><div class="art">${c.avatar_svg}</div><div class="pad"><b>${c.name}</b><br><span style="color:var(--muted)">${c.role} · ${c.zone}</span><p>${c.description}</p></div></div>`).join('');if(me.is_admin){qs('adminBox').classList.remove('hidden');loadPending()}else qs('adminBox').classList.add('hidden')}
async function loadPending(){let p=await api('/admin/pending');qs('pending').innerHTML=p.length?p.map(u=>`<div class="pending"><b class="grow">${esc(u.username)}</b><button class="btn small" onclick="approve(${u.id})">Autorizar</button></div>`).join(''):'<p style="color:var(--muted)">Nenhum cadastro pendente.</p>'}async function approve(id){await api('/admin/approve/'+id,{method:'POST'});loadPending()}
async function createRoom(){let r=await api('/rooms/create',{method:'POST',body:JSON.stringify({name:qs('roomName').value})});openRoom(r.id)}async function joinRoom(){let r=await api('/rooms/join',{method:'POST',body:JSON.stringify({code:qs('joinCode').value})});openRoom(r.id)}
async function leaveRoom(id, ev){if(ev)ev.stopPropagation();if(!confirm('Deseja sair desta sala? Ela deixará de aparecer em Minhas mesas.'))return;await api(`/rooms/${id}/leave`,{method:'POST'});if(currentRoom===id){if(ws)ws.close();currentRoom=null}await loadHub()}
async function leaveCurrentRoom(){if(!currentRoom)return;await leaveRoom(currentRoom)}

const MAP_GRAPHS={
  floresta_negra:{nodes:[
    {id:'entrada',name:'Entrada da Floresta',x:14,y:72,type:'normal',desc:'O último ponto seguro antes das árvores fecharem o caminho.'},
    {id:'trilha',name:'Trilha dos Sussurros',x:31,y:57,type:'normal',desc:'Folhas secas repetem nomes que ninguém disse em voz alta.'},
    {id:'ponte',name:'Ponte Quebrada',x:50,y:47,type:'danger',desc:'Madeira úmida sobre um vão escuro. Qualquer passo errado ecoa longe.'},
    {id:'clareira',name:'Clareira Oculta',x:68,y:34,type:'hidden',desc:'Um círculo de luz verde onde pegadas aparecem e somem.'},
    {id:'arvore',name:'Árvore dos Ossos',x:76,y:62,type:'danger',desc:'Raízes contorcidas guardam objetos de quem passou antes.'},
    {id:'portal',name:'Portal da Próxima Zona',x:91,y:45,type:'portal',desc:'Um arco vivo, pulsando como se respirasse.'}],links:[['entrada','trilha'],['trilha','ponte'],['ponte','clareira'],['ponte','arvore'],['arvore','portal'],['clareira','portal']]},
  fabrica_doces:{nodes:[{id:'portao',name:'Portão Açucarado',x:12,y:55,type:'normal',desc:'A entrada cheira a infância, mas o chão gruda nos sapatos.'},{id:'esteiras',name:'Esteiras de Bala',x:30,y:42,type:'normal',desc:'Esteiras levam doces brilhantes para uma máquina sem fim.'},{id:'tunel',name:'Túnel Colorido',x:48,y:65,type:'danger',desc:'As paredes cantam e confundem a memória.'},{id:'forno',name:'Forno de Biscoitos',x:66,y:43,type:'danger',desc:'O calor parece formar rostos no ar.'},{id:'sala',name:'Sala da Ilusão',x:82,y:25,type:'hidden',desc:'Aqui cada desejo tenta virar armadilha.'},{id:'saida',name:'Saída de Chocolate',x:92,y:62,type:'portal',desc:'Uma porta doce demais para ser confiável.'}],links:[['portao','esteiras'],['esteiras','tunel'],['tunel','forno'],['forno','sala'],['forno','saida'],['sala','saida']]},
  montanhas_arcaicas:{nodes:[{id:'base',name:'Base do Penhasco',x:13,y:72,type:'normal',desc:'Pedras antigas marcam o começo da subida.'},{id:'trilha',name:'Trilha Fóssil',x:28,y:55,type:'normal',desc:'Pegadas gigantes ficaram gravadas na rocha.'},{id:'ninho',name:'Ninho dos Pterodáctilos',x:48,y:34,type:'danger',desc:'Sombras circulam sobre cabeças distraídas.'},{id:'caverna',name:'Caverna Baixa',x:52,y:72,type:'hidden',desc:'O vento que sai dela parece respirar.'},{id:'ponte',name:'Passagem Estreita',x:71,y:52,type:'danger',desc:'Só cabe uma pessoa por vez.'},{id:'cume',name:'Cume Antigo',x:88,y:28,type:'portal',desc:'Do alto, a próxima zona se revela por um instante.'}],links:[['base','trilha'],['trilha','ninho'],['trilha','caverna'],['caverna','ponte'],['ninho','ponte'],['ponte','cume']]},
  gelo_eterno:{nodes:[{id:'acampamento',name:'Acampamento Branco',x:12,y:62,type:'normal',desc:'Barracas meio soterradas indicam que alguém tentou esperar o frio passar.'},{id:'lago',name:'Lago Congelado',x:32,y:48,type:'danger',desc:'O gelo estala como se respondesse aos passos.'},{id:'fenda',name:'Fenda Azul',x:50,y:68,type:'danger',desc:'Uma luz fria sobe de um corte profundo no chão.'},{id:'caverna',name:'Caverna de Cristal',x:61,y:35,type:'hidden',desc:'Cristais refletem versões atrasadas de quem entra.'},{id:'nevasca',name:'Muro de Nevasca',x:78,y:56,type:'danger',desc:'A tempestade gira como uma parede viva.'},{id:'farol',name:'Farol de Gelo',x:91,y:34,type:'portal',desc:'Uma torre congelada aponta para a próxima zona.'}],links:[['acampamento','lago'],['lago','fenda'],['lago','caverna'],['caverna','nevasca'],['fenda','nevasca'],['nevasca','farol']]},
  alexandria:{nodes:[{id:'dunas',name:'Dunas da Chegada',x:12,y:70,type:'normal',desc:'O calor distorce o horizonte.'},{id:'mercado',name:'Mercado Abandonado',x:30,y:55,type:'normal',desc:'Bancas vazias guardam moedas sem dono.'},{id:'templo',name:'Templo de Cleópatra',x:48,y:36,type:'danger',desc:'Colunas rachadas escondem juramentos antigos.'},{id:'biblioteca',name:'Biblioteca Viva',x:62,y:58,type:'hidden',desc:'Livros se fecham quando alguém mente.'},{id:'arquivo',name:'Arquivo Proibido',x:78,y:42,type:'danger',desc:'O conhecimento cobra preço.'},{id:'portal',name:'Porta Solar',x:91,y:62,type:'portal',desc:'Uma porta de luz abre e fecha com o vento quente.'}],links:[['dunas','mercado'],['mercado','templo'],['mercado','biblioteca'],['templo','arquivo'],['biblioteca','arquivo'],['arquivo','portal']]},
  tempestade_deuses:{nodes:[{id:'margem',name:'Margem Alagada',x:12,y:60,type:'normal',desc:'Água até os tornozelos, trovões no peito.'},{id:'raio',name:'Templo do Raio',x:31,y:37,type:'danger',desc:'Cada coluna atrai faíscas azuis.'},{id:'rio',name:'Rio Revolto',x:49,y:64,type:'danger',desc:'A corrente tenta puxar decisões para longe.'},{id:'ponte',name:'Ponte Afundada',x:62,y:47,type:'hidden',desc:'Pedras submersas formam um caminho quase invisível.'},{id:'arena',name:'Arena dos Deuses',x:78,y:34,type:'danger',desc:'O céu parece assistir.'},{id:'marco',name:'Marco da Trégua',x:91,y:58,type:'portal',desc:'Um símbolo partido entre raio e onda.'}],links:[['margem','raio'],['margem','rio'],['raio','ponte'],['rio','ponte'],['ponte','arena'],['arena','marco']]},
  correr_ou_morrer:{nodes:[{id:'casa',name:'Casinha Pequena',x:12,y:67,type:'normal',desc:'A madeira range como se quisesse avisar.'},{id:'plantacao',name:'Plantação Baixa',x:30,y:48,type:'normal',desc:'Fileiras de folhas escondem movimentos rápidos.'},{id:'muro',name:'Muro Enorme',x:51,y:35,type:'danger',desc:'Alto demais para pular sem plano.'},{id:'ninho',name:'Ninho da Noite',x:62,y:66,type:'danger',desc:'Só fica silencioso quando algo está perto.'},{id:'tunel',name:'Túnel de Fuga',x:78,y:48,type:'hidden',desc:'Um buraco estreito sob raízes pretas.'},{id:'saida',name:'Saída Sem Volta',x:92,y:28,type:'portal',desc:'A luz do outro lado pisca como um aviso.'}],links:[['casa','plantacao'],['plantacao','muro'],['plantacao','ninho'],['ninho','tunel'],['muro','tunel'],['tunel','saida']]},
  o_vazio:{nodes:[{id:'borda',name:'Borda da Luz',x:12,y:50,type:'normal',desc:'O último lugar onde ainda há sombra reconhecível.'},{id:'espelhos',name:'Espelhos Falsos',x:30,y:30,type:'danger',desc:'Reflexos sorriem antes das pessoas.'},{id:'ilhas',name:'Ilhas Escuras',x:49,y:58,type:'normal',desc:'Pedaços de chão flutuam sem motivo.'},{id:'porta',name:'Porta Errada',x:62,y:38,type:'hidden',desc:'Sempre parece certa até ser aberta.'},{id:'centro',name:'Centro do Nada',x:78,y:57,type:'danger',desc:'O silêncio tem peso.'},{id:'fim',name:'Rasgo de Saída',x:92,y:42,type:'portal',desc:'Uma fenda fina como linha dourada.'}],links:[['borda','espelhos'],['borda','ilhas'],['espelhos','porta'],['ilhas','porta'],['porta','centro'],['centro','fim']]}
};
let selectedNode=null;
function graph(){return MAP_GRAPHS[state?.map?.id]||MAP_GRAPHS.floresta_negra}
function nodeById(id){return graph().nodes.find(n=>n.id===id)}
function renderMapGraph(isMaster){let g=graph();let layer=qs('pathLayer'), nodes=qs('mapNodes');if(!layer||!nodes)return;let lines=g.links.map(([a,b])=>{let A=nodeById(a),B=nodeById(b);if(!A||!B)return '';let locked=A.type==='hidden'||B.type==='hidden';return `<line class="pathLine ${locked?'locked':''}" x1="${A.x}" y1="${A.y}" x2="${B.x}" y2="${B.y}"></line>`}).join('');layer.innerHTML=lines;nodes.innerHTML=g.nodes.map(n=>`<div class="mapNode ${n.type==='danger'?'danger':n.type==='portal'?'portal':n.type==='hidden'?'hiddenNode':''}" style="left:${n.x}%;top:${n.y}%" onclick="selectMapNode('${n.id}')"><div class="mapNodeLabel">${esc(n.name)}</div></div>`).join('');renderLocationBox()}
function selectMapNode(id){selectedNode=nodeById(id);renderLocationBox();}
function renderLocationBox(){let box=qs('locationBox');if(!box)return;if(!selectedNode){box.innerHTML='<b>Nenhum local selecionado</b><div class="locationMeta">Clique em um ponto do mapa para ver descrição, mover personagens e gerar narrativa daquele local.</div>';return}let isMaster=state?.me&&state.me.role==='mestre'||me&&me.is_admin;let playerOptions=(state.players||[]).map(p=>`<option value="${p.id}">${esc(p.character?p.character.name:p.username)} · ${esc(p.username)}</option>`).join('');box.innerHTML=`<b>${esc(selectedNode.name)}</b><div class="locationMeta">${esc(selectedNode.desc)}</div><label>Mover token para este local</label><select id="targetPlayer">${playerOptions}</select><div class="locationActions"><button class="btn small" onclick="moveSelectedToNode()" ${isMaster?'':'disabled'}>Mover token</button><button class="btn small ghost" onclick="narrateSelectedNode()">Narrar local</button><button class="btn small ghost" onclick="noteSelectedNode()">Enviar ao diário</button><button class="btn small ghost" onclick="imagePromptSelectedNode()">Prompt imagem</button></div>`}
async function moveSelectedToNode(){if(!selectedNode)return;let pid=qs('targetPlayer')?.value;if(!pid)return;await api(`/rooms/${currentRoom}/move-token`,{method:'POST',body:JSON.stringify({player_id:+pid,x:selectedNode.x,y:selectedNode.y})});}
function narrateSelectedNode(){if(!selectedNode)return;let ai=qs('aiAction');if(!ai){alert('Painel de IA não encontrado nesta tela.');return}ai.value=`Local selecionado: ${selectedNode.name}. ${selectedNode.desc}. Narre a chegada das personagens a este ponto do mapa ${state.map.name}, com tensão, ambiente e uma decisão objetiva.`;requestAI('narrative');setTimeout(()=>{try{openPanelTab(5)}catch(e){}},0)}
function imagePromptSelectedNode(){if(!selectedNode)return;qs('aiAction').value=`Crie prompt visual para o local ${selectedNode.name} em ${state.map.name}. Descrição: ${selectedNode.desc}.`;requestAI('image_prompt')}
async function noteSelectedNode(){if(!selectedNode)return;qs('noteTitle').value=`Local: ${selectedNode.name}`;qs('noteText').value=`${selectedNode.desc}
Mapa: ${state.map.name}
Posição aproximada: x=${selectedNode.x}%, y=${selectedNode.y}%`;await addNote()}

async function openRoom(id){currentRoom=id;state=await api('/rooms/'+id);show('game');connectWS();renderGame()}function connectWS(){if(ws)ws.close();let proto=location.protocol==='https:'?'wss':'ws';ws=new WebSocket(`${proto}://${location.host}/ws/${currentRoom}`);ws.onmessage=e=>{let d=JSON.parse(e.data);if(d.type==='state'){state=d.state;renderGame()}else if(d.type==='room_deleted'){if(currentRoom){alert('Esta sala foi encerrada.');currentRoom=null;show('hub');loadHub()}}}}
function renderGame(){let r=state.room,m=state.map;qs('gameTitle').textContent=r.name;qs('roomCode').textContent=r.code;qs('mapSvg').innerHTML=m.image_svg;qs('mapName').textContent=m.name;qs('mapDesc').textContent=m.description;let isMaster=state.me&&state.me.role==='mestre'||me&&me.is_admin;let isStaff=isMaster || (state.me&&state.me.role==='ajudante');qs('masterMapControls').classList.toggle('hidden',!isMaster);qs('masterNotes').classList.toggle('hidden',!isMaster);qs('localAIBox').classList.toggle('hidden',!isStaff);qs('mapSelect').innerHTML=state.maps.map(x=>`<option value="${x.id}" ${x.id===m.id?'selected':''}>${x.zone_number}. ${x.name}</option>`).join('');qs('charSelect').innerHTML=(window._charsHTML||'');loadCharSelect();renderMapGraph(isMaster);renderTokens(isMaster);renderPlayers(isMaster);renderChat();renderNotes();renderAIJobs()}
async function loadCharSelect(){if(window._loadedChars)return;let chars=await api('/characters');window._loadedChars=true;window._charsHTML=chars.map(c=>`<option value="${c.id}">${c.name} — ${c.role}</option>`).join('');qs('charSelect').innerHTML=window._charsHTML}
function renderTokens(isMaster){qs('tokens').innerHTML=state.players.map(p=>`<div class="token" data-id="${p.id}" style="left:${p.x}%;top:${p.y}%" onpointerdown="startDrag(event,${p.id},${isMaster||isMe(p)})">${p.character?p.character.avatar_svg:'<b>?</b>'}<div class="tokenName">${esc(p.character?p.character.name:p.username)}</div></div>`).join('')}function isMe(p){return p.username===me.username}
function startDrag(ev,pid,can){if(!can)return;dragging={pid};ev.currentTarget.setPointerCapture(ev.pointerId)}qs('mapArea').addEventListener('pointermove',ev=>{if(!dragging)return;let rect=qs('mapArea').getBoundingClientRect();let x=(ev.clientX-rect.left)/rect.width*100,y=(ev.clientY-rect.top)/rect.height*100;let el=document.querySelector(`.token[data-id="${dragging.pid}"]`);if(el){el.style.left=Math.max(0,Math.min(100,x))+'%';el.style.top=Math.max(0,Math.min(100,y))+'%'}});qs('mapArea').addEventListener('pointerup',async ev=>{if(!dragging)return;let rect=qs('mapArea').getBoundingClientRect();let x=(ev.clientX-rect.left)/rect.width*100,y=(ev.clientY-rect.top)/rect.height*100;let pid=dragging.pid;dragging=null;await api(`/rooms/${currentRoom}/move-token`,{method:'POST',body:JSON.stringify({player_id:pid,x,y})})});
function renderPlayers(isMaster){qs('players').innerHTML=state.players.map(p=>`<div class="player"><b>${esc(p.username)}</b> <span style="color:var(--muted)">${p.role}</span><br><span style="color:var(--gold2)">${p.character?p.character.name:'sem personagem'}</span><div>Vida ${p.hp}<div class="meter"><div class="fill" style="width:${p.hp}%"></div></div></div><div>Energia ${p.energy}<div class="meter"><div class="fill energy" style="width:${p.energy}%"></div></div></div>${isMaster?`<div class="row" style="margin-top:8px"><input id="hp${p.id}" value="${p.hp}"><input id="en${p.id}" value="${p.energy}"><button class="btn small" onclick="saveStats(${p.id})">OK</button></div><label>Fraqueza/obs.</label><textarea id="nt${p.id}">${esc(p.notes||p.weakness||'')}</textarea><button class="btn small ghost" onclick="saveNotes(${p.id})">Salvar obs.</button>`:''}</div>`).join('')}
async function saveStats(pid){await api(`/rooms/${currentRoom}/stats`,{method:'POST',body:JSON.stringify({player_id:pid,hp:+qs('hp'+pid).value,energy:+qs('en'+pid).value})})}async function saveNotes(pid){await api(`/rooms/${currentRoom}/stats`,{method:'POST',body:JSON.stringify({player_id:pid,notes:qs('nt'+pid).value})})}
async function chooseChar(){await api(`/rooms/${currentRoom}/choose-character`,{method:'POST',body:JSON.stringify({room_id:currentRoom,character_id:qs('charSelect').value})})}async function changeMap(){await api(`/rooms/${currentRoom}/map`,{method:'POST',body:JSON.stringify({map_id:qs('mapSelect').value})})}
function renderChat(){qs('chat').innerHTML=state.chat.map(c=>`<div class="bubble"><b>${esc(c.username)}</b><br>${esc(c.text)}</div>`).join('');qs('chat').scrollTop=99999}async function sendChat(){let t=qs('chatText').value.trim();if(!t)return;qs('chatText').value='';await api(`/rooms/${currentRoom}/chat`,{method:'POST',body:JSON.stringify({text:t})})}
function renderNotes(){qs('notes').innerHTML=state.notes.map(n=>`<div class="note"><b>${esc(n.title)}</b><br>${esc(n.text).replace(/\n/g,'<br>')}</div>`).join('')}async function addNote(){await api(`/rooms/${currentRoom}/notes`,{method:'POST',body:JSON.stringify({title:qs('noteTitle').value,text:qs('noteText').value})});qs('noteText').value=''}async function requestAI(kind){let action=qs('aiAction').value.trim()||'Continue a cena atual com tensão e escolhas.';qs('aiStatus').textContent='Pedido enviado para a IA local...';qs('aiStatus').className='msg';try{let d=await api(`/rooms/${currentRoom}/ai/request`,{method:'POST',body:JSON.stringify({action:action,job_type:kind})});qs('aiStatus').textContent='Pedido #'+d.job.id+' aguardando o worker local.';if(kind==='narrative')qs('aiAction').value='';setTimeout(async()=>{try{state=await api('/rooms/'+currentRoom);renderGame()}catch(e){}},1200)}catch(e){qs('aiStatus').textContent=e.message;qs('aiStatus').className='msg err'}}
function labelJob(t){return t==='summary'?'Resumo':t==='image_prompt'?'Prompt de imagem':t==='question'?'Pergunta':'Narração'}
function renderAIJobs(){let list=state.ai_jobs||[];let box=qs('aiJobs');if(!box)return;box.innerHTML=list.length?list.map(j=>`<div class="aiJob"><div class="aiJobTop"><span class="aiBadge">#${j.id}</span><b>${labelJob(j.job_type)}</b><span class="grow"></span><span class="pill">${j.status}</span></div>${j.status==='done'?`<div class="aiResult">${esc(j.result)}</div><div class="aiActions"><button class="btn small" onclick="publishAI(${j.id},'notes')">Salvar no Diário</button><button class="btn small ghost" onclick="publishAI(${j.id},'chat')">Enviar ao Chat</button></div>`:j.status==='error'?`<div class="err">${esc(j.error||'Erro no worker local')}</div>`:`<div class="aiPending">Aguardando o worker local...</div>`}</div>`).join(''):'<p class="aiPending">Nenhuma resposta da IA ainda.</p>'}
async function publishAI(id,target){await api(`/rooms/${currentRoom}/ai/jobs/${id}/publish`,{method:'POST',body:JSON.stringify({target})});state=await api('/rooms/'+currentRoom);renderGame()}
function toggleSide(){let side=qs('side');let game=document.querySelector('.game');if(!side)return;side.classList.toggle('closed');if(game)game.classList.toggle('panelClosed',side.classList.contains('closed'))}function esc(s){return (s||'').replace(/[&<>"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m]))}

/* ===== v8.1 JS: painel em abas, trilhas curvas e floresta mais rica ===== */
(function(){
  const richerForest={nodes:[
    {id:'entrada',name:'Entrada da Floresta',x:13,y:76,type:'normal',desc:'O último ponto seguro antes das árvores fecharem o caminho. Marcas de passos antigos desaparecem na lama.'},
    {id:'trilha',name:'Trilha dos Sussurros',x:27,y:62,type:'normal',desc:'Folhas secas repetem nomes que ninguém disse em voz alta. A trilha parece mudar quando ninguém olha.'},
    {id:'poco',name:'Poço das Vozes',x:39,y:50,type:'danger',desc:'Um poço coberto por raízes devolve vozes de pessoas que ainda não chegaram aqui.'},
    {id:'ponte',name:'Ponte Quebrada',x:50,y:57,type:'danger',desc:'Madeira úmida sobre um vão escuro. Qualquer passo errado ecoa longe.'},
    {id:'clareira',name:'Clareira Oculta',x:65,y:36,type:'hidden',desc:'Um círculo de luz verde onde pegadas aparecem e somem. Algo antigo observa entre as folhas.'},
    {id:'ninho',name:'Ninho de Espinhos',x:78,y:42,type:'danger',desc:'Galhos torcidos formam um ninho gigante. Dentro dele há tecido rasgado e pequenas luzes vermelhas.'},
    {id:'arvore',name:'Árvore dos Ossos',x:73,y:69,type:'danger',desc:'Raízes contorcidas guardam objetos de quem passou antes. Os ossos pendurados balançam sem vento.'},
    {id:'cabana',name:'Cabana Vazia',x:58,y:76,type:'hidden',desc:'Uma cabana baixa, quase engolida por musgo. A porta está aberta, mas não há pegadas entrando.'},
    {id:'portal',name:'Portal da Próxima Zona',x:91,y:52,type:'portal',desc:'Um arco vivo, pulsando como se respirasse. O ar em volta tem gosto de metal e chuva.'}
  ],links:[['entrada','trilha'],['trilha','poco'],['poco','ponte'],['ponte','clareira'],['clareira','ninho'],['ninho','portal'],['ponte','arvore'],['arvore','portal'],['arvore','cabana'],['cabana','ponte'],['clareira','portal']]};
  if(typeof MAP_GRAPHS!=='undefined') MAP_GRAPHS.floresta_negra=richerForest;
})();
function nodeTypeText(t){return t==='danger'?'Perigo':t==='portal'?'Portal':t==='hidden'?'Oculto':'Local'}
function nodeGlyph(t){return t==='danger'?'⚠':t==='portal'?'◆':t==='hidden'?'✦':'●'}
function curvedPath(A,B,i){let mx=(A.x+B.x)/2,my=(A.y+B.y)/2,dx=B.x-A.x,dy=B.y-A.y,len=Math.max(1,Math.hypot(dx,dy));let bend=((i%2?1:-1)*(5+(i%3)*2));let cx=mx+(-dy/len)*bend,cy=my+(dx/len)*bend;return `M ${A.x} ${A.y} Q ${cx.toFixed(2)} ${cy.toFixed(2)} ${B.x} ${B.y}`}
function renderMapGraph(isMaster){let g=graph();let layer=qs('pathLayer'), nodes=qs('mapNodes');if(!layer||!nodes)return;let defs=`<defs><filter id="trailSoft"><feGaussianBlur stdDeviation="0.25"/></filter></defs>`;let lines=g.links.map(([a,b],i)=>{let A=nodeById(a),B=nodeById(b);if(!A||!B)return '';let cls=(A.type==='danger'||B.type==='danger')?'dangerTrail':(A.type==='hidden'||B.type==='hidden')?'hiddenTrail':'';let d=curvedPath(A,B,i);return `<path class="trailShadow" d="${d}"></path><path class="trailBase ${cls}" d="${d}"></path><path class="trailEdge" d="${d}"></path><path class="trailPebbles" d="${d}"></path>`}).join('');layer.innerHTML=defs+lines;nodes.innerHTML=g.nodes.map(n=>`<div class="mapNode ${n.type==='danger'?'danger':n.type==='portal'?'portal':n.type==='hidden'?'hiddenNode':''} ${selectedNode&&selectedNode.id===n.id?'selected':''}" style="left:${n.x}%;top:${n.y}%" onclick="selectMapNode('${n.id}')"><div class="nodeGlyph">${nodeGlyph(n.type)}</div><div class="mapNodeLabel">${esc(n.name)}</div></div>`).join('');renderLocationBox()}
function selectMapNode(id){selectedNode=nodeById(id);renderMapGraph(state?.me&&state.me.role==='mestre'||me&&me.is_admin);renderLocationBox();}
function renderLocationBox(){let box=qs('locationBox');if(!box)return;if(!selectedNode){box.innerHTML='<div class="locTitle">Selecione um local</div><div class="locationMeta">Clique em um ponto do mapa para ver descrição, mover personagens e gerar narrativa daquele local.</div>';return}let isMaster=state?.me&&state.me.role==='mestre'||me&&me.is_admin;let playerOptions=(state.players||[]).map(p=>`<option value="${p.id}">${esc(p.character?p.character.name:p.username)} · ${esc(p.username)}</option>`).join('');box.innerHTML=`<div class="locTitle">${esc(selectedNode.name)}</div><span class="locType">${nodeTypeText(selectedNode.type)}</span><div class="locationMeta">${esc(selectedNode.desc)}</div><label>Mover token para este local</label><select id="targetPlayer">${playerOptions}</select><div class="locationActions"><button class="btn small" onclick="moveSelectedToNode()" ${isMaster?'':'disabled'}>Mover token</button><button class="btn small ghost" onclick="narrateSelectedNode()">Narrar local</button><button class="btn small ghost" onclick="noteSelectedNode()">Enviar ao diário</button><button class="btn small ghost" onclick="imagePromptSelectedNode()">Prompt imagem</button></div>`}
function initPanelTabs(){let side=qs('side');if(!side||side.dataset.tabs)return;side.dataset.tabs='1';let sections=[...side.querySelectorAll('.sideSection')];let names=['Mapa','Jogadoras','Personagem','Chat','Diário','IA'];let tabs=document.createElement('div');tabs.className='panelTabs';tabs.innerHTML=names.map((n,i)=>`<button class="${i===0?'on':''}" onclick="openPanelTab(${i})">${n}</button>`).join('');side.insertBefore(tabs,side.firstChild);sections.forEach((s,i)=>{s.classList.add('tabPane');if(i===0)s.classList.add('on')});}
function openPanelTab(i){let side=qs('side');[...side.querySelectorAll('.panelTabs button')].forEach((b,k)=>b.classList.toggle('on',k===i));[...side.querySelectorAll('.tabPane')].forEach((p,k)=>p.classList.toggle('on',k===i));}
const _renderGame_v81=renderGame;renderGame=function(){_renderGame_v81();initPanelTabs();}


/* ===== v8.2 JS: estabilidade da IA local ===== */
function hasActiveAI(kind){
  return (state?.ai_jobs||[]).find(j=>(j.status==='pending'||j.status==='processing') && (!kind || j.job_type===kind));
}
async function clearPendingAI(){
  if(!currentRoom)return;
  if(!confirm('Limpar/cancelar todos os pedidos de IA ainda pendentes ou em processamento nesta sala?'))return;
  try{
    let d=await api(`/rooms/${currentRoom}/ai/clear-pending`,{method:'POST'});
    qs('aiStatus').textContent=`${d.cleared||0} pedido(s) pendente(s) limpo(s).`;
    qs('aiStatus').className='msg';
    state=await api('/rooms/'+currentRoom);
    renderGame();
    openPanelTab(5);
  }catch(e){qs('aiStatus').textContent=e.message;qs('aiStatus').className='msg err'}
}
async function cancelAI(id){
  if(!confirm('Cancelar este pedido de IA?'))return;
  try{
    await api(`/rooms/${currentRoom}/ai/jobs/${id}/cancel`,{method:'POST'});
    state=await api('/rooms/'+currentRoom);
    renderGame();
    openPanelTab(5);
  }catch(e){alert(e.message)}
}
const _requestAI_v82_base=requestAI;
requestAI=async function(kind){
  let active=hasActiveAI(kind);
  if(active){
    qs('aiStatus').textContent=`Já existe o pedido #${active.id} (${labelJob(active.job_type)}) aguardando o worker. Processe, cancele ou limpe pendentes antes de criar outro.`;
    qs('aiStatus').className='msg err';
    openPanelTab(5);
    return;
  }
  await _requestAI_v82_base(kind);
  openPanelTab(5);
}
const _renderAIJobs_v82_base=renderAIJobs;
renderAIJobs=function(){
  let list=state?.ai_jobs||[];
  let box=qs('aiJobs');
  if(!box)return;
  box.innerHTML=list.length?list.map(j=>{
    let active=(j.status==='pending'||j.status==='processing');
    let cls=j.status==='error'?' errorJob':(j.status==='processing'?' processingJob':'');
    let body='';
    if(j.status==='done'){
      body=`<div class="aiResult">${esc(j.result)}</div><div class="aiActions"><button class="btn small" onclick="publishAI(${j.id},'notes')">Salvar no Diário</button><button class="btn small ghost" onclick="publishAI(${j.id},'chat')">Enviar ao Chat</button></div>`;
    }else if(j.status==='error'){
      body=`<div class="err">${esc(j.error||'Erro no worker local')}</div>`;
    }else{
      body=`<div class="aiPending">${j.status==='processing'?'Worker processando...':'Aguardando o worker local...'}</div><div class="aiActions"><button class="btn small danger" onclick="cancelAI(${j.id})">Cancelar pedido</button></div>`;
    }
    return `<div class="aiJob${cls}"><div class="aiJobTop"><span class="aiBadge">#${j.id}</span><b>${labelJob(j.job_type)}</b><span class="grow"></span><span class="pill">${j.status}</span></div>${body}</div>`;
  }).join(''):'<p class="aiPending">Nenhuma resposta da IA ainda.</p>';
}
function initAITools(){
  let box=qs('localAIBox');
  if(!box || box.dataset.v82tools)return;
  box.dataset.v82tools='1';
  let status=qs('aiStatus');
  if(status){
    let tools=document.createElement('div');
    tools.className='aiTools';
    tools.innerHTML=`<button class="btn small ghost" onclick="clearPendingAI()">Limpar pendentes</button><button class="btn small ghost" onclick="window.open('/debug/admin-env','_blank')">Ver configuração</button>`;
    status.insertAdjacentElement('afterend',tools);
    let hint=document.createElement('div');
    hint.className='workerHint';
    hint.innerHTML='<b>Worker local:</b> deixe o PowerShell aberto com <code>python local_worker.py</code>. Se aparecer 401, use o arquivo <b>iniciar_worker.bat</b> ou configure novamente o token.';
    tools.insertAdjacentElement('afterend',hint);
  }
}
const _renderGame_v82_base=renderGame;
renderGame=function(){_renderGame_v82_base();initAITools();}

boot();


/* ===== v8.13 JS: modo rápido da IA e comandos prontos ===== */
function aiMode(){return qs('aiMode')?.value || 'short'}
requestAI=async function(kind){
  let active=hasActiveAI(kind);
  if(active){
    qs('aiStatus').textContent=`Já existe o pedido #${active.id} (${labelJob(active.job_type)}) aguardando o worker. Processe, cancele ou limpe pendentes antes de criar outro.`;
    qs('aiStatus').className='msg err';
    openPanelTab(5);
    return;
  }
  let action=qs('aiAction')?.value.trim()||'Continue a cena atual com tensão e escolhas.';
  let mode=aiMode();
  qs('aiStatus').textContent=mode==='short'?'Pedido rápido enviado para a IA local...':'Pedido enviado para a IA local...';
  qs('aiStatus').className='msg';
  try{
    let d=await api(`/rooms/${currentRoom}/ai/request`,{method:'POST',body:JSON.stringify({action:action,job_type:kind,response_mode:mode})});
    qs('aiStatus').textContent='Pedido #'+d.job.id+' aguardando o worker local.';
    if(kind==='narrative')qs('aiAction').value='';
    setTimeout(async()=>{try{state=await api('/rooms/'+currentRoom);renderGame();openPanelTab(5)}catch(e){}},1000);
  }catch(e){qs('aiStatus').textContent=e.message;qs('aiStatus').className='msg err'}
}
function quickAI(type){
  const t={
    opening:['question','Crie uma fala curta e impactante para eu dizer às participantes no início da sessão. Termine com: "O que vocês fazem?"'],
    clue:['question','Crie uma pista curta para as participantes descobrirem neste local, sem entregar a solução inteira.'],
    scare:['question','Crie um susto leve, seguro para crianças/adolescentes, com clima de suspense e sem terror pesado.'],
    consequence:['question','Crie uma consequência objetiva para a próxima ação das participantes, com risco, mas sem violência gráfica.'],
    npc:['question','Crie uma fala curta de um personagem misterioso para esta cena. Deve soar natural e cinematográfica.'],
    catchup:['summary','Resuma rapidamente o que aconteceu até agora para explicar a uma participante que chegou atrasada.']
  };
  let item=t[type]; if(!item)return;
  if(qs('aiMode')) qs('aiMode').value='short';
  if(qs('aiAction')) qs('aiAction').value=item[1];
  requestAI(item[0]);
}
function ensureV813Hint(){
  let box=qs('localAIBox'); if(!box||qs('aiFastHint'))return;
  let h=document.createElement('div');
  h.id='aiFastHint'; h.className='aiActionNote';
  h.innerHTML='Modo <b>Rápida</b> usa prompt menor e limita a resposta para acelerar no seu PC.';
  let status=qs('aiStatus'); if(status) status.parentElement.insertBefore(h,status);
}
const _renderGame_v813=renderGame;
renderGame=function(){_renderGame_v813();ensureV813Hint();}
