# Agent Mode Prompts

This folder contains centralized system prompts for all Agent modes in the OnlySaid application.

## Structure

```
prompts/
├── index.ts           # Central exports and types
├── queryMode.ts       # Query mode system prompts
├── agentMode.ts       # Agent mode system prompts  
├── askMode.ts         # Ask mode system prompts
├── toolSummary.ts     # Tool result summarization prompts
└── README.md          # This documentation
```

## Prompt Files

### `queryMode.ts`
- **Purpose**: Knowledge Base query mode prompts
- **Features**: 
  - Custom KB selection messaging
  - Query engine and embedding model support
  - Avatar name support
  - Custom prompt override capability
  - Rule system integration

### `agentMode.ts`
- **Purpose**: Master Agent coordination mode prompts
- **Features**:
  - Swarm coordination instructions
  - Tool access information
  - Knowledge Base integration
  - Avatar name support
  - Custom prompt override capability
  - Rule system integration

### `askMode.ts`
- **Purpose**: Simple chat assistant mode prompts
- **Features**:
  - Conversational style instructions
  - Context message handling
  - Avatar name support
  - Custom prompt override capability
  - Rule system integration

### `toolSummary.ts`
- **Purpose**: Tool execution result summarization
- **Features**:
  - Result interpretation guidance
  - User-friendly formatting
  - Contextual explanations

## Usage

Import the prompt functions from the central index:

```typescript
import { 
  getQueryModeSystemPrompt,
  getAgentModeSystemPrompt, 
  getAskModeSystemPrompt,
  getToolSummarySystemPrompt 
} from '../prompts';
```

## Features

### Custom Prompt Override
All mode prompts support custom prompt overrides from `LLMConfigurationStore`:
- `queryModeSystemPrompt`
- `agentModeSystemPrompt` 
- `askModeSystemPrompt`

### Placeholder Replacement
Custom prompts support these placeholders:
- `{agent.username}` / `{agent_username}` - Agent name
- `{user.username}` / `{user_username}` - User name
- `{kbIds}` - Knowledge Base IDs (Query mode only)
- `{queryEngine}` - Query engine (Query mode only)
- `{embeddingModel}` - Embedding model (Query mode only)

### Avatar Mode Support
All prompts support avatar mode where the assistant takes on the name and persona of the selected 3D avatar.

### Rule System Integration
All mode prompts are automatically enhanced with the rule system via `appendRulesToSystemPrompt()`.

## Fallback Behavior

Each prompt function follows this pattern:
1. Check for custom prompt in LLM configuration
2. If custom prompt exists, use it with placeholder replacement
3. If no custom prompt, fall back to default prompt
4. Apply rule system enhancements
5. Return final system prompt

## Migration Notes

This centralized structure replaces the previous inline prompt definitions in:
- `mode/Query.ts` 
- `mode/Agent.ts`
- `mode/Ask.ts`

The old prompt functions have been removed and replaced with imports from this centralized location.