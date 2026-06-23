import os, json, random, string, hashlib, secrets
from datetime import datetime, timedelta
from pathlib import Path
from typing import Optional, Dict, List

import jwt
from fastapi import FastAPI, Depends, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from sqlalchemy import create_engine, Column, Integer, String, Boolean, DateTime, ForeignKey, Text, Float, UniqueConstraint
from sqlalchemy.orm import declarative_base, sessionmaker, Session, relationship
from sqlalchemy.pool import StaticPool

APP_NAME = "Terras Raras — Mesa Online"
SECRET = os.getenv("JWT_SECRET", "troque-este-segredo-terras-raras")
ADMIN_USERNAME = os.getenv("ADMIN_USERNAME", "eduardo")
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "admin123")
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./terras_raras.db")
LOCAL_AI_WORKER_TOKEN = os.getenv("LOCAL_AI_WORKER_TOKEN", "terras-local-worker")

if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql+psycopg://", 1)
elif DATABASE_URL.startswith("postgresql://"):
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+psycopg://", 1)

connect_args = {}
engine_kwargs = {}
if DATABASE_URL.startswith("sqlite"):
    connect_args = {"check_same_thread": False}
    if DATABASE_URL == "sqlite://":
        engine_kwargs["poolclass"] = StaticPool

engine = create_engine(DATABASE_URL, connect_args=connect_args, **engine_kwargs)
SessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False)
Base = declarative_base()
security = HTTPBearer()

app = FastAPI(title=APP_NAME)
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True)
    username = Column(String(60), unique=True, nullable=False, index=True)
    password_hash = Column(String(220), nullable=False)
    approved = Column(Boolean, default=False)
    is_admin = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

class Character(Base):
    __tablename__ = "characters"
    id = Column(String(40), primary_key=True)
    name = Column(String(80), nullable=False)
    role = Column(String(80), nullable=False)
    zone = Column(String(80), nullable=False)
    description = Column(Text, default="")
    ability = Column(Text, default="")
    color = Column(String(20), default="#c8a038")
    avatar_svg = Column(Text, default="")

class GameMap(Base):
    __tablename__ = "maps"
    id = Column(String(40), primary_key=True)
    name = Column(String(100), nullable=False)
    zone_number = Column(Integer, default=1)
    description = Column(Text, default="")
    background = Column(String(80), default="forest")
    image_svg = Column(Text, default="")

class Room(Base):
    __tablename__ = "rooms"
    id = Column(String(24), primary_key=True)
    code = Column(String(12), unique=True, nullable=False, index=True)
    name = Column(String(120), nullable=False)
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    active_map_id = Column(String(40), ForeignKey("maps.id"), default="floresta_negra")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow)

class RoomPlayer(Base):
    __tablename__ = "room_players"
    id = Column(Integer, primary_key=True)
    room_id = Column(String(24), ForeignKey("rooms.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    role = Column(String(20), default="participante") # mestre/participante
    character_id = Column(String(40), ForeignKey("characters.id"), nullable=True)
    hp = Column(Integer, default=100)
    energy = Column(Integer, default=80)
    token_x = Column(Float, default=50.0)
    token_y = Column(Float, default=50.0)
    weakness = Column(Text, default="")
    notes = Column(Text, default="")
    inventory = Column(Text, default="Cantil vazio\nAdaga simples")
    updated_at = Column(DateTime, default=datetime.utcnow)
    __table_args__ = (UniqueConstraint("room_id", "user_id", name="uq_room_user"),)

class ChatMessage(Base):
    __tablename__ = "chat_messages"
    id = Column(Integer, primary_key=True)
    room_id = Column(String(24), ForeignKey("rooms.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    text = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

class SessionNote(Base):
    __tablename__ = "session_notes"
    id = Column(Integer, primary_key=True)
    room_id = Column(String(24), ForeignKey("rooms.id", ondelete="CASCADE"), nullable=False)
    title = Column(String(120), default="Nota da Mestre")
    text = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

class EventLog(Base):
    __tablename__ = "event_log"
    id = Column(Integer, primary_key=True)
    room_id = Column(String(24), ForeignKey("rooms.id", ondelete="CASCADE"), nullable=False)
    kind = Column(String(40), default="system")
    text = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

class AIJob(Base):
    __tablename__ = "ai_jobs"
    id = Column(Integer, primary_key=True)
    room_id = Column(String(24), ForeignKey("rooms.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    job_type = Column(String(30), default="narrative")
    status = Column(String(20), default="pending")
    prompt = Column(Text, nullable=False)
    result = Column(Text, default="")
    error = Column(Text, default="")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow)

# ---------- helpers ----------
def db_dep():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def hash_password(password: str) -> str:
    salt = secrets.token_hex(16)
    dk = hashlib.pbkdf2_hmac("sha256", password.encode(), salt.encode(), 120000).hex()
    return f"pbkdf2${salt}${dk}"

def verify_password(password: str, stored: str) -> bool:
    try:
        _, salt, dk = stored.split("$", 2)
        check = hashlib.pbkdf2_hmac("sha256", password.encode(), salt.encode(), 120000).hex()
        return secrets.compare_digest(check, dk)
    except Exception:
        return False

def make_token(user: User) -> str:
    payload = {"sub": str(user.id), "username": user.username, "admin": user.is_admin, "exp": datetime.utcnow() + timedelta(days=14)}
    return jwt.encode(payload, SECRET, algorithm="HS256")

def current_user(creds: HTTPAuthorizationCredentials = Depends(security), db: Session = Depends(db_dep)) -> User:
    try:
        data = jwt.decode(creds.credentials, SECRET, algorithms=["HS256"])
        user = db.get(User, int(data["sub"]))
    except Exception:
        raise HTTPException(401, "Sessão inválida")
    if not user:
        raise HTTPException(401, "Usuário não encontrado")
    if not user.approved:
        raise HTTPException(403, "Cadastro ainda não autorizado")
    return user

def admin_user(user: User = Depends(current_user)) -> User:
    if not user.is_admin:
        raise HTTPException(403, "Apenas administrador")
    return user

def rid(): return "rm_" + "".join(random.choices(string.ascii_lowercase + string.digits, k=8))
def code(): return "SALA-" + "".join(random.choices(string.ascii_uppercase + string.digits, k=4))

def svg_avatar(name, color):
    initial = name[:1].upper()
    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120"><defs><radialGradient id="g"><stop offset="0" stop-color="{color}"/><stop offset="1" stop-color="#100805"/></radialGradient></defs><rect width="120" height="120" rx="60" fill="url(#g)"/><circle cx="60" cy="46" r="24" fill="#d2b28a"/><path d="M22 112c7-30 26-45 38-45s31 15 38 45" fill="#20160d"/><text x="60" y="100" text-anchor="middle" font-size="26" font-family="serif" fill="#f2d27a">{initial}</text></svg>'''

def svg_map(label, bg):
    palettes = {
        "forest": ("#06130b", "#14351f", "#2f6b38"), "candy": ("#241021", "#7b2b63", "#e0a0c4"),
        "mountain": ("#15130e", "#443d32", "#9d8350"), "ice": ("#07131d", "#1b506b", "#bcecff"),
        "desert": ("#201407", "#7b5724", "#d0a24c"), "storm": ("#080912", "#222d69", "#d0d7ff"),
        "demon": ("#110306", "#481018", "#d04444"), "void": ("#020202", "#121212", "#777777")
    }
    a,b,c = palettes.get(bg, palettes["forest"])
    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 700" preserveAspectRatio="none"><defs><radialGradient id="r"><stop offset="0" stop-color="{c}" stop-opacity=".36"/><stop offset="1" stop-color="{a}"/></radialGradient><filter id="noise"><feTurbulence type="fractalNoise" baseFrequency="0.018" numOctaves="3"/><feColorMatrix type="saturate" values="0"/><feComponentTransfer><feFuncA type="table" tableValues="0 .18"/></feComponentTransfer></filter></defs><rect width="1200" height="700" fill="url(#r)"/><rect width="1200" height="700" filter="url(#noise)" opacity=".55"/><path d="M0 540 C180 420 260 610 390 480 S660 390 780 520 S1010 360 1200 480 L1200 700 L0 700Z" fill="{b}" opacity=".8"/><path d="M120 170 C250 70 420 230 560 120 S860 90 1040 190" fill="none" stroke="{c}" stroke-width="5" opacity=".25"/><text x="60" y="92" fill="#e6bd58" font-size="48" font-family="serif" letter-spacing="8">{label}</text></svg>'''

def seed(db: Session):
    Base.metadata.create_all(bind=engine)
    admin = db.query(User).filter(User.username == ADMIN_USERNAME).first()
    if not admin:
        db.add(User(username=ADMIN_USERNAME, password_hash=hash_password(ADMIN_PASSWORD), approved=True, is_admin=True))
    else:
        # Mantém o admin sincronizado com as variáveis do Railway a cada deploy.
        # Assim, trocar ADMIN_PASSWORD no Railway troca a senha real de login.
        admin.password_hash = hash_password(ADMIN_PASSWORD)
        admin.approved = True
        admin.is_admin = True
    chars = [
        ("katrina","Katrina","Guerreira","Zona Diamante","Fria como aço. Sobreviveu onde todos caíram.","Fúria de Aço", "#c84030"),
        ("sarah","Sarah","Estrategista","Zona Áurea","Mente brilhante. Usa lógica como lâmina.","Visão Tática", "#3878c8"),
        ("mira","Mira","Caçadora","Picos Arcaicos","Arqueira silenciosa das montanhas.","Olho de Águia", "#3a8a50"),
        ("vex","Vex","Sombra","Enclave Sombrio","Aparece onde a luz falha.","Passo Silencioso", "#7a4bc8"),
        ("nina","Nina","Curandeira","Alexandria","Guarda livros e segredos antigos.","Mãos de Luz", "#c8a038"),
        ("thais","Thais","Exploradora","Gelo Eterno","Conhece trilhas que ninguém vê.","Rastro Impossível", "#76d1ff"),
    ]
    for cid,n,r,z,d,a,col in chars:
        if not db.get(Character, cid):
            db.add(Character(id=cid,name=n,role=r,zone=z,description=d,ability=a,color=col,avatar_svg=svg_avatar(n,col)))
    maps = [
        ("floresta_negra",1,"Floresta Negra","Uma floresta viva, densa, hostil, com árvores que mudam os polos.","forest"),
        ("fabrica_doces",2,"Fábrica dos Doces Pesadelos","Uma fábrica alucinante onde o cheiro cria ilusões.","candy"),
        ("montanhas_arcaicas",3,"Montanhas Arcaicas","Pterodáctilos, cavernas e monstros que farejam medo.","mountain"),
        ("gelo_eterno",4,"Gelo Eterno","Frio tão intenso que congela escolhas.","ice"),
        ("alexandria",5,"Alexandria","Biblioteca perdida no deserto, onde saber é poder.","desert"),
        ("tempestade_deuses",6,"Tempestade dos Deuses","Zeus e Poseidon em guerra sob chuva, raios e lama.","storm"),
        ("correr_ou_morrer",7,"Correr ou Morrer","Duas casinhas, demônios noturnos e uma fuga cruel.","demon"),
        ("o_vazio",8,"O Vazio","Escuridão, baixa luz e solidão como inimiga.","void"),
    ]
    for mid,num,n,d,bg in maps:
        if not db.get(GameMap, mid):
            db.add(GameMap(id=mid, name=n, zone_number=num, description=d, background=bg, image_svg=svg_map(n,bg)))
    db.commit()

@app.on_event("startup")
def startup():
    db = SessionLocal(); seed(db); db.close()

# ---------- schemas ----------
class RegisterReq(BaseModel): username: str; password: str
class LoginReq(BaseModel): username: str; password: str
class CreateRoomReq(BaseModel): name: str
class JoinReq(BaseModel): code: str
class ChooseCharReq(BaseModel): room_id: str; character_id: str
class MoveReq(BaseModel): player_id: int; x: float; y: float
class StatsReq(BaseModel): player_id: int; hp: Optional[int]=None; energy: Optional[int]=None; weakness: Optional[str]=None; notes: Optional[str]=None; inventory: Optional[str]=None
class MapReq(BaseModel): map_id: str
class ChatReq(BaseModel): text: str
class NoteReq(BaseModel): title: str="Nota da Mestre"; text: str
class AIRequestReq(BaseModel): action: str; job_type: str="narrative"
class AICompleteReq(BaseModel): result: str=""; error: str=""; status: str="done"
class AIPublishReq(BaseModel): target: str="chat"

# ---------- websocket manager ----------
class WSManager:
    def __init__(self): self.rooms: Dict[str, List[WebSocket]] = {}
    async def connect(self, room_id: str, ws: WebSocket):
        await ws.accept(); self.rooms.setdefault(room_id, []).append(ws)
    def disconnect(self, room_id: str, ws: WebSocket):
        if room_id in self.rooms: self.rooms[room_id] = [x for x in self.rooms[room_id] if x is not ws]
    async def broadcast(self, room_id: str, payload: dict):
        dead=[]
        for ws in self.rooms.get(room_id, []):
            try: await ws.send_text(json.dumps(payload, ensure_ascii=False))
            except Exception: dead.append(ws)
        for ws in dead: self.disconnect(room_id, ws)
manager = WSManager()

# ---------- serializers ----------
def player_dict(db: Session, p: RoomPlayer):
    u = db.get(User, p.user_id); ch = db.get(Character, p.character_id) if p.character_id else None
    return {"id":p.id,"username":u.username if u else "?","role":p.role,"character": char_dict(ch) if ch else None,"hp":p.hp,"energy":p.energy,"x":p.token_x,"y":p.token_y,"weakness":p.weakness,"notes":p.notes,"inventory":p.inventory}

def char_dict(c: Optional[Character]):
    if not c: return None
    return {"id":c.id,"name":c.name,"role":c.role,"zone":c.zone,"description":c.description,"ability":c.ability,"color":c.color,"avatar_svg":c.avatar_svg}

def map_dict(m: Optional[GameMap]):
    if not m: return None
    return {"id":m.id,"name":m.name,"zone_number":m.zone_number,"description":m.description,"background":m.background,"image_svg":m.image_svg}

def room_state(db: Session, room_id: str):
    r = db.get(Room, room_id)
    if not r: raise HTTPException(404, "Sala não encontrada")
    players = db.query(RoomPlayer).filter(RoomPlayer.room_id == room_id).all()
    chats = db.query(ChatMessage).filter(ChatMessage.room_id == room_id).order_by(ChatMessage.id.desc()).limit(50).all()[::-1]
    notes = db.query(SessionNote).filter(SessionNote.room_id == room_id).order_by(SessionNote.id.desc()).limit(20).all()
    ai_jobs = db.query(AIJob).filter(AIJob.room_id == room_id).order_by(AIJob.id.desc()).limit(12).all()
    maps = db.query(GameMap).order_by(GameMap.zone_number).all()
    return {
        "room":{"id":r.id,"code":r.code,"name":r.name,"active_map_id":r.active_map_id},
        "map": map_dict(db.get(GameMap, r.active_map_id)),
        "maps":[map_dict(x) for x in maps],
        "players":[player_dict(db,p) for p in players],
        "chat":[{"id":c.id,"username":db.get(User,c.user_id).username,"text":c.text,"created_at":c.created_at.isoformat()} for c in chats],
        "notes":[{"id":n.id,"title":n.title,"text":n.text,"created_at":n.created_at.isoformat()} for n in notes],
        "ai_jobs":[ai_job_dict(j) for j in ai_jobs]
    }

def require_master(db: Session, room_id: str, user: User):
    rp = db.query(RoomPlayer).filter_by(room_id=room_id, user_id=user.id).first()
    if not rp or (rp.role != "mestre" and not user.is_admin):
        raise HTTPException(403, "Apenas a Mestre/admin pode fazer isso")
    return rp


def worker_ok(token: Optional[str]) -> bool:
    return bool(token) and secrets.compare_digest(token, LOCAL_AI_WORKER_TOKEN)

def build_ai_prompt(db: Session, room_id: str, user: User, action: str, job_type: str) -> str:
    r = db.get(Room, room_id)
    m = db.get(GameMap, r.active_map_id) if r else None
    players = db.query(RoomPlayer).filter_by(room_id=room_id).all()
    notes = db.query(SessionNote).filter(SessionNote.room_id == room_id).order_by(SessionNote.id.desc()).limit(5).all()[::-1]
    chats = db.query(ChatMessage).filter(ChatMessage.room_id == room_id).order_by(ChatMessage.id.desc()).limit(12).all()[::-1]
    player_lines = []
    for p in players:
        u = db.get(User, p.user_id)
        ch = db.get(Character, p.character_id) if p.character_id else None
        player_lines.append(f"- {u.username if u else '?'} / {ch.name if ch else 'sem personagem'} / papel: {p.role} / HP {p.hp} / energia {p.energy} / posição no mapa: x={p.token_x:.1f}%, y={p.token_y:.1f}% / inventário: {p.inventory}")
    diary = "\n".join([f"{n.title}: {n.text}" for n in notes]) or "Sem notas ainda."
    history = "\n".join([f"{db.get(User,c.user_id).username if db.get(User,c.user_id) else '?'}: {c.text}" for c in chats]) or "Sem histórico ainda."
    base = f"""Você é a Narradora Local do jogo TERRAS RARAS, um RPG de sobrevivência para crianças/adolescentes, com tom cinematográfico, sombrio porém seguro.

REGRAS IMPORTANTES:
- Escreva em português brasileiro.
- Não mencione IA, modelo, API ou sistema.
- Não use violência gráfica, sexualização, drogas ou terror excessivo.
- Preserve o controle da Mestre: gere sugestão publicável, mas clara e curta.
- Máximo de 3 parágrafos para narrativa.

MESA: {r.name if r else room_id}
MAPA/ZONA ATUAL: {m.name if m else 'Mapa desconhecido'}
DESCRIÇÃO DA ZONA: {m.description if m else ''}

JOGADORAS:
{chr(10).join(player_lines) or 'Nenhuma jogadora listada.'}

DIÁRIO DA MESTRE:
{diary}

HISTÓRICO RECENTE:
{history}

PEDIDO DA MESTRE/JOGADORA:
{action}
"""
    if job_type == "image_prompt":
        return base + """
Crie APENAS um prompt de imagem cinematográfico em inglês para Stable Diffusion/ComfyUI, baseado na cena atual.
Inclua: ambiente, iluminação, câmera, atmosfera, estilo visual, composição, sem texto na imagem.
Não gere narrativa; gere somente o prompt de imagem."""
    if job_type == "summary":
        return base + """
Crie um resumo de sessão organizado em tópicos: eventos importantes, posição dos personagens, itens/fraquezas descobertas e ganchos para a próxima sessão."""
    return base + """
Gere a próxima narração da cena em 2 parágrafos curtos. Depois, se fizer sentido, liste 2 ou 3 escolhas objetivas para as jogadoras. Não use títulos longos."""

def ai_job_dict(j: AIJob):
    return {"id": j.id, "room_id": j.room_id, "job_type": j.job_type, "status": j.status, "prompt": j.prompt, "result": j.result, "error": j.error, "created_at": j.created_at.isoformat(), "updated_at": j.updated_at.isoformat()}

# ---------- routes ----------
@app.get("/")
def home():
    return HTMLResponse(Path("index.html").read_text(encoding="utf-8"))

@app.get("/health")
def health(): return {"status":"ok", "service": APP_NAME, "version":"v7-ai-organizada"}

@app.get("/debug/admin-env")
def debug_admin_env():
    return {
        "admin_username_configured": bool(ADMIN_USERNAME),
        "admin_username": (ADMIN_USERNAME or "").strip().lower(),
        "admin_password_configured": bool(ADMIN_PASSWORD),
        "database_url_configured": bool(DATABASE_URL),
        "jwt_secret_configured": bool(SECRET),
        "local_ai_worker_token_configured": bool(LOCAL_AI_WORKER_TOKEN),
        "version": "v6-local-ai-zero-cost"
    }

@app.post("/auth/register")
def register(req: RegisterReq, db: Session = Depends(db_dep)):
    username = req.username.strip().lower()
    if len(username) < 2 or len(req.password) < 4: raise HTTPException(400, "Nome mínimo 2 letras; senha mínimo 4")
    if db.query(User).filter_by(username=username).first(): raise HTTPException(400, "Nome já cadastrado")
    user = User(username=username, password_hash=hash_password(req.password), approved=False, is_admin=False)
    db.add(user); db.commit()
    return {"ok": True, "message":"Cadastro enviado. Aguarde autorização do Eduardo."}

@app.post("/auth/login")
def login(req: LoginReq, db: Session = Depends(db_dep)):
    username = req.username.strip().lower()
    admin_username = (ADMIN_USERNAME or "eduardo").strip().lower()

    # Correção definitiva: se o login informado bater com as variáveis do Railway,
    # o admin é criado/atualizado no banco imediatamente, mesmo que o banco esteja com senha antiga.
    if username == admin_username and req.password == ADMIN_PASSWORD:
        user = db.query(User).filter_by(username=admin_username).first()
        if not user:
            user = User(
                username=admin_username,
                password_hash=hash_password(ADMIN_PASSWORD),
                approved=True,
                is_admin=True,
            )
            db.add(user)
            db.commit()
            db.refresh(user)
        else:
            user.password_hash = hash_password(ADMIN_PASSWORD)
            user.approved = True
            user.is_admin = True
            db.commit()
            db.refresh(user)
        return {"token": make_token(user), "user": {"id": user.id, "username": user.username, "is_admin": user.is_admin}}

    user = db.query(User).filter_by(username=username).first()
    if not user or not verify_password(req.password, user.password_hash):
        raise HTTPException(401, "Login inválido")
    if not user.approved:
        raise HTTPException(403, "Cadastro ainda pendente de autorização")
    return {"token": make_token(user), "user": {"id": user.id, "username": user.username, "is_admin": user.is_admin}}

@app.get("/me")
def me(user: User = Depends(current_user)):
    return {"id":user.id,"username":user.username,"is_admin":user.is_admin}

@app.get("/admin/pending")
def pending(_: User = Depends(admin_user), db: Session = Depends(db_dep)):
    return [{"id":u.id,"username":u.username,"created_at":u.created_at.isoformat()} for u in db.query(User).filter_by(approved=False).all()]

@app.post("/admin/approve/{user_id}")
def approve(user_id: int, _: User = Depends(admin_user), db: Session = Depends(db_dep)):
    u = db.get(User, user_id)
    if not u: raise HTTPException(404, "Usuário não encontrado")
    u.approved=True; db.commit(); return {"ok": True}

@app.get("/characters")
def characters(db: Session = Depends(db_dep), user: User = Depends(current_user)):
    return [char_dict(c) for c in db.query(Character).all()]

@app.get("/maps")
def maps(db: Session = Depends(db_dep), user: User = Depends(current_user)):
    return [map_dict(m) for m in db.query(GameMap).order_by(GameMap.zone_number).all()]

@app.post("/rooms/create")
def create_room(req: CreateRoomReq, db: Session = Depends(db_dep), user: User = Depends(current_user)):
    r = Room(id=rid(), code=code(), name=req.name.strip() or "Mesa Terras Raras", owner_id=user.id)
    db.add(r); db.flush()
    db.add(RoomPlayer(room_id=r.id, user_id=user.id, role="mestre", character_id="sarah", token_x=50, token_y=50))
    db.add(EventLog(room_id=r.id, kind="system", text=f"{user.username} criou a mesa."))
    db.commit(); return {"id":r.id,"code":r.code,"name":r.name}

@app.post("/rooms/join")
def join_room(req: JoinReq, db: Session = Depends(db_dep), user: User = Depends(current_user)):
    r = db.query(Room).filter(Room.code == req.code.strip().upper()).first()
    if not r: raise HTTPException(404, "Código de sala não encontrado")
    rp = db.query(RoomPlayer).filter_by(room_id=r.id, user_id=user.id).first()
    if not rp:
        db.add(RoomPlayer(room_id=r.id, user_id=user.id, role="participante", token_x=random.randint(35,65), token_y=random.randint(35,65)))
        db.add(EventLog(room_id=r.id, kind="system", text=f"{user.username} entrou na mesa."))
        db.commit()
    return {"id":r.id,"code":r.code,"name":r.name}

@app.get("/rooms/mine")
def mine(db: Session = Depends(db_dep), user: User = Depends(current_user)):
    rows = db.query(RoomPlayer).filter_by(user_id=user.id).all()
    out=[]
    for rp in rows:
        r=db.get(Room, rp.room_id); out.append({"id":r.id,"code":r.code,"name":r.name,"role":rp.role,"map_id":r.active_map_id})
    return out


@app.post("/rooms/{room_id}/leave")
async def leave_room(room_id: str, db: Session = Depends(db_dep), user: User = Depends(current_user)):
    r = db.get(Room, room_id)
    if not r:
        raise HTTPException(404, "Sala não encontrada")
    rp = db.query(RoomPlayer).filter_by(room_id=room_id, user_id=user.id).first()
    if not rp:
        return {"ok": True, "message": "Você já não está nesta sala."}

    was_master = (rp.role == "mestre")
    db.delete(rp)
    db.flush()

    remaining = db.query(RoomPlayer).filter_by(room_id=room_id).all()
    if not remaining:
        db.delete(r)
        db.commit()
        await manager.broadcast(room_id, {"type":"room_deleted"})
        return {"ok": True, "deleted": True, "message": "Você saiu da sala. Como não havia mais jogadoras, a sala foi encerrada."}

    if was_master:
        remaining[0].role = "mestre"
        r.owner_id = remaining[0].user_id
        promoted_user = db.get(User, remaining[0].user_id)
        db.add(EventLog(room_id=room_id, kind="system", text=f"{user.username} saiu da mesa. {promoted_user.username if promoted_user else 'Outra jogadora'} agora é Mestre."))
    else:
        db.add(EventLog(room_id=room_id, kind="system", text=f"{user.username} saiu da mesa."))
    r.updated_at = datetime.utcnow()
    db.commit()
    await manager.broadcast(room_id, {"type":"state", "state":room_state(db, room_id)})
    return {"ok": True, "deleted": False, "message": "Você saiu da sala."}

@app.get("/rooms/{room_id}")
def get_room(room_id: str, db: Session = Depends(db_dep), user: User = Depends(current_user)):
    rp = db.query(RoomPlayer).filter_by(room_id=room_id, user_id=user.id).first()
    if not rp and not user.is_admin: raise HTTPException(403, "Você não está nesta sala")
    st = room_state(db, room_id)
    st["me"] = player_dict(db, rp) if rp else {"role":"admin"}
    return st

@app.post("/rooms/{room_id}/choose-character")
async def choose_character(room_id: str, req: ChooseCharReq, db: Session = Depends(db_dep), user: User = Depends(current_user)):
    if req.room_id != room_id: raise HTTPException(400, "Sala divergente")
    rp = db.query(RoomPlayer).filter_by(room_id=room_id, user_id=user.id).first()
    if not rp: raise HTTPException(403, "Você não está nesta sala")
    if not db.get(Character, req.character_id): raise HTTPException(404, "Personagem não encontrado")
    rp.character_id = req.character_id; rp.updated_at=datetime.utcnow(); db.commit()
    await manager.broadcast(room_id, {"type":"state", "state":room_state(db, room_id)})
    return {"ok": True}

@app.post("/rooms/{room_id}/move-token")
async def move_token(room_id: str, req: MoveReq, db: Session = Depends(db_dep), user: User = Depends(current_user)):
    target = db.get(RoomPlayer, req.player_id)
    if not target or target.room_id != room_id: raise HTTPException(404, "Token não encontrado")
    mine = db.query(RoomPlayer).filter_by(room_id=room_id, user_id=user.id).first()
    if not mine: raise HTTPException(403, "Você não está nesta sala")
    if mine.role != "mestre" and target.user_id != user.id and not user.is_admin:
        raise HTTPException(403, "Você só pode mover seu próprio token")
    target.token_x=max(0,min(100,req.x)); target.token_y=max(0,min(100,req.y)); target.updated_at=datetime.utcnow(); db.commit()
    await manager.broadcast(room_id, {"type":"state", "state":room_state(db, room_id)})
    return {"ok": True}

@app.post("/rooms/{room_id}/stats")
async def stats(room_id: str, req: StatsReq, db: Session = Depends(db_dep), user: User = Depends(current_user)):
    require_master(db, room_id, user)
    p = db.get(RoomPlayer, req.player_id)
    if not p or p.room_id != room_id: raise HTTPException(404, "Jogadora não encontrada")
    if req.hp is not None: p.hp=max(0,min(100,req.hp))
    if req.energy is not None: p.energy=max(0,min(100,req.energy))
    if req.weakness is not None: p.weakness=req.weakness
    if req.notes is not None: p.notes=req.notes
    if req.inventory is not None: p.inventory=req.inventory
    p.updated_at=datetime.utcnow(); db.commit()
    await manager.broadcast(room_id, {"type":"state", "state":room_state(db, room_id)})
    return {"ok": True}

@app.post("/rooms/{room_id}/map")
async def change_map(room_id: str, req: MapReq, db: Session = Depends(db_dep), user: User = Depends(current_user)):
    require_master(db, room_id, user)
    r = db.get(Room, room_id); m = db.get(GameMap, req.map_id)
    if not m: raise HTTPException(404, "Mapa não encontrado")
    r.active_map_id=req.map_id; r.updated_at=datetime.utcnow()
    db.add(EventLog(room_id=room_id, kind="map", text=f"Mapa alterado para {m.name}")); db.commit()
    await manager.broadcast(room_id, {"type":"state", "state":room_state(db, room_id)})
    return {"ok": True}

@app.post("/rooms/{room_id}/chat")
async def chat(room_id: str, req: ChatReq, db: Session = Depends(db_dep), user: User = Depends(current_user)):
    if not db.query(RoomPlayer).filter_by(room_id=room_id, user_id=user.id).first() and not user.is_admin: raise HTTPException(403, "Você não está nesta sala")
    msg = ChatMessage(room_id=room_id, user_id=user.id, text=req.text.strip()[:1000]); db.add(msg); db.commit()
    await manager.broadcast(room_id, {"type":"state", "state":room_state(db, room_id)})
    return {"ok": True}

@app.post("/rooms/{room_id}/notes")
async def notes(room_id: str, req: NoteReq, db: Session = Depends(db_dep), user: User = Depends(current_user)):
    require_master(db, room_id, user)
    db.add(SessionNote(room_id=room_id, title=req.title[:120], text=req.text[:5000])); db.commit()
    await manager.broadcast(room_id, {"type":"state", "state":room_state(db, room_id)})
    return {"ok": True}


@app.post("/rooms/{room_id}/ai/request")
async def request_local_ai(room_id: str, req: AIRequestReq, db: Session = Depends(db_dep), user: User = Depends(current_user)):
    require_master(db, room_id, user)
    job_type = req.job_type if req.job_type in ("narrative", "image_prompt", "summary") else "narrative"
    prompt = build_ai_prompt(db, room_id, user, req.action.strip() or "Continue a cena.", job_type)
    job = AIJob(room_id=room_id, user_id=user.id, job_type=job_type, status="pending", prompt=prompt)
    db.add(job)
    db.add(EventLog(room_id=room_id, kind="ai", text=f"Pedido de IA local criado: {job_type}."))
    db.commit(); db.refresh(job)
    await manager.broadcast(room_id, {"type":"ai_job", "job": ai_job_dict(job)})
    return {"ok": True, "job": ai_job_dict(job), "message":"Pedido enviado para a IA local. Rode o worker no seu computador para processar."}

@app.get("/rooms/{room_id}/ai/jobs")
def list_room_ai_jobs(room_id: str, db: Session = Depends(db_dep), user: User = Depends(current_user)):
    if not db.query(RoomPlayer).filter_by(room_id=room_id, user_id=user.id).first() and not user.is_admin:
        raise HTTPException(403, "Você não está nesta sala")
    jobs = db.query(AIJob).filter_by(room_id=room_id).order_by(AIJob.id.desc()).limit(20).all()
    return [ai_job_dict(j) for j in jobs]

@app.get("/ai/jobs/next")
def next_ai_job(token: str = "", db: Session = Depends(db_dep)):
    if not worker_ok(token):
        raise HTTPException(401, "Worker token inválido")
    job = db.query(AIJob).filter_by(status="pending").order_by(AIJob.id.asc()).first()
    if not job:
        return {"job": None}
    job.status = "processing"
    job.updated_at = datetime.utcnow()
    db.commit(); db.refresh(job)
    return {"job": ai_job_dict(job)}

@app.post("/ai/jobs/{job_id}/complete")
async def complete_ai_job(job_id: int, req: AICompleteReq, token: str = "", db: Session = Depends(db_dep)):
    if not worker_ok(token):
        raise HTTPException(401, "Worker token inválido")
    job = db.get(AIJob, job_id)
    if not job:
        raise HTTPException(404, "Job não encontrado")
    job.status = "error" if req.status == "error" or req.error else "done"
    job.result = req.result[:12000]
    job.error = req.error[:4000]
    job.updated_at = datetime.utcnow()
    if job.status == "done" and job.result:
        # Na v7, a resposta da IA fica em uma área própria.
        # A Mestre escolhe se publica no chat ou salva no Diário.
        db.add(EventLog(room_id=job.room_id, kind="ai", text=f"IA local concluiu: {job.job_type}."))
    elif job.status == "error":
        db.add(EventLog(room_id=job.room_id, kind="ai_error", text=f"Erro na IA local: {job.error or 'erro desconhecido'}"))
    db.commit(); db.refresh(job)
    await manager.broadcast(job.room_id, {"type":"state", "state": room_state(db, job.room_id)})
    await manager.broadcast(job.room_id, {"type":"ai_job", "job": ai_job_dict(job)})
    return {"ok": True, "job": ai_job_dict(job)}


@app.post("/rooms/{room_id}/ai/jobs/{job_id}/publish")
async def publish_ai_job(room_id: str, job_id: int, req: AIPublishReq, db: Session = Depends(db_dep), user: User = Depends(current_user)):
    require_master(db, room_id, user)
    job = db.get(AIJob, job_id)
    if not job or job.room_id != room_id:
        raise HTTPException(404, "Resposta de IA não encontrada")
    if job.status != "done" or not job.result:
        raise HTTPException(400, "A resposta ainda não está pronta")
    title = "Narração da IA Local"
    if job.job_type == "summary":
        title = "Resumo gerado pela IA Local"
    elif job.job_type == "image_prompt":
        title = "Prompt de imagem gerado pela IA Local"
    if req.target == "notes":
        db.add(SessionNote(room_id=room_id, title=title, text=job.result[:5000]))
    else:
        db.add(ChatMessage(room_id=room_id, user_id=user.id, text=("🎙️ " + title + ":\n" + job.result)[:1000]))
    db.add(EventLog(room_id=room_id, kind="ai_publish", text=f"{title} publicado em {req.target}."))
    db.commit()
    await manager.broadcast(room_id, {"type":"state", "state": room_state(db, room_id)})
    return {"ok": True}

@app.websocket("/ws/{room_id}")
async def ws_room(room_id: str, ws: WebSocket):
    await manager.connect(room_id, ws)
    try:
        while True:
            await ws.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(room_id, ws)
