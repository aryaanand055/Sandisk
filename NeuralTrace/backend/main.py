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

@app.get("/files")
def list_all_files():
    # In a real app, we'd walk the whole project. 
    # For now, we manually provide the specific folders.
    files = []
    
    # 1. Root / Main files
    files.append({"name": "design.v", "path": "design.v", "type": "rtl"})
    
    # 2. Testbenches
    tb_dir = os.path.join(os.path.dirname(__file__), "testbenches")
    if os.path.exists(tb_dir):
        for f in os.listdir(tb_dir):
            if f.endswith(('.v', '.sv')):
                files.append({"name": f, "path": f"testbenches/{f}", "type": "testbench"})
    
    return {"files": files}

@app.get("/file/{path:path}")
def get_file_content(path: str):
    # This is a bit simplified for security, but okay for a local prototype
    base_dir = os.path.dirname(__file__)
    if path == "design.v":
        # We might have a physical design.v file or just use the initial state.
        # Let's check for it.
        file_path = os.path.join(base_dir, "design.v")
        if not os.path.exists(file_path):
            return {"content": "module empty(); endmodule"}
    else:
        file_path = os.path.join(base_dir, path)
    
    if os.path.exists(file_path):
        with open(file_path, "r") as f:
            return {"content": f.read()}
    return {"error": "File not found"}

@app.post("/analyze")
def analyze_rtl(req: AnalyzeRequest):
    old_rtl = req.old_rtl
    new_rtl = req.new_rtl

    # Get available testbenches
    tb_dir = os.path.join(os.path.dirname(__file__), "testbenches")
    testbenches = []
    if os.path.exists(tb_dir):
        testbenches = [f for f in os.listdir(tb_dir) if f.endswith(('.v', '.sv'))]

    # If they are identical, we still might want an initial analysis of the current state
    ai_result = ai_engine.generate_analysis(old_rtl, new_rtl, testbenches)
    
    return {
        "status": "success", 
        "commit_id": str(uuid.uuid4())[:8],
        "delta": ai_result.get("delta", {"modified_modules": [], "changed_signals": [], "changed_blocks": []}),
        "impact_map": ai_result.get("impact_map", {"nodes": [], "edges": []}),
        "risk": ai_result.get("risk", "Low"),
        "suggestions": ai_result.get("suggestions", []),
        "stale_testbenches": ai_result.get("stale_testbenches", [])
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
