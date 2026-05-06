import { useEffect, useRef, useState } from 'react';
import './App.css';

function App() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [status, setStatus] = useState('Disconnected');
  const [frameCount, setFrameCount] = useState(0);
  const [fps, setFps] = useState(0);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const requestRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);

  const updateMetrics = (time: number) => {
    if (videoRef.current && !videoRef.current.paused && !videoRef.current.ended) {
      setFrameCount((prev) => prev + 1);
      
      if (!startTimeRef.current) startTimeRef.current = time;
      const elapsed = (time - startTimeRef.current) / 1000;
      if (elapsed > 0) {
        setFps((prevCount) => Math.round((frameCount + 1) / elapsed));
      }
    }
    requestRef.current = requestAnimationFrame(updateMetrics);
  };

  const startStream = async () => {
    try {
      setStatus('Connecting...');
      setFrameCount(0);
      setFps(0);
      startTimeRef.current = 0;

      const pc = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
      });
      pcRef.current = pc;

      pc.ontrack = (event) => {
        if (videoRef.current) {
          if (event.streams && event.streams[0]) {
            videoRef.current.srcObject = event.streams[0];
          } else {
            // Fallback for browsers that don't provide streams in ontrack
            const stream = new MediaStream([event.track]);
            videoRef.current.srcObject = stream;
          }
          
          videoRef.current.onloadedmetadata = () => {
            videoRef.current?.play().catch(console.error);
            if (!requestRef.current) {
              requestRef.current = requestAnimationFrame(updateMetrics);
            }
          };
        }
      };

      pc.oniceconnectionstatechange = () => {
        const state = pc.iceConnectionState;
        setStatus(state.charAt(0).toUpperCase() + state.slice(1));
        if (state === 'failed' || state === 'closed') {
          stopStream();
        }
      };

      pc.addTransceiver('video', { direction: 'recvonly' });

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      const response = await fetch('http://localhost:8000/offer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sdp: pc.localDescription?.sdp,
          type: pc.localDescription?.type,
        }),
      });

      if (!response.ok) throw new Error('Signaling server error');

      const answer = await response.json();
      await pc.setRemoteDescription(new RTCSessionDescription(answer));
    } catch (error) {
      console.error('Failed to establish WebRTC connection:', error);
      setStatus('Error');
      stopStream();
    }
  };

  const stopStream = () => {
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    if (requestRef.current) {
      cancelAnimationFrame(requestRef.current);
      requestRef.current = null;
    }
    setStatus('Disconnected');
  };

  useEffect(() => {
    return () => stopStream();
  }, []);

  return (
    <div className="dashboard">
      <header className="header">
        <div className="logo">
          <span className="icon">🤖</span>
          <h1>RoboGuard <span className="highlight">OS</span></h1>
        </div>
        <div className="header-actions">
          <div className={`status-pill ${status.toLowerCase()}`}>
            <span className="dot"></span>
            {status}
          </div>
        </div>
      </header>

      <main className="main-layout">
        <section className="viewport-container">
          <div className="viewport">
            <video ref={videoRef} autoPlay playsInline muted />
            <div className="hud">
              <div className="hud-top">
                <div className="hud-tag live">● LIVE</div>
                <div className="hud-metric">FPS: {fps}</div>
              </div>
              <div className="hud-bottom">
                <div className="hud-metric">FRM: {frameCount.toLocaleString()}</div>
                <div className="hud-metric">LAT: LOW</div>
              </div>
            </div>
            {status === 'Disconnected' && (
              <div className="viewport-placeholder">
                <div className="placeholder-content">
                  <p>FEED OFFLINE</p>
                  <button onClick={startStream} className="btn-init">INITIALIZE SYSTEM</button>
                </div>
              </div>
            )}
          </div>
        </section>

        <aside className="sidebar">
          <div className="panel stats-panel">
            <h3>SYSTEM TELEMETRY</h3>
            <div className="stat-row">
              <span className="label">Uptime</span>
              <span className="value">00:00:00</span>
            </div>
            <div className="stat-row">
              <span className="label">Bandwidth</span>
              <span className="value">~2.4 Mbps</span>
            </div>
            <div className="stat-row">
              <span className="label">Protocol</span>
              <span className="value">UDP/WebRTC</span>
            </div>
          </div>

          <div className="panel command-panel">
            <h3>MISSION CONTROL</h3>
            <div className="command-buttons">
              <button 
                className="btn btn-start" 
                onClick={startStream} 
                disabled={status !== 'Disconnected' && status !== 'Error'}
              >
                START FEED
              </button>
              <button 
                className="btn btn-stop" 
                onClick={stopStream} 
                disabled={status === 'Disconnected'}
              >
                SHUTDOWN
              </button>
            </div>
          </div>

          <div className="panel alerts-panel">
            <h3>LOGS</h3>
            <div className="log-container">
              <div className="log-entry">System ready for initialization.</div>
              {status !== 'Disconnected' && <div className="log-entry">Establishing secure link...</div>}
              {status === 'Connected' && <div className="log-entry success">Link established. Receiving data.</div>}
              {status === 'Error' && <div className="log-entry error">Link failure. Check backend.</div>}
            </div>
          </div>
        </aside>
      </main>
    </div>
  );
}

export default App;
