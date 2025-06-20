import React, { useState } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  Chip,
  FormControlLabel,
  Checkbox,
  IconButton,
  Card,
  CardContent,
  CardActions,
  Switch,
  FormGroup,
  Divider
} from '@mui/material';
import { Add, Delete, Edit, Save, Cancel } from '@mui/icons-material';
import { useIntl } from 'react-intl';
import { useLLMConfigurationStore, Rule, AIMode } from '@/renderer/stores/LLM/LLMConfiguration';
import SettingsFormField from './SettingsFormField';

const RulesManagement: React.FC = () => {
  const intl = useIntl();
  const {
    rules,
    addRule,
    updateRule,
    deleteRule,
    toggleRuleEnabled
  } = useLLMConfigurationStore();

  const [newRuleContent, setNewRuleContent] = useState('');
  const [newRuleModes, setNewRuleModes] = useState<AIMode[]>([]);
  const [editingRule, setEditingRule] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [editModes, setEditModes] = useState<AIMode[]>([]);

  const aiModes: { value: AIMode; label: string }[] = [
    { value: 'ask', label: intl.formatMessage({ id: 'settings.rules.mode.ask' }) },
    { value: 'query', label: intl.formatMessage({ id: 'settings.rules.mode.query' }) },
    { value: 'agent', label: intl.formatMessage({ id: 'settings.rules.mode.agent' }) },
  ];

  const handleAddRule = () => {
    if (newRuleContent.trim() && newRuleModes.length > 0) {
      addRule(newRuleContent.trim(), newRuleModes);
      setNewRuleContent('');
      setNewRuleModes([]);
    }
  };

  const handleStartEdit = (rule: Rule) => {
    setEditingRule(rule.id);
    setEditContent(rule.content);
    setEditModes([...rule.modes]);
  };

  const handleSaveEdit = () => {
    if (editingRule && editContent.trim() && editModes.length > 0) {
      updateRule(editingRule, {
        content: editContent.trim(),
        modes: editModes
      });
      setEditingRule(null);
      setEditContent('');
      setEditModes([]);
    }
  };

  const handleCancelEdit = () => {
    setEditingRule(null);
    setEditContent('');
    setEditModes([]);
  };

  const handleModeToggle = (mode: AIMode, isNew: boolean = false) => {
    if (isNew) {
      setNewRuleModes(prev => 
        prev.includes(mode) 
          ? prev.filter(m => m !== mode)
          : [...prev, mode]
      );
    } else {
      setEditModes(prev => 
        prev.includes(mode) 
          ? prev.filter(m => m !== mode)
          : [...prev, mode]
      );
    }
  };

  const getModeLabel = (mode: AIMode) => {
    return aiModes.find(m => m.value === mode)?.label || mode;
  };

  return (
    <Box>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        {intl.formatMessage({ id: 'settings.rules.description' })}
      </Typography>

      {/* Add New Rule */}
      <Card variant="outlined" sx={{ mb: 2 }}>
        <CardContent>
          <Typography variant="subtitle2" sx={{ mb: 2 }}>
            {intl.formatMessage({ id: 'settings.rules.addNew' })}
          </Typography>
          
          <SettingsFormField label={intl.formatMessage({ id: 'settings.rules.content' })}>
            <TextField
              fullWidth
              multiline
              rows={3}
              value={newRuleContent}
              onChange={(e) => setNewRuleContent(e.target.value)}
              placeholder={intl.formatMessage({ id: 'settings.rules.contentPlaceholder' })}
              variant="outlined"
              size="small"
            />
          </SettingsFormField>

          <SettingsFormField label={intl.formatMessage({ id: 'settings.rules.applyToModes' })}>
            <FormGroup row>
              {aiModes.map((mode) => (
                <FormControlLabel
                  key={mode.value}
                  control={
                    <Checkbox
                      checked={newRuleModes.includes(mode.value)}
                      onChange={() => handleModeToggle(mode.value, true)}
                      size="small"
                    />
                  }
                  label={mode.label}
                />
              ))}
            </FormGroup>
          </SettingsFormField>
        </CardContent>
        
        <CardActions>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={handleAddRule}
            disabled={!newRuleContent.trim() || newRuleModes.length === 0}
            size="small"
          >
            {intl.formatMessage({ id: 'settings.rules.add' })}
          </Button>
        </CardActions>
      </Card>

      {/* Existing Rules */}
      {rules.length > 0 && (
        <>
          <Typography variant="subtitle2" sx={{ mb: 2 }}>
            {intl.formatMessage({ id: 'settings.rules.existing' })} ({rules.length})
          </Typography>
          
          {rules.map((rule) => (
            <Card key={rule.id} variant="outlined" sx={{ mb: 2 }}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                  <Box sx={{ flex: 1 }}>
                    {editingRule === rule.id ? (
                      <>
                        <TextField
                          fullWidth
                          multiline
                          rows={3}
                          value={editContent}
                          onChange={(e) => setEditContent(e.target.value)}
                          variant="outlined"
                          size="small"
                          sx={{ mb: 2 }}
                        />
                        <FormGroup row>
                          {aiModes.map((mode) => (
                            <FormControlLabel
                              key={mode.value}
                              control={
                                <Checkbox
                                  checked={editModes.includes(mode.value)}
                                  onChange={() => handleModeToggle(mode.value, false)}
                                  size="small"
                                />
                              }
                              label={mode.label}
                            />
                          ))}
                        </FormGroup>
                      </>
                    ) : (
                      <>
                        <Typography variant="body2" sx={{ mb: 1 }}>
                          {rule.content}
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                          {rule.modes.map((mode) => (
                            <Chip
                              key={mode}
                              label={getModeLabel(mode)}
                              size="small"
                              variant="outlined"
                              color="primary"
                            />
                          ))}
                        </Box>
                      </>
                    )}
                  </Box>
                  
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, ml: 2 }}>
                    <Switch
                      checked={rule.enabled}
                      onChange={() => toggleRuleEnabled(rule.id)}
                      size="small"
                    />
                  </Box>
                </Box>
              </CardContent>
              
              <CardActions sx={{ pt: 0 }}>
                {editingRule === rule.id ? (
                  <>
                    <Button
                      startIcon={<Save />}
                      onClick={handleSaveEdit}
                      disabled={!editContent.trim() || editModes.length === 0}
                      size="small"
                    >
                      {intl.formatMessage({ id: 'settings.rules.save' })}
                    </Button>
                    <Button
                      startIcon={<Cancel />}
                      onClick={handleCancelEdit}
                      size="small"
                    >
                      {intl.formatMessage({ id: 'settings.rules.cancel' })}
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      startIcon={<Edit />}
                      onClick={() => handleStartEdit(rule)}
                      size="small"
                    >
                      {intl.formatMessage({ id: 'settings.rules.edit' })}
                    </Button>
                    <Button
                      startIcon={<Delete />}
                      onClick={() => deleteRule(rule.id)}
                      color="error"
                      size="small"
                    >
                      {intl.formatMessage({ id: 'settings.rules.delete' })}
                    </Button>
                  </>
                )}
              </CardActions>
            </Card>
          ))}
        </>
      )}

      {rules.length === 0 && (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <Typography variant="body2" color="text.secondary">
            {intl.formatMessage({ id: 'settings.rules.noRules' })}
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default RulesManagement; 