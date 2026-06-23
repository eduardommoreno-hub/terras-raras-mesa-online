import os, json, random, string, hashlib, secrets, re
from datetime import datetime, timedelta
from pathlib import Path
from typing import Optional, Dict, List

import jwt
from fastapi import FastAPI, Depends, HTTPException, WebSocket, WebSocketDisconnect, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from sqlalchemy import create_engine, Column, Integer, String, Boolean, DateTime, ForeignKey, Text, Float, UniqueConstraint
from sqlalchemy.orm import declarative_base, sessionmaker, Session, relationship
from sqlalchemy.pool import StaticPool

APP_NAME = "Terras Raras — Mesa Online"
APP_VERSION = "v9.7.4-responsivo-funcoes-iguais"
SECRET = os.getenv("JWT_SECRET", "troque-este-segredo-terras-raras")
ADMIN_USERNAME = os.getenv("ADMIN_USERNAME", "eduardo")
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "admin123")
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./terras_raras.db")
LOCAL_AI_WORKER_TOKEN = os.getenv("LOCAL_AI_WORKER_TOKEN", "terras-local-worker-eduardo-2026")
WORKER_LAST_SEEN = None
WORKER_LAST_MODEL = ""
WORKER_LAST_URL = ""

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
    is_public = Column(Boolean, default=False)
    scheduled_start = Column(DateTime, nullable=True)
    session_status = Column(String(20), default="waiting")  # waiting/active/ended
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
    muted_until = Column(DateTime, nullable=True)
    updated_at = Column(DateTime, default=datetime.utcnow)
    __table_args__ = (UniqueConstraint("room_id", "user_id", name="uq_room_user"),)

class ChatMessage(Base):
    __tablename__ = "chat_messages"
    id = Column(Integer, primary_key=True)
    room_id = Column(String(24), ForeignKey("rooms.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    text = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

class StaffChatMessage(Base):
    __tablename__ = "staff_chat_messages"
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


class SecurityLog(Base):
    __tablename__ = "security_logs"
    id = Column(Integer, primary_key=True)
    room_id = Column(String(24), ForeignKey("rooms.id", ondelete="SET NULL"), nullable=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    username = Column(String(80), default="")
    reason = Column(String(80), default="")
    categories = Column(String(300), default="")
    masked_text = Column(Text, default="")
    ip_address = Column(String(80), default="")
    user_agent = Column(Text, default="")
    source = Column(String(40), default="chat")
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

class RoomLocationDescription(Base):
    __tablename__ = "room_location_descriptions"
    id = Column(Integer, primary_key=True)
    room_id = Column(String(24), ForeignKey("rooms.id", ondelete="CASCADE"), nullable=False)
    map_id = Column(String(40), nullable=False)
    location_id = Column(String(80), nullable=False)
    location_name = Column(String(160), default="Local")
    description = Column(Text, nullable=False)
    updated_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    updated_at = Column(DateTime, default=datetime.utcnow)
    __table_args__ = (UniqueConstraint("room_id", "map_id", "location_id", name="uq_room_map_location_desc"),)

class RoomProgressFlag(Base):
    __tablename__ = "room_progress_flags"
    id = Column(Integer, primary_key=True)
    room_id = Column(String(24), ForeignKey("rooms.id", ondelete="CASCADE"), nullable=False)
    map_id = Column(String(40), nullable=False)
    key = Column(String(160), nullable=False)
    value = Column(Boolean, default=True)
    label = Column(String(240), default="")
    updated_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    updated_at = Column(DateTime, default=datetime.utcnow)
    __table_args__ = (UniqueConstraint("room_id", "map_id", "key", name="uq_room_progress_flag"),)

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


def ensure_schema_columns():
    """Migração leve para bancos já existentes no Railway/SQLite."""
    with engine.begin() as conn:
        dialect = engine.dialect.name
        if dialect == "sqlite":
            rows = conn.exec_driver_sql("PRAGMA table_info(rooms)").fetchall()
            cols = {r[1] for r in rows}
            if "is_public" not in cols:
                conn.exec_driver_sql("ALTER TABLE rooms ADD COLUMN is_public BOOLEAN DEFAULT 0")
            if "scheduled_start" not in cols:
                conn.exec_driver_sql("ALTER TABLE rooms ADD COLUMN scheduled_start DATETIME")
            if "session_status" not in cols:
                conn.exec_driver_sql("ALTER TABLE rooms ADD COLUMN session_status VARCHAR(20) DEFAULT 'waiting'")
            rp_rows = conn.exec_driver_sql("PRAGMA table_info(room_players)").fetchall()
            rp_cols = {r[1] for r in rp_rows}
            if "muted_until" not in rp_cols:
                conn.exec_driver_sql("ALTER TABLE room_players ADD COLUMN muted_until DATETIME")
        else:
            conn.exec_driver_sql("ALTER TABLE rooms ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT FALSE")
            conn.exec_driver_sql("ALTER TABLE rooms ADD COLUMN IF NOT EXISTS scheduled_start TIMESTAMP")
            conn.exec_driver_sql("ALTER TABLE rooms ADD COLUMN IF NOT EXISTS session_status VARCHAR(20) DEFAULT 'waiting'")
            conn.exec_driver_sql("ALTER TABLE room_players ADD COLUMN IF NOT EXISTS muted_until TIMESTAMP")


def seed(db: Session):
    Base.metadata.create_all(bind=engine)
    ensure_schema_columns()
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
        ("floresta_negra",1,"Floresta Negra","Uma floresta viva, antiga e consciente. Trilhas mudam, vozes enganam, pistas surgem em lugares errados e o Portal da Próxima Zona observa quem se aproxima.","forest"),
        ("fabrica_doces",2,"Fábrica dos Doces Pesadelos","Uma fábrica alucinante onde o cheiro cria ilusões.","candy"),
        ("montanhas_arcaicas",3,"Montanhas Arcaicas","Pterodáctilos, cavernas e monstros que farejam medo.","mountain"),
        ("gelo_eterno",4,"Gelo Eterno","Frio tão intenso que congela escolhas.","ice"),
        ("alexandria",5,"Alexandria","Biblioteca perdida no deserto, onde saber é poder.","desert"),
        ("tempestade_deuses",6,"Tempestade dos Deuses","Zeus e Poseidon em guerra sob chuva, raios e lama.","storm"),
        ("correr_ou_morrer",7,"Correr ou Morrer","Duas casinhas, demônios noturnos e uma fuga cruel.","demon"),
        ("o_vazio",8,"O Vazio","Escuridão, baixa luz e solidão como inimiga.","void"),
    ]
    for mid,num,n,d,bg in maps:
        existing_map = db.get(GameMap, mid)
        if not existing_map:
            db.add(GameMap(id=mid, name=n, zone_number=num, description=d, background=bg, image_svg=svg_map(n,bg)))
        elif mid == "floresta_negra":
            existing_map.description = d
            existing_map.background = bg
            existing_map.image_svg = svg_map(n,bg)
    db.commit()

@app.on_event("startup")
def startup():
    db = SessionLocal(); seed(db); db.close()

# ---------- schemas ----------
class RegisterReq(BaseModel): username: str; password: str
class LoginReq(BaseModel): username: str; password: str
class CreateRoomReq(BaseModel):
    name: str
    role: str="mestre"
    is_public: bool=False
    scheduled_start: Optional[datetime]=None
class JoinReq(BaseModel):
    code: str
    role: str="participante"
class ChooseCharReq(BaseModel): room_id: str; character_id: str
class MoveReq(BaseModel): player_id: int; x: float; y: float
class StatsReq(BaseModel): player_id: int; hp: Optional[int]=None; energy: Optional[int]=None; weakness: Optional[str]=None; notes: Optional[str]=None; inventory: Optional[str]=None
class MapReq(BaseModel): map_id: str
class ChatReq(BaseModel): text: str
class RoomRoleReq(BaseModel): role: str="participante"
class RoomVisibilityReq(BaseModel):
    is_public: bool=False
    scheduled_start: Optional[datetime]=None
class NoteReq(BaseModel): title: str="Nota da Mestre"; text: str
class AIRequestReq(BaseModel):
    action: str
    job_type: str="narrative"
    response_mode: str="short"
class AICompleteReq(BaseModel): result: str=""; error: str=""; status: str="done"
class AIPublishReq(BaseModel):
    target: str="chat"
    text: Optional[str]=None
    map_id: Optional[str]=None
    location_id: Optional[str]=None
    location_name: Optional[str]=None
class AIWorkerPingReq(BaseModel):
    model: str = ""
    ollama_url: str = ""

class ProgressFlagReq(BaseModel):
    map_id: str
    key: str
    value: bool=True
    label: str=""

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
    return {"id":p.id,"username":u.username if u else "?","role":p.role,"character": char_dict(ch) if ch else None,"hp":p.hp,"energy":p.energy,"x":p.token_x,"y":p.token_y,"weakness":p.weakness,"notes":p.notes,"inventory":p.inventory,"muted_until":p.muted_until.isoformat() if p.muted_until else None}

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
    loc_descs = db.query(RoomLocationDescription).filter(RoomLocationDescription.room_id == room_id).all()
    progress_flags = db.query(RoomProgressFlag).filter(RoomProgressFlag.room_id == room_id).all()
    return {
        "room":{"id":r.id,"code":r.code,"name":r.name,"active_map_id":r.active_map_id,"is_public":bool(r.is_public),"scheduled_start":r.scheduled_start.isoformat() if r.scheduled_start else None,"session_status":r.session_status or "waiting","token_capacity":room_token_capacity(db, room_id),"tokens_used":room_players_count(db, room_id),"tokens_available":max(0, room_token_capacity(db, room_id)-room_players_count(db, room_id))},
        "map": map_dict(db.get(GameMap, r.active_map_id)),
        "maps":[map_dict(x) for x in maps],
        "players":[player_dict(db,p) for p in players],
        "chat":[{"id":c.id,"username":db.get(User,c.user_id).username,"text":c.text,"created_at":c.created_at.isoformat()} for c in chats],
        "notes":[{"id":n.id,"title":n.title,"text":n.text,"created_at":n.created_at.isoformat()} for n in notes],
        "ai_jobs":[ai_job_dict(j) for j in ai_jobs],
        "location_descriptions":[{"id":d.id,"map_id":d.map_id,"location_id":d.location_id,"location_name":d.location_name,"description":d.description,"updated_at":d.updated_at.isoformat()} for d in loc_descs],
        "progress_flags":[{"id":f.id,"map_id":f.map_id,"key":f.key,"value":bool(f.value),"label":f.label,"updated_at":f.updated_at.isoformat()} for f in progress_flags]
    }

def normalize_room_role(role: str) -> str:
    role = (role or "participante").strip().lower()
    aliases = {"jogadora":"participante", "jogador":"participante", "player":"participante", "helper":"ajudante", "assistente":"ajudante", "gm":"mestre", "master":"mestre"}
    role = aliases.get(role, role)
    return role if role in ("mestre", "ajudante", "participante") else "participante"

def role_label(role: str) -> str:
    return {"mestre":"Mestre", "ajudante":"Ajudante da Mestre", "participante":"Jogadora"}.get(role, role)


def eligible_room_characters(db: Session, room_id: Optional[str]=None):
    """
    Fonte única para definir quais totens/personagens existem para uma sala.

    Hoje os personagens são globais, então todos são elegíveis.
    A assinatura já recebe room_id para permitir, no futuro, filtrar por:
    - campanha;
    - mapa/zona ativa;
    - pacote de personagens da sala;
    - personagens liberados pela Mestre.
    """
    q = db.query(Character).order_by(Character.id.asc())
    return q.all()

def room_token_capacity(db: Session, room_id: Optional[str]=None) -> int:
    return len(eligible_room_characters(db, room_id))

def room_players_count(db: Session, room_id: str) -> int:
    return db.query(RoomPlayer).filter_by(room_id=room_id).count()

def used_character_ids(db: Session, room_id: str, except_player_id: Optional[int]=None):
    q = db.query(RoomPlayer).filter(RoomPlayer.room_id == room_id, RoomPlayer.character_id.isnot(None))
    if except_player_id is not None:
        q = q.filter(RoomPlayer.id != except_player_id)
    return {p.character_id for p in q.all() if p.character_id}

def first_available_character_id(db: Session, room_id: str) -> Optional[str]:
    used = used_character_ids(db, room_id)
    for ch in eligible_room_characters(db, room_id):
        if ch.id not in used:
            return ch.id
    return None

def ensure_room_has_token_capacity(db: Session, room_id: str):
    capacity = room_token_capacity(db, room_id)
    current = room_players_count(db, room_id)
    if current >= capacity:
        raise HTTPException(400, "Esta sala já está cheia. Não há totens/personagens disponíveis.")



# ---------- segurança infantil / moderação fixa ----------
SAFE_CHAT_BLOCK_MESSAGE = "Mensagem bloqueada por segurança. Não envie dados pessoais, conteúdo sexual, convite para conversa fora do jogo ou mensagens inadequadas."

CONTACT_PATTERNS = [
    ("EMAIL", re.compile(r"\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b", re.I)),
    ("LINK_EXTERNO", re.compile(r"\b(?:https?://|www\.)\S+\b", re.I)),
    ("TELEFONE", re.compile(r"(?:\+?55\s*)?(?:\(?\d{2}\)?\s*)?(?:9\s*)?\d{4}[-.\s]?\d{4}\b")),
    ("CPF", re.compile(r"\b\d{3}[.\s]?\d{3}[.\s]?\d{3}[-\s]?\d{2}\b")),
    ("CEP", re.compile(r"\b\d{5}[-\s]?\d{3}\b")),
    ("REDE_SOCIAL", re.compile(r"(?<!\w)@\w{3,30}\b")),
]

BLOCK_KEYWORDS = {
    "CONTATO_FORA_DO_JOGO": [
        "whatsapp","wpp","zap","zapi","telegram","discord","insta","instagram","tiktok",
        "me chama","me manda mensagem","chama no privado","pv","dm","direct",
        "conversar em outro lugar","fora do jogo","passa teu número","passa seu número",
        "manda teu número","manda seu número","qual seu número","qual teu número",
        "não conta pra ninguém","não conta para ninguém","segredo entre nós"
    ],
    "DADOS_PESSOAIS": [
        "meu endereço","meu endereco","moro na","moro em","minha rua","minha casa",
        "qual sua idade","qual tua idade","quantos anos você tem","quantos anos vc tem",
        "onde você mora","onde vc mora","onde tu mora","qual sua escola","qual teu colégio"
    ],
    "CONTEUDO_SEXUAL": [
        "nude","nudes","manda foto","manda uma foto","foto do corpo","sem roupa",
        "pelada","pelado","sexo","sexual","beijo na boca","ficar comigo","namorar escondido",
        "tesão","tesao","gostosa","gostoso","safada","safado"
    ],
    "ASSESSIO_GROOMING": [
        "você está sozinha","vc está sozinha","voce esta sozinha","seus pais estão","seus pais tao",
        "apaga a mensagem","não mostra pra ninguém","não mostra para ninguém"
    ],
    "LINGUAGEM_OFENSIVA_GRAVE": [
        "filho da puta","fdp","desgraçada","desgraçado","vagabunda","vagabundo"
    ]
}

def get_client_ip(request: Optional[Request]) -> str:
    if not request:
        return ""
    xff = request.headers.get("x-forwarded-for") or request.headers.get("X-Forwarded-For")
    if xff:
        return xff.split(",")[0].strip()[:80]
    return (request.client.host if request.client else "")[:80]

def compact_contact_text(text: str) -> str:
    """Versão auxiliar para detectar evasões simples com espaços em e-mail/telefone."""
    raw = text or ""
    # Remove espaços somente entre caracteres típicos de contato, preservando a análise normal do texto original.
    return re.sub(r"(?<=[A-Z0-9._%+\-@])\s+(?=[A-Z0-9._%+\-@])", "", raw, flags=re.I)

def has_spaced_phone(text: str) -> bool:
    digits = re.sub(r"\D", "", text or "")
    if digits.startswith("55") and len(digits) in (12, 13):
        return True
    return len(digits) in (10, 11)

def mask_sensitive_text(text: str) -> str:
    masked = text or ""
    compacted = compact_contact_text(masked)
    if re.search(r"\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b", compacted, re.I) or has_spaced_phone(masked):
        # Evita gravar no log dados de contato digitados com espaços para burlar o filtro.
        return "[contato bloqueado e mascarado]"
    masked = re.sub(r"\b([A-Z0-9._%+-])[A-Z0-9._%+-]*(@[A-Z0-9.-]+\.[A-Z]{2,})\b", r"\1****\2", masked, flags=re.I)
    masked = re.sub(r"(?:\+?55\s*)?(?:\(?\d{2}\)?\s*)?(?:9\s*)?\d{4}[-.\s]?\d{4}\b", lambda m: "*"*max(0, len(m.group(0))-4)+m.group(0)[-4:], masked)
    masked = re.sub(r"\b\d{3}[.\s]?\d{3}[.\s]?\d{3}[-\s]?\d{2}\b", "***.***.***-**", masked)
    masked = re.sub(r"\b\d{5}[-\s]?\d{3}\b", "*****-***", masked)
    masked = re.sub(r"(?<!\w)@\w{3,30}\b", "@******", masked)
    masked = re.sub(r"\b(?:https?://|www\.)\S+\b", "[link bloqueado]", masked, flags=re.I)
    return masked[:1200]

def moderate_text(text: str):
    raw = (text or "").strip()
    low = raw.lower()
    compacted = compact_contact_text(raw)
    categories = []
    for label, pattern in CONTACT_PATTERNS:
        if pattern.search(raw) or (label in ("EMAIL", "LINK_EXTERNO", "REDE_SOCIAL") and pattern.search(compacted)):
            categories.append(label)
    if has_spaced_phone(raw):
        categories.append("TELEFONE")
    for label, words in BLOCK_KEYWORDS.items():
        if any(w in low for w in words):
            categories.append(label)
    # Remove duplicatas preservando ordem.
    seen = set()
    categories = [c for c in categories if not (c in seen or seen.add(c))]
    return {
        "blocked": bool(categories),
        "categories": categories,
        "reason": categories[0] if categories else "",
        "masked_text": mask_sensitive_text(raw)
    }

def log_security_block(db: Session, room_id: Optional[str], user: User, request: Optional[Request], text: str, source: str):
    result = moderate_text(text)
    if not result["blocked"]:
        return result
    ip = get_client_ip(request)
    ua = (request.headers.get("user-agent") if request else "")[:1000]
    db.add(SecurityLog(
        room_id=room_id,
        user_id=user.id if user else None,
        username=user.username if user else "",
        reason=result["reason"],
        categories=",".join(result["categories"])[:300],
        masked_text=result["masked_text"],
        ip_address=ip,
        user_agent=ua,
        source=source
    ))
    db.commit()
    return result

def enforce_safe_message(db: Session, room_id: Optional[str], user: User, request: Optional[Request], text: str, source: str="chat"):
    result = moderate_text(text)
    if result["blocked"]:
        log_security_block(db, room_id, user, request, text, source)
        raise HTTPException(400, SAFE_CHAT_BLOCK_MESSAGE)
    return text


def security_log_or_404(db: Session, log_id: int) -> SecurityLog:
    log = db.get(SecurityLog, log_id)
    if not log:
        raise HTTPException(404, "Alerta de segurança não encontrado")
    return log

def ensure_target_user(db: Session, log: SecurityLog) -> User:
    target = db.get(User, log.user_id) if log.user_id else None
    if not target:
        raise HTTPException(404, "Usuária do alerta não encontrada")
    return target

def current_room_player_for_log(db: Session, log: SecurityLog) -> Optional[RoomPlayer]:
    if not log.room_id or not log.user_id:
        return None
    return db.query(RoomPlayer).filter_by(room_id=log.room_id, user_id=log.user_id).first()

def ensure_not_muted(rp: Optional[RoomPlayer]):
    if rp and rp.muted_until and rp.muted_until > datetime.utcnow():
        remaining = int((rp.muted_until - datetime.utcnow()).total_seconds() // 60) + 1
        raise HTTPException(403, f"Você está temporariamente silenciada por segurança. Tente novamente em aproximadamente {remaining} min.")


def require_master(db: Session, room_id: str, user: User):
    rp = db.query(RoomPlayer).filter_by(room_id=room_id, user_id=user.id).first()
    if not rp or (rp.role != "mestre" and not user.is_admin):
        raise HTTPException(403, "Apenas a Mestre/admin pode fazer isso")
    return rp

def require_staff(db: Session, room_id: str, user: User):
    rp = db.query(RoomPlayer).filter_by(room_id=room_id, user_id=user.id).first()
    if not rp or (rp.role not in ("mestre", "ajudante") and not user.is_admin):
        raise HTTPException(403, "Apenas Mestre, Ajudante ou admin pode fazer isso")
    return rp


def worker_ok(token: Optional[str]) -> bool:
    return bool(token) and secrets.compare_digest(token, LOCAL_AI_WORKER_TOKEN)

def normalize_response_mode(mode: str) -> str:
    mode = (mode or "short").strip().lower()
    return mode if mode in ("short", "normal", "detailed") else "short"

def mode_instruction(mode: str, job_type: str) -> str:
    mode = normalize_response_mode(mode)
    if job_type == "image_prompt":
        return "Resposta objetiva: apenas 1 prompt de imagem em inglês, sem explicações."
    if mode == "short":
        return "MODO RÁPIDO: responda curto. Máximo de 1 parágrafo curto ou 4 tópicos. Sem enrolação."
    if mode == "detailed":
        return "MODO DETALHADO: até 3 parágrafos curtos, com opções práticas quando fizer sentido."
    return "MODO NORMAL: até 2 parágrafos curtos, direto e útil para jogo ao vivo."

def build_ai_prompt(db: Session, room_id: str, user: User, action: str, job_type: str, response_mode: str="short") -> str:
    response_mode = normalize_response_mode(response_mode)
    r = db.get(Room, room_id)
    m = db.get(GameMap, r.active_map_id) if r else None
    players = db.query(RoomPlayer).filter_by(room_id=room_id).all()
    notes_limit = 2 if response_mode == "short" else 5
    chats_limit = 4 if response_mode == "short" else 12
    notes = db.query(SessionNote).filter(SessionNote.room_id == room_id).order_by(SessionNote.id.desc()).limit(notes_limit).all()[::-1]
    chats = db.query(ChatMessage).filter(ChatMessage.room_id == room_id).order_by(ChatMessage.id.desc()).limit(chats_limit).all()[::-1]
    player_lines = []
    for p in players:
        u = db.get(User, p.user_id)
        ch = db.get(Character, p.character_id) if p.character_id else None
        if response_mode == "short":
            player_lines.append(f"- {u.username if u else '?'} / {ch.name if ch else 'sem personagem'} / papel: {p.role}")
        else:
            player_lines.append(f"- {u.username if u else '?'} / {ch.name if ch else 'sem personagem'} / papel: {p.role} / HP {p.hp} / energia {p.energy} / posição no mapa: x={p.token_x:.1f}%, y={p.token_y:.1f}% / inventário: {p.inventory}")
    diary = "\n".join([f"{n.title}: {n.text}" for n in notes]) or "Sem notas ainda."
    history = "\n".join([f"{db.get(User,c.user_id).username if db.get(User,c.user_id) else '?'}: {c.text}" for c in chats]) or "Sem histórico ainda."
    progress_flags = db.query(RoomProgressFlag).filter(RoomProgressFlag.room_id == room_id, RoomProgressFlag.value == True).all()
    progress = "\n".join([f"- {f.label or f.key}" for f in progress_flags]) or "Sem progresso marcado ainda."
    # Para perguntas em modo rápido, o prompt é propositalmente curto para acelerar PCs fracos.
    if job_type == "question" and response_mode == "short":
        return f"""[[TR_RESPONSE_MODE=short]]
Você é copilota da Mestre no RPG TERRAS RARAS. Responda em português brasileiro, natural, sem linguagem formal ou jurídica.
Ajude a Mestre/Ajudante com uma resposta prática para jogo ao vivo.
Contexto: mesa {r.name if r else room_id}; zona atual: {m.name if m else 'Mapa desconhecido'}.
{mode_instruction(response_mode, job_type)}
Pedido: {action}
"""

    base = f"""[[TR_RESPONSE_MODE={response_mode}]]
Você é a Narradora Local do jogo TERRAS RARAS, um RPG de sobrevivência para crianças/adolescentes, com tom cinematográfico, sombrio porém seguro.

REGRAS IMPORTANTES:
- Escreva em português brasileiro.
- Não mencione IA, modelo, API ou sistema.
- Não use violência gráfica, sexualização, drogas ou terror excessivo.
- Preserve o controle da Mestre: gere sugestão publicável, mas clara e curta.
- Máximo de 3 parágrafos para narrativa.

FORMATO DA RESPOSTA:
{mode_instruction(response_mode, job_type)}

MESA: {r.name if r else room_id}
MAPA/ZONA ATUAL: {m.name if m else 'Mapa desconhecido'}
DESCRIÇÃO DA ZONA: {m.description if m else ''}

JOGADORAS:
{chr(10).join(player_lines) or 'Nenhuma jogadora listada.'}

DIÁRIO DA MESTRE:
{diary}

HISTÓRICO RECENTE:
{history}

PROGRESSO MARCADO PELA MESTRE:
{progress}

PEDIDO DA MESTRE/AJUDANTE:
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
    if job_type == "question":
        return base + """
Responda como copilota da Mestre. Ajude com ideias práticas para conduzir a sessão.
- Pode sugerir falas prontas para a Mestre dizer às participantes.
- Pode sugerir ganchos, pistas, consequências, clima da cena e próximos passos.
- Seja útil, clara, direta e natural.
- Não use linguagem jurídica ou formal, como “Vossa Senhoria”, “Excelência” ou termos parecidos.
- Máximo de 3 blocos curtos.
- Se ajudar, comece com uma fala pronta entre aspas e depois dê 2 ou 3 sugestões curtas."""
    if job_type == "location_event":
        return base + """
Crie um evento rápido para o local selecionado. Formato:
1) Fala pronta da Mestre em até 4 linhas.
2) Uma pista sutil.
3) Duas escolhas objetivas para as jogadoras.
Não revele segredos internos demais; transforme segredo em suspeita, pista ou clima."""
    return base + """
Gere a próxima narração da cena em 2 parágrafos curtos. Depois, se fizer sentido, liste 2 ou 3 escolhas objetivas para as jogadoras. Não use títulos longos."""

def ai_job_dict(j: AIJob):
    return {"id": j.id, "room_id": j.room_id, "job_type": j.job_type, "status": j.status, "prompt": j.prompt, "result": j.result, "error": j.error, "created_at": j.created_at.isoformat(), "updated_at": j.updated_at.isoformat()}

# ---------- routes ----------
@app.get("/")
def home():
    return HTMLResponse(Path("index.html").read_text(encoding="utf-8"))

@app.get("/script.js")
def script_js():
    return HTMLResponse(Path("script.js").read_text(encoding="utf-8"), media_type="application/javascript")

@app.get("/health")
def health(): return {"status":"ok", "service": APP_NAME, "version": APP_VERSION}

@app.get("/debug/admin-env")
def debug_admin_env(user: User = Depends(admin_user)):
    return {
        "admin_username_configured": bool(ADMIN_USERNAME),
        "admin_username": (ADMIN_USERNAME or "").strip().lower(),
        "admin_password_configured": bool(ADMIN_PASSWORD),
        "database_url_configured": bool(DATABASE_URL),
        "jwt_secret_configured": bool(SECRET),
        "local_ai_worker_token_configured": bool(LOCAL_AI_WORKER_TOKEN),
        "version": APP_VERSION
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


@app.get("/admin/security/logs")
def admin_security_logs(_: User = Depends(admin_user), db: Session = Depends(db_dep)):
    logs = db.query(SecurityLog).order_by(SecurityLog.id.desc()).limit(100).all()
    out = []
    for l in logs:
        room = db.get(Room, l.room_id) if l.room_id else None
        repeat_count = db.query(SecurityLog).filter(SecurityLog.user_id == l.user_id).count() if l.user_id else 1
        out.append({
            "id": l.id,
            "room_id": l.room_id,
            "room_name": room.name if room else "",
            "user_id": l.user_id,
            "username": l.username,
            "reason": l.reason,
            "categories": l.categories.split(",") if l.categories else [],
            "masked_text": l.masked_text,
            "ip_address": l.ip_address,
            "user_agent": l.user_agent,
            "source": l.source,
            "repeat_count": repeat_count,
            "created_at": l.created_at.isoformat()
        })
    return out


@app.post("/admin/security/{log_id}/warn")
async def admin_security_warn(log_id: int, admin: User = Depends(admin_user), db: Session = Depends(db_dep)):
    log = security_log_or_404(db, log_id)
    target = ensure_target_user(db, log)
    if log.room_id:
        db.add(ChatMessage(room_id=log.room_id, user_id=admin.id, text=f"⚠️ Aviso de segurança para {target.username}: não compartilhe dados pessoais, contatos externos ou conteúdo inadequado no jogo."))
        db.add(EventLog(room_id=log.room_id, kind="security_warn", text=f"{target.username} recebeu advertência de segurança."))
        db.commit()
        await manager.broadcast(log.room_id, {"type":"state", "state":room_state(db, log.room_id)})
    return {"ok": True, "action": "warn", "user": target.username}

@app.post("/admin/security/{log_id}/mute")
async def admin_security_mute(log_id: int, admin: User = Depends(admin_user), db: Session = Depends(db_dep)):
    log = security_log_or_404(db, log_id)
    target = ensure_target_user(db, log)
    rp = current_room_player_for_log(db, log)
    if not rp:
        raise HTTPException(404, "Usuária não está mais nesta sala")
    rp.muted_until = datetime.utcnow() + timedelta(minutes=10)
    rp.updated_at = datetime.utcnow()
    db.add(EventLog(room_id=log.room_id, kind="security_mute", text=f"{target.username} foi silenciada por 10 minutos."))
    db.add(ChatMessage(room_id=log.room_id, user_id=admin.id, text=f"🔇 {target.username} foi temporariamente silenciada por segurança."))
    db.commit()
    await manager.broadcast(log.room_id, {"type":"state", "state":room_state(db, log.room_id)})
    return {"ok": True, "action": "mute", "user": target.username, "muted_until": rp.muted_until.isoformat()}

@app.post("/admin/security/{log_id}/remove")
async def admin_security_remove(log_id: int, admin: User = Depends(admin_user), db: Session = Depends(db_dep)):
    log = security_log_or_404(db, log_id)
    target = ensure_target_user(db, log)
    rp = current_room_player_for_log(db, log)
    if not rp:
        raise HTTPException(404, "Usuária não está mais nesta sala")
    room_id = log.room_id
    db.delete(rp)
    db.add(EventLog(room_id=room_id, kind="security_remove", text=f"{target.username} foi removida da sala por segurança."))
    db.add(ChatMessage(room_id=room_id, user_id=admin.id, text=f"🚪 {target.username} foi removida da sala por segurança."))
    db.commit()
    await manager.broadcast(room_id, {"type":"state", "state":room_state(db, room_id)})
    return {"ok": True, "action": "remove", "user": target.username}

@app.post("/admin/security/{log_id}/block-user")
async def admin_security_block_user(log_id: int, admin: User = Depends(admin_user), db: Session = Depends(db_dep)):
    log = security_log_or_404(db, log_id)
    target = ensure_target_user(db, log)
    if target.is_admin:
        raise HTTPException(400, "Não é possível bloquear outro administrador por este painel")
    target.approved = False
    # Remove a usuária de todas as salas para encerrar acesso imediato com novos requests.
    memberships = db.query(RoomPlayer).filter_by(user_id=target.id).all()
    affected_rooms = [rp.room_id for rp in memberships]
    for rp in memberships:
        db.delete(rp)
    if log.room_id:
        db.add(EventLog(room_id=log.room_id, kind="security_block_user", text=f"{target.username} teve a conta bloqueada por segurança."))
        db.add(ChatMessage(room_id=log.room_id, user_id=admin.id, text=f"⛔ {target.username} teve a conta bloqueada por segurança."))
    db.commit()
    for room_id in set(affected_rooms):
        await manager.broadcast(room_id, {"type":"state", "state":room_state(db, room_id)})
    return {"ok": True, "action": "block-user", "user": target.username}

@app.get("/characters")
def characters(db: Session = Depends(db_dep), user: User = Depends(current_user)):
    return [char_dict(c) for c in db.query(Character).all()]

@app.get("/maps")
def maps(db: Session = Depends(db_dep), user: User = Depends(current_user)):
    return [map_dict(m) for m in db.query(GameMap).order_by(GameMap.zone_number).all()]

@app.post("/rooms/create")
def create_room(req: CreateRoomReq, db: Session = Depends(db_dep), user: User = Depends(current_user)):
    chosen_role = normalize_room_role(req.role)
    r = Room(id=rid(), code=code(), name=req.name.strip() or "Mesa Terras Raras", owner_id=user.id, is_public=bool(req.is_public), scheduled_start=req.scheduled_start if req.is_public else None, session_status="waiting")
    db.add(r); db.flush()
    db.add(RoomPlayer(room_id=r.id, user_id=user.id, role=chosen_role, character_id=first_available_character_id(db, r.id), token_x=50, token_y=50))
    db.add(EventLog(room_id=r.id, kind="system", text=f"{user.username} criou a mesa como {role_label(chosen_role)}." + (" Sala pública." if r.is_public else " Sala fechada.")))
    db.commit(); return {"id":r.id,"code":r.code,"name":r.name,"role":chosen_role,"is_public":bool(r.is_public),"scheduled_start":r.scheduled_start.isoformat() if r.scheduled_start else None,"session_status":r.session_status or "waiting","token_capacity":room_token_capacity(db, r.id),"tokens_used":room_players_count(db, r.id),"tokens_available":max(0, room_token_capacity(db, r.id)-room_players_count(db, r.id))}

@app.post("/rooms/join")
def join_room(req: JoinReq, db: Session = Depends(db_dep), user: User = Depends(current_user)):
    r = db.query(Room).filter(Room.code == req.code.strip().upper()).first()
    if not r: raise HTTPException(404, "Código de sala não encontrado")
    existing_player = db.query(RoomPlayer).filter_by(room_id=r.id, user_id=user.id).first()
    if (r.session_status or "waiting") == "ended" and not existing_player:
        raise HTTPException(400, "Esta sessão já foi encerrada.")
    chosen_role = normalize_room_role(req.role)
    master_exists = db.query(RoomPlayer).filter_by(room_id=r.id, role="mestre").first()
    rp = existing_player
    if chosen_role == "mestre" and master_exists and (not rp or rp.role != "mestre") and not user.is_admin:
        raise HTTPException(400, "Esta sala já tem Mestre. Entre como Ajudante da Mestre ou Jogadora.")
    if not rp:
        ensure_room_has_token_capacity(db, r.id)
        available_char = first_available_character_id(db, r.id)
        if not available_char:
            raise HTTPException(400, "Esta sala já está cheia. Não há totens/personagens disponíveis.")
        db.add(RoomPlayer(room_id=r.id, user_id=user.id, role=chosen_role, character_id=available_char, token_x=random.randint(35,65), token_y=random.randint(35,65)))
        db.add(EventLog(room_id=r.id, kind="system", text=f"{user.username} entrou na mesa como {role_label(chosen_role)}."))
        db.commit()
    else:
        if rp.role == "participante" and chosen_role in ("ajudante", "mestre"):
            rp.role = chosen_role
            db.add(EventLog(room_id=r.id, kind="system", text=f"{user.username} mudou função para {role_label(chosen_role)}."))
            db.commit()
    return {"id":r.id,"code":r.code,"name":r.name,"role":chosen_role}

@app.get("/rooms/mine")
def mine(db: Session = Depends(db_dep), user: User = Depends(current_user)):
    rows = db.query(RoomPlayer).filter_by(user_id=user.id).all()
    out=[]
    for rp in rows:
        r=db.get(Room, rp.room_id); out.append({"id":r.id,"code":r.code,"name":r.name,"role":rp.role,"map_id":r.active_map_id,"is_public":bool(r.is_public),"scheduled_start":r.scheduled_start.isoformat() if r.scheduled_start else None,"session_status":r.session_status or "waiting","token_capacity":room_token_capacity(db, r.id),"players_count":room_players_count(db, r.id)})
    return out


@app.get("/rooms/public")
def public_rooms(db: Session = Depends(db_dep), user: User = Depends(current_user)):
    rooms = db.query(Room).filter(Room.is_public == True, Room.session_status != "ended").order_by(Room.scheduled_start.asc().nullslast(), Room.created_at.desc()).limit(30).all()
    out=[]
    for r in rooms:
        players = db.query(RoomPlayer).filter_by(room_id=r.id).all()
        master = next((p for p in players if p.role == "mestre"), None)
        master_user = db.get(User, master.user_id) if master else db.get(User, r.owner_id)
        already = any(p.user_id == user.id for p in players)
        out.append({
            "id": r.id,
            "code": r.code,
            "name": r.name,
            "master": master_user.username if master_user else "?",
            "players_count": len(players),
            "token_capacity": room_token_capacity(db, r.id),
            "tokens_available": max(0, room_token_capacity(db, r.id)-len(players)),
            "map_id": r.active_map_id,
            "scheduled_start": r.scheduled_start.isoformat() if r.scheduled_start else None,
            "session_status": r.session_status or "waiting",
            "already_joined": already
        })
    return out


@app.post("/rooms/{room_id}/role")
async def set_room_role(room_id: str, req: RoomRoleReq, db: Session = Depends(db_dep), user: User = Depends(current_user)):
    r = db.get(Room, room_id)
    if not r:
        raise HTTPException(404, "Sala não encontrada")
    rp = db.query(RoomPlayer).filter_by(room_id=room_id, user_id=user.id).first()
    if not rp:
        raise HTTPException(403, "Você não está nesta sala")
    chosen_role = normalize_room_role(req.role)
    if chosen_role == "mestre":
        master = db.query(RoomPlayer).filter_by(room_id=room_id, role="mestre").first()
        if master and master.user_id != user.id and not user.is_admin:
            raise HTTPException(400, "Esta sala já tem Mestre principal")
        r.owner_id = user.id
    rp.role = chosen_role
    rp.updated_at = datetime.utcnow()
    db.add(EventLog(room_id=room_id, kind="role", text=f"{user.username} agora é {role_label(chosen_role)}."))
    db.commit()
    await manager.broadcast(room_id, {"type":"state", "state":room_state(db, room_id)})
    return {"ok": True, "role": chosen_role}



@app.post("/rooms/{room_id}/visibility")
async def set_room_visibility(room_id: str, req: RoomVisibilityReq, db: Session = Depends(db_dep), user: User = Depends(current_user)):
    require_master(db, room_id, user)
    r = db.get(Room, room_id)
    if not r:
        raise HTTPException(404, "Sala não encontrada")
    r.is_public = bool(req.is_public)
    r.scheduled_start = req.scheduled_start if r.is_public else None
    r.updated_at = datetime.utcnow()
    db.add(EventLog(room_id=room_id, kind="visibility", text=f"Sala agora é {'pública' if r.is_public else 'fechada'}." ))
    db.commit()
    await manager.broadcast(room_id, {"type":"state", "state":room_state(db, room_id)})
    return {"ok": True, "is_public": bool(r.is_public), "scheduled_start": r.scheduled_start.isoformat() if r.scheduled_start else None}


@app.post("/rooms/{room_id}/session/start")
async def start_session(room_id: str, db: Session = Depends(db_dep), user: User = Depends(current_user)):
    require_master(db, room_id, user)
    r = db.get(Room, room_id)
    if not r:
        raise HTTPException(404, "Sala não encontrada")
    if r.session_status == "ended":
        raise HTTPException(400, "Esta sessão já foi encerrada.")
    r.session_status = "active"
    r.updated_at = datetime.utcnow()
    db.add(EventLog(room_id=room_id, kind="session", text="A Mestre iniciou a sessão. O mapa foi liberado."))
    db.commit()
    await manager.broadcast(room_id, {"type":"state", "state":room_state(db, room_id)})
    return {"ok": True, "session_status": r.session_status}


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
    duplicate = db.query(RoomPlayer).filter(RoomPlayer.room_id == room_id, RoomPlayer.character_id == req.character_id, RoomPlayer.id != rp.id).first()
    if duplicate:
        raise HTTPException(400, "Este totem/personagem já está em uso nesta sala.")
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


@app.post("/rooms/{room_id}/map/end")
async def end_current_map(room_id: str, db: Session = Depends(db_dep), user: User = Depends(current_user)):
    require_master(db, room_id, user)
    r = db.get(Room, room_id)
    if not r:
        raise HTTPException(404, "Sala não encontrada")
    current = db.get(GameMap, r.active_map_id)
    if not current:
        raise HTTPException(404, "Mapa atual não encontrado")
    next_map = (
        db.query(GameMap)
        .filter(GameMap.zone_number > current.zone_number)
        .order_by(GameMap.zone_number.asc())
        .first()
    )
    if not next_map:
        r.session_status = "ended"
        r.is_public = False
        r.updated_at = datetime.utcnow()
        db.add(EventLog(room_id=room_id, kind="session", text=f"{current.name} encerrado. A sessão foi encerrada."))
        db.commit()
        await manager.broadcast(room_id, {"type":"state", "state":room_state(db, room_id)})
        return {"ok": False, "finished": True, "message": "Este já é o último mapa disponível. Sessão encerrada."}

    # Marca encerramento do mapa atual e libera o portal, caso exista.
    done_key = f"map:{current.id}:completed"
    flag = db.query(RoomProgressFlag).filter_by(room_id=room_id, map_id=current.id, key=done_key).first()
    if not flag:
        flag = RoomProgressFlag(room_id=room_id, map_id=current.id, key=done_key)
    flag.value = True
    flag.label = f"Mapa encerrado: {current.name}"
    flag.updated_by = user.id
    flag.updated_at = datetime.utcnow()
    db.add(flag)

    portal = db.query(RoomProgressFlag).filter_by(room_id=room_id, map_id=current.id, key="portal_released").first()
    if not portal:
        portal = RoomProgressFlag(room_id=room_id, map_id=current.id, key="portal_released")
    portal.value = True
    portal.label = "Portal liberado ao encerrar o mapa"
    portal.updated_by = user.id
    portal.updated_at = datetime.utcnow()
    db.add(portal)

    r.active_map_id = next_map.id
    r.updated_at = datetime.utcnow()
    db.add(EventLog(room_id=room_id, kind="map_end", text=f"{current.name} encerrado. Próxima zona aberta: {next_map.name}."))
    db.commit()
    await manager.broadcast(room_id, {"type":"state", "state":room_state(db, room_id)})
    return {"ok": True, "previous_map": map_dict(current), "next_map": map_dict(next_map), "message": f"{current.name} encerrado. {next_map.name} aberta."}

@app.post("/rooms/{room_id}/progress")
async def set_progress_flag(room_id: str, req: ProgressFlagReq, db: Session = Depends(db_dep), user: User = Depends(current_user)):
    require_staff(db, room_id, user)
    r = db.get(Room, room_id)
    if not r:
        raise HTTPException(404, "Sala não encontrada")
    key = (req.key or "").strip()[:160]
    if not key:
        raise HTTPException(400, "Chave de progresso inválida")
    map_id = (req.map_id or r.active_map_id or "").strip()[:40]
    flag = db.query(RoomProgressFlag).filter_by(room_id=room_id, map_id=map_id, key=key).first()
    if not flag:
        flag = RoomProgressFlag(room_id=room_id, map_id=map_id, key=key)
    flag.value = bool(req.value)
    flag.label = (req.label or key)[:240]
    flag.updated_by = user.id
    flag.updated_at = datetime.utcnow()
    db.add(flag)
    db.add(EventLog(room_id=room_id, kind="progress", text=f"Progresso atualizado: {flag.label} = {flag.value}."))
    db.commit(); db.refresh(flag)
    await manager.broadcast(room_id, {"type":"state", "state":room_state(db, room_id)})
    return {"ok": True, "flag": {"id":flag.id,"map_id":flag.map_id,"key":flag.key,"value":bool(flag.value),"label":flag.label,"updated_at":flag.updated_at.isoformat()}}

@app.post("/rooms/{room_id}/chat")
async def chat(room_id: str, req: ChatReq, request: Request, db: Session = Depends(db_dep), user: User = Depends(current_user)):
    rp = db.query(RoomPlayer).filter_by(room_id=room_id, user_id=user.id).first()
    if not rp and not user.is_admin: raise HTTPException(403, "Você não está nesta sala")
    ensure_not_muted(rp)
    safe_text = enforce_safe_message(db, room_id, user, request, req.text.strip()[:1000], "chat")
    msg = ChatMessage(room_id=room_id, user_id=user.id, text=safe_text); db.add(msg); db.commit()
    await manager.broadcast(room_id, {"type":"state", "state":room_state(db, room_id)})
    return {"ok": True}

@app.post("/rooms/{room_id}/notes")
async def notes(room_id: str, req: NoteReq, request: Request, db: Session = Depends(db_dep), user: User = Depends(current_user)):
    rp = require_staff(db, room_id, user)
    ensure_not_muted(rp)
    safe_title = enforce_safe_message(db, room_id, user, request, req.title.strip()[:120], "notes_title")
    safe_text = enforce_safe_message(db, room_id, user, request, req.text.strip()[:5000], "notes")
    db.add(SessionNote(room_id=room_id, title=safe_title[:120], text=safe_text[:5000])); db.commit()
    await manager.broadcast(room_id, {"type":"state", "state":room_state(db, room_id)})
    return {"ok": True}


@app.get("/rooms/{room_id}/staff-chat")
def get_staff_chat(room_id: str, db: Session = Depends(db_dep), user: User = Depends(current_user)):
    require_staff(db, room_id, user)
    msgs = db.query(StaffChatMessage).filter(StaffChatMessage.room_id == room_id).order_by(StaffChatMessage.id.desc()).limit(50).all()[::-1]
    return [{"id":m.id,"username":db.get(User,m.user_id).username if db.get(User,m.user_id) else "?","text":m.text,"created_at":m.created_at.isoformat()} for m in msgs]

@app.post("/rooms/{room_id}/staff-chat")
async def post_staff_chat(room_id: str, req: ChatReq, request: Request, db: Session = Depends(db_dep), user: User = Depends(current_user)):
    rp = require_staff(db, room_id, user)
    ensure_not_muted(rp)
    safe_text = enforce_safe_message(db, room_id, user, request, req.text.strip()[:1000], "staff_chat")
    msg = StaffChatMessage(room_id=room_id, user_id=user.id, text=safe_text)
    db.add(msg); db.commit()
    await manager.broadcast(room_id, {"type":"staff_chat_updated"})
    return {"ok": True}


@app.post("/ai/worker/ping")
def ai_worker_ping(req: AIWorkerPingReq, token: str = ""):
    if not worker_ok(token):
        raise HTTPException(401, "Worker token inválido")
    global WORKER_LAST_SEEN, WORKER_LAST_MODEL, WORKER_LAST_URL
    WORKER_LAST_SEEN = datetime.utcnow()
    WORKER_LAST_MODEL = req.model or ""
    WORKER_LAST_URL = req.ollama_url or ""
    return {"ok": True, "last_seen": WORKER_LAST_SEEN.isoformat()}

@app.get("/ai/worker/status")
def ai_worker_status():
    now = datetime.utcnow()
    online = False
    age_seconds = None
    if WORKER_LAST_SEEN:
        age_seconds = int((now - WORKER_LAST_SEEN).total_seconds())
        online = age_seconds <= 20
    return {
        "ok": True,
        "online": online,
        "last_seen": WORKER_LAST_SEEN.isoformat() if WORKER_LAST_SEEN else None,
        "age_seconds": age_seconds,
        "model": WORKER_LAST_MODEL,
        "ollama_url": WORKER_LAST_URL,
        "version": APP_VERSION,
    }

@app.post("/rooms/{room_id}/ai/request")
async def request_local_ai(room_id: str, req: AIRequestReq, db: Session = Depends(db_dep), user: User = Depends(current_user)):
    require_staff(db, room_id, user)
    job_type = req.job_type if req.job_type in ("narrative", "image_prompt", "summary", "question", "location_event") else "narrative"

    # v8.2: evita criar vários pedidos iguais se o worker estiver desligado.
    existing = (
        db.query(AIJob)
        .filter(AIJob.room_id == room_id, AIJob.job_type == job_type, AIJob.status.in_(["pending", "processing"]))
        .order_by(AIJob.id.desc())
        .first()
    )
    if existing:
        await manager.broadcast(room_id, {"type":"ai_job", "job": ai_job_dict(existing)})
        return {
            "ok": True,
            "job": ai_job_dict(existing),
            "message": "Já existe um pedido de IA desse tipo aguardando o worker local. Processe, cancele ou limpe pendentes antes de criar outro."
        }

    response_mode = normalize_response_mode(req.response_mode)
    prompt = build_ai_prompt(db, room_id, user, req.action.strip() or "Continue a cena.", job_type, response_mode)
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


@app.post("/rooms/{room_id}/ai/jobs/{job_id}/cancel")
async def cancel_ai_job(room_id: str, job_id: int, db: Session = Depends(db_dep), user: User = Depends(current_user)):
    require_staff(db, room_id, user)
    job = db.get(AIJob, job_id)
    if not job or job.room_id != room_id:
        raise HTTPException(404, "Pedido de IA não encontrado")
    if job.status not in ("pending", "processing"):
        return {"ok": True, "job": ai_job_dict(job), "message": "Esse pedido já foi finalizado."}
    job.status = "error"
    job.error = "Pedido cancelado pela Mestre."
    job.updated_at = datetime.utcnow()
    db.add(EventLog(room_id=room_id, kind="ai_cancel", text=f"Pedido de IA #{job.id} cancelado."))
    db.commit(); db.refresh(job)
    await manager.broadcast(room_id, {"type":"state", "state": room_state(db, room_id)})
    await manager.broadcast(room_id, {"type":"ai_job", "job": ai_job_dict(job)})
    return {"ok": True, "job": ai_job_dict(job)}


@app.post("/rooms/{room_id}/ai/clear-pending")
async def clear_pending_ai_jobs(room_id: str, db: Session = Depends(db_dep), user: User = Depends(current_user)):
    require_staff(db, room_id, user)
    jobs = db.query(AIJob).filter(AIJob.room_id == room_id, AIJob.status.in_(["pending", "processing"])).all()
    count = len(jobs)
    for job in jobs:
        job.status = "error"
        job.error = "Pedido limpo pela Mestre antes de ser processado."
        job.updated_at = datetime.utcnow()
    if count:
        db.add(EventLog(room_id=room_id, kind="ai_clear", text=f"{count} pedido(s) pendente(s) de IA foram limpos."))
    db.commit()
    await manager.broadcast(room_id, {"type":"state", "state": room_state(db, room_id)})
    return {"ok": True, "cleared": count}

@app.get("/ai/jobs/next")
def next_ai_job(token: str = "", db: Session = Depends(db_dep)):
    if not worker_ok(token):
        raise HTTPException(401, "Worker token inválido")
    global WORKER_LAST_SEEN
    WORKER_LAST_SEEN = datetime.utcnow()

    # v8.2: se o worker caiu durante um processamento, devolve jobs travados para a fila.
    stale = datetime.utcnow() - timedelta(minutes=8)
    stuck_jobs = db.query(AIJob).filter(AIJob.status == "processing", AIJob.updated_at < stale).all()
    for stuck in stuck_jobs:
        stuck.status = "pending"
        stuck.updated_at = datetime.utcnow()
    if stuck_jobs:
        db.commit()

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
    global WORKER_LAST_SEEN
    WORKER_LAST_SEEN = datetime.utcnow()
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
async def publish_ai_job(room_id: str, job_id: int, req: AIPublishReq, request: Request, db: Session = Depends(db_dep), user: User = Depends(current_user)):
    rp = require_staff(db, room_id, user)
    ensure_not_muted(rp)
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
    elif job.job_type == "question":
        title = "Resposta da IA Local"
    elif job.job_type == "location_event":
        title = "Evento do local gerado pela IA Local"

    target = (req.target or "chat").strip().lower()
    final_text = (req.text if req.text is not None else job.result).strip()
    if not final_text:
        raise HTTPException(400, "O texto final está vazio")
    if target in ("chat", "staff", "bastidores", "notes", "location"):
        final_text = enforce_safe_message(db, room_id, user, request, final_text, "ai_publish_" + target)
    if target == "notes":
        db.add(SessionNote(room_id=room_id, title=title, text=final_text[:5000]))
    elif target in ("staff", "bastidores"):
        db.add(StaffChatMessage(room_id=room_id, user_id=user.id, text=("🤫 " + title + ":\n" + final_text)[:5000]))
    elif target == "location":
        if not req.map_id or not req.location_id:
            raise HTTPException(400, "Selecione um local do mapa antes de usar como descrição")
        loc = db.query(RoomLocationDescription).filter_by(room_id=room_id, map_id=req.map_id, location_id=req.location_id).first()
        if not loc:
            loc = RoomLocationDescription(room_id=room_id, map_id=req.map_id, location_id=req.location_id)
        loc.location_name = (req.location_name or "Local")[:160]
        loc.description = final_text[:5000]
        loc.updated_by = user.id
        loc.updated_at = datetime.utcnow()
        db.add(loc)
    else:
        db.add(ChatMessage(room_id=room_id, user_id=user.id, text=("🎙️ " + title + ":\n" + final_text)[:5000]))
    db.add(EventLog(room_id=room_id, kind="ai_publish", text=f"{title} publicado em {target}."))
    db.commit()
    await manager.broadcast(room_id, {"type":"state", "state": room_state(db, room_id)})
    if target in ("staff", "bastidores"):
        await manager.broadcast(room_id, {"type":"staff_chat_updated"})
    return {"ok": True}

@app.post("/rooms/{room_id}/ai/clear-done")
async def clear_done_ai_jobs(room_id: str, db: Session = Depends(db_dep), user: User = Depends(current_user)):
    require_staff(db, room_id, user)
    jobs = db.query(AIJob).filter(AIJob.room_id == room_id, AIJob.status.in_(["done", "error"])).all()
    count = len(jobs)
    for job in jobs:
        db.delete(job)
    if count:
        db.add(EventLog(room_id=room_id, kind="ai_clear", text=f"{count} resposta(s) concluída(s)/com erro da IA foram limpas."))
    db.commit()
    await manager.broadcast(room_id, {"type":"state", "state": room_state(db, room_id)})
    return {"ok": True, "cleared": count}

@app.websocket("/ws/{room_id}")
async def ws_room(room_id: str, ws: WebSocket):
    await manager.connect(room_id, ws)
    try:
        while True:
            await ws.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(room_id, ws)
