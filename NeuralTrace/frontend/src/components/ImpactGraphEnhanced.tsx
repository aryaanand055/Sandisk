import React, { useCallback, useEffect, useState } from 'react';
import ReactFlow, {
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  MarkerType,
  Handle,
  Position
} from 'reactflow';
import 'reactflow/dist/style.css';
import dagre from 'dagre';
import './ImpactGraphEnhanced.css';

const getLayoutedElements = (nodes: any[], edges: any[], direction = 'TB') => {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));
  
  const isHorizontal = direction === 'LR';
  dagreGraph.setGraph({
    rankdir: direction,
    nodesep: 24,
    ranksep: 70,
    edgesep: 12,
    marginx: 20,
    marginy: 20
  });

  nodes.forEach((node) => {
    dagreGraph.setNode(String(node.id), { width: 180, height: 56 });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(String(edge.source), String(edge.target));
  });

  dagre.layout(dagreGraph);

  let layoutedNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(String(node.id));
    return {
      ...node,
      id: String(node.id),
      targetPosition: isHorizontal ? 'left' : 'top',
      sourcePosition: isHorizontal ? 'right' : 'bottom',
      position: {
        x: nodeWithPosition.x - 90,
        y: nodeWithPosition.y - 28,
      },
    };
  });

  // For top-bottom layouts, wrap very wide sibling ranks into extra rows below.
  // This keeps the graph readable even when many sibling nodes are not directly linked to each other.
  if (!isHorizontal) {
    const rankBuckets = new Map<number, any[]>();
    layoutedNodes.forEach((node) => {
      const rankKey = Math.round(node.position.y / 20) * 20;
      const bucket = rankBuckets.get(rankKey) || [];
      bucket.push(node);
      rankBuckets.set(rankKey, bucket);
    });

    const sortedRanks = Array.from(rankBuckets.keys()).sort((a, b) => a - b);
    const wrappedNodes: any[] = [];
    const maxColumns = 6;
    const columnSpacing = 200;
    const rowSpacing = 92;
    const rankGap = 70;
    let cursorY = 0;

    sortedRanks.forEach((rank, rankIndex) => {
      const bucket = (rankBuckets.get(rank) || []).sort((a, b) => a.position.x - b.position.x);
      const rowsNeeded = Math.max(1, Math.ceil(bucket.length / maxColumns));
      const columnsInFirstRow = Math.min(maxColumns, bucket.length);
      const blockWidth = columnsInFirstRow * columnSpacing;
      const startX = -Math.max(0, (blockWidth - columnSpacing) / 2);

      if (rankIndex === 0) {
        cursorY = bucket.length ? bucket[0].position.y : 0;
      } else {
        cursorY += rankGap;
      }

      bucket.forEach((node, index) => {
        const row = Math.floor(index / maxColumns);
        const col = index % maxColumns;
        wrappedNodes.push({
          ...node,
          position: {
            x: startX + col * columnSpacing,
            y: cursorY + row * rowSpacing
          }
        });
      });

      cursorY += (rowsNeeded - 1) * rowSpacing;
    });

    layoutedNodes = wrappedNodes;
  }

  const layoutedEdges = edges.map(edge => ({
    ...edge,
    id: edge.id || `e${edge.source}-${edge.target}`,
    source: String(edge.source),
    target: String(edge.target)
  }));

  return { nodes: layoutedNodes, edges: layoutedEdges };
};

// Color schemes for different node types
const NODE_COLORS: Record<string, string> = {
  module: '#254e70',
  signal: '#5a3d2b',
  port: '#d97706',
  parameter: '#7c3aed',
  function: '#06b6d4',
  always_block: '#ec4899',
  assign_block: '#f59e0b',
  verification: '#2d4d2d',
  coverage: '#4a2333'
};

// Change status colors
const CHANGE_COLORS: Record<string, string> = {
  added: '#22c55e',
  deleted: '#ef4444',
  modified: '#eab308',
  unaffected: '#9ca3af'
};

// Custom node component with hover tooltip
const GraphNode: React.FC<any> = ({ data, selected }) => {
  const [showTooltip, setShowTooltip] = useState(false);
  
  const nodeType = data.nodeType || 'module';
  const changeStatus = data.changeStatus || 'unaffected';
  const isChanged = changeStatus !== 'unaffected';
  
  const baseColor = NODE_COLORS[nodeType] || NODE_COLORS.module;
  const overlayColor = isChanged ? CHANGE_COLORS[changeStatus] : baseColor;
  
  const shouldPulse = isChanged && ['added', 'deleted', 'modified'].includes(changeStatus);
  const animationClass = shouldPulse ? 'animate-pulse-signal' : '';
  
  return (
    <div
      className={`graph-node ${animationClass} ${selected ? 'selected' : ''}`}
      style={{
        background: overlayColor,
        borderColor: baseColor,
        opacity: changeStatus === 'unaffected' ? 0.6 : 1,
        boxShadow: selected ? `0 0 0 3px rgba(59, 130, 246, 0.5)` : undefined
      }}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <Handle type="target" position={Position.Top} />
      <div className="font-bold text-xs truncate">{data.label}</div>
      <div className="text-xs text-gray-300">{nodeType}</div>
      {showTooltip && (
        <div className="graph-tooltip">
          <div className="tooltip-title">{data.label}</div>
          <div className="tooltip-row"><span className="tooltip-label">Type:</span> {nodeType}</div>
          {data.module && <div className="tooltip-row"><span className="tooltip-label">Module:</span> {data.module}</div>}
          {data.width && <div className="tooltip-row"><span className="tooltip-label">Width:</span> {data.width}</div>}
          {data.direction && <div className="tooltip-row"><span className="tooltip-label">Dir:</span> {data.direction}</div>}
          {data.criticality !== undefined && <div className="tooltip-row"><span className="tooltip-label">Criticality:</span> {(data.criticality * 100).toFixed(1)}%</div>}
          {data.impactLevel !== undefined && <div className="tooltip-row"><span className="tooltip-label">Impact:</span> Level {data.impactLevel}</div>}
        </div>
      )}
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
};

const NODE_TYPES = { graphNode: GraphNode };

const baseNodes: any[] = [];
const baseEdges: any[] = [];

interface ImpactGraphProps {
  externalNodes?: any[];
  externalEdges?: any[];
  fullGraphData?: any;
  changeHighlighting?: {
    added: string[];
    deleted: string[];
    modified: string[];
    affected: Array<{ id: string; impactLevel: number }>;
  };
  onGenerateFullGraph?: () => Promise<void>;
  onNodeSelect?: (node: { id: string; label: string; file?: string; line?: number; module?: string; nodeType?: string }) => void;
}

const ImpactGraphEnhanced: React.FC<ImpactGraphProps> = ({ 
  externalNodes, 
  externalEdges, 
  fullGraphData,
  changeHighlighting,
  onGenerateFullGraph,
  onNodeSelect
}) => {
  const [nodes, setNodes, onNodesChange] = useNodesState(baseNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(baseEdges);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // If fullGraphData is provided, use that instead of externalNodes/externalEdges
    if (fullGraphData && fullGraphData.nodes && fullGraphData.edges) {
      const initialNodes = fullGraphData.nodes.map((n: any) => {
        const metadata = n.metadata || {};
        const nodeType = metadata.type || 'module';
        
        // Determine change status
        let changeStatus = 'unaffected';
        if (changeHighlighting) {
          if (changeHighlighting.added.includes(n.id)) changeStatus = 'added';
          else if (changeHighlighting.deleted.includes(n.id)) changeStatus = 'deleted';
          else if (changeHighlighting.modified.includes(n.id)) changeStatus = 'modified';
        }
        
        const affectedItem = changeHighlighting?.affected.find(a => a.id === n.id);
        
        return {
          id: String(n.id),
          position: { x: 0, y: 0 },
          data: {
            label: metadata.name || n.id,
            nodeType: nodeType,
            changeStatus: changeStatus,
            file: metadata.file,
            line: metadata.line,
            module: metadata.module,
            width: metadata.width,
            direction: metadata.direction,
            criticality: metadata.criticality,
            impactLevel: affectedItem?.impactLevel
          },
          type: 'graphNode'
        };
      });
      
      const initialEdges = fullGraphData.edges.map((e: any) => {
        const edgeType = e.data?.edge_type || 'unknown';
        let edgeColor = '#4caf50';
        
        if (edgeType === 'has_port') edgeColor = '#d97706';
        else if (edgeType === 'has_parameter') edgeColor = '#7c3aed';
        else if (edgeType === 'uses_signal') edgeColor = '#06b6d4';
        else if (edgeType === 'assignment') edgeColor = '#ec4899';
        
        return {
          id: `e${e.source}-${e.target}`,
          source: String(e.source),
          target: String(e.target),
          type: 'smoothstep',
          animated: true,
          style: { stroke: edgeColor, strokeWidth: 1.5 },
          markerEnd: { type: MarkerType.ArrowClosed, color: edgeColor }
        };
      });
      
      const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
        initialNodes,
        initialEdges,
        'TB'
      );
      
      setNodes(layoutedNodes);
      setEdges(layoutedEdges);
    } else if (externalNodes && externalEdges) {
      const initialNodes = externalNodes.map((n: any) => ({
        id: String(n.id),
        position: { x: 0, y: 0 },
        data: { label: n.label, nodeType: n.type, changeStatus: 'unaffected' },
        type: 'graphNode'
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
  }, [externalNodes, externalEdges, fullGraphData, changeHighlighting, setNodes, setEdges]);

  const onConnect = useCallback((params: any) => setEdges((eds) => addEdge(params, eds)), [setEdges]);

  const onNodeClick = useCallback((_event: any, node: any) => {
    if (!onNodeSelect) return;
    onNodeSelect({
      id: String(node.id),
      label: node?.data?.label || String(node.id),
      file: node?.data?.file,
      line: node?.data?.line,
      module: node?.data?.module,
      nodeType: node?.data?.nodeType
    });
  }, [onNodeSelect]);
  
  const handleGenerateFullGraph = async () => {
    if (!onGenerateFullGraph) return;
    setLoading(true);
    try {
      await onGenerateFullGraph();
    } catch (error) {
      console.error('Error generating full graph:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full h-full min-h-[500px] relative">
      {(loading || !fullGraphData) && (
        <div className="absolute top-4 left-4 z-10 bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 shadow-lg">
          {loading && <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />}
          <span>{loading ? 'Generating full codebase graph...' : 'Full graph not loaded'}</span>
          {!loading && !fullGraphData && onGenerateFullGraph && (
            <button
              onClick={handleGenerateFullGraph}
              className="ml-2 bg-white text-blue-600 px-3 py-1 rounded font-semibold hover:bg-blue-50 transition-colors"
              disabled={loading}
            >
              Generate Now
            </button>
          )}
        </div>
      )}
      
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        nodeTypes={NODE_TYPES}
        fitView
      >
        <Controls />
        <MiniMap nodeStrokeColor="#fff" nodeColor="#2d2d2d" maskColor="rgba(0,0,0,0.8)" />
        <Background color="#333" gap={16} />
      </ReactFlow>
    </div>
  );
};

export default ImpactGraphEnhanced;
