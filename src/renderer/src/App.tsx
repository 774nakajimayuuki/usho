import { useEffect, useRef, useState } from 'react'
import type { Issue, ParkedGroup, Task, ToolStatus } from '../../shared/types'
import { AgentSlots } from './components/AgentSlots'
import { NeedsYou } from './components/NeedsYou'
import { OpenIssues } from './components/OpenIssues'
import { StatusStrip } from './components/StatusStrip'
import { EmptyDetail, TaskDetail } from './components/TaskDetail'
import { TopBar } from './components/TopBar'
import { formatConfig } from './format'
import { presets } from './presets'
import { needsYou, toBoardTask } from './tasks'
import { useRepo } from './useRepo'
import { useShortcuts } from './useShortcuts'
import { useTasks } from './useTasks'

function parkedGroup(label: string, tasks: Task[]): ParkedGroup[] {
  if (tasks.length === 0) return []
  return [{ label, items: tasks.map((task) => ({ text: `${task.issue ?? ''} ${task.title}`, meta: formatConfig(task.config) })) }]
}

export function App() {
  const { repo, issues, chooseRepo, refreshIssues } = useRepo()
  const { records, error, start, discard, answer, stop, openWorktree, dismissError } = useTasks()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [presetId, setPresetId] = useState('balanced')
  const [tools, setTools] = useState<ToolStatus[] | null>(null)
  const [now, setNow] = useState(() => Date.now())
  // How many activity steps of each task you had seen when you last left it
  const [seen, setSeen] = useState<Record<string, number>>({})
  const viewing = useRef<{ id: string; steps: number } | null>(null)
  const detailRef = useRef<HTMLElement>(null)

  useEffect(() => {
    void window.usho.checkTools().then(setTools)
  }, [])

  // Keeps "active 2m ago" and stall detection current
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30_000)
    return () => clearInterval(timer)
  }, [])

  const tasks = records.map((record) => toBoardTask(record, now, seen[record.id]))
  const queue = needsYou(tasks)
  const selected = tasks.find((task) => task.id === selectedId) ?? queue[0] ?? tasks[0] ?? null
  const selectedSteps = records.find((r) => r.id === selected?.id)?.run?.activity.length ?? 0
  const preset = presets.find((p) => p.id === presetId) ?? presets[0]

  useEffect(() => {
    const left = viewing.current
    if (left && left.id !== selected?.id) setSeen((s) => ({ ...s, [left.id]: left.steps }))
    viewing.current = selected ? { id: selected.id, steps: selectedSteps } : null
  }, [selected?.id, selectedSteps])

  const parked = [
    ...parkedGroup('Waiting for a slot', tasks.filter((task, i) => task.slot === null && !records[i].run)),
    ...parkedGroup(
      'Not running',
      tasks.filter((_, i) => records[i].run?.state === 'stopped' || records[i].run?.state === 'unsupported')
    )
  ]

  async function startFromIssue(issue: Issue): Promise<void> {
    const task = await start(issue, preset.config)
    if (task) setSelectedId(task.id)
  }

  function step(offset: number): void {
    if (queue.length === 0) return
    const index = queue.findIndex((task) => task.id === selected?.id)
    const nextIndex = index === -1 ? 0 : Math.min(Math.max(index + offset, 0), queue.length - 1)
    setSelectedId(queue[nextIndex].id)
  }

  function decide(allow: boolean): void {
    if (selected?.decision.kind !== 'approval') return
    // Move on to the next thing that needs you, like clearing an inbox
    const index = queue.findIndex((task) => task.id === selected.id)
    const next = queue[index + 1] ?? queue[index - 1]
    void answer(selected.id, allow)
    if (next) setSelectedId(next.id)
  }

  useShortcuts({
    next: () => step(1),
    previous: () => step(-1),
    open: () => detailRef.current?.focus(),
    allow: () => decide(true),
    deny: () => decide(false),
    slot: (n) => {
      const task = tasks.find((t) => t.slot === n)
      if (task) setSelectedId(task.id)
    }
  })

  return (
    <div className="app">
      <TopBar
        repo={repo}
        onChooseRepo={() => void chooseRepo()}
        presets={presets}
        presetId={preset.id}
        onPresetChange={setPresetId}
      />
      <StatusStrip
        needCount={queue.length}
        blockedCount={queue.filter((task) => task.slot !== null).length}
        busySlots={tasks.filter((task) => task.slot !== null).length}
        parked={parked}
        openIssues={issues.status === 'loaded' ? issues.issues.length : null}
        preset={preset}
        tools={tools}
      />
      {error && (
        <div className="banner" role="alert">
          <span>{error}</span>
          <button type="button" className="link-btn" onClick={dismissError}>
            Dismiss
          </button>
        </div>
      )}
      <div className="workspace">
        <NeedsYou
          queue={queue}
          parked={parked}
          selectedId={selected?.id ?? null}
          onSelect={setSelectedId}
          onAct={(task) => setSelectedId(task.id)}
        >
          <OpenIssues
            repo={repo}
            state={issues}
            tasks={records}
            preset={preset}
            onChooseRepo={() => void chooseRepo()}
            onRefresh={() => void refreshIssues()}
            onStart={startFromIssue}
            onSelectTask={setSelectedId}
          />
        </NeedsYou>
        <main className="content">
          <AgentSlots tasks={tasks} selectedId={selected?.id ?? null} onSelect={setSelectedId} />
          {selected ? (
            <TaskDetail
              key={selected.id}
              ref={detailRef}
              task={selected}
              onAllow={() => decide(true)}
              onDeny={() => decide(false)}
              onStop={() => void stop(selected.id)}
              onOpenWorktree={() => void openWorktree(selected.id)}
              onDiscard={() => void discard(selected.id)}
            />
          ) : (
            <EmptyDetail />
          )}
        </main>
      </div>
    </div>
  )
}
