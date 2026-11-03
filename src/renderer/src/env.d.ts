import type { UshoApi } from '../../shared/types'

declare global {
  interface Window {
    usho: UshoApi
  }
}
