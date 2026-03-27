import React, { useCallback, useEffect } from 'react';
import ReactFlow, {
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  MarkerType
} from 'reactflow';
import 'reactflow/dist/style.css';
import dagre from 'dagre';

const getLayoutedElements = (nodes: any[], edges: any[], direction = 'TB') => {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));
  
  const isHorizontal = direction === 'LR';
  dagreGraph.setGraph({ rankdir: direction });

  nodes.forEach((node) => {
    // Standard node dimensions
    dagreGraph.setNode(String(node.id), { width: 180, height: 50 });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(String(edge.source), String(edge.target));
  });

  dagre.layout(dagreGraph);

  const layoutedNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(String(node.id));
    return {
      ...node,
      id: String(node.id),
      targetPosition: isHorizontal ? 'left' : 'top',
      sourcePosition: isHorizontal ? 'right' : 'bottom',
      position: {
        x: nodeWithPosition.x - 90,
        y: nodeWithPosition.y - 25,
      },
    };
  });

  const layoutedEdges = edges.map(edge => ({
    ...edge,
    id: edge.id || `e${edge.source}-${edge.target}`,
    source: String(edge.source),
    target: String(edge.target)
  }));

  return { nodes: layoutedNodes, edges: layoutedEdges };
};

const baseNodes: any[] = [];
const baseEdges: any[] = [];

interface ImpactGraphProps {
  externalNodes?: any[];
  externalEdges?: any[];
}

const ImpactGraph: React.FC<ImpactGraphProps> = ({ externalNodes, externalEdges }) => {
  const [nodes, setNodes, onNodesChange] = useNodesState(baseNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(baseEdges);

  useEffect(() => {
    if (externalNodes && externalEdges) {
      const initialNodes = externalNodes.map((n: any) => ({
         id: String(n.id),
         position: { x: 0, y: 0 },
         data: { label: n.label },
         style: { 
           background: n.type === 'module' ? '#254e70' : 
                      (n.type === 'signal' ? '#5a3d2b' : 
                      (n.type === 'verification' ? '#2d4d2d' : '#4a2333')), 
           color: '#fff', 
           border: '1px solid #555',
           borderRadius: n.type === 'module' ? '8px' : '4px',
           padding: '10px',
           fontSize: '12px',
           fontWeight: 'bold',
           boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.5)'
         }
      }));

      const initialEdges = externalEdges.map((e: any) => ({
         id: `e${e.source}-${e.target}`,
         source: String(e.source),
         target: String(e.target),
         type: 'smoothstep',
         animated: true,
         style: { stroke: '#4caf50', strokeWidth: 2 },
         markerEnd: { type: MarkerType.ArrowClosed, color: '#4caf50' }
      }));

      const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
        initialNodes,
        initialEdges,
        'TB'
      );

      setNodes(layoutedNodes);
      setEdges(layoutedEdges);
    }
  }, [externalNodes, externalEdges, setNodes, setEdges]);

  const onConnect = useCallback((params: any) => setEdges((eds) => addEdge(params, eds)), [setEdges]);

  return (
    <div className="w-full h-full min-h-[400px]">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        fitView
      >
        <Controls />
        <MiniMap nodeStrokeColor="#fff" nodeColor="#2d2d2d" maskColor="rgba(0,0,0,0.8)" />
        <Background color="#333" gap={16} />
      </ReactFlow>
    </div>
  );
};

export default ImpactGraph;
