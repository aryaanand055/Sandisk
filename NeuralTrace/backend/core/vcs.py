import uuid
import json
import os
from datetime import datetime
from pathlib import Path
from typing import Dict, Optional

class GraphSnapshot:
    """Represents a snapshot of the dependency graph at a specific commit."""
    def __init__(self, commit_id: str, graph_data: Dict, delta: Dict, impact_analysis: Dict):
        self.commit_id = commit_id
        self.graph_data = graph_data
        self.delta = delta
        self.impact_analysis = impact_analysis
        self.timestamp = datetime.now().isoformat()
class VersionControlSystem:
    def __init__(self, snapshot_dir: str = ".neuralTrace/snapshots"):
        self.commits = []
        self.snapshot_dir = snapshot_dir
        self._init_snapshot_storage()
    
    def _init_snapshot_storage(self):
        """Initialize snapshot storage directory."""
        os.makedirs(self.snapshot_dir, exist_ok=True)

    def create_commit(self, 
                     message: str, 
                     delta: dict, 
                     impact_map: dict, 
                     risk_summary: str,
                     graph_snapshot: Optional[Dict] = None):
        """Create a commit with optional graph snapshot persistence."""
        commit = {
            "id": str(uuid.uuid4()),
            "timestamp": datetime.now().isoformat(),
            "message": message,
            "delta": delta,
            "impact_map": impact_map,
            "risk_summary": risk_summary
        }
        self.commits.append(commit)
        
        # Persist graph snapshot if provided
        if graph_snapshot:
            self.save_graph_snapshot(commit["id"], graph_snapshot, delta, impact_map)
        
        return commit
        
    def get_history(self):
        return self.commits
    
    def save_graph_snapshot(self, 
                           commit_id: str, 
                           graph_data: Dict,
                           delta: Dict,
                           impact_analysis: Dict) -> str:
        """
        Save complete graph snapshot for a commit.
        
        Args:
            commit_id: unique commit identifier
            graph_data: graph snapshot {nodes, edges, ...}
            delta: changes in this commit
            impact_analysis: impact analysis results
        
        Returns:
            path to saved snapshot
        """
        commit_dir = os.path.join(self.snapshot_dir, commit_id)
        os.makedirs(commit_dir, exist_ok=True)
        
        # Save main graph snapshot
        graph_path = os.path.join(commit_dir, "graph.json")
        with open(graph_path, 'w') as f:
            json.dump({
                'commit_id': commit_id,
                'timestamp': datetime.now().isoformat(),
                'graph': graph_data,
                'delta': delta,
                'impact_analysis': impact_analysis
            }, f, indent=2, default=str)
        
        # Create index for easy lookup
        self._update_snapshot_index(commit_id)
        
        return graph_path
    
    def get_graph_snapshot(self, commit_id: str) -> Optional[Dict]:
        """
        Retrieve graph snapshot for a specific commit.
        
        Args:
            commit_id: commit identifier
        
        Returns:
            graph snapshot dict or None if not found
        """
        graph_path = os.path.join(self.snapshot_dir, commit_id, "graph.json")
        if os.path.exists(graph_path):
            try:
                with open(graph_path, 'r') as f:
                    return json.load(f)
            except Exception as e:
                print(f"Error loading snapshot for {commit_id}: {str(e)}")
        return None
    
    def get_all_snapshots(self) -> Dict[str, Dict]:
        """Get all available graph snapshots."""
        snapshots = {}
        if os.path.exists(self.snapshot_dir):
            for commit_id in os.listdir(self.snapshot_dir):
                snapshot = self.get_graph_snapshot(commit_id)
                if snapshot:
                    snapshots[commit_id] = snapshot
        return snapshots
    
    def compare_snapshots(self, commit_id_old: str, commit_id_new: str) -> Dict:
        """
        Compare two graph snapshots.
        
        Returns:
            {old_snapshot, new_snapshot, changes_since}
        """
        old = self.get_graph_snapshot(commit_id_old)
        new = self.get_graph_snapshot(commit_id_new)
        
        return {
            'old_snapshot': old,
            'new_snapshot': new,
            'old_commit': commit_id_old,
            'new_commit': commit_id_new
        }
    
    def _update_snapshot_index(self, commit_id: str):
        """Update index file for snapshot tracking."""
        index_path = os.path.join(self.snapshot_dir, "index.json")
        
        index = {}
        if os.path.exists(index_path):
            try:
                with open(index_path, 'r') as f:
                    index = json.load(f)
            except:
                index = {}
        
        index[commit_id] = {
            'timestamp': datetime.now().isoformat(),
            'path': f"{commit_id}/graph.json"
        }
        
        with open(index_path, 'w') as f:
            json.dump(index, f, indent=2, default=str)
