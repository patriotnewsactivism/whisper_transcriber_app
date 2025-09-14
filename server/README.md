
# Whisper Transcriber Server (FastAPI)

## Setup
```powershell
cd server
python -m venv venv
venv\Scripts\activate
python -m pip install --upgrade pip setuptools wheel
pip install -r requirements.txt
uvicorn app:app --host 0.0.0.0 --port 8000
```
