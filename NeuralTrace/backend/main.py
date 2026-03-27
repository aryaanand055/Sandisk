import os
import uuid
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from core.ai import AIEngine
from pyverilog.vparser.parser import VerilogParser

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

class SyntaxCheckRequest(BaseModel):
    rtl: str

class CreateFileRequest(BaseModel):
    name: str
    type: str  # 'rtl' or 'testbench'

class ApplyFixRequest(BaseModel):
    path: str
    fixed_code: str

@app.get("/")
def read_root():
    return {"message": "Neural Trace API is running"}

@app.post("/files")
def create_file(req: CreateFileRequest):
    base_dir = os.path.dirname(__file__)
    if req.type == "testbench":
        target_dir = os.path.join(base_dir, "testbenches")
        if not os.path.exists(target_dir):
            os.makedirs(target_dir)
        file_path = os.path.join(target_dir, req.name)
    else:
        file_path = os.path.join(base_dir, req.name)
    
    if os.path.exists(file_path):
        return {"error": "File already exists"}
    
    with open(file_path, "w") as f:
        f.write("// New file " + req.name + "\n")
    
    return {"status": "success", "path": req.name if req.type != "testbench" else f"testbenches/{req.name}"}
@app.delete("/file/{path:path}")
def delete_file(path: str):
    if path == "design.v":
        return {"error": "Cannot delete the main design file"}
    
    base_dir = os.path.dirname(__file__)
    file_path = os.path.join(base_dir, path)
    
    if os.path.exists(file_path):
        try:
            os.remove(file_path)
            return {"status": "success"}
        except Exception as e:
            return {"error": str(e)}
    return {"error": "File not found"}

@app.get("/files")
def list_all_files():
    # In a real app, we'd walk the whole project. 
    # For now, we manually provide the specific folders.
    files = []
    base_dir = os.path.dirname(__file__)
    
    # 1. Root / Main files (excluding the testbenches directory and system files)
    for f in os.listdir(base_dir):
        if f.endswith(('.v', '.sv')) and os.path.isfile(os.path.join(base_dir, f)):
            files.append({"name": f, "path": f, "type": "rtl"})
    
    # Ensure clk_divider.v is there if present
    if not any(f["path"] == "clk_divider.v" for f in files) and os.path.exists(os.path.join(base_dir, "clk_divider.v")):
        files.insert(0, {"name": "clk_divider.v", "path": "clk_divider.v", "type": "rtl"})

    # 2. Testbenches
    tb_dir = os.path.join(base_dir, "testbenches")
    if os.path.exists(tb_dir):
        for f in os.listdir(tb_dir):
            if f.endswith(('.v', '.sv')):
                files.append({"name": f, "path": f"testbenches/{f}", "type": "testbench"})
    
    return {"files": files}

@app.get("/file/{path:path}")
def get_file_content(path: str):
    # This is a bit simplified for security, but okay for a local prototype
    base_dir = os.path.dirname(__file__)
    file_path = os.path.join(base_dir, path)
    
    if os.path.exists(file_path):
        with open(file_path, "r") as f:
            return {"content": f.read()}
    return {"error": "File not found"}

@app.post("/check-syntax")
def check_syntax(req: SyntaxCheckRequest):
    parser = VerilogParser()
    try:
        # Use a temporary file for parsing if needed, but pyverilog's parser can take a string
        # Actually, pyverilog's parser.parse() takes code as a string!
        parser.parse(req.rtl)
        return {"status": "success"}
    except Exception as e:
        # The error message from pyverilog usually contains line numbers like "line:4: before: endmodule"
        return {"status": "error", "message": str(e)}

@app.post("/analyze")
def analyze_rtl(req: AnalyzeRequest):
    old_rtl = req.old_rtl
    new_rtl = req.new_rtl

    # Get available testbenches and their contents for better context
    tb_dir = os.path.join(os.path.dirname(__file__), "testbenches")
    testbench_context = {}
    if os.path.exists(tb_dir):
        for f in os.listdir(tb_dir):
            if f.endswith(('.v', '.sv')):
                with open(os.path.join(tb_dir, f), 'r') as tb_f:
                    testbench_context[f] = tb_f.read()

    # If they are identical, we still might want an initial analysis of the current state
    ai_result = ai_engine.generate_analysis(old_rtl, new_rtl, testbench_context)
    
    return {
        "status": "success", 
        "commit_id": str(uuid.uuid4())[:8],
        "delta": ai_result.get("delta", {"modified_modules": [], "changed_signals": [], "changed_blocks": []}),
        "impact_map": ai_result.get("impact_map", {"nodes": [], "edges": []}),
        "risk": ai_result.get("risk", "Low"),
        "suggestions": ai_result.get("suggestions", []),
        "stale_testbenches": ai_result.get("stale_testbenches", [])
    }

@app.post("/apply-fix")
def apply_fix(req: ApplyFixRequest):
    base_dir = os.path.dirname(__file__)
    file_path = os.path.join(base_dir, req.path)
    
    if not os.path.exists(file_path):
        return {"error": "File not found"}
    
    try:
        with open(file_path, "w") as f:
            f.write(req.fixed_code)
        return {"status": "success"}
    except Exception as e:
        return {"error": str(e)}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
