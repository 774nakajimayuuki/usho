import { useEffect, useRef } from 'react'

export interface ShortcutHandlers {
  next: () => void
  previous: () => void
  open: () => void
  allow: () => void
  deny: () => void
  slot: (n: number) => void
}

export const modKey = navigator.userAgent.includes('Mac') ? '⌘' : 'Ctrl+'

/** Keyboard triage: J/K move through Needs you, A/D answer an approval, ⌘1–⌘6 jump to a slot. */
export function useShortcuts(handlers: ShortcutHandlers): void {
  const latest = useRef(handlers)
  useEffect(() => {
    latest.current = handlers
  })

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent): void {
      if (e.target instanceof HTMLElement && e.target.closest('input, textarea, select, [contenteditable]')) return
      const h = latest.current

      if ((e.metaKey || e.ctrlKey) && /^[1-9]$/.test(e.key)) {
        e.preventDefault()
        h.slot(Number(e.key))
        return
      }
      if (e.metaKey || e.ctrlKey || e.altKey) return

      // Enter on a focused button should press that button
      if (e.key === 'Enter') {
        if (e.target instanceof HTMLButtonElement) return
        e.preventDefault()
        h.open()
        return
      }

      const keys: Record<string, () => void> = { j: h.next, k: h.previous, a: h.allow, d: h.deny }
      const run = keys[e.key.toLowerCase()]
      if (!run) return
      e.preventDefault()
      run()
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])
}
