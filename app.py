from fastapi import FastAPI

from models import FingerprintData
from scorer import analyze_risk

app = FastAPI()


@app.get("/")
def home():

    return {
        "message": "AI Risk Engine Running"
    }


@app.post("/analyze")
def analyze(data: FingerprintData):

    result = analyze_risk(data)

    return result