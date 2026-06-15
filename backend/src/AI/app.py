from fastapi import FastAPI, HTTPException #app.py
from fastapi.middleware.cors import CORSMiddleware
from models import FileUploadPayload
from scorer import analyze_risk
import httpx

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

SUPABASE_URL = "https://hhxuvjiksyooedjzaabd.supabase.co"
SUPABASE_KEY = "sb_publishable_ukmy9hfPGZHjHcfhfFG7jw_zJznT2Ji"

async def get_isp(ip: str) -> str:
    """Obține ISP-ul direct din Python, nu din browser."""
    if not ip or ip in ("N/A", "127.0.0.1", "localhost"):
        return "N/A"
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"http://ip-api.com/json/{ip}",
                params={"fields": "status,org,isp"},
                timeout=5.0
            )
            if response.status_code == 200:
                data = response.json()
                if data.get("status") == "success":
                    return data.get("org") or data.get("isp") or "N/A"
    except Exception as e:
        print(f"[ISP] Eroare: {e}")
    return "N/A"

@app.get("/")
def home():
    return {"message": "AI Risk Engine Running"}

@app.post("/upload-secure-file")
async def upload_secure_file(payload: FileUploadPayload):

    # Obține ISP real din Python (nu din browser)
    real_isp = await get_isp(payload.fingerprint.ip)
    print(f"[ISP] IP: {payload.fingerprint.ip} → ISP: {real_isp}")

    # Înlocuiește ISP-ul din fingerprint cu cel real
    fingerprint_data = payload.fingerprint.dict()
    fingerprint_data["isp"] = real_isp

    # Reconstruiește fingerprint cu ISP corect
    from models import FingerprintData
    corrected_fingerprint = FingerprintData(**fingerprint_data)

    ai_result = analyze_risk(corrected_fingerprint)

    supabase_payload = {
        "sender_id":          int(payload.sender_id),
        "receiver_id":        int(payload.recipient_id),
        "file_path":          payload.file_name,
        "encrypted_file":     payload.encrypted_file,
        "encrypted_file_key": payload.encrypted_key,
        "iv":                 payload.iv,
        "ai_label":           ai_result["label"],
        "ai_risk_score":      ai_result["trust_score"]
    }

    headers = {
        "apikey":        SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type":  "application/json",
        "Prefer":        "return=minimal"
    }

    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"{SUPABASE_URL}/rest/v1/SafeSend_Files",
            json=[supabase_payload],
            headers=headers
        )

    if response.status_code not in [200, 201]:
        raise HTTPException(
            status_code=400,
            detail=f"Supabase write error: {response.text}"
        )

    return {
        "status": "Approved and saved securely",
        "labeling": str(ai_result["label"]), # Explicitly sends "Green", "Yellow", or "Red"
        "score": int(ai_result["trust_score"])
    }