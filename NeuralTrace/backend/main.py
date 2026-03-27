import os
import uuid
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from core.ai import AIEngine

app = FastAPI(title="Neural Trace API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

ai_engine = AIEngine()

class AnalyzeRequest(BaseModel):
    old_rtl: str
    new_rtl: str

@app.get("/")
def read_root():
    return {"message": "Neural Trace API is running"}

@app.post("/analyze")
def analyze_rtl(req: AnalyzeRequest):
    old_rtl = req.old_rtl
    new_rtl = req.new_rtl

    if old_rtl.strip() == new_rtl.strip():
        return {
            "status": "success", 
            "commit_id": str(uuid.uuid4())[:8],
            "delta": {"modified_modules": [], "changed_signals": [], "changed_blocks": []},
            "impact_map": {"nodes": [], "edges": []},
            "risk": "Clean",
            "suggestions": ["No Uncommitted Changes. Working copy matches baseline."]
        }
    
    # Get actual AI analysis derived precisely from the code using Gemini
    ai_result = ai_engine.generate_analysis(old_rtl, new_rtl)
    
    return {
        "status": "success", 
        "commit_id": str(uuid.uuid4())[:8],
        "delta": ai_result.get("delta", {"modified_modules": [], "changed_signals": [], "changed_blocks": []}),
        "impact_map": ai_result.get("impact_map", {"nodes": [], "edges": []}),
        "risk": ai_result.get("risk", "Low"),
        "suggestions": ai_result.get("suggestions", [])
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
