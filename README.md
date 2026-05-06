# Robotics Surveillance Web App

This is a real-time robotics surveillance web application using WebRTC for low-latency video streaming.

## Features
- Real-time video streaming from a robot (or webcam) to a web browser.
- Low-latency communication using WebRTC.
- Modern React frontend with Vite.
- Robust Python backend with FastAPI and aiortc.

## Project Structure
- `backend/`: FastAPI server and WebRTC signaling logic.
- `frontend/`: React application for the user interface.

## Getting Started

### Backend Setup
1. Navigate to the `backend` directory:
   ```bash
   cd backend
   ```
2. (Optional) Create a virtual environment:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Run the server:
   ```bash
   python main.py
   ```

### Frontend Setup
1. Navigate to the `frontend` directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run the development server:
   ```bash
   npm run dev
   ```

## Usage
1. Start the backend server.
2. Start the frontend development server.
3. Open the web app in your browser (usually `http://localhost:5173`).
4. Click "Start Stream" to begin the surveillance video.
