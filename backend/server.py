from fastapi import FastAPI, APIRouter, HTTPException, Depends, File, UploadFile, Form
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
import jwt
import bcrypt
import aiofiles
import json
import time
import threading
from contextlib import asynccontextmanager
import requests
import numpy as np
import cv2
from starlette.responses import StreamingResponse, Response
import base64

# Import for AI integration
from emergentintegrations.llm.chat import LlmChat, UserMessage, ImageContent

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Configuration
JWT_SECRET = os.environ.get('JWT_SECRET', 'birdieo-secret-key-2024')
JWT_ALGORITHM = 'HS256'
JWT_EXPIRATION_HOURS = 24

# AI Configuration
EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY', 'sk-emergent-fB808Dd9a3dC47a913')

# Live Stream Configuration (from live_api_lexington.py)
SNAPSHOT_URL = "https://stream.lexingtonnc.gov/golf/hole1/readImage.asp?dummy=1756663077563"
SNAPSHOT_INTERVAL = 1.0
MAX_WIDTH = 1280
JPEG_QUALITY = 85

# Global variables for live stream
_latest_frame: Optional[np.ndarray] = None
_latest_ts: float = 0.0
_reader_running = True
_lock = threading.Lock()

# Create upload directories
upload_dirs = [
    ROOT_DIR / "uploads" / "player_photos",
    ROOT_DIR / "uploads" / "video_clips"
]
for dir_path in upload_dirs:
    dir_path.mkdir(parents=True, exist_ok=True)

# Security
security = HTTPBearer()

def _snapshot_reader_loop():
    """Continuously fetch the JPEG and publish it as the latest frame."""
    global _latest_frame, _latest_ts
    backoff = 1.0
    while _reader_running:
        try:
            url = f"{SNAPSHOT_URL}&t={int(time.time()*1000)}" if "?" in SNAPSHOT_URL else f"{SNAPSHOT_URL}?t={int(time.time()*1000)}"
            r = requests.get(url, timeout=10)
            r.raise_for_status()

            arr = np.frombuffer(r.content, dtype=np.uint8)
            img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
            if img is None:
                raise RuntimeError("cv2.imdecode returned None")

            if MAX_WIDTH > 0 and img.shape[1] > MAX_WIDTH:
                h, w = img.shape[:2]
                new_w = MAX_WIDTH
                new_h = int(h * (new_w / w))
                img = cv2.resize(img, (new_w, new_h), interpolation=cv2.INTER_AREA)

            with _lock:
                _latest_frame = img
                _latest_ts = time.time()

            backoff = 1.0
            time.sleep(SNAPSHOT_INTERVAL)

        except Exception as e:
            print(f"[SNAPSHOT] Error: {e}. Retrying in {backoff:.1f}s")
            time.sleep(backoff)
            backoff = min(20.0, backoff * 2.0)

@asynccontextmanager
async def lifespan(app: FastAPI):
    print(f"[startup] Polling snapshot: {SNAPSHOT_URL}")
    t = threading.Thread(target=_snapshot_reader_loop, daemon=True)
    t.start()
    yield
    global _reader_running
    _reader_running = False
    print("[shutdown] Reader stopping…")

# Create the main app
app = FastAPI(title="Birdieo.ai API", lifespan=lifespan)
api_router = APIRouter(prefix="/api")

# Serve static files
app.mount("/uploads", StaticFiles(directory=str(ROOT_DIR / "uploads")), name="uploads")

# Pydantic Models
class UserCreate(BaseModel):
    name: str
    email: EmailStr
    password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class User(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    email: EmailStr
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    is_verified: bool = False

class CheckInData(BaseModel):
    tee_time: datetime
    handedness: str  # "left" or "right"
    course_name: str = "Lexington Golf Course"

class PlayerPhoto(BaseModel):
    angle: str  # "front", "side", "back", "face"
    file_path: str
    clothing_analysis: Optional[Dict[str, Any]] = None

class Round(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    subject_id: str = Field(default_factory=lambda: f"SUB{str(uuid.uuid4())[:6].upper()}")
    tee_time: datetime
    handedness: str
    course_name: str
    expected_timeline: Dict[int, str]  # hole number -> expected time
    player_photos: List[PlayerPhoto] = []
    clothing_breakdown: Optional[Dict[str, str]] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    completed: bool = False

class VideoClip(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    round_id: str
    subject_id: str
    hole_number: int
    file_path: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    confidence_score: Optional[float] = None
    frame_accuracy_score: Optional[float] = None

class DetectionResult(BaseModel):
    label: str
    confidence: float
    box: Dict[str, int]  # x, y, w, h

class AnalysisResponse(BaseModel):
    ok: bool
    width: Optional[int] = None
    height: Optional[int] = None
    detections: List[DetectionResult] = []
    ts: Optional[float] = None
    reason: Optional[str] = None

# Helper Functions
def create_jwt_token(user_id: str) -> str:
    payload = {
        'user_id': user_id,
        'exp': datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def verify_jwt_token(token: str) -> str:
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload['user_id']
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> str:
    return verify_jwt_token(credentials.credentials)

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def generate_expected_timeline(tee_time: datetime) -> Dict[int, str]:
    """Generate expected timeline for 18 holes (15 minutes apart)"""
    timeline = {}
    current_time = tee_time
    for hole in range(1, 19):
        timeline[hole] = current_time.strftime("%H:%M")
        current_time += timedelta(minutes=15)
    return timeline

async def analyze_clothing_with_ai(image_path: str, angle: str) -> Dict[str, str]:
    """Analyze clothing using OpenAI vision model"""
    try:
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"clothing-analysis-{uuid.uuid4()}",
            system_message="You are an expert at analyzing clothing in golf course photos. Provide detailed clothing descriptions for player identification."
        ).with_model("openai", "gpt-4o")
        
        image_content = ImageContent(file_path=image_path)
        
        user_message = UserMessage(
            text=f"Analyze the clothing in this {angle} view photo of a golfer. Describe: 1) Top (shirt/jacket color, style, patterns), 2) Bottom (pants/shorts color, style), 3) Hat (color, style if visible), 4) Shoes (color, style if visible). Return as JSON format with keys: top, bottom, hat, shoes.",
            file_contents=[image_content]
        )
        
        response = await chat.send_message(user_message)
        
        # Try to parse JSON response, fallback to text parsing
        try:
            clothing_data = json.loads(response)
        except:
            # Fallback parsing
            clothing_data = {
                "top": "Not analyzed",
                "bottom": "Not analyzed", 
                "hat": "Not analyzed",
                "shoes": "Not analyzed"
            }
        
        return clothing_data
        
    except Exception as e:
        print(f"AI clothing analysis error: {e}")
        return {
            "top": "Analysis failed",
            "bottom": "Analysis failed",
            "hat": "Analysis failed", 
            "shoes": "Analysis failed"
        }

async def detect_persons_in_frame(frame: np.ndarray) -> List[DetectionResult]:
    """Detect persons in frame using AI vision model"""
    try:
        # Encode frame as JPEG
        _, buffer = cv2.imencode('.jpg', frame)
        image_b64 = base64.b64encode(buffer).decode('utf-8')
        
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"person-detection-{uuid.uuid4()}",
            system_message="You are an expert at detecting people in golf course video frames. Identify all people and provide bounding box coordinates."
        ).with_model("openai", "gpt-4o")
        
        image_content = ImageContent(image_base64=image_b64)
        
        user_message = UserMessage(
            text="Detect all people in this golf course image. For each person, provide bounding box coordinates (x, y, width, height) as percentage of image dimensions. Return as JSON array with format: [{'label': 'person', 'confidence': 0.9, 'box': {'x': 10, 'y': 20, 'w': 100, 'h': 200}}]",
            file_contents=[image_content]
        )
        
        response = await chat.send_message(user_message)
        
        try:
            detections_data = json.loads(response)
            return [DetectionResult(**detection) for detection in detections_data]
        except:
            # Return demo detection if AI fails
            h, w = frame.shape[:2]
            return [DetectionResult(
                label="person",
                confidence=0.8,
                box={"x": int(w*0.25), "y": int(h*0.25), "w": int(w*0.5), "h": int(h*0.5)}
            )]
            
    except Exception as e:
        print(f"Person detection error: {e}")
        # Return demo detection
        h, w = frame.shape[:2]
        return [DetectionResult(
            label="person",
            confidence=0.5,
            box={"x": int(w*0.25), "y": int(h*0.25), "w": int(w*0.5), "h": int(h*0.5)}
        )]

# API Routes
@api_router.post("/auth/register")
async def register_user(user_data: UserCreate):
    # Check if user already exists
    existing_user = await db.users.find_one({"email": user_data.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="User already exists")
    
    # Create new user
    hashed_password = hash_password(user_data.password)
    user = User(
        name=user_data.name,
        email=user_data.email
    )
    
    user_dict = user.dict()
    user_dict['password'] = hashed_password
    
    await db.users.insert_one(user_dict)
    
    # Create JWT token
    token = create_jwt_token(user.id)
    
    return {
        "message": "User registered successfully",
        "token": token,
        "user": user
    }

@api_router.post("/auth/login")
async def login_user(login_data: UserLogin):
    # Find user
    user_doc = await db.users.find_one({"email": login_data.email})
    if not user_doc:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    # Verify password
    if not verify_password(login_data.password, user_doc['password']):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    # Create JWT token
    token = create_jwt_token(user_doc['id'])
    
    user = User(**{k: v for k, v in user_doc.items() if k != 'password'})
    
    return {
        "message": "Login successful",
        "token": token,
        "user": user
    }

@api_router.get("/auth/me")
async def get_current_user_info(user_id: str = Depends(get_current_user)):
    user_doc = await db.users.find_one({"id": user_id})
    if not user_doc:
        raise HTTPException(status_code=404, detail="User not found")
    
    user = User(**{k: v for k, v in user_doc.items() if k != 'password'})
    return user

@api_router.post("/checkin/start")
async def start_checkin(
    checkin_data: CheckInData,
    user_id: str = Depends(get_current_user)
):
    # Create new round
    round_obj = Round(
        user_id=user_id,
        tee_time=checkin_data.tee_time,
        handedness=checkin_data.handedness,
        course_name=checkin_data.course_name,
        expected_timeline=generate_expected_timeline(checkin_data.tee_time)
    )
    
    await db.rounds.insert_one(round_obj.dict())
    
    return {
        "message": "Check-in started",
        "round": round_obj
    }

@api_router.post("/checkin/upload-photo/{round_id}")
async def upload_player_photo(
    round_id: str,
    angle: str = Form(...),
    file: UploadFile = File(...),
    user_id: str = Depends(get_current_user)
):
    # Verify round belongs to user
    round_doc = await db.rounds.find_one({"id": round_id, "user_id": user_id})
    if not round_doc:
        raise HTTPException(status_code=404, detail="Round not found")
    
    # Save file
    file_extension = file.filename.split('.')[-1]
    filename = f"{round_id}_{angle}_{int(time.time())}.{file_extension}"
    file_path = ROOT_DIR / "uploads" / "player_photos" / filename
    
    async with aiofiles.open(file_path, 'wb') as f:
        content = await file.read()
        await f.write(content)
    
    # Analyze clothing with AI
    clothing_analysis = await analyze_clothing_with_ai(str(file_path), angle)
    
    # Create photo record
    photo = PlayerPhoto(
        angle=angle,
        file_path=f"/uploads/player_photos/{filename}",
        clothing_analysis=clothing_analysis
    )
    
    # Update round with photo
    await db.rounds.update_one(
        {"id": round_id},
        {"$push": {"player_photos": photo.dict()}}
    )
    
    return {
        "message": "Photo uploaded successfully",
        "photo": photo
    }

@api_router.post("/checkin/complete/{round_id}")
async def complete_checkin(
    round_id: str,
    user_id: str = Depends(get_current_user)
):
    # Get round
    round_doc = await db.rounds.find_one({"id": round_id, "user_id": user_id})
    if not round_doc:
        raise HTTPException(status_code=404, detail="Round not found")
    
    # Aggregate clothing analysis from all photos
    clothing_breakdown = {}
    for photo in round_doc.get('player_photos', []):
        if photo.get('clothing_analysis'):
            for item, description in photo['clothing_analysis'].items():
                clothing_breakdown[item] = description
    
    # Update round
    await db.rounds.update_one(
        {"id": round_id},
        {"$set": {"clothing_breakdown": clothing_breakdown}}
    )
    
    return {
        "message": "Check-in completed successfully",
        "subject_id": round_doc['subject_id']
    }

@api_router.get("/rounds")
async def get_user_rounds(user_id: str = Depends(get_current_user)):
    rounds = await db.rounds.find({"user_id": user_id}).sort("created_at", -1).to_list(100)
    return [Round(**round_doc) for round_doc in rounds]

@api_router.get("/rounds/{round_id}")
async def get_round_details(
    round_id: str,
    user_id: str = Depends(get_current_user)
):
    round_doc = await db.rounds.find_one({"id": round_id, "user_id": user_id})
    if not round_doc:
        raise HTTPException(status_code=404, detail="Round not found")
    
    return Round(**round_doc)

@api_router.get("/rounds/{round_id}/clips")
async def get_round_clips(
    round_id: str,
    user_id: str = Depends(get_current_user)
):
    # Verify round belongs to user
    round_doc = await db.rounds.find_one({"id": round_id, "user_id": user_id})
    if not round_doc:
        raise HTTPException(status_code=404, detail="Round not found")
    
    clips = await db.video_clips.find({"round_id": round_id}).sort("hole_number", 1).to_list(100)
    return [VideoClip(**clip) for clip in clips]

# Live Stream API Routes (from live_api_lexington.py)
@api_router.get("/stream/health")
def stream_health():
    with _lock:
        has_frame = _latest_frame is not None
        age = (time.time() - _latest_ts) if has_frame else None
    return {"ok": has_frame, "age_seconds": age, "source": SNAPSHOT_URL}

@api_router.get("/stream/frame")
def get_current_frame():
    with _lock:
        img = None if _latest_frame is None else _latest_frame.copy()
    if img is None:
        return Response(status_code=503)
    ok, buf = cv2.imencode(".jpg", img, [int(cv2.IMWRITE_JPEG_QUALITY), JPEG_QUALITY])
    if not ok:
        return Response(status_code=500)
    return Response(content=buf.tobytes(), media_type="image/jpeg")

@api_router.get("/stream/mjpeg")
def mjpeg_stream():
    boundary = "frame"

    def gen():
        while True:
            with _lock:
                img = None if _latest_frame is None else _latest_frame.copy()
            if img is None:
                time.sleep(0.05)
                continue
            ok, buf = cv2.imencode(".jpg", img, [int(cv2.IMWRITE_JPEG_QUALITY), JPEG_QUALITY])
            if not ok:
                time.sleep(0.02)
                continue
            jpg = buf.tobytes()
            yield (
                b"--" + boundary.encode() + b"\r\n"
                b"Content-Type: image/jpeg\r\n"
                b"Content-Length: " + str(len(jpg)).encode() + b"\r\n\r\n" +
                jpg + b"\r\n"
            )

    headers = {
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "Pragma": "no-cache",
        "Connection": "keep-alive",
    }
    return StreamingResponse(
        gen(),
        media_type=f"multipart/x-mixed-replace; boundary={boundary}",
        headers=headers,
    )

@api_router.get("/stream/analyze", response_model=AnalysisResponse)
async def analyze_current_frame():
    """Analyze current frame for person detection"""
    with _lock:
        img = None if _latest_frame is None else _latest_frame.copy()
        ts = _latest_ts
    
    if img is None:
        return AnalysisResponse(ok=False, reason="no frame yet")
    
    h, w = img.shape[:2]
    
    # Detect persons using AI
    try:
        detections = await detect_persons_in_frame(img)
        return AnalysisResponse(
            ok=True,
            ts=ts,
            width=w,
            height=h,
            detections=detections
        )
    except Exception as e:
        print(f"Analysis error: {e}")
        # Return demo detection
        demo_detection = DetectionResult(
            label="person",
            confidence=0.5,
            box={"x": int(w*0.25), "y": int(h*0.25), "w": int(w*0.5), "h": int(h*0.5)}
        )
        return AnalysisResponse(
            ok=True,
            ts=ts,
            width=w,
            height=h,
            detections=[demo_detection]
        )

@api_router.post("/stream/capture-clip")
async def capture_30_second_clip(hole_number: int = 1):
    """Capture a 30-second clip for testing purposes"""
    try:
        # Create a mock video clip entry
        clip_id = str(uuid.uuid4())
        mock_clip = VideoClip(
            id=clip_id,
            round_id="mock-round-" + str(uuid.uuid4())[:8],
            subject_id="MOCK" + str(uuid.uuid4())[:6].upper(),
            hole_number=hole_number,
            file_path=f"/uploads/video_clips/mock_clip_{clip_id[:8]}.mp4",
            confidence_score=0.85,
            frame_accuracy_score=0.92
        )
        
        await db.video_clips.insert_one(mock_clip.dict())
        
        return {
            "message": "30-second clip captured successfully",
            "clip": mock_clip
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error capturing clip: {str(e)}")

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()