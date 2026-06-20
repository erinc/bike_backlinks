import { DOMProtocol } from 'bike/core'

export type BacklinkItem = {
  rowId: number
  text: string
  type: string
  level: number
  path: string[]
}

export type SelectedRow = {
  rowId: number
  text: string
  persistentId?: string
}

export type BacklinksProtocol = DOMProtocol & {
  toDOM:
    | {
        type: 'update'
        selectedRow?: SelectedRow
        backlinks: BacklinkItem[]
        message?: string
      }
  toApp:
    | { type: 'selectRow'; rowId: number }
    | { type: 'refresh' }
}
