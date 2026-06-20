import { AttributedString, Outline, Range, Row, URL } from 'bike/app'
import { BacklinkItem } from '../dom/protocols'

export function findBacklinks(outline: Outline, target: Row): BacklinkItem[] {
  if (!target.persistentId) return []

  const seen = new Set<number>()
  const backlinks: BacklinkItem[] = []

  for (const row of outline.root.descendants) {
    if (row.id === target.id) continue
    if (!rowLinksToTarget(row, target)) continue
    if (seen.has(row.id)) continue

    seen.add(row.id)
    backlinks.push({
      rowId: row.id,
      text: displayText(row),
      type: row.type,
      level: row.level,
      path: row.ancestors
        .filter((ancestor) => ancestor.parent)
        .map(displayText),
    })
  }

  return backlinks
}

export function rowLinksToTarget(row: Row, target: Row): boolean {
  if (!target.persistentId) return false

  for (const link of linksInText(row.text)) {
    if (linkMatchesTarget(link, row.outline, target)) return true
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

function linkMatchesTarget(link: string, outline: Outline, target: Row): boolean {
  if (isLocalShorthandForTarget(link, target.persistentId!)) return true

  const resolved = outline.resolveLink(link)
  if (!resolved) return false

  return sameBikeRowURL(resolved, target.url)
}

function isLocalShorthandForTarget(link: string, targetPersistentId: string): boolean {
  if (!link.startsWith('#')) return false
  const shorthand = link.slice(1)
  if (shorthand === targetPersistentId) return true
  try {
    return decodeURIComponent(shorthand) === targetPersistentId
  } catch {
    return false
  }
}

function sameBikeRowURL(left: URL, right: URL): boolean {
  if (left.scheme !== 'bike' || right.scheme !== 'bike') return false

  return (left.host ?? '') === (right.host ?? '')
    && (left.path ?? '') === (right.path ?? '')
    && (left.fragment ?? '') === (right.fragment ?? '')
}

function displayText(row: Row): string {
  const text = row.text.string.trim()
  return text || 'Untitled row'
}
