import { IUser } from '@/../../types/User/User';
import { useLLMConfigurationStore } from '@/renderer/stores/LLM/LLMConfiguration';
import { useTopicStore } from '@/renderer/stores/Topic/TopicStore';
import { useCopilotStore } from '@/renderer/stores/Copilot/CopilotStore';
import { appendRulesToSystemPrompt } from '@/utils/rules';

// Helper to check if file is DOCX
const isDOCXFile = (fileName?: string): boolean => {
  if (!fileName) return false;
  const ext = fileName.toLowerCase().substring(fileName.lastIndexOf('.'));
  return ['.docx', '.doc'].includes(ext);
};

/**
 * Default system prompt for Ask Mode (with copilot mode detection)
 */
export const askModeSystemPrompt = (
  user: IUser, 
  agent: IUser, 
  avatarName?: string,
  fileContent?: string,
  fileName?: string,
  fileExtension?: string
): string => {
  const assistantName = avatarName || agent.username;
  
  // Check if we're in copilot mode
  const topicStore = useTopicStore.getState();
  const isCopilotMode = topicStore.selectedContext?.section === 'local:copilot';
  
  if (isCopilotMode) {
    // Check if this is a DOCX file for special handling
    const isDocxFile = isDOCXFile(fileName);
    
    if (isDocxFile) {
      // Get structure information from copilot store
      const copilotStore = useCopilotStore.getState();
      const contextInfo = copilotStore.getContextInfo();
      const documentStructure = contextInfo?.documentStructure;
      
      // Build structure summary for AI
      let structureSummary = '';
      if (documentStructure && documentStructure.length > 0) {
        structureSummary = '\n\nDOCUMENT STRUCTURE BREAKDOWN:\n';
        documentStructure.forEach((element, index) => {
          const preview = element.content.length > 50 
            ? element.content.substring(0, 50) + '...'
            : element.content;
          structureSummary += `- Element ${index}: ${element.type}${element.level ? ` (level ${element.level})` : ''} - "${preview}"\n`;
        });
        structureSummary += `\nTotal elements: ${documentStructure.length}\n`;
      } else {
        structureSummary = '\n\nDOCUMENT STRUCTURE: Not available - fallback to text-based patches\n';
      }
      
      // DOCX-specific copilot mode prompt
      return `
Your name is ${assistantName} and you are an AI Document Copilot assistant for ${user.username}.

You are currently assisting with editing and modifying the DOCX document: "${fileName}"

CURRENT DOCUMENT CONTENT:
\`\`\`text
${fileContent}
\`\`\`
${structureSummary}

As a DOCX Document Copilot, you should:

1. **Understand document structure**: Analyze headings, paragraphs, formatting, and overall document organization
2. **Provide content assistance**: Help with writing, editing, restructuring, and improving document content
3. **Suggest document improvements**: Offer better organization, clarity, flow, and professional formatting
4. **Answer document questions**: Explain content, suggest alternatives, or clarify document structure

CRITICAL OUTPUT FORMAT FOR DOCX DOCUMENTS:

**PREFERRED METHOD - Structure-based patches (most reliable):**
For precise document element modifications, use structure patches:

\`\`\`docx-structure-patch
{
  "elementIndex": 0,
  "action": "replace",
  "elementType": "heading",
  "newElement": {
    "type": "heading",
    "content": "New Heading Text",
    "level": 1,
    "formatting": {
      "bold": true,
      "fontSize": 16
    }
  }
}
\`\`\`

**Available actions:**
- \`replace\`: Replace entire element at index
- \`insert\`: Add new element (use \`insertPosition\`: "before"/"after")
- \`delete\`: Remove element at index
- \`modify\`: Merge changes with existing element

**Element types:** heading, paragraph, table, list, image

**FALLBACK METHOD - Anchor patches:**
For simple text changes when structure is unclear:

\`\`\`anchor-patch
ANCHOR_START: [unique text before your change]
ORIGINAL: [text to replace]
REPLACEMENT: [new text]
ANCHOR_END: [unique text after your change]
\`\`\`

**GUIDELINES:**
- Use structure patches for precise element targeting (preferred)
- Use anchor patches only for simple text replacements
- Element indices start at 0 (first element = 0, second = 1, etc.)
- Always specify element type when known
- Preserve formatting unless explicitly changing it

Your responses should be:
- Focused on document content and structure
- Professional and well-written
- Contextually aware of the document's purpose
- Specific about which parts to modify
- Formatted for easy application to the document

Remember: You're working with a structured document, not code. Focus on content quality, clarity, and proper document organization.
      `.trim();
    } else {
      // Regular code file copilot mode prompt
      return `
Your name is ${assistantName} and you are an AI Copilot assistant for ${user.username}.

You are currently assisting with editing and modifying the file: "${fileName}"
File extension: ${fileExtension}

CURRENT FILE CONTENT:
\`\`\`${fileExtension}
${fileContent}
\`\`\`

Your main purpose is to assist in modifying specific files. You should:

1. **Understand the file context**: Analyze the current file content, structure, and purpose
2. **Provide targeted assistance**: Help with editing, refactoring, debugging, or enhancing the code/content
3. **Suggest improvements**: Offer code optimizations, best practices, or structural improvements
4. **Answer questions**: Explain code functionality, suggest alternatives, or clarify implementation details

CRITICAL OUTPUT FORMAT:
When suggesting code changes or modifications, you MUST output them in the following format:
\`\`\`${fileExtension}
[your suggested code changes here]
\`\`\`

This format is essential for the system to properly process and apply your suggestions.

Your responses should be:
- Concise and focused on the file being edited
- Technically accurate and following best practices for the file type
- Helpful for understanding and improving the code/content
- Professional yet friendly

Remember: You have full context of the file content and should leverage this to provide the most relevant and helpful assistance.
      `.trim();
    }
  } else {
    // Regular ask mode prompt
    return `
Your name is ${assistantName} and you are assistant for your companion ${user.username}.

You and your companion ${user.username} will be hearing messages in chats.
Your responses should be short, concise, friendly, helpful, and professional.
Use emojis only when appropriate.

You will be provided a list of messages in a chat with timestamps as contexts for your references.
    `.trim();
  }
};

/**
 * Get system prompt with custom prompt support and rules
 */
export const getAskModeSystemPrompt = (
  user: IUser, 
  agent: IUser, 
  avatarName?: string,
  fileContent?: string,
  fileName?: string,
  fileExtension?: string
): string => {
  const { askModeSystemPrompt: customPrompt } = useLLMConfigurationStore.getState();
  const assistantName = avatarName || agent.username;
  
  // Check if we're in copilot mode to determine which custom prompt to use
  const topicStore = useTopicStore.getState();
  const isCopilotMode = topicStore.selectedContext?.section === 'local:copilot';
  
  let systemPrompt = '';
  if (customPrompt && customPrompt.trim()) {
    // Replace placeholders in custom prompt
    systemPrompt = customPrompt
      .replace(/\{agent\.username\}/g, assistantName)
      .replace(/\{user\.username\}/g, user.username)
      .replace(/\{agent_username\}/g, assistantName)
      .replace(/\{user_username\}/g, user.username)
      .replace(/\{file_content\}/g, fileContent || '')
      .replace(/\{file_name\}/g, fileName || '')
      .replace(/\{file_extension\}/g, fileExtension || '');
  } else {
    // Fallback to default prompt
    systemPrompt = askModeSystemPrompt(user, agent, avatarName, fileContent, fileName, fileExtension);
  }
  
  // Additional context for DOCX files in copilot mode
  if (isCopilotMode && isDOCXFile(fileName)) {
    systemPrompt += `

ADDITIONAL CONTEXT FOR DOCX DOCUMENTS:
- The document has both "View Mode" (formatted) and "Edit Mode" (text editing)
- Focus on making precise, targeted changes to specific parts of the document
- Use anchor patches to avoid rewriting the entire document when possible
`;
  }
  
  // Append rules for ask mode
  return appendRulesToSystemPrompt(systemPrompt, 'ask');
};