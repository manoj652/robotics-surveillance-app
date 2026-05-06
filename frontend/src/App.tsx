import { useEffect, useRef, useState } from 'react';
import './App.css';

function App() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [status, setStatus] = useState('Disconnected');
  const pcRef = useRef<RTCPeerConnection | null>(null);

  const startStream = async () => {
    setStatus('Connecting...');
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    });
    pcRef.current = pc;

    pc.ontrack = (event) => {
      if (videoRef.current) {
        videoRef.current.srcObject = event.streams[0];
      }
    };

    pc.oniceconnectionstatechange = () => {
      setStatus(pc.iceConnectionState);
    };

    // Add transceivers for video
    pc.addTransceiver('video', { direction: 'recvonly' });

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    try {
      const response = await fetch('http://localhost:8000/offer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sdp: pc.localDescription?.sdp,
          type: pc.localDescription?.type,
        }),
      });

      const answer = await response.json();
      await pc.setRemoteDescription(new RTCSessionDescription(answer));
    } catch (error) {
      console.error('Failed to connect to signaling server:', error);
      setStatus('Failed to connect');
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
    setStatus('Disconnected');
  };

  useEffect(() => {
    return () => {
      stopStream();
    };
  }, []);

  return (
    <div className="container">
      <h1>Robotics Surveillance</h1>
      <div className="status-bar">
        Status: <span className={`status ${status.toLowerCase()}`}>{status}</span>
      </div>
      <div className="video-container">
        <video ref={videoRef} autoPlay playsInline muted />
      </div>
      <div className="controls">
        <button onClick={startStream} disabled={status === 'Connecting' || status === 'connected'}>
          Start Stream
        </button>
        <button onClick={stopStream} disabled={status === 'Disconnected'}>
          Stop Stream
        </button>
      </div>
    </div>
  );
}

export default App;
