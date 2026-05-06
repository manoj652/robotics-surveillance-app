import asyncio
import cv2
import numpy as np
from aiortc import RTCPeerConnection, RTCSessionDescription, VideoStreamTrack
from aiortc.contrib.media import MediaRelay
from av import VideoFrame
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager

relay = MediaRelay()
pcs = set()

class CameraStreamTrack(VideoStreamTrack):
    """
    A synthetic video stream track for testing.
    """
    def __init__(self):
        super().__init__()
        print("Initializing Synthetic Video Track...")
        self.count = 0
        self.width = 640
        self.height = 480

    async def recv(self):
        pts, time_base = await self.next_timestamp()
        
        # Create a synthetic frame (bouncing ball)
        frame = np.zeros((self.height, self.width, 3), dtype=np.uint8)
        
        # Bouncing ball logic
        c = (self.count * 5) % self.width
        r = int(self.height / 2 + 50 * np.sin(self.count / 10))
        cv2.circle(frame, (c, r), 30, (0, 255, 0), -1)
        
        cv2.putText(frame, f"TEST PATTERN - FRAME {self.count}", (50, 50), 
                    cv2.FONT_HERSHEY_SIMPLEX, 1, (255, 255, 255), 2)
        
        # Add timestamp
        import datetime
        cv2.putText(frame, str(datetime.datetime.now()), (50, 430), 
                    cv2.FONT_HERSHEY_SIMPLEX, 0.7, (200, 200, 200), 1)
            
        new_frame = VideoFrame.from_ndarray(frame, format="rgb24")
        new_frame.pts = pts
        new_frame.time_base = time_base
        self.count += 1
        
        if self.count % 100 == 0:
            print(f"DEBUG: Sent {self.count} synthetic frames")
            
        return new_frame

    def stop(self):
        super().stop()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup logic
    yield
    # Shutdown logic: close peer connections
    coros = [pc.close() for pc in pcs]
    await asyncio.gather(*coros)
    pcs.clear()

app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/offer")
async def offer(request: Request):
    try:
        params = await request.json()
        offer = RTCSessionDescription(sdp=params["sdp"], type=params["type"])

        pc = RTCPeerConnection()
        pcs.add(pc)

        @pc.on("icecandidate")
        def on_icecandidate(candidate):
            if candidate:
                print(f"DEBUG: Gathered ICE candidate: {candidate.foundation} {candidate.component} {candidate.protocol} {candidate.priority} {candidate.ip} {candidate.port} type {candidate.type}")
            else:
                print("DEBUG: ICE candidate gathering finished.")

        @pc.on("connectionstatechange")
        async def on_connectionstatechange():
            print(f"Connection state: {pc.connectionState}")
            if pc.connectionState in ["failed", "closed"]:
                await pc.close()
                pcs.discard(pc)

        # Add video track
        pc.addTrack(CameraStreamTrack())

        await pc.setRemoteDescription(offer)
        answer = await pc.createAnswer()
        await pc.setLocalDescription(answer)

        # Wait for ICE gathering to complete
        # This is important when not using trickle ICE
        print("Gathering ICE candidates...")
        # A simple way to wait for gathering to complete
        # We can't easily await gathering specifically in aiortc without more complex logic, 
        # but aiortc usually completes gathering during setLocalDescription or shortly after.
        # Alternatively, we can use a small sleep or a more robust event listener.
        
        # Robust way to wait for gathering:
        while pc.iceGatheringState != "complete":
            await asyncio.sleep(0.1)
        
        print("ICE gathering complete.")

        return JSONResponse(
            content={
                "sdp": pc.localDescription.sdp,
                "type": pc.localDescription.type,
            }
        )
    except Exception as e:
        print(f"Error handling offer: {e}")
        import traceback
        traceback.print_exc()
        return JSONResponse(status_code=500, content={"error": str(e)})

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
