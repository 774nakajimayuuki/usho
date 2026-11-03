import { useEffect, useReducer, useRef, useState } from 'react'
import type { Task, ToolStatus } from '../../shared/types'
import { AgentSlots } from './components/AgentSlots'
import { NeedsYou } from './components/NeedsYou'
import { OpenIssues } from './components/OpenIssues'
import { StatusStrip } from './components/StatusStrip'
import { TaskDetail } from './components/TaskDetail'
import { TopBar } from './components/TopBar'
import { presets, sampleParked, sampleTasks } from './sampleData'
import { needsYou, tasksReducer, type QueuedTask } from './tasks'
import { useRepo } from './useRepo'
import { useShortcuts } from './useShortcuts'

export function App() {
  const { repo, issues, chooseRepo, refreshIssues } = useRepo()
  const [tasks, dispatch] = useReducer(tasksReducer, sampleTasks)
  const [selectedId, setSelectedId] = useState(() => needsYou(sampleTasks)[0]?.id ?? sampleTasks[0].id)
  const [presetId, setPresetId] = useState('balanced')
  const [tools, setTools] = useState<ToolStatus[] | null>(null)
  const detailRef = useRef<HTMLElement>(null)

  useEffect(() => {
    void window.usho.checkTools().then(setTools)
  }, [])

  const queue = needsYou(tasks)
  const selected = tasks.find((task) => task.id === selectedId) ?? tasks[0]
  const preset = presets.find((p) => p.id === presetId) ?? presets[0]

  function step(offset: number): void {
    if (queue.length === 0) return
    const index = queue.findIndex((task) => task.id === selected.id)
    const nextIndex = index === -1 ? 0 : Math.min(Math.max(index + offset, 0), queue.length - 1)
    setSelectedId(queue[nextIndex].id)
  }

  function decide(type: 'allow' | 'deny', task: Task): void {
    if (task.decision.kind !== 'approval') return
    // Move on to the next thing that needs you, like clearing an inbox
    const index = queue.findIndex((t) => t.id === task.id)
    const next = queue[index + 1] ?? queue[index - 1]
    dispatch({ type, id: task.id })
    if (next && task.id === selected.id) setSelectedId(next.id)
  }

  function act(task: QueuedTask): void {
    if (task.decision.kind === 'approval') decide('allow', task)
    else setSelectedId(task.id)
  }

  useShortcuts({
    next: () => step(1),
    previous: () => step(-1),
    open: () => detailRef.current?.focus(),
    allow: () => decide('allow', selected),
    deny: () => decide('deny', selected),
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
        parked={sampleParked}
        openIssues={issues.status === 'loaded' ? issues.issues.length : null}
        preset={preset}
        tools={tools}
      />
      <div className="workspace">
        <NeedsYou
          queue={queue}
          parked={sampleParked}
          selectedId={selected.id}
          onSelect={setSelectedId}
          onAct={act}
        >
          <OpenIssues
            repo={repo}
            state={issues}
            onChooseRepo={() => void chooseRepo()}
            onRefresh={() => void refreshIssues()}
          />
        </NeedsYou>
        <main className="content">
          <AgentSlots tasks={tasks} selectedId={selected.id} onSelect={setSelectedId} />
          <TaskDetail
            ref={detailRef}
            task={selected}
            onAllow={() => decide('allow', selected)}
            onDeny={() => decide('deny', selected)}
          />
        </main>
      </div>
    </div>
  )
}
