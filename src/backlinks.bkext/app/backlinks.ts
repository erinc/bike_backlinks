import { AttributedString, Outline, OutlineChange, Range, Row, URL } from 'bike/app'
import { BacklinkItem } from '../dom/protocols'

export function findBacklinks(outline: Outline, target: Row): BacklinkItem[] {
  return new BacklinkIndex(outline).getBacklinks(target)
}

export class BacklinkIndex {
  private targetSources = new Map<string, Map<number, BacklinkItem>>()
  private sourceTargets = new Map<number, Set<string>>()

  constructor(private outline: Outline) {
    this.rebuild(outline)
  }

  rebuild(outline = this.outline): void {
    this.outline = outline
    this.targetSources.clear()
    this.sourceTargets.clear()
    this.indexRows(outline.root.descendants)
  }

  applyChange(change: OutlineChange): boolean {
    switch (change.type) {
      case 'rowChanged': {
        const row = this.outline.getRowById(change.rowId)
        if (!row) return false
        this.reindexRow(row)
        return true
      }
      case 'siblingsInserted':
        this.indexRowsWithDescendants(change.siblings)
        return true
      case 'siblingsRemoved':
        this.removeRowsWithDescendants(change.siblings)
        return true
      case 'siblingsMoved':
        this.reindexRowsWithDescendants(change.newSiblings)
        return true
      case 'reload':
        this.rebuild(change.newOutline)
        return true
      case 'beginTransaction':
      case 'endTransaction':
      case 'metadata':
        return false
    }
  }

  getBacklinks(target: Row): BacklinkItem[] {
    if (!target.persistentId) return []

    const seen = new Set<number>()
    const backlinks: BacklinkItem[] = []

    for (const key of targetKeys(target)) {
      const sources = this.targetSources.get(key)
      if (!sources) continue

      for (const item of sources.values()) {
        if (item.rowId === target.id || seen.has(item.rowId)) continue
        seen.add(item.rowId)
        backlinks.push(item)
      }
    }

    return backlinks
  }

  private indexRows(rows: Iterable<Row>): void {
    for (const row of rows) {
      this.indexRow(row)
    }
  }

  private indexRowsWithDescendants(rows: Iterable<Row>): void {
    for (const row of rows) {
      this.indexRow(row)
      this.indexRows(row.descendants)
    }
  }

  private reindexRow(row: Row): void {
    this.removeRow(row)
    this.indexRow(row)
  }

  private reindexRowsWithDescendants(rows: Iterable<Row>): void {
    for (const row of rows) {
      this.reindexRow(row)
      for (const descendant of row.descendants) {
        this.reindexRow(descendant)
      }
    }
  }

  private removeRowsWithDescendants(rows: Iterable<Row>): void {
    for (const row of rows) {
      this.removeRow(row)
      for (const descendant of row.descendants) {
        this.removeRow(descendant)
      }
    }
  }

  private indexRow(row: Row): void {
    const keys = linkTargetKeys(row)
    if (keys.size === 0) return

    const item = backlinkItem(row)
    this.sourceTargets.set(row.id, keys)

    for (const key of keys) {
      let sources = this.targetSources.get(key)
      if (!sources) {
        sources = new Map<number, BacklinkItem>()
        this.targetSources.set(key, sources)
      }
      sources.set(row.id, item)
    }
  }

  private removeRow(row: Row): void {
    const oldKeys = this.sourceTargets.get(row.id)
    if (!oldKeys) return

    for (const key of oldKeys) {
      const sources = this.targetSources.get(key)
      if (!sources) continue
      sources.delete(row.id)
      if (sources.size === 0) {
        this.targetSources.delete(key)
      }
    }

    this.sourceTargets.delete(row.id)
  }
}

export function rowLinksToTarget(row: Row, target: Row): boolean {
  if (!target.persistentId) return false

  const rowKeys = linkTargetKeys(row)
  for (const key of targetKeys(target)) {
    if (rowKeys.has(key)) return true
  }

  return false
}

function linksInText(text: AttributedString): string[] {
  const links: string[] = []
  const range: Range = [0, 0]

  while (range[0] < text.count) {
    const link = text.attributeAt('a', range[0], 'downstream', range)
    if (link) links.push(link)
    range[0] = range[1]
    range[1] = range[0]
  }

  return links
}

function linkTargetKeys(row: Row): Set<string> {
  const keys = new Set<string>()

  for (const link of linksInText(row.text)) {
    for (const key of targetKeysForLink(link, row.outline)) {
      keys.add(key)
    }
  }

  return keys
}

function targetKeysForLink(link: string, outline: Outline): string[] {
  const keys: string[] = []

  if (link.startsWith('#')) {
    const persistentId = persistentIdFromShorthand(link)
    if (persistentId) keys.push(persistentKey(persistentId))
  }

  const resolved = outline.resolveLink(link)
  if (resolved?.scheme === 'bike') {
    keys.push(urlKey(resolved))
  }

  return keys
}

function persistentIdFromShorthand(link: string): string | undefined {
  const shorthand = link.slice(1)
  try {
    return decodeURIComponent(shorthand)
  } catch {
    return undefined
  }
}

function targetKeys(row: Row): string[] {
  if (!row.persistentId) return []
  return [
    persistentKey(row.persistentId),
    urlKey(row.url),
  ]
}

function persistentKey(persistentId: string): string {
  return `pid:${persistentId}`
}

function urlKey(url: URL): string {
  return `url:${url.host ?? ''}|${url.path ?? ''}|${url.fragment ?? ''}`
}

function backlinkItem(row: Row): BacklinkItem {
  return {
    rowId: row.id,
    persistentId: row.persistentId,
    calendarDate: findCalendarDateId(row),
    text: displayText(row),
    type: row.type,
    level: row.level,
    path: row.ancestors
      .filter((ancestor) => ancestor.parent)
      .map(displayText),
  }
}

function findCalendarDateId(row: Row): string | undefined {
  for (const ancestor of row.ancestorsWithSelf.slice().reverse()) {
    const persistentId = ancestor.persistentId
    if (persistentId && isCalendarDayId(persistentId)) return persistentId
  }
  return undefined
}

function isCalendarDayId(persistentId: string): boolean {
  const match = persistentId.match(/^(\d{4})\/(\d{2})\/(\d{2})$/)
  if (!match) return false

  const month = Number(match[2])
  const day = Number(match[3])
  return month >= 1 && month <= 12 && day >= 1 && day <= 31
}

function displayText(row: Row): string {
  const text = row.text.string.trim()
  return text || 'Untitled row'
}
