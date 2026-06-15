# models.py
from pydantic import BaseModel

class FingerprintData(BaseModel):
    employee_id: str
    ip: str
    city: str
    isp: str
    browser: str
    os: str
    timezone: str
    screen_resolution: str
    login_time: str            # format: "YYYY-MM-DD HH:MM"

class FileUploadPayload(BaseModel):
    sender_id: str
    recipient_id: str
    file_name: str
    encrypted_file: str
    encrypted_key: str
    iv: str
    fingerprint: FingerprintData