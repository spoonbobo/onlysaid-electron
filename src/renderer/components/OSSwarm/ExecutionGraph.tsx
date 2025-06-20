import React, { useEffect, useRef, useState, useMemo } from 'react';
import { Box, Typography, Chip, Tooltip, IconButton, Paper } from '@mui/material';
import { 
  PlayArrow, 
  Pause, 
  Stop, 
  Person, 
  Task, 
  Build, 
  CheckCircle, 
  Error, 
  Schedule,
  ZoomIn,
  ZoomOut,
  CenterFocusStrong
} from '@mui/icons-material';
import { ExecutionGraph } from '@/renderer/stores/Agent/AgentTaskStore';

interface Node {
  id: string;
  type: 'execution' | 'agent' | 'task' | 'tool';
  label: string;
  status: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  metadata?: any;
  connections: string[];
}

interface Edge {
  id: string;
  from: string;
  to: string;
  type: 'creates' | 'executes' | 'uses' | 'reports_to';
  animated: boolean;
  color: string;
}

interface ExecutionGraphProps {
  graph: ExecutionGraph | null;
  isLive?: boolean;
  width?: number;
  height?: number;
}

const statusColors = {
  pending: '#FFA726',
  running: '#42A5F5',
  completed: '#66BB6A',
  failed: '#EF5350',
  idle: '#BDBDBD',
  busy: '#42A5F5',
  approved: '#66BB6A',
  denied: '#EF5350',
  executing: '#7986CB'
};

const nodeTypes = {
  execution: { icon: PlayArrow, width: 120, height: 60 },
  agent: { icon: Person, width: 100, height: 50 },
  task: { icon: Task, width: 90, height: 40 },
  tool: { icon: Build, width: 80, height: 35 }
};

export const ExecutionGraphComponent: React.FC<ExecutionGraphProps> = ({
  graph,
  isLive = false,
  width = 800,
  height = 600
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(null);
  const [isPlaying, setIsPlaying] = useState(isLive);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);

  // Convert graph data to nodes and edges
  const { nodes, edges } = useMemo(() => {
    if (!graph) return { nodes: [], edges: [] };

    const nodes: Node[] = [];
    const edges: Edge[] = [];

    // Create execution node (center)
    const executionNode: Node = {
      id: graph.execution.id,
      type: 'execution',
      label: graph.execution.task_description.substring(0, 30) + '...',
      status: graph.execution.status,
      x: width / 2,
      y: height / 2,
      width: nodeTypes.execution.width,
      height: nodeTypes.execution.height,
      color: statusColors[graph.execution.status as keyof typeof statusColors] || '#BDBDBD',
      metadata: graph.execution,
      connections: []
    };
    nodes.push(executionNode);

    // Create agent nodes (circle around execution)
    const agentRadius = 150;
    graph.agents.forEach((agent, index) => {
      const angle = (2 * Math.PI * index) / graph.agents.length;
      const agentNode: Node = {
        id: agent.id,
        type: 'agent',
        label: `${agent.role} Agent`,
        status: agent.status,
        x: width / 2 + Math.cos(angle) * agentRadius,
        y: height / 2 + Math.sin(angle) * agentRadius,
        width: nodeTypes.agent.width,
        height: nodeTypes.agent.height,
        color: statusColors[agent.status as keyof typeof statusColors] || '#BDBDBD',
        metadata: agent,
        connections: [graph.execution.id]
      };
      nodes.push(agentNode);

      // Edge from execution to agent
      edges.push({
        id: `exec-${agent.id}`,
        from: graph.execution.id,
        to: agent.id,
        type: 'creates',
        animated: agent.status === 'busy',
        color: '#90A4AE'
      });
    });

    // Create task nodes (around their respective agents)
    graph.tasks.forEach((task, taskIndex) => {
      const agentNode = nodes.find(n => n.metadata?.agent_id === task.agent_id);
      if (!agentNode) return;

      const taskRadius = 80;
      const tasksForAgent = graph.tasks.filter(t => t.agent_id === task.agent_id);
      const indexInAgent = tasksForAgent.findIndex(t => t.id === task.id);
      const angle = (2 * Math.PI * indexInAgent) / tasksForAgent.length;

      const taskNode: Node = {
        id: task.id,
        type: 'task',
        label: task.task_description.substring(0, 20) + '...',
        status: task.status,
        x: agentNode.x + Math.cos(angle) * taskRadius,
        y: agentNode.y + Math.sin(angle) * taskRadius,
        width: nodeTypes.task.width,
        height: nodeTypes.task.height,
        color: statusColors[task.status as keyof typeof statusColors] || '#BDBDBD',
        metadata: task,
        connections: [agentNode.id]
      };
      nodes.push(taskNode);

      // Edge from agent to task
      edges.push({
        id: `agent-${task.id}`,
        from: agentNode.id,
        to: task.id,
        type: 'executes',
        animated: task.status === 'running',
        color: '#81C784'
      });
    });

    // Create tool execution nodes (around their respective tasks or agents)
    graph.toolExecutions.forEach((toolExec, toolIndex) => {
      const parentNode = toolExec.task_id 
        ? nodes.find(n => n.id === toolExec.task_id)
        : nodes.find(n => n.metadata?.id === toolExec.agent_id);
      
      if (!parentNode) return;

      const toolRadius = 50;
      const toolsForParent = graph.toolExecutions.filter(t => 
        toolExec.task_id ? t.task_id === toolExec.task_id : t.agent_id === toolExec.agent_id
      );
      const indexInParent = toolsForParent.findIndex(t => t.id === toolExec.id);
      const angle = (2 * Math.PI * indexInParent) / toolsForParent.length;

      const toolNode: Node = {
        id: toolExec.id,
        type: 'tool',
        label: toolExec.tool_name,
        status: toolExec.status,
        x: parentNode.x + Math.cos(angle) * toolRadius,
        y: parentNode.y + Math.sin(angle) * toolRadius,
        width: nodeTypes.tool.width,
        height: nodeTypes.tool.height,
        color: statusColors[toolExec.status as keyof typeof statusColors] || '#BDBDBD',
        metadata: toolExec,
        connections: [parentNode.id]
      };
      nodes.push(toolNode);

      // Edge from parent to tool
      edges.push({
        id: `parent-${toolExec.id}`,
        from: parentNode.id,
        to: toolExec.id,
        type: 'uses',
        animated: toolExec.status === 'executing',
        color: '#FFB74D'
      });
    });

    return { nodes, edges };
  }, [graph, width, height]);

  // Animation loop
  useEffect(() => {
    if (!isPlaying || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationTime = 0;

    const animate = () => {
      animationTime += 0.02;
      
      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Apply zoom and pan
      ctx.save();
      ctx.scale(zoom, zoom);
      ctx.translate(pan.x, pan.y);

      // Draw edges first
      edges.forEach(edge => {
        const fromNode = nodes.find(n => n.id === edge.from);
        const toNode = nodes.find(n => n.id === edge.to);
        if (!fromNode || !toNode) return;

        ctx.strokeStyle = edge.color;
        ctx.lineWidth = 2;
        
        if (edge.animated) {
          // Animated dashed line
          ctx.setLineDash([5, 5]);
          ctx.lineDashOffset = -animationTime * 20;
        } else {
          ctx.setLineDash([]);
        }

        ctx.beginPath();
        ctx.moveTo(fromNode.x, fromNode.y);
        ctx.lineTo(toNode.x, toNode.y);
        ctx.stroke();

        // Arrow head for animated edges
        if (edge.animated) {
          const angle = Math.atan2(toNode.y - fromNode.y, toNode.x - fromNode.x);
          const arrowLength = 10;
          const arrowAngle = Math.PI / 6;

          ctx.setLineDash([]);
          ctx.beginPath();
          ctx.moveTo(toNode.x, toNode.y);
          ctx.lineTo(
            toNode.x - arrowLength * Math.cos(angle - arrowAngle),
            toNode.y - arrowLength * Math.sin(angle - arrowAngle)
          );
          ctx.moveTo(toNode.x, toNode.y);
          ctx.lineTo(
            toNode.x - arrowLength * Math.cos(angle + arrowAngle),
            toNode.y - arrowLength * Math.sin(angle + arrowAngle)
          );
          ctx.stroke();
        }
      });

      // Draw nodes
      nodes.forEach(node => {
        // Node background with pulse animation for active nodes
        const isActive = ['running', 'busy', 'executing'].includes(node.status);
        const pulseScale = isActive ? 1 + 0.1 * Math.sin(animationTime * 3) : 1;
        
        ctx.save();
        ctx.translate(node.x, node.y);
        ctx.scale(pulseScale, pulseScale);

        // Node shape
        ctx.fillStyle = node.color;
        ctx.strokeStyle = selectedNode?.id === node.id ? '#1976D2' : '#424242';
        ctx.lineWidth = selectedNode?.id === node.id ? 3 : 1;
        
        const radius = 8;
        ctx.beginPath();
        ctx.roundRect(-node.width/2, -node.height/2, node.width, node.height, radius);
        ctx.fill();
        ctx.stroke();

        // Node icon
        ctx.fillStyle = '#FFFFFF';
        ctx.font = '16px Material Icons';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        // Simple icon representation (you'd need to implement proper icon rendering)
        const iconMap = {
          execution: '▶',
          agent: '👤',
          task: '📋',
          tool: '🔧'
        };
        ctx.fillText(iconMap[node.type as keyof typeof iconMap] || '?', 0, -5);

        // Node label
        ctx.fillStyle = '#000000';
        ctx.font = '10px Arial';
        ctx.fillText(node.label, 0, node.height/2 + 12);

        // Status indicator
        const statusIcon = node.status === 'completed' ? '✓' : 
                          node.status === 'failed' ? '✗' : 
                          node.status === 'running' || node.status === 'busy' || node.status === 'executing' ? '⟳' : 
                          '○';
        ctx.fillStyle = node.color;
        ctx.font = '12px Arial';
        ctx.fillText(statusIcon, node.width/2 - 8, -node.height/2 + 8);

        ctx.restore();
      });

      ctx.restore();

      if (isPlaying) {
        animationRef.current = requestAnimationFrame(animate);
      }
    };

    animate();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPlaying, nodes, edges, zoom, pan, selectedNode]);

  // Handle canvas click
  const handleCanvasClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = (event.clientX - rect.left) / zoom - pan.x;
    const y = (event.clientY - rect.top) / zoom - pan.y;

    console.log('Canvas click:', { x, y, zoom, pan });

    // Find clicked node
    const clickedNode = nodes.find(node => {
      const nodeLeft = node.x - node.width/2;
      const nodeRight = node.x + node.width/2;
      const nodeTop = node.y - node.height/2;
      const nodeBottom = node.y + node.height/2;
      
      return x >= nodeLeft && x <= nodeRight && y >= nodeTop && y <= nodeBottom;
    });

    console.log('Clicked node:', clickedNode);
    setSelectedNode(clickedNode || null);
  };

  const handleZoomIn = () => setZoom(prev => Math.min(prev * 1.2, 3));
  const handleZoomOut = () => setZoom(prev => Math.max(prev / 1.2, 0.3));
  const handleCenter = () => {
    setPan({ x: 0, y: 0 });
    setZoom(1);
  };

  return (
    <Box sx={{ 
      position: 'relative', 
      width, 
      height,
      pointerEvents: 'auto',
      overflow: 'hidden'
    }}>
      {/* Controls */}
      <Paper
        sx={{
          position: 'absolute',
          top: 8,
          left: 8,
          zIndex: 10,
          p: 1,
          display: 'flex',
          gap: 1,
          alignItems: 'center'
        }}
      >
        <IconButton
          size="small"
          onClick={() => setIsPlaying(!isPlaying)}
          color={isPlaying ? 'secondary' : 'primary'}
        >
          {isPlaying ? <Pause /> : <PlayArrow />}
        </IconButton>
        
        <IconButton size="small" onClick={handleZoomIn}>
          <ZoomIn />
        </IconButton>
        
        <IconButton size="small" onClick={handleZoomOut}>
          <ZoomOut />
        </IconButton>
        
        <IconButton size="small" onClick={handleCenter}>
          <CenterFocusStrong />
        </IconButton>

        <Typography variant="caption" sx={{ ml: 1 }}>
          {zoom.toFixed(1)}x
        </Typography>
      </Paper>

      {/* Stats */}
      {graph && (
        <Paper
          sx={{
            position: 'absolute',
            top: 8,
            right: 8,
            zIndex: 10,
            p: 1,
            minWidth: 200
          }}
        >
          <Typography variant="caption" display="block">
            <strong>Status:</strong> {graph.execution.status}
          </Typography>
          <Typography variant="caption" display="block">
            <strong>Agents:</strong> {graph.agents.length}
          </Typography>
          <Typography variant="caption" display="block">
            <strong>Tasks:</strong> {graph.tasks.length}
          </Typography>
          <Typography variant="caption" display="block">
            <strong>Tools:</strong> {graph.toolExecutions.length}
          </Typography>
        </Paper>
      )}

      {/* Node details */}
      {selectedNode && (
        <Paper
          sx={{
            position: 'absolute',
            bottom: 8,
            left: 8,
            zIndex: 10,
            p: 2,
            minWidth: 250,
            maxWidth: 400
          }}
        >
          <Typography variant="h6" gutterBottom>
            {selectedNode.type.charAt(0).toUpperCase() + selectedNode.type.slice(1)} Details
          </Typography>
          
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <Chip 
              label={selectedNode.status} 
              size="small" 
              sx={{ backgroundColor: selectedNode.color, color: 'white' }}
            />
            <Typography variant="body2" fontWeight="medium">
              {selectedNode.label}
            </Typography>
          </Box>

          {selectedNode.metadata && (
            <Box sx={{ mt: 1 }}>
              {selectedNode.type === 'execution' && (
                <>
                  <Typography variant="caption" display="block">
                    <strong>Created:</strong> {new Date(selectedNode.metadata.created_at).toLocaleString()}
                  </Typography>
                  {selectedNode.metadata.started_at && (
                    <Typography variant="caption" display="block">
                      <strong>Started:</strong> {new Date(selectedNode.metadata.started_at).toLocaleString()}
                    </Typography>
                  )}
                  {selectedNode.metadata.completed_at && (
                    <Typography variant="caption" display="block">
                      <strong>Completed:</strong> {new Date(selectedNode.metadata.completed_at).toLocaleString()}
                    </Typography>
                  )}
                </>
              )}
              
              {selectedNode.type === 'agent' && (
                <>
                  <Typography variant="caption" display="block">
                    <strong>Role:</strong> {selectedNode.metadata.role}
                  </Typography>
                  {selectedNode.metadata.expertise && (
                    <Typography variant="caption" display="block">
                      <strong>Expertise:</strong> {JSON.parse(selectedNode.metadata.expertise).join(', ')}
                    </Typography>
                  )}
                  {selectedNode.metadata.current_task && (
                    <Typography variant="caption" display="block">
                      <strong>Current Task:</strong> {selectedNode.metadata.current_task}
                    </Typography>
                  )}
                </>
              )}
              
              {selectedNode.type === 'tool' && (
                <>
                  <Typography variant="caption" display="block">
                    <strong>Tool:</strong> {selectedNode.metadata.tool_name}
                  </Typography>
                  {selectedNode.metadata.mcp_server && (
                    <Typography variant="caption" display="block">
                      <strong>MCP Server:</strong> {selectedNode.metadata.mcp_server}
                    </Typography>
                  )}
                  {selectedNode.metadata.execution_time && (
                    <Typography variant="caption" display="block">
                      <strong>Execution Time:</strong> {selectedNode.metadata.execution_time}s
                    </Typography>
                  )}
                  {selectedNode.metadata.human_approved !== undefined && (
                    <Typography variant="caption" display="block">
                      <strong>Human Approved:</strong> {selectedNode.metadata.human_approved ? 'Yes' : 'No'}
                    </Typography>
                  )}
                </>
              )}
            </Box>
          )}
        </Paper>
      )}

      {/* Canvas */}
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        onClick={handleCanvasClick}
        style={{
          border: '1px solid #e0e0e0',
          borderRadius: 4,
          cursor: 'pointer',
          backgroundColor: '#fafafa',
          pointerEvents: 'auto',
          userSelect: 'none'
        }}
      />

      {/* Empty state */}
      {!graph && (
        <Box
          sx={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            textAlign: 'center',
            color: 'text.secondary'
          }}
        >
          <Typography variant="h6" gutterBottom>
            No Execution Graph
          </Typography>
          <Typography variant="body2">
            Start an OSSwarm execution to see the live graph
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default ExecutionGraphComponent; 