import { useEffect, useState } from 'react'
import type { ToolStatus } from '../../shared/types'

export function App() {
  const [tools, setTools] = useState<ToolStatus[] | null>(null)

  useEffect(() => {
    void window.usho.checkTools().then(setTools)
  }, [])

  return (
    <main className="app">
      <header>
        <h1>Usho</h1>
        <p>Run Claude Code and Codex per GitHub issue, and watch every status on one board.</p>
      </header>

      <section>
        <h2>Tools</h2>
        {tools === null ? (
          <p className="muted">Checking…</p>
        ) : (
          <ul className="tools">
            {tools.map((tool) => (
              <li key={tool.command} className={tool.installed ? 'ok' : 'missing'}>
                <span className="dot" aria-hidden="true" />
                <span className="label">{tool.label}</span>
                <code>{tool.command}</code>
                <span className="version">{tool.installed ? tool.version : 'Not found'}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  )
}
