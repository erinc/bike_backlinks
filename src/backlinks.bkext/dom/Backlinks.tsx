import { DOMExtensionContext } from 'bike/dom'
import { Disclosure, Label, SFSymbol } from 'bike/components'
import { createRoot } from 'react-dom/client'
import { useEffect, useMemo, useState } from 'react'
import { BacklinkItem, BacklinksProtocol, SelectedRow } from './protocols'

type BacklinksState = {
  selectedRow?: SelectedRow
  backlinks: BacklinkItem[]
  message?: string
}

function BacklinksPanel({ context }: { context: DOMExtensionContext<BacklinksProtocol> }) {
  const [state, setState] = useState<BacklinksState>({
    backlinks: [],
    message: 'Select a row to see backlinks.',
  })
  const [rowDates, setRowDates] = useState<Record<number, RowDates>>({})

  useEffect(() => {
    context.onmessage = (message) => {
      if (message.type === 'update') {
        setState({
          selectedRow: message.selectedRow,
          backlinks: message.backlinks,
          message: message.message,
        })
      }
    }

    context.postMessage({ type: 'refresh' })

    return () => {
      context.onmessage = undefined
    }
  }, [])

  const count = state.backlinks.length
  const sortedBacklinks = useMemo(() => sortBacklinks(state.backlinks, rowDates), [state.backlinks, rowDates])
  const accessory = state.selectedRow
    ? <Label color="secondary">{count}</Label>
    : undefined

  useEffect(() => {
    const rowRefs = state.backlinks.map((backlink) => backlink.rowId)
    if (rowRefs.length === 0) {
      setRowDates({})
      return
    }

    let canceled = false
    bike.session.getOutline({ rowRefs, shape: 'flat' })
      .then((outline) => {
        if (canceled) return

        const nextDates: Record<number, RowDates> = {}
        for (const row of flattenSessionRows(outline.root.children ?? [])) {
          nextDates[row.id] = {
            created: row.created,
            modified: row.modified,
          }
        }
        setRowDates(nextDates)
      })
      .catch(() => {
        if (!canceled) setRowDates({})
      })

    return () => {
      canceled = true
    }
  }, [state.backlinks])

  return (
    <Disclosure
      label="Backlinks"
      accessory={accessory}
      accessoryAlignment="trailing"
      defaultExpanded
      style={{ marginTop: 6 }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {state.message ? (
          <Label color="secondary">{state.message}</Label>
        ) : count > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {sortedBacklinks.map((backlink) => (
              <button
                key={backlink.rowId}
                type="button"
                onClick={() => context.postMessage({ type: 'selectRow', rowId: backlink.rowId })}
                style={{
                  appearance: 'none',
                  border: 'none',
                  background: 'transparent',
                  color: 'inherit',
                  cursor: 'default',
                  display: 'grid',
                  gridTemplateColumns: '16px minmax(0, 1fr)',
                  gap: 6,
                  padding: '3px 2px',
                  textAlign: 'left',
                  width: '100%',
                }}
              >
                <SFSymbol name={symbolForType(backlink.type)} scale="small" style={{ color: 'var(--secondary-label)' }} />
                <span style={{ minWidth: 0 }}>
                  <span style={{
                    display: 'block',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    fontSize: 12,
                  }}>
                    {backlink.text}
                  </span>
                  {backlink.path.length > 0 ? (
                    <span style={{
                      display: 'block',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      color: 'var(--secondary-label)',
                      fontSize: 11,
                      marginTop: 1,
                    }}>
                      {backlink.path.join(' / ')}
                    </span>
                  ) : null}
                </span>
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </Disclosure>
  )
}

type RowDates = {
  created: string
  modified: string
}

function sortBacklinks(backlinks: BacklinkItem[], rowDates: Record<number, RowDates>): BacklinkItem[] {
  const outlineOrder = new Map(backlinks.map((backlink, index) => [backlink.rowId, index]))

  return [...backlinks].sort((left, right) => {
    const leftTime = sortTime(rowDates[left.rowId])
    const rightTime = sortTime(rowDates[right.rowId])

    if (leftTime !== rightTime) return rightTime - leftTime
    return (outlineOrder.get(left.rowId) ?? 0) - (outlineOrder.get(right.rowId) ?? 0)
  })
}

function sortTime(dates: RowDates | undefined): number {
  if (!dates) return 0
  return Date.parse(dates.modified || dates.created) || 0
}

function flattenSessionRows(rows: SessionRow[]): SessionRow[] {
  const result: SessionRow[] = []

  for (const row of rows) {
    result.push(row)
    if (row.children) {
      result.push(...flattenSessionRows(row.children))
    }
  }

  return result
}

function symbolForType(type: string): string {
  switch (type) {
    case 'heading':
      return 'textformat.size'
    case 'task':
      return 'checkmark.square'
    case 'ordered':
      return 'list.number'
    case 'unordered':
      return 'list.bullet'
    case 'quote':
      return 'text.quote'
    case 'code':
      return 'chevron.left.forwardslash.chevron.right'
    case 'note':
      return 'note.text'
    default:
      return 'arrow.uturn.left'
  }
}

export function activate(context: DOMExtensionContext<BacklinksProtocol>) {
  createRoot(context.element).render(<BacklinksPanel context={context} />)
}
