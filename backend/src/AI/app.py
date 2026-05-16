# app.py
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware  # <--- Import CORS
from models import FileUploadPayload
from scorer import analyze_risk
import httpx

app = FastAPI()

# Configure CORS so your browser frontend can talk to your backend port
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all layout origins during development
    allow_credentials=True,
    allow_methods=["*"],  # Allows POST, GET, OPTIONS, etc.
    allow_headers=["*"],
)

SUPABASE_URL = "https://hhxuvjiksyooedjzaabd.supabase.co"
SUPABASE_KEY = "sb_publishable_ukmy9hfPGZHjHcfhfFG7jw_zJznT2Ji" 

@app.get("/")
def home():
    return {"message": "AI Risk Engine Running"}

@app.post("/upload-secure-file")
async def upload_secure_file(payload: FileUploadPayload):
    # 1. Evaluate file transactional fingerprints using behavioral AI Rules
    ai_result = analyze_risk(payload.fingerprint)
    
    # 2. Build insertion package for 'SafeSend_Files' 
    supabase_payload = {
        "sender_id": int(payload.sender_id),
        "receiver_id": int(payload.recipient_id),
        "file_path": payload.file_name,
        "encrypted_file": payload.encrypted_file,
        "encrypted_file_key": payload.encrypted_key,
        "iv": payload.iv,
        "ai_label": ai_result["label"],
        "ai_risk_score": ai_result["trust_score"]
    }
    
    # 3. Insert record directly inside database using an async HTTP client
    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=minimal"
    }
    
    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"{SUPABASE_URL}/rest/v1/SafeSend_Files", 
            json=[supabase_payload], 
            headers=headers
        )
    
    if response.status_code not in [200, 201]:
        raise HTTPException(status_code=400, detail=f"Supabase write error: {response.text}")
        
    return {
        "status": "success",
        "ai_assessment": ai_result
    }