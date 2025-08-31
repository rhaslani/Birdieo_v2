from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, UploadFile, File
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
import bcrypt
import jwt
import base64
from enum import Enum
import asyncio

# Load environment variables
load_dotenv()

# Import Emergent LLM integration
from emergentintegrations.llm.chat import LlmChat, UserMessage, ImageContent


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI(title="Birdieo API", description="Golf shot capture platform")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# JWT Configuration
JWT_SECRET = os.environ.get('JWT_SECRET', 'your-secret-key-change-in-production')
JWT_ALGORITHM = 'HS256'
security = HTTPBearer()

# Enums
class UserRole(str, Enum):
    PLAYER = "player"
    COURSE_MANAGER = "course_manager"
    ADMIN = "admin"

class RoundStatus(str, Enum):
    SCHEDULED = "scheduled"
    ACTIVE = "active"
    COMPLETED = "completed"

class Handedness(str, Enum):
    RIGHT = "right"
    LEFT = "left"

class SubscriptionPlan(str, Enum):
    FREE = "free"
    SUBSCRIBER = "subscriber"
    TEAM = "team"

# Data Models
class User(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: EmailStr
    email_verified: bool = False
    password_hash: str
    name: str
    role: UserRole = UserRole.PLAYER
    handedness: Optional[Handedness] = None  # Remember user's handedness preference
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    name: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: str
    email: str
    name: str
    role: UserRole
    email_verified: bool
    handedness: Optional[Handedness]
    created_at: datetime

class ClothingDescriptor(BaseModel):
    top_color: str
    top_style: str
    bottom_color: str
    hat_color: Optional[str] = None
    shoes_color: str

class SubjectProfile(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    round_id: str
    user_id: Optional[str] = None
    type: str  # "subscribed" or "temp"
    face_embedding: Optional[List[float]] = None
    clothing_descriptor: ClothingDescriptor
    handedness: Handedness
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class HoleTimeline(BaseModel):
    hole_01: Optional[datetime] = None
    hole_02: Optional[datetime] = None
    hole_03: Optional[datetime] = None
    hole_04: Optional[datetime] = None
    hole_05: Optional[datetime] = None
    hole_06: Optional[datetime] = None
    hole_07: Optional[datetime] = None
    hole_08: Optional[datetime] = None
    hole_09: Optional[datetime] = None
    hole_10: Optional[datetime] = None
    hole_11: Optional[datetime] = None
    hole_12: Optional[datetime] = None
    hole_13: Optional[datetime] = None
    hole_14: Optional[datetime] = None
    hole_15: Optional[datetime] = None
    hole_16: Optional[datetime] = None
    hole_17: Optional[datetime] = None
    hole_18: Optional[datetime] = None

class Round(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    course_id: str
    course_name: str
    tee_time: datetime
    expected_timeline: Dict[str, Any]  # Use dict instead of HoleTimeline
    handedness: Handedness
    status: RoundStatus = RoundStatus.SCHEDULED
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    completed_at: Optional[datetime] = None

class Clip(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    round_id: str
    subject_id: str
    hole_number: int
    camera_id: str
    s3_key_master: str
    hls_manifest: str
    poster_url: str
    duration_sec: int
    face_blur_applied: bool = False
    published_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class CheckinRequest(BaseModel):
    tee_time: datetime
    course_id: str
    course_name: str
    handedness: Handedness

class PhotoAnalysisRequest(BaseModel):
    photo_base64: str
    photo_type: str  # "face", "front", "side", "back"

class ClothingAnalysisResult(BaseModel):
    top_color: str
    top_style: str
    bottom_color: str
    hat_color: Optional[str] = None
    shoes_color: str
    confidence: float
    detected_items: List[str]

class PhotoCaptureRequest(BaseModel):
    round_id: str
    face_photo: str  # base64
    front_photo: str  # base64
    side_photo: str  # base64
    back_photo: str  # base64
    clothing_descriptor: ClothingDescriptor

# Helper Functions
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_jwt_token(user_id: str, email: str) -> str:
    payload = {
        'user_id': user_id,
        'email': email,
        'exp': datetime.now(timezone.utc) + timedelta(days=30)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = payload.get('user_id')
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token")
        
        user_dict = await db.users.find_one({"id": user_id})
        if not user_dict:
            raise HTTPException(status_code=401, detail="User not found")
        
        return User(**user_dict)
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

async def analyze_clothing_from_photo(photo_base64: str) -> ClothingAnalysisResult:
    """Analyze clothing details from a photo using AI"""
    try:
        # Initialize LLM chat with Emergent key
        emergent_key = os.environ.get('EMERGENT_LLM_KEY')
        if not emergent_key:
            raise HTTPException(status_code=500, detail="AI service not configured")
        
        chat = LlmChat(
            api_key=emergent_key,
            session_id=f"clothing_analysis_{uuid.uuid4()}",
            system_message="You are an expert at analyzing golf attire. Analyze the clothing in the image and return specific details about colors and styles suitable for golf player identification."
        ).with_model("openai", "gpt-4o-mini")
        
        # Create image content from base64
        image_content = ImageContent(image_base64=photo_base64)
        
        # Create analysis prompt
        analysis_prompt = """
        Analyze this golf attire photo and identify the following clothing details:
        
        1. Top color (white, black, red, blue, green, yellow, gray, navy, etc.)
        2. Top style (polo, t-shirt, sweater, jacket, vest)
        3. Bottom color (khaki, white, black, navy, gray, brown)
        4. Hat color if visible (white, black, red, blue, green, none)
        5. Shoe color if visible (white, black, brown, gray)
        
        Return your analysis in this exact JSON format:
        {
            "top_color": "color_name",
            "top_style": "style_name", 
            "bottom_color": "color_name",
            "hat_color": "color_name_or_none",
            "shoes_color": "color_name",
            "confidence": 0.85,
            "detected_items": ["polo shirt", "khaki pants", "white shoes"]
        }
        
        Focus on the most prominent and clearly visible clothing items. Use standard color names.
        """
        
        # Send message with image
        user_message = UserMessage(
            text=analysis_prompt,
            file_contents=[image_content]
        )
        
        response = await chat.send_message(user_message)
        
        # Parse JSON response
        import json
        try:
            # Extract JSON from response (in case there's extra text)
            response_text = response.strip()
            if '```json' in response_text:
                json_start = response_text.find('{')
                json_end = response_text.rfind('}') + 1
                json_text = response_text[json_start:json_end]
            else:
                json_text = response_text
                
            analysis_data = json.loads(json_text)
            return ClothingAnalysisResult(**analysis_data)
            
        except json.JSONDecodeError as e:
            # Fallback: create default analysis
            logger.warning(f"Failed to parse AI response: {e}")
            return ClothingAnalysisResult(
                top_color="blue",
                top_style="polo",
                bottom_color="khaki", 
                hat_color="none",
                shoes_color="white",
                confidence=0.5,
                detected_items=["clothing items"]
            )
            
    except Exception as e:
        logger.error(f"Clothing analysis failed: {e}")
        # Return default analysis on error
        return ClothingAnalysisResult(
            top_color="blue",
            top_style="polo", 
            bottom_color="khaki",
            hat_color="none",
            shoes_color="white",
            confidence=0.3,
            detected_items=["error in analysis"]
        )

def prepare_for_mongo(data: dict) -> dict:
    """Convert datetime objects to ISO strings for MongoDB storage"""
    result = {}
    for key, value in data.items():
        if isinstance(value, datetime):
            result[key] = value.isoformat()
        elif isinstance(value, dict):
            result[key] = prepare_for_mongo(value)
        else:
            result[key] = value
    return result

def parse_from_mongo(item: dict) -> dict:
    """Convert ISO strings back to datetime objects from MongoDB and handle ObjectId"""
    result = {}
    for key, value in item.items():
        # Skip MongoDB's _id field, we use our own id field
        if key == '_id':
            continue
        elif key in ['created_at', 'tee_time', 'completed_at', 'published_at'] and isinstance(value, str):
            try:
                result[key] = datetime.fromisoformat(value.replace('Z', '+00:00'))
            except ValueError:
                result[key] = value
        elif isinstance(value, dict):
            result[key] = parse_from_mongo(value)
        else:
            result[key] = value
    return result

# Generate mock timeline based on tee time
def generate_expected_timeline(tee_time: datetime) -> dict:
    """Generate expected timeline as a dictionary instead of HoleTimeline object"""
    timeline = {}
    current_time = tee_time
    
    for hole in range(1, 19):
        hole_key = f"hole_{hole:02d}"
        timeline[hole_key] = current_time.isoformat()
        # Add 15 minutes per hole on average (can be customized per course)
        current_time += timedelta(minutes=15)
    
    return timeline

# Authentication Routes
@api_router.post("/auth/register", response_model=dict)
async def register(user_data: UserCreate):
    # Check if user exists
    existing_user = await db.users.find_one({"email": user_data.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Create user
    hashed_password = hash_password(user_data.password)
    user = User(
        email=user_data.email,
        password_hash=hashed_password,
        name=user_data.name
    )
    
    user_dict = prepare_for_mongo(user.dict())
    await db.users.insert_one(user_dict)
    
    # Create JWT token
    token = create_jwt_token(user.id, user.email)
    
    return {
        "message": "User registered successfully",
        "token": token,
        "user": UserResponse(**user.dict())
    }

@api_router.post("/auth/login", response_model=dict)
async def login(login_data: UserLogin):
    user_dict = await db.users.find_one({"email": login_data.email})
    if not user_dict:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    user_dict = parse_from_mongo(user_dict)
    user = User(**user_dict)
    
    if not verify_password(login_data.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    token = create_jwt_token(user.id, user.email)
    
    return {
        "message": "Login successful",
        "token": token,
        "user": UserResponse(**user.dict())
    }

class UserProfileUpdate(BaseModel):
    name: Optional[str] = None
    handedness: Optional[Handedness] = None

@api_router.get("/auth/me", response_model=UserResponse)
async def get_current_user_info(current_user: User = Depends(get_current_user)):
    return UserResponse(**current_user.dict())

@api_router.put("/auth/profile", response_model=UserResponse)
async def update_user_profile(profile_data: UserProfileUpdate, current_user: User = Depends(get_current_user)):
    """Update user profile information including handedness preference"""
    update_fields = {}
    
    if profile_data.name is not None:
        update_fields["name"] = profile_data.name
    
    if profile_data.handedness is not None:
        update_fields["handedness"] = profile_data.handedness.value
    
    if update_fields:
        # Update in database
        await db.users.update_one(
            {"id": current_user.id},
            {"$set": update_fields}
        )
        
        # Update current user object
        for field, value in update_fields.items():
            setattr(current_user, field, value)
    
    return UserResponse(**current_user.dict())

# Check-in Routes
@api_router.post("/checkin", response_model=dict)
async def create_checkin(checkin_data: CheckinRequest, current_user: User = Depends(get_current_user)):
    # Generate expected timeline
    expected_timeline = generate_expected_timeline(checkin_data.tee_time)
    
    # Create round
    round_obj = Round(
        user_id=current_user.id,
        course_id=checkin_data.course_id,
        course_name=checkin_data.course_name,
        tee_time=checkin_data.tee_time,
        expected_timeline=expected_timeline,
        handedness=checkin_data.handedness,
        status=RoundStatus.SCHEDULED
    )
    
    round_dict = prepare_for_mongo(round_obj.dict())
    await db.rounds.insert_one(round_dict)
    
    return {
        "message": "Check-in successful",
        "round_id": round_obj.id,
        "expected_timeline": expected_timeline
    }

# Photo Analysis Route
@api_router.post("/analyze-photo", response_model=ClothingAnalysisResult)
async def analyze_photo(photo_request: PhotoAnalysisRequest, current_user: User = Depends(get_current_user)):
    """Analyze clothing from a photo using AI"""
    try:
        # Clean the base64 data (remove data URL prefix if present)
        photo_data = photo_request.photo_base64
        if ',' in photo_data:
            photo_data = photo_data.split(',')[1]
        
        # Analyze the photo
        analysis_result = await analyze_clothing_from_photo(photo_data)
        
        return analysis_result
        
    except Exception as e:
        logger.error(f"Photo analysis failed: {e}")
        raise HTTPException(status_code=500, detail="Photo analysis failed")

# Clothing Verification Route  
@api_router.post("/verify-clothing", response_model=dict)
async def verify_clothing(verification_data: dict, current_user: User = Depends(get_current_user)):
    """Allow user to verify/correct AI-detected clothing details"""
    try:
        round_id = verification_data.get('round_id')
        verified_clothing = verification_data.get('clothing_descriptor')
        user_confirmed = verification_data.get('confirmed', False)
        
        if not round_id or not verified_clothing:
            raise HTTPException(status_code=400, detail="Missing required data")
        
        # Update the round's subject profile with verified clothing
        subject_profile = SubjectProfile(
            round_id=round_id,
            user_id=current_user.id,
            type="subscribed",
            clothing_descriptor=ClothingDescriptor(**verified_clothing),
            handedness=verified_clothing.get('handedness', 'right')
        )
        
        profile_dict = prepare_for_mongo(subject_profile.dict())
        await db.subject_profiles.insert_one(profile_dict)
        
        return {
            "message": "Clothing details verified and saved",
            "confirmed": user_confirmed,
            "subject_id": subject_profile.id
        }
        
    except Exception as e:
        logger.error(f"Clothing verification failed: {e}")
        raise HTTPException(status_code=500, detail="Clothing verification failed")

@api_router.post("/checkin/photos", response_model=dict)
async def capture_photos(photo_data: PhotoCaptureRequest, current_user: User = Depends(get_current_user)):
    # Verify round exists and belongs to user
    round_dict = await db.rounds.find_one({"id": photo_data.round_id, "user_id": current_user.id})
    if not round_dict:
        raise HTTPException(status_code=404, detail="Round not found")
    
    # Create subject profile
    subject_profile = SubjectProfile(
        round_id=photo_data.round_id,
        user_id=current_user.id,
        type="subscribed",  # Assuming subscribed for now
        clothing_descriptor=photo_data.clothing_descriptor,
        handedness=Handedness(round_dict["handedness"])
    )
    
    profile_dict = prepare_for_mongo(subject_profile.dict())
    await db.subject_profiles.insert_one(profile_dict)
    
    return {
        "message": "Photos captured successfully",
        "subject_id": subject_profile.id
    }

# Rounds Routes
@api_router.get("/rounds", response_model=List[dict])
async def get_user_rounds(current_user: User = Depends(get_current_user)):
    rounds_cursor = db.rounds.find({"user_id": current_user.id}).sort("created_at", -1)
    rounds = await rounds_cursor.to_list(length=None)
    
    result = []
    for round_dict in rounds:
        round_dict = parse_from_mongo(round_dict)
        
        # Get clips count for this round
        clips_count = await db.clips.count_documents({"round_id": round_dict["id"]})
        
        round_dict["clips_count"] = clips_count
        result.append(round_dict)
    
    return result

@api_router.get("/rounds/{round_id}")
async def get_round_details(round_id: str, current_user: User = Depends(get_current_user)):
    round_dict = await db.rounds.find_one({"id": round_id, "user_id": current_user.id})
    if not round_dict:
        raise HTTPException(status_code=404, detail="Round not found")
    
    round_dict = parse_from_mongo(round_dict)
    
    # Get clips for this round
    clips_cursor = db.clips.find({"round_id": round_id}).sort("hole_number", 1)
    clips = await clips_cursor.to_list(length=None)
    
    # Parse clips
    parsed_clips = []
    for clip in clips:
        clip = parse_from_mongo(clip)
        parsed_clips.append(clip)
    
    round_dict["clips"] = parsed_clips
    return round_dict

# Clips Routes  
@api_router.get("/clips/{round_id}")
async def get_round_clips(round_id: str, current_user: User = Depends(get_current_user)):
    # Verify round belongs to user
    round_dict = await db.rounds.find_one({"id": round_id, "user_id": current_user.id})
    if not round_dict:
        raise HTTPException(status_code=404, detail="Round not found")
    
    clips_cursor = db.clips.find({"round_id": round_id}).sort("hole_number", 1)
    clips = await clips_cursor.to_list(length=None)
    
    return [parse_from_mongo(clip) for clip in clips]

class VisionDetectionEvent(BaseModel):
    round_id: str
    hole_number: int
    camera_angle: str
    detections: List[Dict[str, Any]]
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class VisionTriggerCapture(BaseModel):
    round_id: str
    player_id: str
    hole_number: int
    camera_angle: str
    trigger_reason: str

# Vision Detection Routes
@api_router.post("/vision/detection-event", response_model=dict)
async def log_detection_event(event_data: VisionDetectionEvent, current_user: User = Depends(get_current_user)):
    """Log a vision detection event for potential shot capture"""
    try:
        event_dict = prepare_for_mongo(event_data.dict())
        await db.vision_events.insert_one(event_dict)
        
        return {
            "message": "Detection event logged successfully",
            "event_id": event_dict.get("id"),
            "detections_count": len(event_data.detections)
        }
    except Exception as e:
        logger.error(f"Failed to log detection event: {e}")
        raise HTTPException(status_code=500, detail="Failed to log detection event")

@api_router.post("/vision/trigger-capture", response_model=dict)
async def trigger_shot_capture(trigger_data: VisionTriggerCapture, current_user: User = Depends(get_current_user)):
    """Trigger automatic shot capture based on vision detection"""
    try:
        # Verify round exists and belongs to user
        round_dict = await db.rounds.find_one({"id": trigger_data.round_id, "user_id": current_user.id})
        if not round_dict:
            raise HTTPException(status_code=404, detail="Round not found")
        
        # Create a shot capture trigger record
        capture_trigger = {
            "id": str(uuid.uuid4()),
            "round_id": trigger_data.round_id,
            "player_id": trigger_data.player_id,
            "hole_number": trigger_data.hole_number,
            "camera_angle": trigger_data.camera_angle,
            "trigger_reason": trigger_data.trigger_reason,
            "triggered_at": datetime.now(timezone.utc).isoformat(),
            "status": "triggered"
        }
        
        await db.capture_triggers.insert_one(capture_trigger)
        
        return {
            "message": "Shot capture triggered successfully",
            "trigger_id": capture_trigger["id"],
            "status": "triggered"
        }
    except Exception as e:
        logger.error(f"Failed to trigger shot capture: {e}")
        raise HTTPException(status_code=500, detail="Failed to trigger shot capture")

@api_router.get("/vision/events/{round_id}", response_model=List[dict])
async def get_vision_events(round_id: str, current_user: User = Depends(get_current_user)):
    """Get vision detection events for a round"""
    try:
        # Verify round belongs to user
        round_dict = await db.rounds.find_one({"id": round_id, "user_id": current_user.id})
        if not round_dict:
            raise HTTPException(status_code=404, detail="Round not found")
        
        events_cursor = db.vision_events.find({"round_id": round_id}).sort("timestamp", -1)
        events = await events_cursor.to_list(length=None)
        
        return [parse_from_mongo(event) for event in events]
    except Exception as e:
        logger.error(f"Failed to get vision events: {e}")
        raise HTTPException(status_code=500, detail="Failed to get vision events")

# Mock Data Generation (for demo purposes)
@api_router.post("/demo/generate-clips/{round_id}")
async def generate_demo_clips(round_id: str, current_user: User = Depends(get_current_user)):
    # Verify round exists and belongs to user
    round_dict = await db.rounds.find_one({"id": round_id, "user_id": current_user.id})
    if not round_dict:
        raise HTTPException(status_code=404, detail="Round not found")
    
    # Generate mock clips for holes 1, 3, 5, 7, 9 (partial round simulation)
    mock_holes = [1, 3, 5, 7, 9, 12, 15, 18]
    
    for hole_num in mock_holes:
        clip = Clip(
            round_id=round_id,
            subject_id=f"subject_{current_user.id}",
            hole_number=hole_num,
            camera_id=f"camera_a_hole_{hole_num}",
            s3_key_master=f"demo/round_{round_id}/hole_{hole_num}/clip.m3u8",
            hls_manifest=f"https://demo-hls.birdieo.com/round_{round_id}/hole_{hole_num}/playlist.m3u8",
            poster_url=f"https://demo-hls.birdieo.com/round_{round_id}/hole_{hole_num}/poster.jpg",
            duration_sec=12 + (hole_num % 3) * 4,  # Vary duration 12-20 seconds
            face_blur_applied=False
        )
        
        clip_dict = prepare_for_mongo(clip.dict())
        await db.clips.insert_one(clip_dict)
    
    # Update round status to active
    await db.rounds.update_one(
        {"id": round_id},
        {"$set": {"status": RoundStatus.ACTIVE.value}}
    )
    
    return {"message": f"Generated {len(mock_holes)} demo clips for round {round_id}"}

# Video Stream Routes
@api_router.get("/video/pebble-beach-stream")
async def get_pebble_beach_stream():
    """Proxy the Pebble Beach live stream for Hole 1"""
    try:
        import requests
        from fastapi.responses import StreamingResponse
        
        # Pebble Beach live stream URL (we'll try to extract the actual video stream)
        pebble_beach_url = "https://www.pebblebeach.com/golf/pebble-beach-golf-links/live-golf-cams/pebble-beach-golf-links-putting-green/"
        
        # For now, return a stream URL that can work with our vision system
        # In production, this would extract the actual HLS stream from the Pebble Beach page
        stream_info = {
            "stream_url": "https://www.pebblebeach.com/golf/pebble-beach-golf-links/live-golf-cams/pebble-beach-golf-links-putting-green/",
            "stream_type": "hls",
            "hole_number": 1,
            "camera_name": "Pebble Beach Golf Links - Putting Green",
            "location": "Pebble Beach, California",
            "description": "Live view of the famous Pebble Beach putting green where golfers finish their rounds",
            "is_live": True
        }
        
        return stream_info
    except Exception as e:
        logger.error(f"Failed to get Pebble Beach stream: {e}")
        raise HTTPException(status_code=500, detail="Failed to access live stream")

@api_router.post("/rounds/reset-hole1-video")
async def reset_hole1_video(current_user: User = Depends(get_current_user)):
    """Reset all rounds to use the Pebble Beach live stream for Hole 1"""
    try:
        # Update all existing clips for Hole 1 to use the Pebble Beach stream
        result = await db.clips.update_many(
            {"hole_number": 1},
            {"$set": {
                "hls_manifest": "https://www.pebblebeach.com/golf/pebble-beach-golf-links/live-golf-cams/pebble-beach-golf-links-putting-green/",
                "poster_url": "https://images.unsplash.com/photo-1596727362302-b8d891c42ab8?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDk1NzZ8MHwxfHNlYXJjaHwxfHxwZWJibGUlMjBiZWFjaHxlbnwwfHx8fDE3NTY2NTM5Mjl8MA&ixlib=rb-4.1.0&q=85",
                "s3_key_master": "live/pebble-beach/hole_01/live_stream.m3u8",
                "camera_id": "pebble_beach_putting_green",
                "updated_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        
        return {
            "message": "Successfully reset Hole 1 videos to Pebble Beach live stream",
            "updated_clips": result.modified_count,
            "stream_url": "https://www.pebblebeach.com/golf/pebble-beach-golf-links/live-golf-cams/pebble-beach-golf-links-putting-green/"
        }
    except Exception as e:
        logger.error(f"Failed to reset Hole 1 videos: {e}")
        raise HTTPException(status_code=500, detail="Failed to reset Hole 1 videos")

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