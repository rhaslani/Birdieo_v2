import time
import threading
from contextlib import asynccontextmanager
from typing import Optional

import requests
import numpy as np
import cv2
from fastapi import FastAPI, Response
from starlette.responses import StreamingResponse

# ====================== CONFIG ======================
SNAPSHOT_URL = "https://stream.lexingtonnc.gov/golf/hole1/readImage.asp?dummy=1756663077563"
SNAPSHOT_INTERVAL = 1.0      # seconds between polls
MAX_WIDTH = 1280             # downscale if wider (set 0 to disable)
JPEG_QUALITY = 85            # 1..100 for /frame and /stream.mjpg
# ====================================================

_latest_frame: Optional[np.ndarray] = None
_latest_ts: float = 0.0
_reader_running = True
_lock = threading.Lock()

def _snapshot_reader_loop():
    """Continuously fetch the JPEG and publish it as the latest frame."""
    global _latest_frame, _latest_ts
    backoff = 1.0
    while _reader_running:
        try:
            # Bust caches with a timestamp so browsers/CDNs don’t serve stale images
            url = f"{SNAPSHOT_URL}&t={int(time.time()*1000)}" if "?" in SNAPSHOT_URL \
                  else f"{SNAPSHOT_URL}?t={int(time.time()*1000)}"

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

app = FastAPI(title="Lexington Live Image API", lifespan=lifespan)

@app.get("/health")
def health():
    with _lock:
        has_frame = _latest_frame is not None
        age = (time.time() - _latest_ts) if has_frame else None
    return {"ok": has_frame, "age_seconds": age, "source": SNAPSHOT_URL}

@app.get("/frame")
def frame():
    with _lock:
        img = None if _latest_frame is None else _latest_frame.copy()
    if img is None:
        return Response(status_code=503)
    ok, buf = cv2.imencode(".jpg", img, [int(cv2.IMWRITE_JPEG_QUALITY), JPEG_QUALITY])
    if not ok:
        return Response(status_code=500)
    return Response(content=buf.tobytes(), media_type="image/jpeg")

@app.get("/stream.mjpg")
def mjpeg():
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

@app.get("/analyze")
def analyze_demo():
    """Replace with your actual CV; this returns a dummy box."""
    with _lock:
        img = None if _latest_frame is None else _latest_frame.copy()
        ts = _latest_ts
    if img is None:
        return {"ok": False, "reason": "no frame yet"}
    h, w = img.shape[:2]
    box = {"x": int(w*0.25), "y": int(h*0.25), "w": int(w*0.5), "h": int(h*0.5)}
    return {"ok": True, "ts": ts, "width": w, "height": h, "detections": [{"label": "demo", "box": box}]}