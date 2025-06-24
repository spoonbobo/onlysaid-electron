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
import { ExecutionGraph } from '@/renderer/stores/Agent/task';

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
  debug?: boolean;
}

// Add these new interfaces for better task and tool display
interface TaskDetails {
  description: string;
  assignedAgent: string;
  priority: number;
  iterations: number;
  maxIterations: number;
  result?: string;
  logs: number;
}

interface ToolDetails {
  name: string;
  arguments: any;
  mcpServer: string;
  executionTime?: number;
  result?: string;
  error?: string;
  humanApproved: boolean;
  logs: number;
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
  onRefresh,
  debug = false
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
  
  // ✅ Fixed: Use container dimensions that respect parent constraints
  const [containerDimensions, setContainerDimensions] = useState({ width, height });

  // ✅ Use MUI theme-friendly status colors
  const statusColors = useMemo(() => getStatusColors(theme), [theme]);

  // ✅ Fixed: Better dimension handling that respects constraints
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const newWidth = rect.width > 0 ? rect.width : width;
        const newHeight = rect.height > 0 ? rect.height : height;
        
        setContainerDimensions({
          width: newWidth,
          height: newHeight
        });
      }
    };

    // Initial measurement
    updateDimensions();

    // Update on resize
    const resizeObserver = new ResizeObserver(updateDimensions);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => {
      resizeObserver.disconnect();
    };
  }, [width, height, fullscreen]);

  // ✅ Calculate optimal position for node details panel
  const calculatePanelPosition = useCallback((node: Node) => {
    if (!containerRef.current) return { top: 20, left: 20, right: null, bottom: null, preference: 5 };

    const containerWidth = fullscreen ? window.innerWidth : containerDimensions.width;
    const containerHeight = fullscreen ? window.innerHeight : containerDimensions.height;
    
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
  }, [zoom, pan, containerDimensions, fullscreen]);

  // Enhanced node and edge calculation with better positioning
  const { nodes, edges, stats } = useMemo(() => {
    // ✅ FIXED: Better logging with debug flag
    if (debug) {
      const now = Date.now();
      if (!(window as any).lastGraphLog || now - (window as any).lastGraphLog > 2000) {
        console.log('[ExecutionGraph] Recalculating graph with:', {
          hasGraph: !!graph,
          agentCount: graph?.agents?.length || 0,
          taskCount: graph?.tasks?.length || 0,
          toolCount: graph?.toolExecutions?.length || 0,
          agentStatuses: graph?.agents?.map(a => ({ 
            id: a.id, 
            role: a.role, 
            status: a.status,
            agent_id: a.agent_id,
            last_updated: a.last_updated 
          })) || []
        });
        (window as any).lastGraphLog = now;
      }
    }
    
    if (!graph) return { nodes: [], edges: [], stats: { total: 0, completed: 0, failed: 0, running: 0 } };

    const nodes: Node[] = [];
    const edges: Edge[] = [];
    
    // ✅ Use dynamic container dimensions
    const centerX = containerDimensions.width / 2;
    const centerY = containerDimensions.height / 2;

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

    // ✅ IMPROVED: Better agent node positioning and status handling
    const agentRadius = Math.min(containerDimensions.width, containerDimensions.height) * 0.25;
    const agentCount = graph.agents.length;
    
    graph.agents.forEach((agent, index) => {
      const angle = (2 * Math.PI * index) / agentCount - Math.PI / 2;
      
      // ✅ IMPROVED: Better agent status handling with fallback
      const agentStatus = agent.status || 'idle';
      
      // ✅ IMPROVED: Better agent identification
      const agentLabel = agent.role || `Agent ${index + 1}`;
      
      if (debug) {
        console.log(`[ExecutionGraph] Creating agent node:`, {
          id: agent.id,
          agent_id: agent.agent_id,
          role: agent.role,
          status: agentStatus,
          last_updated: agent.last_updated
        });
      }
      
      const agentNode: Node = {
        id: agent.id,
        type: 'agent',
        label: agentLabel,
        status: agentStatus,
        x: centerX + Math.cos(angle) * agentRadius,
        y: centerY + Math.sin(angle) * agentRadius,
        width: nodeTypes.agent.width,
        height: nodeTypes.agent.height,
        color: statusColors[agentStatus as keyof typeof statusColors]?.bg || theme.palette.grey[100],
        borderColor: statusColors[agentStatus as keyof typeof statusColors]?.border || theme.palette.grey[400],
        metadata: agent,
        connections: [graph.execution.id],
      };
      nodes.push(agentNode);

      // ✅ IMPROVED: Better edge animation based on status
      const isActiveStatus = ['busy', 'running', 'executing', 'completed'].includes(agentStatus);
      
      edges.push({
        id: `exec-${agent.id}`,
        from: graph.execution.id,
        to: agent.id,
        type: 'creates',
        animated: isActiveStatus && isLive,
        color: isActiveStatus ? theme.palette.primary.main : theme.palette.grey[400],
        width: isActiveStatus ? 3 : 2
      });
    });

    // ✅ IMPROVED: Better task node handling with enhanced agent matching
    graph.tasks.forEach((task) => {
      // ✅ ENHANCED: Multiple strategies for finding parent agent node
      const agentNode = nodes.find(n => {
        if (!n.metadata || n.type !== 'agent') return false;
        
        // Try multiple matching strategies
        const matchStrategies = [
          n.metadata.id === task.agent_id,                    // Direct ID match
          n.metadata.agent_id === task.agent_id,              // Agent ID field match
          n.id === task.agent_id,                             // Node ID match
          n.metadata.role === task.agent_id,                  // Role-based match
          // ✅ NEW: Try matching by role if agent_id looks like a role
          task.agent_id && typeof task.agent_id === 'string' && 
          task.agent_id.toLowerCase().includes(n.metadata.role?.toLowerCase() || '')
        ];
        
        return matchStrategies.some(Boolean);
      });
      
      if (!agentNode) {
        if (debug) {
          console.warn('[ExecutionGraph] No agent node found for task:', {
            taskId: task.id,
            agentId: task.agent_id,
            taskDescription: task.task_description?.substring(0, 50),
            availableAgents: nodes.filter(n => n.type === 'agent').map(n => ({
              id: n.id,
              metadataId: n.metadata?.id,
              agentId: n.metadata?.agent_id,
              role: n.metadata?.role
            }))
          });
        }
        return;
      }

      const tasksForAgent = graph.tasks.filter(t => t.agent_id === task.agent_id);
      const indexInAgent = tasksForAgent.findIndex(t => t.id === task.id);
      const taskRadius = 100;
      const taskAngle = tasksForAgent.length > 1 ? (2 * Math.PI * indexInAgent) / tasksForAgent.length : 0;

      // ✅ IMPROVED: Handle task status properly with fallback
      const taskStatus = task.status || 'pending';

      const taskNode: Node = {
        id: task.id,
        type: 'task',
        label: task.task_description?.length > 25 
          ? task.task_description.substring(0, 22) + '...'
          : task.task_description || `Task ${task.id}`,
        status: taskStatus,
        x: agentNode.x + Math.cos(taskAngle) * taskRadius,
        y: agentNode.y + Math.sin(taskAngle) * taskRadius,
        width: nodeTypes.task.width,
        height: nodeTypes.task.height,
        color: statusColors[taskStatus as keyof typeof statusColors]?.bg || theme.palette.grey[100],
        borderColor: statusColors[taskStatus as keyof typeof statusColors]?.border || theme.palette.grey[400],
        metadata: task,
        connections: [agentNode.id],
      };
      nodes.push(taskNode);

      const isActiveTaskStatus = ['running', 'executing'].includes(taskStatus);

      edges.push({
        id: `agent-${task.id}`,
        from: agentNode.id,
        to: task.id,
        type: 'executes',
        animated: isActiveTaskStatus && isLive,
        color: isActiveTaskStatus ? theme.palette.success.main : theme.palette.success.light,
        width: isActiveTaskStatus ? 3 : 2
      });
    });

    // ✅ IMPROVED: Better tool execution nodes logic with enhanced parent matching
    graph.toolExecutions.forEach((toolExec) => {
      // ✅ ENHANCED: Better parent node matching with multiple strategies
      let parentNode = null;
      
      // Strategy 1: Try to find by task_id first (most specific)
      if (toolExec.task_id) {
        parentNode = nodes.find(n => 
          n.id === toolExec.task_id || 
          (n.metadata && n.metadata.id === toolExec.task_id)
        );
      }
      
      // Strategy 2: Fall back to agent_id if no task found
      if (!parentNode && toolExec.agent_id) {
        parentNode = nodes.find(n => {
          if (!n.metadata) return false;
          return n.metadata.id === toolExec.agent_id ||
                 n.metadata.agent_id === toolExec.agent_id ||
                 n.id === toolExec.agent_id ||
                 (n.metadata.role && n.metadata.role === toolExec.agent_id);
        });
      }
      
      if (!parentNode) {
        if (debug) {
          console.warn('[ExecutionGraph] No parent node found for tool execution:', {
            toolId: toolExec.id,
            toolName: toolExec.tool_name,
            taskId: toolExec.task_id,
            agentId: toolExec.agent_id,
            availableNodes: nodes.map(n => ({ 
              id: n.id, 
              type: n.type, 
              metadataId: n.metadata?.id,
              role: n.metadata?.role 
            }))
          });
        }
        return;
      }

      const toolsForParent = graph.toolExecutions.filter(t => 
        toolExec.task_id ? t.task_id === toolExec.task_id : t.agent_id === toolExec.agent_id
      );
      const indexInParent = toolsForParent.findIndex(t => t.id === toolExec.id);
      const toolRadius = 65;
      const toolAngle = toolsForParent.length > 1 ? (2 * Math.PI * indexInParent) / toolsForParent.length : 0;

      // ✅ IMPROVED: Handle tool execution status properly with fallback
      const toolStatus = toolExec.status || 'pending';

      const toolNode: Node = {
        id: toolExec.id,
        type: 'tool',
        label: toolExec.tool_name || 'Unknown Tool',
        status: toolStatus,
        x: parentNode.x + Math.cos(toolAngle) * toolRadius,
        y: parentNode.y + Math.sin(toolAngle) * toolRadius,
        width: nodeTypes.tool.width,
        height: nodeTypes.tool.height,
        color: statusColors[toolStatus as keyof typeof statusColors]?.bg || theme.palette.grey[100],
        borderColor: statusColors[toolStatus as keyof typeof statusColors]?.border || theme.palette.grey[400],
        metadata: toolExec,
        connections: [parentNode.id],
      };
      nodes.push(toolNode);

      const isActiveToolStatus = ['executing', 'running'].includes(toolStatus);

      edges.push({
        id: `parent-${toolExec.id}`,
        from: parentNode.id,
        to: toolExec.id,
        type: 'uses',
        animated: isActiveToolStatus && isLive,
        color: isActiveToolStatus ? theme.palette.warning.main : theme.palette.warning.light,
        width: isActiveToolStatus ? 3 : 2
      });
    });

    // ✅ IMPROVED: Better stats calculation with proper null handling
    const allNodes = [
      ...(graph.agents || []), 
      ...(graph.tasks || []), 
      ...(graph.toolExecutions || [])
    ];
    
    const stats = {
      total: allNodes.length,
      completed: allNodes.filter(n => n.status === 'completed').length,
      failed: allNodes.filter(n => n.status === 'failed').length,
      running: allNodes.filter(n => ['running', 'busy', 'executing'].includes(n.status || '')).length
    };

    if (debug) {
      console.log('[ExecutionGraph] Graph calculation complete:', {
        nodeCount: nodes.length,
        edgeCount: edges.length,
        stats
      });
    }

    return { nodes, edges, stats };
  }, [graph, containerDimensions, statusColors, theme, isLive, debug]);

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
        
        for (let x = -containerDimensions.width; x < containerDimensions.width * 2; x += gridSize) {
          ctx.beginPath();
          ctx.moveTo(x, -containerDimensions.height);
          ctx.lineTo(x, containerDimensions.height * 2);
          ctx.stroke();
        }
        
        for (let y = -containerDimensions.height; y < containerDimensions.height * 2; y += gridSize) {
          ctx.beginPath();
          ctx.moveTo(-containerDimensions.width, y);
          ctx.lineTo(containerDimensions.width * 2, y);
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
  }, [isPlaying, nodes, edges, zoom, pan, selectedNode, hoveredNode, theme, statusColors, containerDimensions]);

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
        // ✅ Fixed: Proper container sizing with constraints
        position: 'relative',
        width: fullscreen ? '100vw' : width,
        height: fullscreen ? '100vh' : height,
        maxWidth: fullscreen ? '100vw' : '100%',
        maxHeight: fullscreen ? '100vh' : '100%',
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
          <Tooltip title={intl.formatMessage({ id: isPlaying ? 'agent.graph.pauseAnimation' : 'agent.graph.playAnimation' })}>
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
            <Tooltip title={intl.formatMessage({ id: 'agent.graph.zoomIn' })}>
              <IconButton onClick={handleZoomIn}>
                <ZoomIn />
              </IconButton>
            </Tooltip>
            
            <Tooltip title={intl.formatMessage({ id: 'agent.graph.zoomOut' })}>
              <IconButton onClick={handleZoomOut}>
                <ZoomOut />
              </IconButton>
            </Tooltip>
            
            <Tooltip title={intl.formatMessage({ id: 'agent.graph.centerView' })}>
              <IconButton onClick={handleCenter}>
                <CenterFocusStrong />
              </IconButton>
            </Tooltip>
          </ButtonGroup>

          <Tooltip title={intl.formatMessage({ id: 'agent.graph.refresh' })}>
            <IconButton size="small" onClick={handleRefresh}>
              <Refresh />
            </IconButton>
          </Tooltip>

          {onFullscreenToggle && (
            <Tooltip title={intl.formatMessage({ id: fullscreen ? 'agent.graph.exitFullscreen' : 'agent.graph.fullscreen' })}>
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
                  {intl.formatMessage({ id: 'agent.graph.executionStatus' })}
                </Typography>
              </Stack>
              
              <Stack direction="row" spacing={2} justifyContent="space-between">
                <Box textAlign="center" sx={{ flex: 1 }}>
                  <Typography variant="caption" color="text.secondary">
                    {intl.formatMessage({ id: 'agent.graph.agents' })}
                  </Typography>
                  <Typography variant="h6" fontWeight="bold">
                    {graph.agents.length}
                  </Typography>
                </Box>
                <Box textAlign="center" sx={{ flex: 1 }}>
                  <Typography variant="caption" color="text.secondary">
                    {intl.formatMessage({ id: 'agent.graph.tasks' })}
                  </Typography>
                  <Typography variant="h6" fontWeight="bold">
                    {graph.tasks.length}
                  </Typography>
                </Box>
              </Stack>
              
              <Stack direction="row" spacing={2} justifyContent="space-between">
                <Box textAlign="center" sx={{ flex: 1 }}>
                  <Typography variant="caption" color="text.secondary">
                    {intl.formatMessage({ id: 'agent.graph.tools' })}
                  </Typography>
                  <Typography variant="h6" fontWeight="bold">
                    {graph.toolExecutions.length}
                  </Typography>
                </Box>
                <Box textAlign="center" sx={{ flex: 1 }}>
                  <Typography variant="caption" color="text.secondary">
                    {intl.formatMessage({ id: 'agent.graph.status' })}
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

      {/* Node Details Panel - keeping all the existing complex positioning logic */}
      {selectedNode && (
        <Zoom in={true}>
          <Card
            elevation={4}
            sx={{
              position: 'absolute',
              zIndex: 15,
              overflow: 'hidden',
              borderRadius: 2,
              ...(() => {
                const position = calculatePanelPosition(selectedNode);
                return {
                  ...(position.left !== null && { left: position.left }),
                  ...(position.right !== null && { right: position.right }),
                  ...(position.top !== null && { top: position.top }),
                  ...(position.bottom !== null && { bottom: position.bottom }),
                  width: fullscreen ? Math.min(450, window.innerWidth * 0.35) : 350,
                  maxHeight: fullscreen ? 'min(500px, 60vh)' : 'min(400px, 60vh)',
                  '&::before': {
                    content: '""',
                    position: 'absolute',
                    width: 0,
                    height: 0,
                    borderStyle: 'solid',
                    ...(position.preference === 1 && {
                      left: -8,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      borderWidth: '8px 8px 8px 0',
                      borderColor: `transparent ${theme.palette.background.paper} transparent transparent`
                    }),
                    ...(position.preference === 2 && {
                      right: -8,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      borderWidth: '8px 0 8px 8px',
                      borderColor: `transparent transparent transparent ${theme.palette.background.paper}`
                    }),
                    ...(position.preference === 3 && {
                      top: -8,
                      left: '50%',
                      transform: 'translateX(-50%)',
                      borderWidth: '0 8px 8px 8px',
                      borderColor: `transparent transparent ${theme.palette.background.paper} transparent`
                    }),
                    ...(position.preference === 4 && {
                      bottom: -8,
                      left: '50%',
                      transform: 'translateX(-50%)',
                      borderWidth: '8px 8px 0 8px',
                      borderColor: `${theme.palette.background.paper} transparent transparent transparent`
                    })
                  }
                };
              })(),
              border: 2,
              borderColor: selectedNode.borderColor,
              boxShadow: `0 8px 32px ${alpha(selectedNode.borderColor, 0.3)}`,
              '@media (max-width: 768px)': {
                width: 'calc(100vw - 40px)',
                maxWidth: 'calc(100vw - 40px)',
                left: '20px !important',
                right: 'auto !important',
                maxHeight: '50vh',
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
                      {intl.formatMessage({ id: `agent.graph.${selectedNode.type}` })}
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

                {selectedNode.metadata && (
                  <Box sx={{ 
                    flexGrow: 1,
                    overflow: 'auto',
                    pr: 1,
                    minHeight: 0
                  }}>
                    <Stack spacing={fullscreen ? 2 : 1}>
                      {/* Enhanced Execution Details */}
                      {selectedNode.type === 'execution' && (
                        <>
                          <Typography variant="caption" display="block">
                            <strong>{intl.formatMessage({ id: 'agent.graph.created' })}:</strong> {new Date(selectedNode.metadata.created_at).toLocaleString()}
                          </Typography>
                          {selectedNode.metadata.started_at && (
                            <Typography variant="caption" display="block">
                              <strong>{intl.formatMessage({ id: 'agent.graph.started' })}:</strong> {new Date(selectedNode.metadata.started_at).toLocaleString()}
                            </Typography>
                          )}
                          {selectedNode.metadata.completed_at && (
                            <Typography variant="caption" display="block">
                              <strong>{intl.formatMessage({ id: 'agent.graph.completed' })}:</strong> {new Date(selectedNode.metadata.completed_at).toLocaleString()}
                            </Typography>
                          )}
                          
                          {/* ✅ NEW: Show execution summary */}
                          <Divider sx={{ my: 1 }} />
                          <Typography variant="caption" display="block" sx={{ fontWeight: 600 }}>
                            <strong>Execution Summary:</strong>
                          </Typography>
                          <Typography variant="caption" display="block">
                            <strong>Agents:</strong> {selectedNode.metadata.total_agents || graph?.agents.length || 0}
                          </Typography>
                          <Typography variant="caption" display="block">
                            <strong>Tasks:</strong> {selectedNode.metadata.total_tasks || graph?.tasks.length || 0}
                          </Typography>
                          <Typography variant="caption" display="block">
                            <strong>Tool Executions:</strong> {selectedNode.metadata.total_tool_executions || graph?.toolExecutions.length || 0}
                          </Typography>
                          
                          {graph && graph.logs && (
                            <Stack spacing={1}>
                              <Typography variant="caption" display="block">
                                <strong>{intl.formatMessage({ id: 'agent.graph.totalLogs' }, { count: graph.logs.length })}:</strong> {graph.logs.length}
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
                      
                      {/* Enhanced Agent Details */}
                      {selectedNode.type === 'agent' && (
                        <>
                          <Typography variant="caption" display="block">
                            <strong>{intl.formatMessage({ id: 'agent.graph.role' })}:</strong> {selectedNode.metadata.role}
                          </Typography>
                          <Typography variant="caption" display="block">
                            <strong>Agent ID:</strong> {selectedNode.metadata.agent_id || selectedNode.metadata.id}
                          </Typography>
                          {selectedNode.metadata.expertise && (
                            <Typography variant="caption" display="block">
                              <strong>{intl.formatMessage({ id: 'agent.graph.expertise' })}:</strong> {
                                typeof selectedNode.metadata.expertise === 'string' 
                                  ? JSON.parse(selectedNode.metadata.expertise).join(', ')
                                  : Array.isArray(selectedNode.metadata.expertise) 
                                    ? selectedNode.metadata.expertise.join(', ')
                                    : selectedNode.metadata.expertise
                              }
                            </Typography>
                          )}
                          {selectedNode.metadata.current_task && (
                            <Typography variant="caption" display="block" sx={{ wordBreak: 'break-word' }}>
                              <strong>{intl.formatMessage({ id: 'agent.graph.currentTask' })}:</strong> {selectedNode.metadata.current_task}
                            </Typography>
                          )}
                          
                          {/* ✅ NEW: Show agent's tasks */}
                          {graph && graph.tasks && (
                            <>
                              <Divider sx={{ my: 1 }} />
                              <Typography variant="caption" display="block" sx={{ fontWeight: 600 }}>
                                <strong>Assigned Tasks ({graph.tasks.filter(t => t.agent_id === selectedNode.metadata.id).length}):</strong>
                              </Typography>
                              {graph.tasks.filter(t => t.agent_id === selectedNode.metadata.id).map((task, index) => (
                                <Paper 
                                  key={task.id} 
                                  variant="outlined" 
                                  sx={{ p: 1, mb: 1, bgcolor: alpha(theme.palette.background.default, 0.5) }}
                                >
                                  <Typography variant="caption" display="block" sx={{ fontWeight: 500 }}>
                                    Task {index + 1}: {task.task_description}
                                  </Typography>
                                  <Typography variant="caption" display="block" color="text.secondary">
                                    Status: <Chip label={task.status} size="small" sx={{ height: 16, fontSize: '0.6rem' }} />
                                    {task.priority && ` • Priority: ${task.priority}`}
                                  </Typography>
                                  {task.result && (
                                    <Typography variant="caption" display="block" sx={{ mt: 0.5, fontStyle: 'italic' }}>
                                      Result: {task.result.substring(0, 100)}{task.result.length > 100 ? '...' : ''}
                                    </Typography>
                                  )}
                                </Paper>
                              ))}
                            </>
                          )}
                          
                          {/* ✅ NEW: Show agent's tool executions */}
                          {graph && graph.toolExecutions && (
                            <>
                              <Divider sx={{ my: 1 }} />
                              <Typography variant="caption" display="block" sx={{ fontWeight: 600 }}>
                                <strong>Tool Executions ({graph.toolExecutions.filter(t => t.agent_id === selectedNode.metadata.id).length}):</strong>
                              </Typography>
                              {graph.toolExecutions.filter(t => t.agent_id === selectedNode.metadata.id).map((tool, index) => (
                                <Paper 
                                  key={tool.id} 
                                  variant="outlined" 
                                  sx={{ p: 1, mb: 1, bgcolor: alpha(theme.palette.background.default, 0.5) }}
                                >
                                  <Typography variant="caption" display="block" sx={{ fontWeight: 500 }}>
                                    {tool.tool_name}
                                  </Typography>
                                  <Typography variant="caption" display="block" color="text.secondary">
                                    Status: <Chip label={tool.status} size="small" sx={{ height: 16, fontSize: '0.6rem' }} />
                                    {tool.mcp_server && ` • Server: ${tool.mcp_server}`}
                                  </Typography>
                                  {tool.execution_time && (
                                    <Typography variant="caption" display="block" color="text.secondary">
                                      Execution Time: {tool.execution_time}s
                                    </Typography>
                                  )}
                                </Paper>
                              ))}
                            </>
                          )}
                          
                          {graph && graph.logs && (
                            <Typography variant="caption" display="block">
                              <strong>{intl.formatMessage({ id: 'agent.graph.agentLogs' })}:</strong> {graph.logs.filter(l => l.agent_id === selectedNode.metadata.id).length}
                            </Typography>
                          )}
                        </>
                      )}
                      
                      {/* Enhanced Task Details */}
                      {selectedNode.type === 'task' && (
                        <>
                          <Typography variant="caption" display="block" sx={{ fontWeight: 600 }}>
                            <strong>Task Description:</strong>
                          </Typography>
                          <Paper 
                            variant="outlined" 
                            sx={{ p: 1, mb: 1, bgcolor: alpha(theme.palette.background.default, 0.5) }}
                          >
                            <Typography variant="caption" display="block" sx={{ wordBreak: 'break-word' }}>
                              {selectedNode.metadata.task_description}
                            </Typography>
                          </Paper>
                          
                          <Typography variant="caption" display="block">
                            <strong>{intl.formatMessage({ id: 'agent.graph.priority' })}:</strong> {selectedNode.metadata.priority}
                          </Typography>
                          <Typography variant="caption" display="block">
                            <strong>{intl.formatMessage({ id: 'agent.graph.iterations' })}:</strong> {selectedNode.metadata.iterations}/{selectedNode.metadata.max_iterations}
                          </Typography>
                          
                          {/* ✅ NEW: Show assigned agent info */}
                          {graph && graph.agents && (
                            <>
                              <Typography variant="caption" display="block">
                                <strong>Assigned Agent:</strong> {
                                  graph.agents.find(a => a.id === selectedNode.metadata.agent_id)?.role || 'Unknown'
                                }
                              </Typography>
                            </>
                          )}
                          
                          {selectedNode.metadata.result && (
                            <>
                              <Divider sx={{ my: 1 }} />
                              <Typography variant="caption" display="block" sx={{ fontWeight: 600 }}>
                                <strong>Task Result:</strong>
                              </Typography>
                              <Paper 
                                variant="outlined" 
                                sx={{ p: 1, mb: 1, bgcolor: alpha(theme.palette.success.light, 0.1) }}
                              >
                                <Typography variant="caption" display="block" sx={{ wordBreak: 'break-word' }}>
                                  {selectedNode.metadata.result.substring(0, fullscreen ? 400 : 200)}
                                  {selectedNode.metadata.result.length > (fullscreen ? 400 : 200) ? '...' : ''}
                                </Typography>
                              </Paper>
                            </>
                          )}
                          
                          {/* ✅ NEW: Show related tool executions */}
                          {graph && graph.toolExecutions && (
                            <>
                              <Divider sx={{ my: 1 }} />
                              <Typography variant="caption" display="block" sx={{ fontWeight: 600 }}>
                                <strong>Related Tools ({graph.toolExecutions.filter(t => t.task_id === selectedNode.metadata.id).length}):</strong>
                              </Typography>
                              {graph.toolExecutions.filter(t => t.task_id === selectedNode.metadata.id).map((tool, index) => (
                                <Paper 
                                  key={tool.id} 
                                  variant="outlined" 
                                  sx={{ p: 1, mb: 1, bgcolor: alpha(theme.palette.background.default, 0.5) }}
                                >
                                  <Typography variant="caption" display="block" sx={{ fontWeight: 500 }}>
                                    {tool.tool_name}
                                  </Typography>
                                  <Typography variant="caption" display="block" color="text.secondary">
                                    Status: <Chip label={tool.status} size="small" sx={{ height: 16, fontSize: '0.6rem' }} />
                                  </Typography>
                                </Paper>
                              ))}
                            </>
                          )}
                          
                          {graph && graph.logs && (
                            <Typography variant="caption" display="block">
                              <strong>{intl.formatMessage({ id: 'agent.graph.taskLogs' })}:</strong> {graph.logs.filter(l => l.task_id === selectedNode.metadata.id).length}
                            </Typography>
                          )}
                        </>
                      )}
                      
                      {/* Enhanced Tool Details */}
                      {selectedNode.type === 'tool' && (
                        <>
                          <Typography variant="caption" display="block" sx={{ fontWeight: 600 }}>
                            <strong>Tool Information:</strong>
                          </Typography>
                          <Typography variant="caption" display="block">
                            <strong>{intl.formatMessage({ id: 'agent.graph.tool' })}:</strong> {selectedNode.metadata.tool_name}
                          </Typography>
                          {selectedNode.metadata.mcp_server && (
                            <Typography variant="caption" display="block">
                              <strong>{intl.formatMessage({ id: 'agent.graph.mcpServer' })}:</strong> {selectedNode.metadata.mcp_server}
                            </Typography>
                          )}
                          
                          {/* ✅ NEW: Show tool arguments */}
                          {selectedNode.metadata.tool_arguments && (
                            <>
                              <Typography variant="caption" display="block" sx={{ fontWeight: 600, mt: 1 }}>
                                <strong>Arguments:</strong>
                              </Typography>
                              <Paper 
                                variant="outlined" 
                                sx={{ p: 1, mb: 1, bgcolor: alpha(theme.palette.background.default, 0.5) }}
                              >
                                <Typography 
                                  variant="caption" 
                                  display="block" 
                                  sx={{ 
                                    fontFamily: 'monospace', 
                                    fontSize: '0.65rem',
                                    wordBreak: 'break-all',
                                    whiteSpace: 'pre-wrap'
                                  }}
                                >
                                  {typeof selectedNode.metadata.tool_arguments === 'string' 
                                    ? selectedNode.metadata.tool_arguments 
                                    : JSON.stringify(JSON.parse(selectedNode.metadata.tool_arguments || '{}'), null, 2)
                                  }
                                </Typography>
                              </Paper>
                            </>
                          )}
                          
                          {/* ✅ NEW: Show execution details */}
                          <Divider sx={{ my: 1 }} />
                          <Typography variant="caption" display="block" sx={{ fontWeight: 600 }}>
                            <strong>{intl.formatMessage({ id: 'agent.graph.humanApproved' })}:</strong> {selectedNode.metadata.human_approved ? intl.formatMessage({ id: 'common.yes' }) : intl.formatMessage({ id: 'common.no' })}
                          </Typography>
                          {selectedNode.metadata.execution_time && (
                            <Typography variant="caption" display="block">
                              <strong>{intl.formatMessage({ id: 'agent.graph.executionTime' })}:</strong> {selectedNode.metadata.execution_time}s
                            </Typography>
                          )}
                          
                          {/* ✅ NEW: Show tool result */}
                          {selectedNode.metadata.result && (
                            <>
                              <Typography variant="caption" display="block" sx={{ fontWeight: 600, mt: 1 }}>
                                <strong>Result:</strong>
                              </Typography>
                              <Paper 
                                variant="outlined" 
                                sx={{ p: 1, mb: 1, bgcolor: alpha(theme.palette.success.light, 0.1) }}
                              >
                                <Typography 
                                  variant="caption" 
                                  display="block" 
                                  sx={{ 
                                    wordBreak: 'break-word',
                                    maxHeight: 100,
                                    overflow: 'auto'
                                  }}
                                >
                                  {selectedNode.metadata.result.substring(0, fullscreen ? 300 : 150)}
                                  {selectedNode.metadata.result.length > (fullscreen ? 300 : 150) ? '...' : ''}
                                </Typography>
                              </Paper>
                            </>
                          )}
                          
                          {/* ✅ NEW: Show tool error */}
                          {selectedNode.metadata.error && (
                            <>
                              <Typography variant="caption" display="block" sx={{ fontWeight: 600, mt: 1 }}>
                                <strong>Error:</strong>
                              </Typography>
                              <Paper 
                                variant="outlined" 
                                sx={{ p: 1, mb: 1, bgcolor: alpha(theme.palette.error.light, 0.1) }}
                              >
                                <Typography 
                                  variant="caption" 
                                  display="block" 
                                  sx={{ 
                                    wordBreak: 'break-word',
                                    color: 'error.main'
                                  }}
                                >
                                  {selectedNode.metadata.error}
                                </Typography>
                              </Paper>
                            </>
                          )}
                          
                          {/* ✅ NEW: Show related task and agent */}
                          {graph && (
                            <>
                              <Divider sx={{ my: 1 }} />
                              <Typography variant="caption" display="block" sx={{ fontWeight: 600 }}>
                                <strong>Context:</strong>
                              </Typography>
                              {selectedNode.metadata.task_id && graph.tasks && (
                                <Typography variant="caption" display="block">
                                  <strong>Task:</strong> {
                                    graph.tasks.find(t => t.id === selectedNode.metadata.task_id)?.task_description?.substring(0, 50) + '...' || 'Unknown'
                                  }
                                </Typography>
                              )}
                              {selectedNode.metadata.agent_id && graph.agents && (
                                <Typography variant="caption" display="block">
                                  <strong>Agent:</strong> {
                                    graph.agents.find(a => a.id === selectedNode.metadata.agent_id)?.role || 'Unknown'
                                  }
                                </Typography>
                              )}
                            </>
                          )}
                          
                          {graph && graph.logs && (
                            <Typography variant="caption" display="block">
                              <strong>{intl.formatMessage({ id: 'agent.graph.toolLogs' })}:</strong> {graph.logs.filter(l => l.tool_execution_id === selectedNode.metadata.id).length}
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

      {/* ✅ Canvas - now with proper sizing constraints */}
      <canvas
        ref={canvasRef}
        width={containerDimensions.width}
        height={containerDimensions.height}
        onMouseDown={handleCanvasMouseDown}
        onMouseMove={handleCanvasMouseMove}
        onMouseUp={handleCanvasMouseUp}
        onMouseLeave={handleCanvasMouseUp}
        style={{
          cursor: isDragging ? 'grabbing' : hoveredNode ? 'pointer' : 'grab',
          backgroundColor: theme.palette.mode === 'dark' ? theme.palette.grey[900] : theme.palette.background.default,
          pointerEvents: 'auto',
          userSelect: 'none',
          display: 'block',
          maxWidth: '100%',
          maxHeight: '100%'
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
            {intl.formatMessage({ id: 'agent.graph.noExecutionGraph' })}
          </Typography>
          <Typography variant="body2">
            {intl.formatMessage({ id: 'agent.graph.startExecutionToSeeGraph' })}
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default ExecutionGraphComponent;