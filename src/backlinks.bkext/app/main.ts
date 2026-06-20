import { AppExtensionContext, Disposable, OutlineEditor, Row, Window } from 'bike/app'
import { BacklinksProtocol } from '../dom/protocols'
import { BacklinkIndex } from './backlinks'

export async function activate(_context: AppExtensionContext) {
  bike.observeWindows(async (window: Window) => {
    const handle = await window.inspector.addItem<BacklinksProtocol>({
      label: 'Backlinks',
      script: 'Backlinks.js',
    })

    let editor: OutlineEditor | undefined
    let selectedRow: Row | undefined
    let backlinkIndex: BacklinkIndex | undefined
    let selectionObserver: Disposable | undefined
    let outlineObserver: Disposable | undefined

    const refresh = () => {
      if (!editor || !selectedRow) {
        handle.postMessage({
          type: 'update',
          backlinks: [],
          message: 'Select a row to see backlinks.',
        })
        return
      }

      const row = editor.outline.getRowById(selectedRow.id)
      if (!row) {
        selectedRow = undefined
        handle.postMessage({
          type: 'update',
          backlinks: [],
          message: 'Selected row is no longer available.',
        })
        return
      }

      selectedRow = row

      if (!row.persistentId) {
        handle.postMessage({
          type: 'update',
          selectedRow: {
            rowId: row.id,
            text: row.text.string.trim() || 'Untitled row',
          },
          backlinks: [],
        })
        return
      }

      handle.postMessage({
        type: 'update',
        selectedRow: {
          rowId: row.id,
          text: row.text.string.trim() || 'Untitled row',
          persistentId: row.persistentId,
        },
        backlinks: backlinkIndex?.getBacklinks(row) ?? [],
      })
    }

    const attachEditor = (nextEditor: OutlineEditor | undefined) => {
      selectionObserver?.dispose()
      outlineObserver?.dispose()
      editor = nextEditor
      selectedRow = nextEditor?.selection?.row
      backlinkIndex = nextEditor ? new BacklinkIndex(nextEditor.outline) : undefined

      if (!nextEditor) {
        refresh()
        return
      }

      selectionObserver = nextEditor.observeSelection((selection) => {
        selectedRow = selection?.row
        refresh()
      }, 200)

      outlineObserver = nextEditor.outline.observeChanges((change) => {
        if (change.type === 'reload') {
          backlinkIndex = new BacklinkIndex(change.newOutline)
        } else if (backlinkIndex && !backlinkIndex.applyChange(change)) {
          return
        }
        refresh()
      })

      refresh()
    }

    handle.onmessage = (message) => {
      if (message.type === 'refresh') {
        refresh()
        return
      }

      if (message.type === 'selectRow' && editor) {
        const row = editor.outline.getRowById(message.rowId)
        if (!row) return
        editor.activate()
        editor.revealRow(row)
        editor.selectRows(row)
      }
    }

    attachEditor(window.currentOutlineEditor)
    const editorObserver = window.observeCurrentOutlineEditor(attachEditor)
    window.onClose(() => {
      editorObserver.dispose()
      selectionObserver?.dispose()
      outlineObserver?.dispose()
    })
  })
}
