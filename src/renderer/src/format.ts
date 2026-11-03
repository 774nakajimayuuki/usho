import type { AgentConfig, Stage, Task } from '../../shared/types'

export const STAGES: { id: Stage; label: string }[] = [
  { id: 'design', label: 'Design' },
  { id: 'develop', label: 'Develop' },
  { id: 'self-review', label: 'Self-review' },
  { id: 'ai-review', label: 'AI review' },
  { id: 'peer-review', label: 'Peer review' }
]

export function stageIndex(stage: Stage): number {
  return STAGES.findIndex((s) => s.id === stage)
}

/** "Claude · Opus 5.5", or with `withEffort` "Claude Code · Opus 5.5 · high effort" */
export function formatConfig(config: AgentConfig, withEffort = false): string {
  if (withEffort) return `${config.agent} · ${config.model} · ${config.effort} effort`
  const short = config.agent === 'Claude Code' ? 'Claude' : config.agent
  return `${short} · ${config.model}`
}

export function describeStage(task: Task): string {
  if (task.stage === null) return `Quick task · uses ${task.tool ?? 'no tools'} · changes no files`
  const index = stageIndex(task.stage)
  const next = STAGES[index + 1]
  const current = `Stage ${index + 1} of ${STAGES.length}: ${STAGES[index].label}`
  return next ? `${current} · next: ${next.label}` : current
}

export function timeAgo(iso: string, now = Date.now()): string {
  const minutes = Math.round((now - Date.parse(iso)) / 60_000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.round(hours / 24)
  if (days < 30) return `${days}d ago`
  return new Date(iso).toLocaleDateString()
}

export function plural(count: number, word: string): string {
  return `${count} ${word}${count === 1 ? '' : 's'}`
}

export function cx(...names: (string | false | null | undefined)[]): string {
  return names.filter(Boolean).join(' ')
}
