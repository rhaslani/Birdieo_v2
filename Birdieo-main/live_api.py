import os
import time
import threading
from typing import Optional, Dict
from contextlib import asynccontextmanager

import av          # PyAV (FFmpeg bindings)
import numpy as np
import cv2         # for JPEG encode / optional resize
from fastapi import FastAPI, Response
from starlette.responses import StreamingResponse

###############################################################################
# CONFIG
###############################################################################
STREAM_URL = os.getenv(
    "STREAM_URL",
    "https://s53.ipcamlive.com/streams/35k7zcqp3ugdkfj9s/stream.m3u8"
)

# Optional headers if origin requires them (e.g., Referer / User-Agent)
HLS_HEADERS: Dict[str, str] = {
    # "Referer": "https://golftheriverside.com/",
    # "User-Agent": "Mozilla/5.0",
}

TARGET_FPS   = float(os.getenv("TARGET_FPS", "10"))   # throttle publish rate
MAX_WIDTH    = int(os.getenv("MAX_WIDTH", "1280"))    # downscale if wider
JPEG_QUALITY = int(os.getenv("JPEG_QUALITY", "85"))   # 1..100

RECONNECT_BASE_DELAY = 1.0    # seconds
RECONNECT_MAX_DELAY  = 20.0   # seconds

###############################################################################
# GLOBAL STATE
###############################################################################
_latest_frame: Optional[np.ndarray] = None  # BGR
_latest_ts: float = 0.0
_reader_running = True
_lock = threading.Lock()

###############################################################################
# HELPERS
###############################################################################
def _open_container(url: str, headers: Dict[str, str]) -> av.container.InputContainer:
    """
    Open HLS with optional HTTP headers.
    PyAV/FFmpeg expects headers as a single CRLF-separated string.
    """
    options = {}
    if headers:
        header_str = "".join(f"{k}: {v}\r\n" for k, v in headers.items())
        options["headers"] = header_str
    return av.open(url, mode="r", options=options)

def _reader_loop():
    global _latest_frame, _latest_ts
    delay = 1.0 / max(1e-6, TARGET_FPS)
    backoff = RECONNECT_BASE_DELAY

    while _reader_running:
        container = None
        try:
            container = _open_container(STREAM_URL, HLS_HEADERS)

            # pick first video stream
            vstream = next((s for s in container.streams if s.type == "video"), None)
            if vstream is None:
                raise RuntimeError("No video stream found in HLS.")
            vstream.thread_type = "AUTO"

            backoff = RECONNECT_BASE_DELAY  # reset backoff after successful open

            for frame in container.decode(video=0):
                img = frame.to_ndarray(format="bgr24")

                if MAX_WIDTH > 0 and img.shape[1] > MAX_WIDTH:
                    h, w = img.shape[:2]
                    new_w = MAX_WIDTH
                    new_h = int(h * (new_w / w))
                    img = cv2.resize(img, (new_w, new_h), interpolation=cv2.INTER_AREA)

                with _lock:
                    _latest_frame = img
                    _latest_ts = time.time()

                time.sleep(delay)

        except Exception as e:
            print(f"[reader] Error: {e}. Reconnecting in {backoff:.1f}s")
            time.sleep(backoff)
            backoff = min(RECONNECT_MAX_DELAY, backoff * 2.0)
        finally:
            try:
                if container is not None:
                    container.close()
            except Exception:
                pass

###############################################################################
# FASTAPI (with lifespan)
###############################################################################
@asynccontextmanager
async def lifespan(app: FastAPI):
    # --- startup ---
    print(f"[startup] Starting reader for {STREAM_URL}")
    t = threading.Thread(target=_reader_loop, daemon=True)
    t.start()

    yield  # API runs during this period

    # --- shutdown ---
    global _reader_running
    _reader_running = False
    print("[shutdown] Reader stopping…")

app = FastAPI(title="Riverside Live CV API", lifespan=lifespan)

###############################################################################
# ENDPOINTS
###############################################################################
@app.get("/health")
def health():
    with _lock:
        has_frame = _latest_frame is not None
        age = (time.time() - _latest_ts) if has_frame else None
    return {"ok": has_frame, "age_seconds": age, "stream_url": STREAM_URL}

@app.get("/frame")
def latest_frame():
    with _lock:
        frame = None if _latest_frame is None else _latest_frame.copy()
    if frame is None:
        return Response(status_code=503)
    ok, buf = cv2.imencode(".jpg", frame, [int(cv2.IMWRITE_JPEG_QUALITY), JPEG_QUALITY])
    if not ok:
        return Response(status_code=500)
    return Response(content=buf.tobytes(), media_type="image/jpeg")

@app.get("/stream.mjpg")
def mjpeg():
    boundary = "frame"

    def gen():
        while True:
            with _lock:
                frm = None if _latest_frame is None else _latest_frame.copy()
            if frm is None:
                time.sleep(0.05)
                continue
            ok, buf = cv2.imencode(".jpg", frm, [int(cv2.IMWRITE_JPEG_QUALITY), JPEG_QUALITY])
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
    """Replace this with real inference on `_latest_frame`."""
    with _lock:
        frame = None if _latest_frame is None else _latest_frame.copy()
        ts = _latest_ts
    if frame is None:
        return {"ok": False, "reason": "no frame yet"}
    h, w = frame.shape[:2]
    box = {"x": int(w*0.25), "y": int(h*0.25), "w": int(w*0.5), "h": int(h*0.5)}
    return {"ok": True, "ts": ts, "width": w, "height": h,
            "detections": [{"label": "demo", "box": box}]}