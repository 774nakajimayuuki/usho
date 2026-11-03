import type { ParkedGroup, Preset, Task } from '../../shared/types'

// Sample data for building the board before real agents are wired up

export const presets: Preset[] = [
  { id: 'fast', label: 'Fast', config: { agent: 'Claude Code', model: 'Haiku 5.5', effort: 'low' } },
  { id: 'balanced', label: 'Balanced', config: { agent: 'Claude Code', model: 'Sonnet 5.5', effort: 'medium' } },
  { id: 'deep', label: 'Deep', config: { agent: 'Codex', model: 'GPT-6.1-Sol', effort: 'xhigh' } }
]

export const sampleTasks: Task[] = [
  {
    id: '18',
    issue: '#18',
    title: 'Persist task state in SQLite',
    config: { agent: 'Claude Code', model: 'Opus 5.5', effort: 'high' },
    stage: 'develop',
    slot: 1,
    level: 'attention',
    status: 'Needs you: wants to run npm test',
    time: 'idle 7m',
    queue: {
      reason: 'Wants approval',
      cost: 'Claude Code idle for 7 min · holding slot 1',
      action: 'Allow',
      waitingMinutes: 7
    },
    lastLook: '14 min ago',
    since: [
      'Created src/main/store.ts (+86)',
      'Created src/main/store.test.ts (+41)',
      'Stopped to ask before running the tests'
    ],
    next: 'If the tests pass, Claude Code moves on to self-review. It should need you again for the draft PR in about 15 min.',
    decision: {
      kind: 'approval',
      command: 'npm test -- src/main/store.test.ts',
      risk: 'Low risk · runs tests, changes no files'
    }
  },
  {
    id: '19',
    issue: '#19',
    title: 'Create a git worktree per task',
    config: { agent: 'Codex', model: 'GPT-6.1-Sol', effort: 'high' },
    stage: 'self-review',
    slot: 2,
    level: 'neutral',
    status: 'Running npm test',
    time: 'active 5s ago',
    lastLook: '6 min ago',
    since: ['Created src/main/worktree.ts (+73)', 'Created src/main/worktree.test.ts (+58)', 'Started npm test'],
    next: 'Likely to finish self-review in about 3 min, then hand the diff to Claude Code for AI review.',
    decision: { kind: 'none' }
  },
  {
    id: '22',
    issue: '#22',
    title: 'Notify when an agent needs input',
    config: { agent: 'Claude Code', model: 'Sonnet 5.5', effort: 'medium' },
    stage: 'develop',
    slot: 3,
    level: 'neutral',
    status: 'Editing src/main/notify.ts',
    time: 'active 12s ago',
    lastLook: 'not opened yet',
    since: ['Read src/main/index.ts', 'Started editing src/main/notify.ts'],
    next: 'Likely to ask to run npm test in about 5 min.',
    decision: { kind: 'none' }
  },
  {
    id: '17',
    issue: '#17',
    title: 'Show an empty state when a repo has no issues',
    config: { agent: 'Claude Code', model: 'Opus 5.5', effort: 'high' },
    stage: 'ai-review',
    slot: 4,
    level: 'neutral',
    status: 'Codex is reviewing the diff',
    time: 'active 8s ago',
    lastLook: '30 min ago',
    since: [
      'Created src/renderer/src/EmptyState.tsx (+38)',
      'Self-review: type check and tests passed',
      'Handed the diff to Codex · GPT-6.1-Sol for review'
    ],
    next: 'If the review finds nothing, a draft PR opens and this task moves to Needs you.',
    decision: { kind: 'none' }
  },
  {
    id: '20',
    issue: '#20',
    title: 'Show a count badge on the Dock icon',
    config: { agent: 'Codex', model: 'GPT-6-Astra', effort: 'xhigh' },
    stage: 'develop',
    slot: 5,
    level: 'problem',
    status: 'No output for 6 min',
    time: 'quiet 6m',
    queue: {
      reason: 'No output',
      cost: 'Codex quiet for 6 min · holding slot 5',
      action: 'Check in',
      waitingMinutes: 6
    },
    lastLook: '15 min ago',
    since: ['Edited src/main/index.ts (+21 −1)', 'Started npm run build', 'No output for the last 6 min'],
    next: 'A build in this repo usually takes under a minute, so Codex is probably stuck.',
    decision: {
      kind: 'stalled',
      tail: '$ npm run build\nvite v8.3.5 building client environment for production...'
    }
  },
  {
    id: 'q2',
    issue: null,
    title: 'Explain how electron-builder signs Windows apps',
    config: { agent: 'Codex', model: 'GPT-6-Luna', effort: 'high' },
    stage: null,
    tool: 'Web',
    slot: 6,
    level: 'neutral',
    status: 'Reading the electron-builder docs',
    time: 'active 4s ago',
    lastLook: 'not opened yet',
    since: ['Searched the web for electron-builder Windows code signing', 'Started reading the electron-builder docs'],
    next: 'Likely to have an answer in about 2 min.',
    decision: { kind: 'none' }
  },
  {
    id: '21',
    issue: '#21',
    title: 'Stream agent output into the detail pane',
    config: { agent: 'Codex', model: 'GPT-6-Astra', effort: 'xhigh' },
    stage: 'self-review',
    slot: null,
    level: 'problem',
    status: 'Stopped: the type check failed',
    time: '12m ago',
    queue: {
      reason: 'Failed',
      cost: 'Codex stopped 12 min ago · slot freed',
      action: 'Ask to fix',
      waitingMinutes: 12
    },
    lastLook: '20 min ago',
    since: [
      'Created src/renderer/src/LogView.tsx (+112)',
      'Edited src/main/index.ts (+18 −2)',
      'The type check failed, so Codex stopped'
    ],
    next: 'Asking Codex to fix it puts the task back into the next free slot.',
    decision: {
      kind: 'failed',
      error:
        "src/renderer/src/LogView.tsx:34:7 - error TS2322:\nType 'string | undefined' is not assignable to type 'string'."
    }
  },
  {
    id: '15',
    issue: '#15',
    title: 'List open issues with gh',
    config: { agent: 'Claude Code', model: 'Sonnet 5.5', effort: 'medium' },
    stage: 'ai-review',
    slot: null,
    level: 'attention',
    status: 'Draft PR #23 is ready',
    time: '25m ago',
    queue: {
      reason: 'PR ready',
      cost: 'Draft PR #23 · ready for 25 min',
      action: 'Open PR',
      waitingMinutes: 25
    },
    lastLook: '40 min ago',
    since: [
      'Created src/main/github.ts and 2 more files',
      'Type check and tests passed',
      'Codex · GPT-6.1-Sol reviewed the diff: no issues',
      'Opened draft PR #23'
    ],
    next: 'When you are happy with it, request reviews on GitHub. Usho then moves it to Parked › In review.',
    decision: {
      kind: 'review',
      pr: '#23',
      files: [
        { path: 'src/main/github.ts', diff: '+64 −0' },
        { path: 'src/shared/types.ts', diff: '+12 −0' },
        { path: 'src/renderer/src/IssueList.tsx', diff: '+88 −0' }
      ]
    }
  },
  {
    id: 'q1',
    issue: null,
    title: 'Summarize the Slack thread about the Windows release',
    config: { agent: 'Claude Code', model: 'Sonnet 5.5', effort: 'medium' },
    stage: null,
    tool: 'Slack',
    slot: null,
    level: 'attention',
    status: 'Summary ready',
    time: '2m ago',
    queue: {
      reason: 'Result ready',
      cost: 'Summary of 24 messages · 2 min ago',
      action: 'Read',
      waitingMinutes: 2
    },
    lastLook: 'not opened yet',
    since: ['Read 24 messages from the Slack thread', 'Wrote the summary'],
    next: 'Nothing more will happen. Copy the summary, or turn a next step into an issue.',
    decision: {
      kind: 'result',
      text: [
        'Decided',
        '• Ship the Windows build once CI passes on both runners (#12).',
        '• Keep the first preview build unsigned.',
        '',
        'Open questions',
        '• Who buys the code-signing certificate, and when?',
        '• Is a zip enough for now, or do we need an installer?',
        '',
        'Next steps',
        '• Finish the Windows CLI path fix (#24).',
        '• Add a note about the unsigned build to the README.'
      ].join('\n')
    }
  }
]

export const sampleParked: ParkedGroup[] = [
  {
    label: 'In review',
    items: [
      { text: '#12 Build on macOS and Windows in GitHub Actions', meta: 'waiting 1d' },
      { text: '#13 Add an app icon', meta: '1 new comment' }
    ]
  },
  {
    label: 'Waiting for a slot',
    items: [
      { text: '#24 Find CLIs on Windows', meta: 'next' },
      { text: 'Draft a reply to the review comment on PR #16', meta: 'after #24' }
    ]
  }
]
