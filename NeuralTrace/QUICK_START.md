# Quick Start Guide: Full Verilog Dependency Graph

## Installation & Setup

### Backend Dependencies
```bash
cd NeuralTrace/backend
pip install -r requirements.txt
# Already includes: networkx, pyverilog, fastapi, uvicorn, python-dotenv
```

### Frontend Dependencies
```bash
cd NeuralTrace/frontend
npm install
# Already includes: react, reactflow, dagre, lucide-react, axios, tailwind
```

## Running the System

### 1. Start Backend Server
```bash
cd NeuralTrace/backend
python main.py
# Runs on http://localhost:8000
```

### 2. Start Frontend Development SERVER
```bash
cd NeuralTrace/frontend
npm run dev
# Runs on http://localhost:5173
```

### 3. Open in Browser
Navigate to `http://localhost:5173` to access Neural Trace

---

## Using the Full Codebase Graph

### Step 1: Generate Full Graph
1. Click the **"Full Impact Analysis"** button (top right of screen)
2. Click the **"Generate Now"** button in the modal
3. Wait for the graph to generate (1-5 seconds)
4. You now see the complete dependency map of your Verilog code

### Step 2: Explore the Graph
- **Hover over nodes** to see detailed information:
  - Node name and type (module, signal, port, parameter, etc.)
  - File and line number
  - Criticality score (0-100%)
  - Bit width and direction (for ports)

- **Use controls**:
  - Scroll to zoom in/out
  - Drag to pan around
  - Use the mini-map (bottom right) for navigation
  - Click "Fit to View" to see entire graph

### Step 3: Understand Node Colors
- **Dark Blue**: Modules
- **Brown**: Signals (wires, regs)
- **Orange**: Ports (input/output)
- **Purple**: Parameters
- **Cyan**: Functions
- **Pink**: Always blocks (sequential logic)
- **Amber**: Assign blocks (combinational logic)

### Step 4: Make Changes & Commit
1. Edit a Verilog file
2. Click **"Commit"** button
3. After commit, the graph automatically shows:
   - **Green nodes**: Newly added entities
   - **Red nodes**: Deleted entities
   - **Yellow nodes**: Modified entities
   - **Gray nodes (faded)**: Unaffected by changes
   - **Gradient colors**: Affected dependencies (darker = more critical)

### Step 5: Understand Change Impact
- **Pulse animation** on changed nodes (5 seconds) draws your attention
- **Color gradient** shows cascade of impact:
  - Bright red: Direct impact (1 hop away)
  - Darker red: Indirect impact (2-3 hops away)
- **Display shows**:
  - Risk level (High/Medium/Low)
  - Number of affected nodes
  - Impact chains

---

## API Endpoints Reference

### Generate Full Graph
```bash
GET http://localhost:8000/api/graph/full
Response:
{
  "status": "success",
  "commit_id": "abc123def456",
  "graph": {
    "nodes": [...],
    "edges": [...],
    "node_count": 256,
    "edge_count": 512
  },
  "files_analyzed": 8
}
```

### Get Snapshot
```bash
GET http://localhost:8000/api/graph/snapshot/{commit_id}
Response: { "snapshot": { "nodes": [...], "edges": [...] } }
```

### Compare Snapshots (Get Changes)
```bash
GET http://localhost:8000/api/graph/changes/{old_commit}/{new_commit}
Response:
{
  "delta": {
    "added_nodes": [...],      # Green nodes
    "deleted_nodes": [...],    # Red nodes
    "modified_nodes": [...]    # Yellow nodes
  },
  "impact_analysis": {
    "affected_nodes": [...],   # All impacted nodes with impact_level
    "risk_level": "High",      # High/Medium/Low
    "total_changes": 5,
    "total_affected": 47
  }
}
```

### List Snapshots
```bash
GET http://localhost:8000/api/graph/snapshots
Response:
{
  "total_snapshots": 5,
  "snapshots": ["commit1", "commit2", ...]
}
```

---

## Example Scenarios

### Scenario 1: Understand Current Code Structure
**Goal**: See how your entire Verilog design is organized

**Steps**:
1. Click "Full Impact Analysis"
2. Click "Generate Now"
3. Use mini-map to explore
4. Hover nodes to understand relationships
5. See how many modules, signals, functions exist
6. Identify heavily-used signals (high fan-out)

**Insights gained**:
- Code complexity at a glance
- Critical signal dependencies
- Module hierarchy
- Unused parameters/signals

---

### Scenario 2: Assess Change Impact
**Goal**: Understand what will break if you modify a signal

**Steps**:
1. Generate full graph (if not already done)
2. Find the signal you want to modify (hover to search)
3. Look at its outgoing edges (what nodes depend on it)
4. Note the colors and criticality scores
5. Make the change and commit
6. See immediate visual feedback on impact

**Insights gained**:
- Exactly which modules use this signal
- How deep the dependency chain goes
- Risk assessment automatically calculated
- Can decide if safety margin exists

---

### Scenario 3: Track Evolution Over Commits
**Goal**: See how code has evolved across commits

**Steps**:
1. Commit 1: Generate graph (baseline)
2. Commit 2: Make changes, see green/red/yellow highlighting
3. Notice what changed, what was affected
4. Understand the impact pattern
5. Use this for code review documentation

**Insights gained**:
- Git history + dependency impact
- Can explain changes to team
- Document decisions with screenshots
- Identify risky patterns in your changes

---

### Scenario 4: Compare Two Versions
**Goal**: See differences between two commits

**Steps**:
1. Generate full graph
2. Commit 1 creates snapshot
3. Change code
4. Commit 2 creates another snapshot
5. Backend automatically compares
6. Frontend shows differences

**API comparison**:
```bash
curl http://localhost:8000/api/graph/changes/commit1/commit2
```

---

## Troubleshooting

### "No Verilog files found"
- Ensure .v or .sv files exist in NeuralTrace/backend/ directory
- Files must be readable and valid Verilog

### Graph takes too long to generate
- For 5000+ node graphs, allow 5-10 seconds
- Large graphs will have dense display - use zoom and mini-map
- Consider filtering to specific modules (future feature)

### Nodes overlapping (hard to read)
- Use mini-map to navigate to less crowded areas
- Zoom in to see individual node details
- Scroll to find clearer regions

### No change highlighting visible
- Ensure you made actual changes (not identical commits)
- Check console for errors: F12 → Console tab
- Verify backend is generating snapshots: check `.neuralTrace/snapshots/` directory

### "Generate Now" button not working
- Check backend is running: http://localhost:8000/ should respond
- Check console errors (F12 → Console)
- Verify VITE_API_URL is set correctly or defaults to localhost:8000

---

## Performance Tips

### For Large Codebases (> 2000 nodes)
1. **Use zoom controls** to focus on regions
2. **Check mini-map** frequently for navigation
3. **Leverage highlighting** to see only changed nodes
4. **Wait 2-3 seconds** for graph stabilization after initial render

### For Analysis
1. **Identify high-criticality nodes** (hover to see scores)
2. **Look for fan-out patterns** (nodes with many outgoing edges)
3. **Track impact chains** (follow color gradient)
4. **Compare commit snapshots** for evolution

---

## Understanding Criticality Scores

Each node has a **criticality score** (0-100%) shown on hover:

- **90-100%** (Critical): High fan-out, many dependents
  → Changes here impact many nodes → Use caution
  
- **70-89%** (High): Used by multiple downstream nodes
  → Moderately important → Test thoroughly
  
- **50-69%** (Medium): Used by several nodes
  → Standard dependency → Normal precautions
  
- **30-49%** (Low): Used by few nodes
  → Limited scope → Safer to modify
  
- **0-29%** (Minimal): Leaf nodes or little dependency
  → Isolated entities → Safe to change

---

## Understanding Impact Levels

When changes are highlighted, affected nodes show impact levels:

- **Level 0** (Bright red): Directly depends on changed node
- **Level 1** (Dark red): Depends on something that changed
- **Level 2** (Darker red): Indirect, 2-3 dependencies away
- **Level 3+** (Darkest red): Very indirect dependency

---

## Recording Screenshots

### For Documentation
1. Generate full graph
2. Make changes and commit
3. Screenshot the highlighting view
4. Annotate with:
   - Which nodes changed (green/red/yellow)
   - Risk level
   - Affected count
   - Impact chains
5. Share with team for review

---

## Integration with Your Workflow

### Git Integration (Planned)
```bash
# In future, could show graph diffs in git hooks
git commit # Automatically generates snapshot
git log --graph # Could visualize dependency evolution
```

### CI/CD Integration (Planned)
```bash
# Could block risky commits:
if risk_level > "High":
  fail_build()
```

### Review Process (Now)
1. Review changes on screen
2. Check dependency impact
3. Decide on additional testing needed
4. Share graph visualization with team

---

## Command Reference

### Backend API
```bash
# Generate full graph
curl http://localhost:8000/api/graph/full

# Get specific snapshot
curl http://localhost:8000/api/graph/snapshot/abc123

# Compare two snapshots
curl "http://localhost:8000/api/graph/changes/abc/def"

# List all snapshots
curl http://localhost:8000/api/graph/snapshots
```

### Frontend
```bash
# Development server
npm run dev          # Runs on localhost:5173

# Production build
npm run build        # Creates dist/ folder

# Preview production build
npm run preview
```

### Backend
```bash
# Run with reload
python main.py       # Auto-reloads on file changes

# Run in Docker (future)
docker run -p 8000:8000 neural-trace

# Run tests (when added)
pytest backend/core/
```

---

## Next Steps

1. ✅ **Try the full graph**: Generate it and explore
2. ✅ **Make a change**: Commit and see highlighting
3. ✅ **Check a snapshot**: Use the API to retrieve old graphs
4. ✅ **Compare commits**: See what changed visually
5. ✅ **Share results**: Screenshot for your team
6. 📋 **Add to workflow**: Integrate into your development process

---

## Support

For issues or questions:
1. Check console: F12 → Console
2. Check backend logs: Terminal where `python main.py` runs
3. Verify both backend and frontend are running
4. Check that Verilog files exist and are readable
5. Review this guide for troubleshooting

Happy graphing! 🎉
