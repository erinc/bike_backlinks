import { DOMExtensionContext } from 'bike/dom'
import { Disclosure, Label, SFSymbol } from 'bike/components'
import { createRoot } from 'react-dom/client'
import { useEffect, useState } from 'react'
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
  const accessory = state.selectedRow
    ? <Label color="secondary">{count}</Label>
    : undefined

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
            {state.backlinks.map((backlink) => (
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
