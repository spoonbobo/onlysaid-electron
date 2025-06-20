import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';
import type OpenAI from 'openai';

export interface MCPToolResult {
  success: boolean;
  result?: any;
  error?: string;
  executionTime?: number;
}

export class LangChainToolsHelper {
  /**
   * Convert OpenAI tool schema to Zod schema
   */
  static convertOpenAISchemaToZod(parameters: any): z.ZodObject<any> {
    if (!parameters?.properties) {
      return z.object({});
    }

    const zodFields: Record<string, any> = {};
    
    for (const [key, value] of Object.entries(parameters.properties)) {
      const prop = value as any;
      let zodField: any;

      switch (prop.type) {
        case 'string':
          zodField = z.string();
          if (prop.enum) {
            zodField = z.enum(prop.enum);
          }
          break;
        case 'number':
          zodField = z.number();
          if (prop.minimum !== undefined) {
            zodField = zodField.min(prop.minimum);
          }
          if (prop.maximum !== undefined) {
            zodField = zodField.max(prop.maximum);
          }
          break;
        case 'integer':
          zodField = z.number().int();
          if (prop.minimum !== undefined) {
            zodField = zodField.min(prop.minimum);
          }
          if (prop.maximum !== undefined) {
            zodField = zodField.max(prop.maximum);
          }
          break;
        case 'boolean':
          zodField = z.boolean();
          break;
        case 'array':
          if (prop.items) {
            // Recursively handle array items
            const itemSchema = this.convertPropertyToZod(prop.items);
            zodField = z.array(itemSchema);
          } else {
            zodField = z.array(z.any());
          }
          break;
        case 'object':
          if (prop.properties) {
            zodField = this.convertOpenAISchemaToZod(prop);
          } else {
            zodField = z.object({}).passthrough();
          }
          break;
        default:
          zodField = z.any();
      }
      
      if (prop.description) {
        zodField = zodField.describe(prop.description);
      }

      // Handle optional fields
      if (parameters.required && Array.isArray(parameters.required)) {
        if (!parameters.required.includes(key)) {
          zodField = zodField.optional();
        }
      } else {
        zodField = zodField.optional();
      }

      zodFields[key] = zodField;
    }
    
    return z.object(zodFields);
  }

  /**
   * Convert a single property to Zod schema
   */
  private static convertPropertyToZod(prop: any): z.ZodTypeAny {
    switch (prop.type) {
      case 'string':
        return prop.enum ? z.enum(prop.enum) : z.string();
      case 'number':
        return z.number();
      case 'integer':
        return z.number().int();
      case 'boolean':
        return z.boolean();
      case 'array':
        return prop.items ? z.array(this.convertPropertyToZod(prop.items)) : z.array(z.any());
      case 'object':
        return prop.properties ? this.convertOpenAISchemaToZod(prop) : z.object({}).passthrough();
      default:
        return z.any();
    }
  }

  /**
   * Create a LangChain tool from OpenAI tool definition with MCP integration
   */
  static createMCPTool(
    openAITool: OpenAI.Chat.Completions.ChatCompletionTool,
    mcpExecutor: (toolName: string, args: any) => Promise<MCPToolResult>
  ): any {
    if (!openAITool.function) {
      throw new Error('Tool function definition is required');
    }

    return {
      name: openAITool.function.name,
      description: openAITool.function.description || `MCP Tool: ${openAITool.function.name}`,
      schema: z.object({}),
      func: async (input: any) => {
        try {
          console.log(`[LangChain Tools] Executing MCP tool: ${openAITool.function!.name}`, input);
          
          const startTime = Date.now();
          const result = await mcpExecutor(openAITool.function!.name, input);
          const executionTime = Date.now() - startTime;

          if (!result.success) {
            throw new Error(result.error || 'Tool execution failed');
          }

          const response = {
            success: true,
            result: result.result,
            executionTime,
            timestamp: new Date().toISOString(),
          };

          console.log(`[LangChain Tools] Tool ${openAITool.function!.name} completed in ${executionTime}ms`);
          
          return JSON.stringify(response);
        } catch (error: any) {
          console.error(`[LangChain Tools] Error executing tool ${openAITool.function!.name}:`, error);
          
          const errorResponse = {
            success: false,
            error: error.message,
            timestamp: new Date().toISOString(),
          };
          
          return JSON.stringify(errorResponse);
        }
      },
    } as any;
  }

  /**
   * Validate tool input against schema
   */
  static validateToolInput(schema: z.ZodObject<any>, input: any): { valid: boolean; error?: string } {
    try {
      schema.parse(input);
      return { valid: true };
    } catch (error: any) {
      return { valid: false, error: error.message };
    }
  }
} 