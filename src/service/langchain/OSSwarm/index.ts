export { OSSwarmCore, OSSwarmConfig, OSSwarmLimits } from './core';
export { OSSwarmService } from './service';
export { OSSwarmFactory } from './factory';
export { setupOSSwarmHandlers } from './handlers';

// Re-export types for convenience
export type { SwarmAgent, SwarmTask } from './core'; 