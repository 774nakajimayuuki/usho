import type { Preset } from '../../shared/types'

export const presets: Preset[] = [
  { id: 'fast', label: 'Fast', config: { agent: 'Claude Code', model: 'Haiku 5.5', effort: 'low' } },
  { id: 'balanced', label: 'Balanced', config: { agent: 'Claude Code', model: 'Sonnet 5.5', effort: 'medium' } },
  { id: 'deep', label: 'Deep', config: { agent: 'Codex', model: 'GPT-6.1-Sol', effort: 'xhigh' } }
]
