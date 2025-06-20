import { useLLMConfigurationStore, AIMode } from '@/renderer/stores/LLM/LLMConfiguration';

export const getRulesForMode = (mode: AIMode): string => {
  const { getRulesForMode } = useLLMConfigurationStore.getState();
  const rules = getRulesForMode(mode);
  
  if (rules.length === 0) {
    return '';
  }
  
  const rulesText = rules.map((rule, index) => `${index + 1}. ${rule.content}`).join('\n');
  return `\n\nAdditional Rules:\n${rulesText}`;
};

export const appendRulesToSystemPrompt = (systemPrompt: string, mode: AIMode): string => {
  const rules = getRulesForMode(mode);
  return systemPrompt + rules;
}; 