from pydantic import BaseModel

class FingerprintData(BaseModel):

    employee_id: str

    ip: str
    country: str
    city: str
    isp: str

    browser: str
    os: str
    timezone: str
    screen_resolution: str

    login_time: str