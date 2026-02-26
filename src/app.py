from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List
import csv
import io
from src.inference import BotDetector

app = FastAPI()

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

detector = BotDetector()

class PredictRequest(BaseModel):
    username: str

class BatchPredictRequest(BaseModel):
    usernames: List[str]

@app.post("/predict")
def predict(req: PredictRequest):
    prediction, confidence, (human_prob, bot_prob), top_features = detector.predict(req.username)
    return {
        "username": req.username,
        "prediction": "BOT" if prediction == 1 else "HUMAN",
        "confidence": confidence,
        "bot_probability": bot_prob,
        "human_probability": human_prob,
        "top_features": top_features
    }

@app.post("/predict/batch")
def predict_batch(req: BatchPredictRequest):
    results = []
    for username in req.usernames:
        username = username.strip()
        if not username:
            continue
        try:
            prediction, confidence, (human_prob, bot_prob), top_features = detector.predict(username)
            results.append({
                "username": username,
                "prediction": "BOT" if prediction == 1 else "HUMAN",
                "confidence": confidence,
                "bot_probability": bot_prob,
                "human_probability": human_prob,
                "top_features": top_features,
                "error": None
            })
        except Exception as e:
            results.append({
                "username": username,
                "prediction": None,
                "confidence": None,
                "bot_probability": None,
                "human_probability": None,
                "top_features": None,
                "error": str(e)
            })
    return {"results": results}

@app.post("/predict/csv")
async def predict_csv(file: UploadFile = File(...)):
    contents = await file.read()
    text = contents.decode("utf-8")
    reader = csv.reader(io.StringIO(text))
    usernames = []
    for row in reader:
        for cell in row:
            cell = cell.strip().lstrip("@")
            if cell and cell.lower() not in ("username", "user", "screen_name", "handle"):
                usernames.append(cell)
    results = []
    for username in usernames:
        if not username:
            continue
        try:
            prediction, confidence, (human_prob, bot_prob), top_features = detector.predict(username)
            results.append({
                "username": username,
                "prediction": "BOT" if prediction == 1 else "HUMAN",
                "confidence": confidence,
                "bot_probability": bot_prob,
                "human_probability": human_prob,
                "top_features": top_features,
                "error": None
            })
        except Exception as e:
            results.append({
                "username": username,
                "prediction": None,
                "confidence": None,
                "bot_probability": None,
                "human_probability": None,
                "top_features": None,
                "error": str(e)
            })
    return {"results": results}
