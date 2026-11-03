import type { Preset, RepoInfo } from '../../../shared/types'
import { ChevronDownIcon, LogoIcon } from '../icons'

interface TopBarProps {
  repo: RepoInfo | null
  onChooseRepo: () => void
  presets: Preset[]
  presetId: string
  onPresetChange: (id: string) => void
}

export function TopBar({ repo, onChooseRepo, presets, presetId, onPresetChange }: TopBarProps) {
  return (
    <header className="topbar">
      <div className="brand">
        <LogoIcon />
        Usho
      </div>
      <button type="button" className="btn mono" onClick={onChooseRepo} title={repo?.path}>
        {repo?.nameWithOwner ?? 'Choose a repository'}
        <ChevronDownIcon />
      </button>
      <input className="ask" type="text" aria-label="New task" placeholder="Ask an agent, or paste an issue URL" />
      <div className="segmented" role="group" aria-label="Preset">
        {presets.map((preset) => (
          <button
            key={preset.id}
            type="button"
            aria-pressed={preset.id === presetId}
            onClick={() => onPresetChange(preset.id)}
          >
            {preset.label}
          </button>
        ))}
      </div>
      <button type="button" className="btn primary">
        Run
      </button>
    </header>
  )
}
