import networkx as nx
from typing import Dict, List, Set, Tuple
from collections import defaultdict


class DeltaEngine:
    def __init__(self):
        self.old_graph = None
        self.new_graph = None
        self.delta = {
            "added_nodes": [],
            "deleted_nodes": [],
            "modified_nodes": [],
            "added_edges": [],
            "deleted_edges": [],
            "modified_edges": []
        }
    
    def compute_delta(self, old_graph_snapshot: Dict, new_graph_snapshot: Dict) -> Dict:
        """
        Compare two graph snapshots to identify changes.
        
        Args:
            old_graph_snapshot: {nodes: [...], edges: [...]}
            new_graph_snapshot: {nodes: [...], edges: [...]}
        
        Returns:
            delta dict with added/deleted/modified nodes and edges
        """
        self.delta = {
            "added_nodes": [],
            "deleted_nodes": [],
            "modified_nodes": [],
            "added_edges": [],
            "deleted_edges": [],
            "modified_edges": []
        }
        
        # Extract node and edge sets
        old_nodes = {node['id']: node for node in old_graph_snapshot.get('nodes', [])}
        new_nodes = {node['id']: node for node in new_graph_snapshot.get('nodes', [])}
        
        old_edges = {(edge['source'], edge['target']): edge for edge in old_graph_snapshot.get('edges', [])}
        new_edges = {(edge['source'], edge['target']): edge for edge in new_graph_snapshot.get('edges', [])}
        
        # Compare nodes
        self._compare_nodes(old_nodes, new_nodes)
        
        # Compare edges
        self._compare_edges(old_edges, new_edges)
        
        return self.delta
    
    def _compare_nodes(self, old_nodes: Dict, new_nodes: Dict):
        """Compare node sets to identify additions, deletions, and modifications."""
        old_ids = set(old_nodes.keys())
        new_ids = set(new_nodes.keys())
        
        # Added nodes
        for node_id in new_ids - old_ids:
            node = new_nodes[node_id]
            self.delta['added_nodes'].append({
                'id': node_id,
                'type': node['metadata'].get('type', 'unknown'),
                'name': node['metadata'].get('name', ''),
                'metadata': node['metadata'],
                'change_type': 'added',
                'visual_color': 'green'
            })
        
        # Deleted nodes
        for node_id in old_ids - new_ids:
            node = old_nodes[node_id]
            self.delta['deleted_nodes'].append({
                'id': node_id,
                'type': node['metadata'].get('type', 'unknown'),
                'name': node['metadata'].get('name', ''),
                'metadata': node['metadata'],
                'change_type': 'deleted',
                'visual_color': 'red'
            })
        
        # Modified nodes (same ID, but different attributes)
        for node_id in old_ids & new_ids:
            old_meta = old_nodes[node_id]['metadata']
            new_meta = new_nodes[node_id]['metadata']
            
            if old_meta != new_meta:
                self.delta['modified_nodes'].append({
                    'id': node_id,
                    'type': new_meta.get('type', 'unknown'),
                    'name': new_meta.get('name', ''),
                    'old_metadata': old_meta,
                    'new_metadata': new_meta,
                    'change_type': 'modified',
                    'visual_color': 'yellow'
                })
    
    def _compare_edges(self, old_edges: Dict, new_edges: Dict):
        """Compare edge sets to identify additions, deletions, and modifications."""
        old_edge_keys = set(old_edges.keys())
        new_edge_keys = set(new_edges.keys())
        
        # Added edges
        for edge_key in new_edge_keys - old_edge_keys:
            edge = new_edges[edge_key]
            self.delta['added_edges'].append({
                'source': edge['source'],
                'target': edge['target'],
                'edge_type': edge['data'].get('edge_type', 'unknown'),
                'change_type': 'added'
            })
        
        # Deleted edges
        for edge_key in old_edge_keys - new_edge_keys:
            edge = old_edges[edge_key]
            self.delta['deleted_edges'].append({
                'source': edge['source'],
                'target': edge['target'],
                'edge_type': edge['data'].get('edge_type', 'unknown'),
                'change_type': 'deleted'
            })
        
        # Modified edges
        for edge_key in old_edge_keys & new_edge_keys:
            if old_edges[edge_key]['data'] != new_edges[edge_key]['data']:
                self.delta['modified_edges'].append({
                    'source': edge_key[0],
                    'target': edge_key[1],
                    'old_data': old_edges[edge_key]['data'],
                    'new_data': new_edges[edge_key]['data'],
                    'change_type': 'modified'
                })
    
    def cascade_impact_analysis(self, 
                               delta: Dict, 
                               new_graph_snapshot: Dict) -> Dict:
        """
        Analyze downstream impact of all changes.
        Returns all nodes affected by the changes (direct and indirect).
        
        Args:
            delta: change delta dict
            new_graph_snapshot: current full graph
        
        Returns:
            {
                'affected_nodes': [node_id with impact_level],
                'impact_chains': [from_node -> cascade of affected],
                'risk_level': 'High'/'Medium'/'Low'
            }
        """
        # Build networkx graph from snapshot for ancestor/descendant analysis
        temp_graph = nx.DiGraph()
        
        # Add all nodes
        for node in new_graph_snapshot.get('nodes', []):
            temp_graph.add_node(node['id'], **node['metadata'])
        
        # Add all edges
        for edge in new_graph_snapshot.get('edges', []):
            temp_graph.add_edge(edge['source'], edge['target'], **edge['data'])
        
        # Collect all changed node IDs
        changed_node_ids = set()
        for node in delta.get('added_nodes', []):
            changed_node_ids.add(node['id'])
        for node in delta.get('deleted_nodes', []):
            changed_node_ids.add(node['id'])
        for node in delta.get('modified_nodes', []):
            changed_node_ids.add(node['id'])
        
        # For each changed node, find all descendants (nodes it affects)
        affected_nodes = {}
        impact_chains = {}
        
        for changed_node_id in changed_node_ids:
            if temp_graph.has_node(changed_node_id):
                try:
                    descendants = nx.descendants(temp_graph, changed_node_id)
                    
                    impact_chains[changed_node_id] = []
                    
                    for i, descendant in enumerate(descendants):
                        impact_level = min(i, 3)  # Cap at 3 hops for visualization
                        
                        if descendant not in affected_nodes:
                            affected_nodes[descendant] = {
                                'id': descendant,
                                'impact_level': impact_level,
                                'triggered_by': [changed_node_id],
                                'visual_color': self._color_by_impact_level(impact_level)
                            }
                        else:
                            affected_nodes[descendant]['triggered_by'].append(changed_node_id)
                            affected_nodes[descendant]['impact_level'] = min(
                                affected_nodes[descendant]['impact_level'], 
                                impact_level
                            )
                        
                        impact_chains[changed_node_id].append({
                            'node': descendant,
                            'distance': i + 1,
                            'impact_level': impact_level
                        })
                except nx.NetworkXError:
                    pass
        
        # Determine overall risk level
        risk_level = self._assess_risk_level(
            changed_node_ids, 
            affected_nodes, 
            delta, 
            new_graph_snapshot
        )
        
        return {
            'affected_nodes': list(affected_nodes.values()),
            'impact_chains': impact_chains,
            'risk_level': risk_level,
            'total_changes': len(changed_node_ids),
            'total_affected': len(affected_nodes)
        }
    
    def _color_by_impact_level(self, impact_level: int) -> str:
        """Map impact level to gradient color."""
        colors = ['#ff6b6b', '#ff8c8c', '#ffadad', '#ffc9c9']  # Red gradient
        return colors[min(impact_level, len(colors) - 1)]
    
    def _assess_risk_level(self, 
                          changed_node_ids: Set[str],
                          affected_nodes: Dict,
                          delta: Dict,
                          graph_snapshot: Dict) -> str:
        """Assess overall risk level based on change scope."""
        
        # Extract criticality from metadata
        node_metadata = {node['id']: node['metadata'] for node in graph_snapshot.get('nodes', [])}
        
        total_criticality = 0
        for node_id in changed_node_ids:
            criticality = node_metadata.get(node_id, {}).get('criticality', 0.5)
            total_criticality += criticality
        
        avg_criticality = total_criticality / len(changed_node_ids) if changed_node_ids else 0
        affected_ratio = len(affected_nodes) / max(len(graph_snapshot.get('nodes', [])), 1)
        
        # Heuristic risk assessment
        if avg_criticality > 0.7 or affected_ratio > 0.5:
            return 'High'
        elif avg_criticality > 0.4 or affected_ratio > 0.2:
            return 'Medium'
        else:
            return 'Low'
