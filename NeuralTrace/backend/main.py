import os
import uuid
import json
import sys
import subprocess
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
from core.ai import AIEngine
from core.graph import DependencyGraph
from core.delta import DeltaEngine
from core.vcs import VersionControlSystem
from pyverilog.vparser.parser import VerilogParser

load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))
PYTHON_EXECUTABLE = os.getenv("PYTHON_EXECUTABLE", sys.executable)
ZYBO_SCRIPT_DIR = os.getenv("ZYBO_SCRIPT_DIR", os.path.join(os.path.expanduser("~"), "Desktop"))

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


dependency_graph = DependencyGraph()
delta_engine = DeltaEngine()
vcs = VersionControlSystem()

class SyntaxCheckRequest(BaseModel):
    rtl: str

class CreateFileRequest(BaseModel):
    name: str
    type: str  # 'rtl' or 'testbench'

class ApplyFixRequest(BaseModel):
    path: str
    fixed_code: str

class ZyboRequest(BaseModel):
    affected_modules: list
    testbenches: dict = {}


def _analyze_payload_path() -> str:
    return os.path.join(os.path.dirname(__file__), "analyze_request.json")


def _save_analyze_payload(old_rtl: str, new_rtl: str) -> str:
    payload_path = _analyze_payload_path()
    payload = {
        "old_rtl": old_rtl,
        "new_rtl": new_rtl
    }
    with open(payload_path, "w") as f:
        json.dump(payload, f, indent=2)
    return payload_path


def _load_analyze_payload() -> tuple[str, str]:
    payload_path = _analyze_payload_path()
    with open(payload_path, "r") as f:
        payload = json.load(f)
    return payload.get("old_rtl", ""), payload.get("new_rtl", "")

@app.get("/api/graph/full")
def generate_full_graph():
    """
    Generate comprehensive dependency graph from entire Verilog codebase.
    Discovers all .v and .sv files and builds a complete dependency map.
    """
    try:
        base_dir = os.path.dirname(__file__)
        verilog_files = {}
        
        # Discover all Verilog files
        for root, dirs, files in os.walk(base_dir):
            # Skip testbenches unless needed
            for file in files:
                if file.endswith(('.v', '.sv')):
                    filepath = os.path.join(root, file)
                    relative_path = os.path.relpath(filepath, base_dir).replace('\\', '/')
                    try:
                        with open(filepath, 'r') as f:
                            verilog_files[relative_path] = f.read()
                    except Exception as e:
                        print(f"Error reading {filepath}: {str(e)}")
        
        if not verilog_files:
            return {
                "status": "empty",
                "message": "No Verilog files found",
                "graph": {"nodes": [], "edges": [], "node_count": 0, "edge_count": 0}
            }
        
        # Build comprehensive graph
        graph, metadata = dependency_graph.build_full_codebase_graph(verilog_files)
        
        # Get graph snapshot
        graph_snapshot = dependency_graph.get_graph_snapshot()
        
        # Create and save commit for this graph generation
        commit_id = str(uuid.uuid4())[:12]
        vcs.save_graph_snapshot(
            commit_id,
            graph_snapshot,
            {"nodes": verilog_files.keys()},
            {}
        )
        
        return {
            "status": "success",
            "commit_id": commit_id,
            "graph": graph_snapshot,
            "metadata": metadata,
            "files_analyzed": len(verilog_files),
            "files": list(verilog_files.keys())
        }
    except Exception as e:
        return {
            "status": "error",
            "message": str(e),
            "graph": {"nodes": [], "edges": []}
        }

@app.get("/api/graph/snapshot/{commit_hash}")
def get_snapshot(commit_hash: str):
    """
    Retrieve a previously saved graph snapshot by commit hash.
    """
    try:
        snapshot = vcs.get_graph_snapshot(commit_hash)
        if snapshot:
            return {
                "status": "success",
                "commit_hash": commit_hash,
                "snapshot": snapshot
            }
        else:
            raise HTTPException(status_code=404, detail=f"Snapshot not found for commit {commit_hash}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/graph/changes/{old_commit}/{new_commit}")
def get_changes(old_commit: str, new_commit: str):
    """
    Compare two graph snapshots and return the changes and affected dependencies.
    Highlights what changed between the two versions.
    """
    try:
        old_snapshot = vcs.get_graph_snapshot(old_commit)
        new_snapshot = vcs.get_graph_snapshot(new_commit)
        
        if not old_snapshot:
            raise HTTPException(status_code=404, detail=f"Old snapshot not found for commit {old_commit}")
        if not new_snapshot:
            raise HTTPException(status_code=404, detail=f"New snapshot not found for commit {new_commit}")
        
        # Compute delta
        delta = delta_engine.compute_delta(
            old_snapshot['graph'],
            new_snapshot['graph']
        )
        
        # Analyze cascade impact
        impact_analysis = delta_engine.cascade_impact_analysis(
            delta,
            new_snapshot['graph']
        )
        
        return {
            "status": "success",
            "old_commit": old_commit,
            "new_commit": new_commit,
            "delta": delta,
            "impact_analysis": impact_analysis
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/graph/snapshots")
def list_all_snapshots():
    """List all available graph snapshots."""
    try:
        snapshots = vcs.get_all_snapshots()
        return {
            "status": "success",
            "total_snapshots": len(snapshots),
            "snapshots": list(snapshots.keys())
        }
    except Exception as e:
        return {
            "status": "error",
            "message": str(e),
            "snapshots": []
        }

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
    # Persist the analysis request so backend processing is file-driven.
    payload_path = _save_analyze_payload(req.old_rtl, req.new_rtl)
    old_rtl, new_rtl = _load_analyze_payload()

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
        "request_file": os.path.basename(payload_path),
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

@app.post("/connect-zybo")
def connect_zybo(req: ZyboRequest):
    """
    Aggregates project files and analysis into a single JSON file
    and executes the connection script on the Desktop.
    """
    base_dir = os.path.dirname(__file__)
    
    # 1. Gather all files (RTL and Testbenches)
    all_files = {}
    
    # Root RTL files
    for f in os.listdir(base_dir):
        if f.endswith(('.v', '.sv')) and os.path.isfile(os.path.join(base_dir, f)):
            with open(os.path.join(base_dir, f), 'r') as file_ref:
                all_files[f] = file_ref.read()
    
    # Testbench files
    tb_dir = os.path.join(base_dir, "testbenches")
    if os.path.exists(tb_dir):
        for f in os.listdir(tb_dir):
            if f.endswith(('.v', '.sv')):
                with open(os.path.join(tb_dir, f), 'r') as file_ref:
                    all_files[f] = file_ref.read()

    # 2. Construct the single JSON object
    payload = {
        "affected_modules": req.affected_modules,
        "files": all_files,
        "testbenches": req.testbenches
    }

    # 3. Path detection for script and task file
    desktop_path = ZYBO_SCRIPT_DIR
    script_name = "zybo_connect.py" 
    script_path = os.path.join(desktop_path, script_name)
    json_task_path = os.path.join(desktop_path, "zybo_task.json")

    if not os.path.exists(script_path):
        return {
            "error": f"Connection script '{script_name}' not found on Desktop. Please ensure it exists at: {script_path}",
            "status": "error"
        }

    # 4. Save the JSON payload to the Desktop (or a temp dir, but user asked for one JSON file to be sent)
    import json
    with open(json_task_path, "w") as f:
        json.dump(payload, f, indent=2)

    try:
        # Execute the desktop script, passing the path to the JSON file
        result = subprocess.run([PYTHON_EXECUTABLE, script_path, json_task_path], capture_output=True, text=True, timeout=30)
        return {
            "status": "success",
            "output": result.stdout,
            "stderr": result.stderr,
            "exit_code": result.returncode
        }
    except subprocess.TimeoutExpired:
        return {"status": "error", "error": "Execution timed out (30s)."}
    except Exception as e:
        return {"status": "error", "error": str(e)}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
