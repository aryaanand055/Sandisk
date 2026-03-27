import uuid
from datetime import datetime

class VersionControlSystem:
    def __init__(self):
        self.commits = []

    def create_commit(self, message: str, delta: dict, impact_map: dict, risk_summary: str):
        commit = {
            "id": str(uuid.uuid4()),
            "timestamp": datetime.now().isoformat(),
            "message": message,
            "delta": delta,
            "impact_map": impact_map,
            "risk_summary": risk_summary
        }
        self.commits.append(commit)
        return commit
        
    def get_history(self):
        return self.commits
