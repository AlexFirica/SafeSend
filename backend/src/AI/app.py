# backend/src/AI/app.py
from fastapi import FastAPI, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware  # <--- 1. IMPORT CORS
from models import FileUploadPayload
from scorer import analyze_risk
import httpx

app = FastAPI()

# 2. CONFIGURE CORS MIDDLEWARE (Add this block right under app = FastAPI())
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows your Live Server on port 5500 to talk to port 8000
    allow_credentials=True,
    allow_methods=["*"],  # Allows POST, OPTIONS, GET, etc.
    allow_headers=["*"],  # Allows custom headers like Authorization
)

# Simulated Token Verification Helper Layer
def verify_access_token(token: str):
    if not token or token == "null":
        raise HTTPException(status_code=401, detail="Missing login authentication token.")
    if "expired" in token.lower():
        raise HTTPException(status_code=401, detail="Session Token expired. Re-authenticate.")
    if token.startswith("fake_"):
        raise HTTPException(status_code=403, detail="Malicious or corrupted signature footprint.")
    return True

@app.post("/upload-secure-file")
async def upload_secure_file(payload: FileUploadPayload, authorization: str = Header(None)):
    # 1. Access Token Guard Step: If expired or fake, stop transmission immediately
    verify_access_token(authorization)
    
    # 2. Risk Scoring Process
    ai_result = analyze_risk(payload.fingerprint)
    
    # 3. Payload Assembly for Database Write
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
    
    # Push to Supabase File Ledger Registry table
    headers = {
        "apikey": "sb_publishable_ukmy9hfPGZHjHcfhfFG7jw_zJznT2Ji",
        "Authorization": "Bearer sb_publishable_ukmy9hfPGZHjHcfhfFG7jw_zJznT2Ji",
        "Content-Type": "application/json",
        "Prefer": "return=minimal"
    }
    
    async with httpx.AsyncClient() as client:
        response = await client.post(
            "https://hhxuvjiksyooedjzaabd.supabase.co/rest/v1/SafeSend_Files",
            json=[supabase_payload],
            headers=headers
        )
        
    if response.status_code not in [200, 201]:
        raise HTTPException(status_code=400, detail="Supabase structural writing mismatch error.")

    return {
        "status": "Approved and saved securely",
        "labeling": ai_result["label"],
        "score": ai_result["trust_score"]
    }