import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export interface GraphNode {
  id: string;
  metadata: Record<string, any>;
}

export interface GraphEdge {
  source: string;
  target: string;
  data: Record<string, any>;
}

export interface GraphSnapshot {
  nodes: GraphNode[];
  edges: GraphEdge[];
  node_count: number;
  edge_count: number;
}

export interface Delta {
  added_nodes: any[];
  deleted_nodes: any[];
  modified_nodes: any[];
  added_edges: any[];
  deleted_edges: any[];
  modified_edges: any[];
}

export interface ImpactAnalysis {
  affected_nodes: Array<{
    id: string;
    impact_level: number;
    triggered_by: string[];
    visual_color: string;
  }>;
  impact_chains: Record<string, any>;
  risk_level: string;
  total_changes: number;
  total_affected: number;
}

class GraphAPIService {
  /**
   * Generate full dependency graph for entire Verilog codebase
   */
  async generateFullGraph(): Promise<{
    status: string;
    commit_id: string;
    graph: GraphSnapshot;
    metadata: Record<string, any>;
    files_analyzed: number;
    files: string[];
  }> {
    try {
      const response = await axios.get(`${API_URL}/api/graph/full`);
      return response.data;
    } catch (error) {
      console.error('Error generating full graph:', error);
      throw error;
    }
  }

  /**
   * Get a previously saved graph snapshot
   */
  async getSnapshot(commitHash: string): Promise<any> {
    try {
      const response = await axios.get(`${API_URL}/api/graph/snapshot/${commitHash}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching snapshot:', error);
      throw error;
    }
  }

  /**
   * Get changes between two commits/snapshots
   */
  async getChanges(
    oldCommit: string,
    newCommit: string
  ): Promise<{
    status: string;
    old_commit: string;
    new_commit: string;
    delta: Delta;
    impact_analysis: ImpactAnalysis;
  }> {
    try {
      const response = await axios.get(`${API_URL}/api/graph/changes/${oldCommit}/${newCommit}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching changes:', error);
      throw error;
    }
  }

  /**
   * List all available snapshots
   */
  async listSnapshots(): Promise<{
    status: string;
    total_snapshots: number;
    snapshots: string[];
  }> {
    try {
      const response = await axios.get(`${API_URL}/api/graph/snapshots`);
      return response.data;
    } catch (error) {
      console.error('Error listing snapshots:', error);
      throw error;
    }
  }

  /**
   * Format change highlighting data for visualization
   */
  formatChangeHighlighting(delta: Delta, impactAnalysis: ImpactAnalysis) {
    return {
      added: delta.added_nodes.map((n: any) => n.id),
      deleted: delta.deleted_nodes.map((n: any) => n.id),
      modified: delta.modified_nodes.map((n: any) => n.id),
      affected: impactAnalysis.affected_nodes
    };
  }
}

export const graphAPIService = new GraphAPIService();
