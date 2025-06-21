import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { 
  Box, 
  Typography, 
  Chip, 
  IconButton, 
  Paper, 
  Tooltip,
  Card,
  CardContent,
  Fade,
  Zoom,
  useTheme,
  alpha,
  Stack,
  Divider,
  ButtonGroup,
  Grid
} from '@mui/material';
import { 
  PlayArrow, 
  Pause, 
  Person, 
  Task, 
  Build, 
  ZoomIn,
  ZoomOut,
  CenterFocusStrong,
  Fullscreen,
  FullscreenExit,
  Refresh,
  Timeline,
  AccountTree,
  Close
} from '@mui/icons-material';
import { useIntl } from 'react-intl';
import { ExecutionGraph } from '@/renderer/stores/Agent/AgentTaskStore';
import { useAgentTaskStore } from '@/renderer/stores/Agent/AgentTaskStore';

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
  borderColor: string;
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
  width: number;
}

interface ExecutionGraphProps {
  graph: ExecutionGraph | null;
  isLive?: boolean;
  width?: number;
  height?: number;
  onNodeSelect?: (node: Node | null) => void;
  fullscreen?: boolean;
  onFullscreenToggle?: () => void;
  onRefresh?: () => void;
}

// ✅ MUI-friendly status colors using theme
const getStatusColors = (theme: any) => ({
  pending: { 
    bg: alpha(theme.palette.warning.light, theme.palette.mode === 'dark' ? 0.2 : 0.1), 
    border: theme.palette.warning.main, 
    text: theme.palette.warning.dark 
  },
  running: { 
    bg: alpha(theme.palette.info.light, theme.palette.mode === 'dark' ? 0.2 : 0.1), 
    border: theme.palette.info.main, 
    text: theme.palette.info.dark 
  },
  completed: { 
    bg: alpha(theme.palette.success.light, theme.palette.mode === 'dark' ? 0.2 : 0.1), 
    border: theme.palette.success.main, 
    text: theme.palette.success.dark 
  },
  failed: { 
    bg: alpha(theme.palette.error.light, theme.palette.mode === 'dark' ? 0.2 : 0.1), 
    border: theme.palette.error.main, 
    text: theme.palette.error.dark 
  },
  idle: { 
    bg: alpha(theme.palette.grey[theme.palette.mode === 'dark' ? 700 : 300], 0.1), 
    border: theme.palette.grey[theme.palette.mode === 'dark' ? 400 : 500], 
    text: theme.palette.grey[theme.palette.mode === 'dark' ? 300 : 700] 
  },
  busy: { 
    bg: alpha(theme.palette.primary.light, theme.palette.mode === 'dark' ? 0.2 : 0.1), 
    border: theme.palette.primary.main, 
    text: theme.palette.primary.dark 
  },
  approved: { 
    bg: alpha(theme.palette.success.light, theme.palette.mode === 'dark' ? 0.2 : 0.1), 
    border: theme.palette.success.main, 
    text: theme.palette.success.dark 
  },
  denied: { 
    bg: alpha(theme.palette.error.light, theme.palette.mode === 'dark' ? 0.2 : 0.1), 
    border: theme.palette.error.main, 
    text: theme.palette.error.dark 
  },
  executing: { 
    bg: alpha(theme.palette.secondary.light, theme.palette.mode === 'dark' ? 0.2 : 0.1), 
    border: theme.palette.secondary.main, 
    text: theme.palette.secondary.dark 
  }
});

const nodeTypes = {
  execution: { icon: AccountTree, width: 140, height: 70, radius: 12 },
  agent: { icon: Person, width: 120, height: 60, radius: 10 },
  task: { icon: Task, width: 100, height: 50, radius: 8 },
  tool: { icon: Build, width: 90, height: 45, radius: 6 }
};

export const ExecutionGraphComponent: React.FC<ExecutionGraphProps> = ({
  graph,
  isLive = false,
  width = 800,
  height = 600,
  onNodeSelect,
  fullscreen = false,
  onFullscreenToggle,
  onRefresh
}) => {
  const theme = useTheme();
  const intl = useIntl();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number>(null);
  
  const [isPlaying, setIsPlaying] = useState(isLive);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [hoveredNode, setHoveredNode] = useState<Node | null>(null);

  // ✅ Use MUI theme-friendly status colors
  const statusColors = useMemo(() => getStatusColors(theme), [theme]);

  // ✅ Calculate optimal position for node details panel
  const calculatePanelPosition = useCallback((node: Node) => {
    if (!containerRef.current) return { top: 20, left: 20, right: null, bottom: null, preference: 5 };

    const containerWidth = fullscreen ? window.innerWidth : width;
    const containerHeight = fullscreen ? window.innerHeight : height;
    
    // Transform node position from canvas coordinates to screen coordinates
    const screenX = (node.x + pan.x) * zoom;
    const screenY = (node.y + pan.y) * zoom;
    
    // Panel dimensions
    const panelWidth = fullscreen ? Math.min(450, containerWidth * 0.35) : 350;
    const panelHeight = Math.min(400, containerHeight * 0.6);
    
    // Margin from edges
    const margin = 20;
    
    // Calculate preferred positions (right side of node first)
    const positions = [
      // Right side of node
      {
        left: screenX + node.width/2 * zoom + margin,
        top: Math.max(margin, screenY - panelHeight/2),
        right: null,
        bottom: null,
        preference: 1
      },
      // Left side of node
      {
        left: Math.max(margin, screenX - node.width/2 * zoom - panelWidth - margin),
        top: Math.max(margin, screenY - panelHeight/2),
        right: null,
        bottom: null,
        preference: 2
      },
      // Below node
      {
        left: Math.max(margin, Math.min(containerWidth - panelWidth - margin, screenX - panelWidth/2)),
        top: screenY + node.height/2 * zoom + margin,
        right: null,
        bottom: null,
        preference: 3
      },
      // Above node
      {
        left: Math.max(margin, Math.min(containerWidth - panelWidth - margin, screenX - panelWidth/2)),
        top: null,
        right: null,
        bottom: containerHeight - (screenY - node.height/2 * zoom) + margin,
        preference: 4
      }
    ];
    
    // Find the best position that fits within bounds
    for (const pos of positions) {
      const fitsHorizontally = pos.left >= margin && pos.left + panelWidth <= containerWidth - margin;
      const fitsVertically = pos.top !== null ? 
        (pos.top >= margin && pos.top + panelHeight <= containerHeight - margin) : true;
      
      if (fitsHorizontally && fitsVertically) {
        return pos;
      }
    }
    
    // Fallback: center the panel
    return {
      left: Math.max(margin, (containerWidth - panelWidth) / 2),
      top: Math.max(margin, (containerHeight - panelHeight) / 2),
      right: null,
      bottom: null,
      preference: 5
    };
  }, [zoom, pan, width, height, fullscreen]);

  // Enhanced node and edge calculation with better positioning
  const { nodes, edges, stats } = useMemo(() => {
    if (!graph) return { nodes: [], edges: [], stats: { total: 0, completed: 0, failed: 0, running: 0 } };

    const nodes: Node[] = [];
    const edges: Edge[] = [];
    const centerX = width / 2;
    const centerY = height / 2;

    // Create execution node (center) with enhanced styling
    const executionNode: Node = {
      id: graph.execution.id,
      type: 'execution',
      label: graph.execution.task_description.length > 40 
        ? graph.execution.task_description.substring(0, 37) + '...'
        : graph.execution.task_description,
      status: graph.execution.status,
      x: centerX,
      y: centerY,
      width: nodeTypes.execution.width,
      height: nodeTypes.execution.height,
      color: statusColors[graph.execution.status as keyof typeof statusColors]?.bg || theme.palette.grey[100],
      borderColor: statusColors[graph.execution.status as keyof typeof statusColors]?.border || theme.palette.grey[400],
      metadata: graph.execution,
      connections: [],
    };
    nodes.push(executionNode);

    // Create agent nodes in a circle with better spacing
    const agentRadius = Math.min(width, height) * 0.25;
    const agentCount = graph.agents.length;
    
    graph.agents.forEach((agent, index) => {
      const angle = (2 * Math.PI * index) / agentCount - Math.PI / 2;
      const agentNode: Node = {
        id: agent.id,
        type: 'agent',
        label: `${agent.role}`,
        status: agent.status,
        x: centerX + Math.cos(angle) * agentRadius,
        y: centerY + Math.sin(angle) * agentRadius,
        width: nodeTypes.agent.width,
        height: nodeTypes.agent.height,
        color: statusColors[agent.status as keyof typeof statusColors]?.bg || theme.palette.grey[100],
        borderColor: statusColors[agent.status as keyof typeof statusColors]?.border || theme.palette.grey[400],
        metadata: agent,
        connections: [graph.execution.id],
      };
      nodes.push(agentNode);

      edges.push({
        id: `exec-${agent.id}`,
        from: graph.execution.id,
        to: agent.id,
        type: 'creates',
        animated: agent.status === 'busy',
        color: agent.status === 'busy' ? theme.palette.primary.main : theme.palette.grey[400],
        width: agent.status === 'busy' ? 3 : 2
      });
    });

    // Create task nodes around their agents
    graph.tasks.forEach((task) => {
      const agentNode = nodes.find(n => n.metadata?.agent_id === task.agent_id);
      if (!agentNode) return;

      const tasksForAgent = graph.tasks.filter(t => t.agent_id === task.agent_id);
      const indexInAgent = tasksForAgent.findIndex(t => t.id === task.id);
      const taskRadius = 100;
      const taskAngle = (2 * Math.PI * indexInAgent) / tasksForAgent.length;

      const taskNode: Node = {
        id: task.id,
        type: 'task',
        label: task.task_description.length > 25 
          ? task.task_description.substring(0, 22) + '...'
          : task.task_description,
        status: task.status,
        x: agentNode.x + Math.cos(taskAngle) * taskRadius,
        y: agentNode.y + Math.sin(taskAngle) * taskRadius,
        width: nodeTypes.task.width,
        height: nodeTypes.task.height,
        color: statusColors[task.status as keyof typeof statusColors]?.bg || theme.palette.grey[100],
        borderColor: statusColors[task.status as keyof typeof statusColors]?.border || theme.palette.grey[400],
        metadata: task,
        connections: [agentNode.id],
      };
      nodes.push(taskNode);

      edges.push({
        id: `agent-${task.id}`,
        from: agentNode.id,
        to: task.id,
        type: 'executes',
        animated: task.status === 'running',
        color: task.status === 'running' ? theme.palette.success.main : theme.palette.success.light,
        width: task.status === 'running' ? 3 : 2
      });
    });

    // Create tool execution nodes
    graph.toolExecutions.forEach((toolExec) => {
      const parentNode = toolExec.task_id 
        ? nodes.find(n => n.id === toolExec.task_id)
        : nodes.find(n => n.metadata?.id === toolExec.agent_id);
      
      if (!parentNode) return;

      const toolsForParent = graph.toolExecutions.filter(t => 
        toolExec.task_id ? t.task_id === toolExec.task_id : t.agent_id === toolExec.agent_id
      );
      const indexInParent = toolsForParent.findIndex(t => t.id === toolExec.id);
      const toolRadius = 65;
      const toolAngle = (2 * Math.PI * indexInParent) / toolsForParent.length;

      const toolNode: Node = {
        id: toolExec.id,
        type: 'tool',
        label: toolExec.tool_name,
        status: toolExec.status,
        x: parentNode.x + Math.cos(toolAngle) * toolRadius,
        y: parentNode.y + Math.sin(toolAngle) * toolRadius,
        width: nodeTypes.tool.width,
        height: nodeTypes.tool.height,
        color: statusColors[toolExec.status as keyof typeof statusColors]?.bg || theme.palette.grey[100],
        borderColor: statusColors[toolExec.status as keyof typeof statusColors]?.border || theme.palette.grey[400],
        metadata: toolExec,
        connections: [parentNode.id],
      };
      nodes.push(toolNode);

      edges.push({
        id: `parent-${toolExec.id}`,
        from: parentNode.id,
        to: toolExec.id,
        type: 'uses',
        animated: toolExec.status === 'executing',
        color: toolExec.status === 'executing' ? theme.palette.warning.main : theme.palette.warning.light,
        width: toolExec.status === 'executing' ? 3 : 2
      });
    });

    // Calculate stats
    const allNodes = [...graph.agents, ...graph.tasks, ...graph.toolExecutions];
    const stats = {
      total: allNodes.length,
      completed: allNodes.filter(n => n.status === 'completed').length,
      failed: allNodes.filter(n => n.status === 'failed').length,
      running: allNodes.filter(n => ['running', 'busy', 'executing'].includes(n.status)).length
    };

    return { nodes, edges, stats };
  }, [graph, width, height, statusColors, theme]);

  // Animation logic (keeping the same as before but with theme colors)
  const animate = useCallback(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationTime = Date.now() * 0.001;
    
    const render = () => {
      ctx.fillStyle = theme.palette.mode === 'dark' ? theme.palette.grey[900] : theme.palette.background.default;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      ctx.save();
      ctx.scale(zoom, zoom);
      ctx.translate(pan.x, pan.y);

      if (zoom > 0.5) {
        ctx.strokeStyle = alpha(theme.palette.divider, theme.palette.mode === 'dark' ? 0.2 : 0.1);
        ctx.lineWidth = 1;
        const gridSize = 50;
        
        for (let x = -width; x < width * 2; x += gridSize) {
          ctx.beginPath();
          ctx.moveTo(x, -height);
          ctx.lineTo(x, height * 2);
          ctx.stroke();
        }
        
        for (let y = -height; y < height * 2; y += gridSize) {
          ctx.beginPath();
          ctx.moveTo(-width, y);
          ctx.lineTo(width * 2, y);
          ctx.stroke();
        }
      }

      edges.forEach(edge => {
        const fromNode = nodes.find(n => n.id === edge.from);
        const toNode = nodes.find(n => n.id === edge.to);
        if (!fromNode || !toNode) return;

        const dx = toNode.x - fromNode.x;
        const dy = toNode.y - fromNode.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const unitX = dx / distance;
        const unitY = dy / distance;
        
        const startX = fromNode.x + unitX * (fromNode.width / 2);
        const startY = fromNode.y + unitY * (fromNode.height / 2);
        const endX = toNode.x - unitX * (toNode.width / 2);
        const endY = toNode.y - unitY * (toNode.height / 2);

        ctx.strokeStyle = edge.color;
        ctx.lineWidth = edge.width;
        
        if (edge.animated && isPlaying) {
          ctx.setLineDash([8, 4]);
          ctx.lineDashOffset = -animationTime * 30;
        } else {
          ctx.setLineDash([]);
        }

        const controlX = (startX + endX) / 2 + (endY - startY) * 0.1;
        const controlY = (startY + endY) / 2 + (startX - endX) * 0.1;
        
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.quadraticCurveTo(controlX, controlY, endX, endY);
        ctx.stroke();

        if ((edge.animated && isPlaying) || edge.type === 'executes') {
          const angle = Math.atan2(endY - controlY, endX - controlX);
          const arrowLength = 12;
          const arrowAngle = Math.PI / 6;

          ctx.setLineDash([]);
          ctx.fillStyle = edge.color;
          ctx.beginPath();
          ctx.moveTo(endX, endY);
          ctx.lineTo(
            endX - arrowLength * Math.cos(angle - arrowAngle),
            endY - arrowLength * Math.sin(angle - arrowAngle)
          );
          ctx.lineTo(
            endX - arrowLength * Math.cos(angle + arrowAngle),
            endY - arrowLength * Math.sin(angle + arrowAngle)
          );
          ctx.closePath();
          ctx.fill();
        }
      });

      nodes.forEach(node => {
        const isSelected = selectedNode?.id === node.id;
        const isHovered = hoveredNode?.id === node.id;
        const isActive = ['running', 'busy', 'executing'].includes(node.status);
        
        ctx.save();
        ctx.translate(node.x, node.y);

        if (isSelected || isHovered || isActive) {
          ctx.shadowColor = isSelected ? theme.palette.primary.main : 
                           isActive ? node.borderColor : 
                           theme.palette.mode === 'dark' ? theme.palette.grey[400] : theme.palette.grey[600];
          ctx.shadowBlur = isSelected ? 15 : isActive ? 10 : 5;
          ctx.shadowOffsetX = 0;
          ctx.shadowOffsetY = 0;
        }

        const pulseScale = (isActive && isPlaying) ? 1 + 0.05 * Math.sin(animationTime * 4) : 1;
        ctx.scale(pulseScale, pulseScale);

        const gradient = ctx.createLinearGradient(0, -node.height/2, 0, node.height/2);
        gradient.addColorStop(0, node.color);
        gradient.addColorStop(1, alpha(node.color, 0.8));
        
        ctx.fillStyle = gradient;
        ctx.strokeStyle = isSelected ? theme.palette.primary.main : node.borderColor;
        ctx.lineWidth = isSelected ? 4 : isHovered ? 3 : 2;
        
        const radius = nodeTypes[node.type as keyof typeof nodeTypes].radius;
        ctx.beginPath();
        ctx.roundRect(-node.width/2, -node.height/2, node.width, node.height, radius);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = statusColors[node.status as keyof typeof statusColors]?.text || theme.palette.text.primary;
        ctx.font = `${isSelected ? '20px' : '16px'} Material Icons`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        const iconMap = {
          execution: '⚡',
          agent: '👤',
          task: '📋',
          tool: '🔧'
        };
        ctx.fillText(iconMap[node.type as keyof typeof iconMap] || '?', 0, -8);

        ctx.fillStyle = theme.palette.text.primary;
        ctx.font = `${isSelected ? 'bold ' : ''}${Math.min(11, node.width / 8)}px ${theme.typography.fontFamily}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        
        const words = node.label.split(' ');
        const lines = [];
        let currentLine = '';
        
        words.forEach(word => {
          const testLine = currentLine + (currentLine ? ' ' : '') + word;
          const metrics = ctx.measureText(testLine);
          if (metrics.width > node.width - 10 && currentLine) {
            lines.push(currentLine);
            currentLine = word;
          } else {
            currentLine = testLine;
          }
        });
        if (currentLine) lines.push(currentLine);
        
        lines.forEach((line, index) => {
          ctx.fillText(line, 0, 8 + index * 12);
        });

        const statusIcon = node.status === 'completed' ? '✓' : 
                          node.status === 'failed' ? '✗' : 
                          (node.status === 'running' || node.status === 'busy' || node.status === 'executing') && isPlaying ? 
                            (Math.floor(animationTime * 2) % 4 === 0 ? '◐' : 
                             Math.floor(animationTime * 2) % 4 === 1 ? '◑' : 
                             Math.floor(animationTime * 2) % 4 === 2 ? '◒' : '◓') : 
                          (node.status === 'running' || node.status === 'busy' || node.status === 'executing') ? '●' :
                          '○';
        
        ctx.fillStyle = node.borderColor;
        ctx.font = 'bold 14px Arial';
        ctx.fillText(statusIcon, node.width/2 - 12, -node.height/2 + 12);

        ctx.restore();
      });

      ctx.restore();

      if (isPlaying) {
        animationRef.current = requestAnimationFrame(render);
      }
    };

    render();
  }, [isPlaying, nodes, edges, zoom, pan, selectedNode, hoveredNode, theme, statusColors]);

  useEffect(() => {
    if (canvasRef.current) {
      animate();
    }
    
    if (isPlaying) {
      const startAnimation = () => {
        if (animationRef.current) {
          cancelAnimationFrame(animationRef.current);
        }
        animate();
      };
      startAnimation();
    }
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [animate, isPlaying, graph]);

  // Mouse interaction handlers (keeping same logic)
  const handleCanvasMouseDown = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;
    
    const rect = canvasRef.current.getBoundingClientRect();
    const x = (event.clientX - rect.left) / zoom - pan.x;
    const y = (event.clientY - rect.top) / zoom - pan.y;

    const clickedNode = nodes.find(node => {
      const nodeLeft = node.x - node.width/2;
      const nodeRight = node.x + node.width/2;
      const nodeTop = node.y - node.height/2;
      const nodeBottom = node.y + node.height/2;
      
      return x >= nodeLeft && x <= nodeRight && y >= nodeTop && y <= nodeBottom;
    });

    if (clickedNode) {
      setSelectedNode(selectedNode?.id === clickedNode.id ? null : clickedNode);
      onNodeSelect?.(selectedNode?.id === clickedNode.id ? null : clickedNode);
    } else {
      setSelectedNode(null);
      onNodeSelect?.(null);
      setIsDragging(true);
      setDragStart({ x: event.clientX - pan.x, y: event.clientY - pan.y });
    }
  };

  const handleCanvasMouseMove = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;

    if (isDragging) {
      setPan({
        x: event.clientX - dragStart.x,
        y: event.clientY - dragStart.y
      });
    } else {
      const rect = canvasRef.current.getBoundingClientRect();
      const x = (event.clientX - rect.left) / zoom - pan.x;
      const y = (event.clientY - rect.top) / zoom - pan.y;

      const hoveredNode = nodes.find(node => {
        const nodeLeft = node.x - node.width/2;
        const nodeRight = node.x + node.width/2;
        const nodeTop = node.y - node.height/2;
        const nodeBottom = node.y + node.height/2;
        
        return x >= nodeLeft && x <= nodeRight && y >= nodeTop && y <= nodeBottom;
      });

      setHoveredNode(hoveredNode || null);
    }
  };

  const handleCanvasMouseUp = () => {
    setIsDragging(false);
  };

  const handleZoomIn = () => setZoom(prev => Math.min(prev * 1.3, 4));
  const handleZoomOut = () => setZoom(prev => Math.max(prev / 1.3, 0.2));
  const handleCenter = () => {
    setPan({ x: 0, y: 0 });
    setZoom(1);
  };

  const handleRefresh = () => {
    setSelectedNode(null);
    setHoveredNode(null);
    onRefresh?.();
  };

  return (
    <Box 
      ref={containerRef}
      sx={{ 
        position: 'relative', 
        width: fullscreen ? '100vw' : width, 
        height: fullscreen ? '100vh' : height,
        pointerEvents: 'auto',
        overflow: 'hidden',
        bgcolor: 'background.default',
        borderRadius: fullscreen ? 0 : 2,
        border: fullscreen ? 'none' : 1,
        borderColor: 'divider'
      }}
    >
      {/* ✅ Enhanced MUI Controls with better fullscreen positioning */}
      <Paper
        elevation={3}
        sx={{
          position: 'absolute',
          top: fullscreen ? 20 : 12,
          left: fullscreen ? 20 : 12,
          zIndex: 10,
          p: 1.5,
          borderRadius: 2,
          ...(fullscreen && {
            '@media (max-width: 768px)': {
              top: 16,
              left: 16,
              p: 1
            }
          })
        }}
      >
        <Stack direction={fullscreen ? "column" : "row"} spacing={1} alignItems="center">
          <Tooltip title={intl.formatMessage({ id: isPlaying ? 'osswarm.graph.pauseAnimation' : 'osswarm.graph.playAnimation' })}>
            <IconButton
              size="small"
              onClick={() => setIsPlaying(!isPlaying)}
              color={isPlaying ? 'secondary' : 'primary'}
              sx={{ 
                bgcolor: isPlaying ? 'secondary.light' : 'primary.light',
                color: 'white',
                '&:hover': {
                  bgcolor: isPlaying ? 'secondary.main' : 'primary.main'
                }
              }}
            >
              {isPlaying ? <Pause /> : <PlayArrow />}
            </IconButton>
          </Tooltip>
          
          {!fullscreen && <Divider orientation="vertical" flexItem />}
          
          <ButtonGroup size="small" variant="outlined" orientation={fullscreen ? "vertical" : "horizontal"}>
            <Tooltip title={intl.formatMessage({ id: 'osswarm.graph.zoomIn' })}>
              <IconButton onClick={handleZoomIn}>
                <ZoomIn />
              </IconButton>
            </Tooltip>
            
            <Tooltip title={intl.formatMessage({ id: 'osswarm.graph.zoomOut' })}>
              <IconButton onClick={handleZoomOut}>
                <ZoomOut />
              </IconButton>
            </Tooltip>
            
            <Tooltip title={intl.formatMessage({ id: 'osswarm.graph.centerView' })}>
              <IconButton onClick={handleCenter}>
                <CenterFocusStrong />
              </IconButton>
            </Tooltip>
          </ButtonGroup>

          <Tooltip title={intl.formatMessage({ id: 'osswarm.graph.refresh' })}>
            <IconButton size="small" onClick={handleRefresh}>
              <Refresh />
            </IconButton>
          </Tooltip>

          {onFullscreenToggle && (
            <Tooltip title={intl.formatMessage({ id: fullscreen ? 'osswarm.graph.exitFullscreen' : 'osswarm.graph.fullscreen' })}>
              <IconButton size="small" onClick={onFullscreenToggle}>
                {fullscreen ? <FullscreenExit /> : <Fullscreen />}
              </IconButton>
            </Tooltip>
          )}

          <Typography variant="caption" sx={{ ml: 1, minWidth: 40, color: 'text.secondary' }}>
            {zoom.toFixed(1)}x
          </Typography>
        </Stack>
      </Paper>

      {/* ✅ Enhanced MUI Stats Panel with better fullscreen positioning */}
      {graph && (
        <Fade in={true}>
          <Paper
            elevation={3}
            sx={{
              position: 'absolute',
              top: fullscreen ? 20 : 12,
              right: fullscreen ? 20 : 12,
              zIndex: 10,
              p: 2,
              minWidth: fullscreen ? 280 : 220,
              borderRadius: 2,
              ...(fullscreen && {
                '@media (max-width: 768px)': {
                  top: 16,
                  right: 16,
                  left: 16,
                  minWidth: 'auto'
                }
              })
            }}
          >
            <Stack spacing={2}>
              <Stack direction="row" alignItems="center" spacing={1}>
                <Timeline color="primary" />
                <Typography variant="h6" sx={{ fontSize: fullscreen ? '1.1rem' : '1rem' }}>
                  {intl.formatMessage({ id: 'osswarm.graph.executionStatus' })}
                </Typography>
              </Stack>
              
              <Stack direction="row" spacing={2} justifyContent="space-between">
                <Box textAlign="center" sx={{ flex: 1 }}>
                  <Typography variant="caption" color="text.secondary">
                    {intl.formatMessage({ id: 'osswarm.graph.agents' })}
                  </Typography>
                  <Typography variant="h6" fontWeight="bold">
                    {graph.agents.length}
                  </Typography>
                </Box>
                <Box textAlign="center" sx={{ flex: 1 }}>
                  <Typography variant="caption" color="text.secondary">
                    {intl.formatMessage({ id: 'osswarm.graph.tasks' })}
                  </Typography>
                  <Typography variant="h6" fontWeight="bold">
                    {graph.tasks.length}
                  </Typography>
                </Box>
              </Stack>
              
              <Stack direction="row" spacing={2} justifyContent="space-between">
                <Box textAlign="center" sx={{ flex: 1 }}>
                  <Typography variant="caption" color="text.secondary">
                    {intl.formatMessage({ id: 'osswarm.graph.tools' })}
                  </Typography>
                  <Typography variant="h6" fontWeight="bold">
                    {graph.toolExecutions.length}
                  </Typography>
                </Box>
                <Box textAlign="center" sx={{ flex: 1 }}>
                  <Typography variant="caption" color="text.secondary">
                    {intl.formatMessage({ id: 'osswarm.graph.status' })}
                  </Typography>
                  <Chip
                    label={graph.execution.status.toUpperCase()}
                    size="small"
                    color={
                      graph.execution.status === 'completed' ? 'success' :
                      graph.execution.status === 'failed' ? 'error' :
                      graph.execution.status === 'running' ? 'info' :
                      'default'
                    }
                  />
                </Box>
              </Stack>
            </Stack>
          </Paper>
        </Fade>
      )}

      {/* ✅ Node Details Panel positioned near the selected node */}
      {selectedNode && (
        <Zoom in={true}>
          <Card
            elevation={4}
            sx={{
              position: 'absolute',
              zIndex: 15, // Higher than other panels
              overflow: 'hidden',
              borderRadius: 2,
              // ✅ Dynamic positioning based on selected node
              ...(() => {
                const position = calculatePanelPosition(selectedNode);
                return {
                  ...(position.left !== null && { left: position.left }),
                  ...(position.right !== null && { right: position.right }),
                  ...(position.top !== null && { top: position.top }),
                  ...(position.bottom !== null && { bottom: position.bottom }),
                  width: fullscreen ? Math.min(450, window.innerWidth * 0.35) : 350,
                  maxHeight: fullscreen ? 'min(500px, 60vh)' : 'min(400px, 60vh)',
                  // Add a subtle pointer/arrow effect
                  '&::before': {
                    content: '""',
                    position: 'absolute',
                    width: 0,
                    height: 0,
                    borderStyle: 'solid',
                    // Position arrow based on panel position relative to node
                    ...(position.preference === 1 && {
                      // Panel is to the right of node - arrow on left
                      left: -8,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      borderWidth: '8px 8px 8px 0',
                      borderColor: `transparent ${theme.palette.background.paper} transparent transparent`
                    }),
                    ...(position.preference === 2 && {
                      // Panel is to the left of node - arrow on right
                      right: -8,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      borderWidth: '8px 0 8px 8px',
                      borderColor: `transparent transparent transparent ${theme.palette.background.paper}`
                    }),
                    ...(position.preference === 3 && {
                      // Panel is below node - arrow on top
                      top: -8,
                      left: '50%',
                      transform: 'translateX(-50%)',
                      borderWidth: '0 8px 8px 8px',
                      borderColor: `transparent transparent ${theme.palette.background.paper} transparent`
                    }),
                    ...(position.preference === 4 && {
                      // Panel is above node - arrow on bottom
                      bottom: -8,
                      left: '50%',
                      transform: 'translateX(-50%)',
                      borderWidth: '8px 8px 0 8px',
                      borderColor: `${theme.palette.background.paper} transparent transparent transparent`
                    })
                  }
                };
              })(),
              // ✅ Enhanced visual connection to selected node
              border: 2,
              borderColor: selectedNode.borderColor,
              boxShadow: `0 8px 32px ${alpha(selectedNode.borderColor, 0.3)}`,
              // ✅ Mobile responsive adjustments
              '@media (max-width: 768px)': {
                width: 'calc(100vw - 40px)',
                maxWidth: 'calc(100vw - 40px)',
                left: '20px !important',
                right: 'auto !important',
                maxHeight: '50vh',
                // Remove arrow on mobile for cleaner look
                '&::before': {
                  display: 'none'
                }
              }
            }}
          >
            <CardContent 
              sx={{ 
                p: fullscreen ? 3 : 2.5,
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden'
              }}
            >
              <Stack spacing={2} sx={{ height: '100%' }}>
                {/* Header section - fixed */}
                <Stack direction="row" alignItems="center" spacing={2} sx={{ flexShrink: 0 }}>
                  <Paper
                    sx={{ 
                      p: 1, 
                      borderRadius: 1, 
                      bgcolor: selectedNode.color,
                      border: 2,
                      borderColor: selectedNode.borderColor,
                      flexShrink: 0
                    }}
                  >
                    {selectedNode.type === 'execution' && <AccountTree />}
                    {selectedNode.type === 'agent' && <Person />}
                    {selectedNode.type === 'task' && <Task />}
                    {selectedNode.type === 'tool' && <Build />}
                  </Paper>
                  <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                    <Typography 
                      variant="h6" 
                      sx={{ 
                        fontSize: fullscreen ? '1.2rem' : '1.1rem',
                        fontWeight: 600
                      }} 
                      noWrap
                    >
                      {intl.formatMessage({ id: `osswarm.graph.${selectedNode.type}` })}
                    </Typography>
                    <Chip 
                      label={selectedNode.status.toUpperCase()} 
                      size="small" 
                      color={
                        selectedNode.status === 'completed' ? 'success' :
                        selectedNode.status === 'failed' ? 'error' :
                        selectedNode.status === 'running' ? 'info' :
                        'default'
                      }
                    />
                  </Box>
                  <Tooltip title={intl.formatMessage({ id: 'common.close' })}>
                    <IconButton 
                      size="small" 
                      onClick={() => {
                        setSelectedNode(null);
                        onNodeSelect?.(null);
                      }}
                      sx={{ flexShrink: 0 }}
                    >
                      <Close />
                    </IconButton>
                  </Tooltip>
                </Stack>

                {/* Label section - fixed */}
                <Typography 
                  variant="body2" 
                  fontWeight="medium" 
                  sx={{ 
                    wordBreak: 'break-word',
                    fontSize: fullscreen ? '0.95rem' : '0.875rem',
                    flexShrink: 0
                  }}
                >
                  {selectedNode.label}
                </Typography>

                {/* Metadata section - scrollable */}
                {selectedNode.metadata && (
                  <Box sx={{ 
                    flexGrow: 1,
                    overflow: 'auto',
                    pr: 1, // Add padding for scrollbar
                    minHeight: 0 // Important for flex child to shrink
                  }}>
                    <Stack spacing={fullscreen ? 2 : 1}>
                      {selectedNode.type === 'execution' && (
                        <>
                          <Typography variant="caption" display="block">
                            <strong>{intl.formatMessage({ id: 'osswarm.graph.created' })}:</strong> {new Date(selectedNode.metadata.created_at).toLocaleString()}
                          </Typography>
                          {selectedNode.metadata.started_at && (
                            <Typography variant="caption" display="block">
                              <strong>{intl.formatMessage({ id: 'osswarm.graph.started' })}:</strong> {new Date(selectedNode.metadata.started_at).toLocaleString()}
                            </Typography>
                          )}
                          {selectedNode.metadata.completed_at && (
                            <Typography variant="caption" display="block">
                              <strong>{intl.formatMessage({ id: 'osswarm.graph.completed' })}:</strong> {new Date(selectedNode.metadata.completed_at).toLocaleString()}
                            </Typography>
                          )}
                          {/* Enhanced logs summary for execution */}
                          {graph && graph.logs && (
                            <Stack spacing={1}>
                              <Typography variant="caption" display="block">
                                <strong>{intl.formatMessage({ id: 'osswarm.graph.totalLogs' }, { count: graph.logs.length })}:</strong> {graph.logs.length}
                              </Typography>
                              <Stack direction="row" spacing={0.5} flexWrap="wrap">
                                {graph.logs.filter(l => l.log_type === 'error').length > 0 && (
                                  <Chip 
                                    label={`${graph.logs.filter(l => l.log_type === 'error').length} errors`}
                                    size="small"
                                    color="error"
                                    sx={{ height: 20, fontSize: '0.65rem' }}
                                  />
                                )}
                                {graph.logs.filter(l => l.log_type === 'warning').length > 0 && (
                                  <Chip 
                                    label={`${graph.logs.filter(l => l.log_type === 'warning').length} warnings`}
                                    size="small"
                                    color="warning"
                                    sx={{ height: 20, fontSize: '0.65rem' }}
                                  />
                                )}
                                {graph.logs.filter(l => l.log_type === 'info').length > 0 && (
                                  <Chip 
                                    label={`${graph.logs.filter(l => l.log_type === 'info').length} info`}
                                    size="small"
                                    color="info"
                                    sx={{ height: 20, fontSize: '0.65rem' }}
                                  />
                                )}
                              </Stack>
                            </Stack>
                          )}
                        </>
                      )}
                      
                      {selectedNode.type === 'agent' && (
                        <>
                          <Typography variant="caption" display="block">
                            <strong>{intl.formatMessage({ id: 'osswarm.graph.role' })}:</strong> {selectedNode.metadata.role}
                          </Typography>
                          {selectedNode.metadata.expertise && (
                            <Typography variant="caption" display="block">
                              <strong>{intl.formatMessage({ id: 'osswarm.graph.expertise' })}:</strong> {JSON.parse(selectedNode.metadata.expertise).join(', ')}
                            </Typography>
                          )}
                          {selectedNode.metadata.current_task && (
                            <Typography variant="caption" display="block" sx={{ wordBreak: 'break-word' }}>
                              <strong>{intl.formatMessage({ id: 'osswarm.graph.currentTask' })}:</strong> {selectedNode.metadata.current_task}
                            </Typography>
                          )}
                          {graph && graph.logs && (
                            <Typography variant="caption" display="block">
                              <strong>{intl.formatMessage({ id: 'osswarm.graph.agentLogs' })}:</strong> {graph.logs.filter(l => l.agent_id === selectedNode.metadata.id).length}
                            </Typography>
                          )}
                        </>
                      )}
                      
                      {selectedNode.type === 'task' && (
                        <>
                          <Typography variant="caption" display="block">
                            <strong>{intl.formatMessage({ id: 'osswarm.graph.priority' })}:</strong> {selectedNode.metadata.priority}
                          </Typography>
                          <Typography variant="caption" display="block">
                            <strong>{intl.formatMessage({ id: 'osswarm.graph.iterations' })}:</strong> {selectedNode.metadata.iterations}/{selectedNode.metadata.max_iterations}
                          </Typography>
                          {selectedNode.metadata.result && (
                            <Typography variant="caption" display="block" sx={{ wordBreak: 'break-word' }}>
                              <strong>{intl.formatMessage({ id: 'osswarm.graph.result' })}:</strong> {selectedNode.metadata.result.substring(0, fullscreen ? 300 : 150)}{selectedNode.metadata.result.length > (fullscreen ? 300 : 150) ? '...' : ''}
                            </Typography>
                          )}
                          {graph && graph.logs && (
                            <Typography variant="caption" display="block">
                              <strong>{intl.formatMessage({ id: 'osswarm.graph.taskLogs' })}:</strong> {graph.logs.filter(l => l.task_id === selectedNode.metadata.id).length}
                            </Typography>
                          )}
                        </>
                      )}
                      
                      {selectedNode.type === 'tool' && (
                        <>
                          <Typography variant="caption" display="block">
                            <strong>{intl.formatMessage({ id: 'osswarm.graph.tool' })}:</strong> {selectedNode.metadata.tool_name}
                          </Typography>
                          {selectedNode.metadata.mcp_server && (
                            <Typography variant="caption" display="block">
                              <strong>{intl.formatMessage({ id: 'osswarm.graph.mcpServer' })}:</strong> {selectedNode.metadata.mcp_server}
                            </Typography>
                          )}
                          {selectedNode.metadata.execution_time && (
                            <Typography variant="caption" display="block">
                              <strong>{intl.formatMessage({ id: 'osswarm.graph.executionTime' })}:</strong> {selectedNode.metadata.execution_time}s
                            </Typography>
                          )}
                          <Typography variant="caption" display="block">
                            <strong>{intl.formatMessage({ id: 'osswarm.graph.humanApproved' })}:</strong> {selectedNode.metadata.human_approved ? intl.formatMessage({ id: 'common.yes' }) : intl.formatMessage({ id: 'common.no' })}
                          </Typography>
                          {graph && graph.logs && (
                            <Typography variant="caption" display="block">
                              <strong>{intl.formatMessage({ id: 'osswarm.graph.toolLogs' })}:</strong> {graph.logs.filter(l => l.tool_execution_id === selectedNode.metadata.id).length}
                            </Typography>
                          )}
                        </>
                      )}
                    </Stack>
                  </Box>
                )}
              </Stack>
            </CardContent>
          </Card>
        </Zoom>
      )}

      {/* Canvas */}
      <canvas
        ref={canvasRef}
        width={fullscreen ? window.innerWidth : width}
        height={fullscreen ? window.innerHeight : height}
        onMouseDown={handleCanvasMouseDown}
        onMouseMove={handleCanvasMouseMove}
        onMouseUp={handleCanvasMouseUp}
        onMouseLeave={handleCanvasMouseUp}
        style={{
          cursor: isDragging ? 'grabbing' : hoveredNode ? 'pointer' : 'grab',
          backgroundColor: theme.palette.mode === 'dark' ? theme.palette.grey[900] : theme.palette.background.default,
          pointerEvents: 'auto',
          userSelect: 'none'
        }}
      />

      {/* ✅ Enhanced Empty State */}
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
          <AccountTree sx={{ fontSize: 64, opacity: 0.3, mb: 2 }} />
          <Typography variant="h6" gutterBottom>
            {intl.formatMessage({ id: 'osswarm.graph.noExecutionGraph' })}
          </Typography>
          <Typography variant="body2">
            {intl.formatMessage({ id: 'osswarm.graph.startExecutionToSeeGraph' })}
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default ExecutionGraphComponent; 