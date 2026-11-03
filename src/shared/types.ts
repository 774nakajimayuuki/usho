/** A CLI that Usho drives, and whether it can be run on this machine. */
export interface ToolStatus {
  command: string
  label: string
  installed: boolean
  version: string | null
}

/** The API the preload script exposes to the renderer as `window.usho`. */
export interface UshoApi {
  checkTools: () => Promise<ToolStatus[]>
}
