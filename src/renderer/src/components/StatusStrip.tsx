import type { ParkedGroup, Preset, ToolStatus } from '../../../shared/types'
import { cx, formatConfig, plural } from '../format'
import { SLOT_COUNT } from '../tasks'

interface StatusStripProps {
  needCount: number
  blockedCount: number
  busySlots: number
  parked: ParkedGroup[]
  /** Null until the issues have loaded */
  openIssues: number | null
  preset: Preset
  tools: ToolStatus[] | null
}

export function StatusStrip({
  needCount,
  blockedCount,
  busySlots,
  parked,
  openIssues,
  preset,
  tools
}: StatusStripProps) {
  return (
    <div className="strip">
      <span className="strip-need">
        <span className="dot" />
        {needCount} need you · {plural(blockedCount, 'agent')} blocked on you
      </span>
      <span>
        {busySlots} of {SLOT_COUNT} slots busy
      </span>
      {parked.map((group) => (
        <span key={group.label}>
          {group.items.length} {group.label.toLowerCase()}
        </span>
      ))}
      {openIssues !== null && <span>{plural(openIssues, 'open issue')}</span>}
      <span className="strip-end">
        <span>
          {preset.label} = {formatConfig(preset.config, true)}
        </span>
        <ToolList tools={tools} />
      </span>
    </div>
  )
}

function ToolList({ tools }: { tools: ToolStatus[] | null }) {
  if (tools === null) return <span>Checking CLIs…</span>
  return (
    <span className="tools">
      {tools.map((tool) => (
        <span
          key={tool.command}
          className={cx('tool', !tool.installed && 'is-missing')}
          title={tool.installed ? `${tool.label}: ${tool.version}` : `${tool.label} was not found`}
        >
          <span className="dot" />
          {tool.installed ? tool.command : `${tool.command} not found`}
        </span>
      ))}
    </span>
  )
}
