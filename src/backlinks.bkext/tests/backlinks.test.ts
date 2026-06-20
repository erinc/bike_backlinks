import { Outline } from 'bike/app'
import { findBacklinks, rowLinksToTarget } from '../app/backlinks'

describe('Backlinks', () => {
  it('finds rows that link to the target row by shorthand', () => {
    const outline = new Outline()
    outline.root.ensuredPersistentId
    const [target, source] = outline.insertRows([
      { persistentId: 'target', text: 'Target' },
      { text: 'See [Target](#target)', format: 'markdown' },
    ])

    const backlinks = findBacklinks(outline, target)

    assert.equal(backlinks.length, 1)
    assert.equal(backlinks[0].rowId, source.id)
    assert.equal(backlinks[0].text, 'See Target')
  })

  it('deduplicates multiple links from the same source row', () => {
    const outline = new Outline()
    outline.root.ensuredPersistentId
    const [target] = outline.insertRows([
      { persistentId: 'target', text: 'Target' },
      { text: '[One](#target) and [Two](#target)', format: 'markdown' },
    ])

    const backlinks = findBacklinks(outline, target)

    assert.equal(backlinks.length, 1)
  })

  it('does not return the target row as its own backlink', () => {
    const outline = new Outline()
    outline.root.ensuredPersistentId
    const [target] = outline.insertRows([
      { persistentId: 'target', text: '[Self](#target)', format: 'markdown' },
    ])

    const backlinks = findBacklinks(outline, target)

    assert.equal(backlinks.length, 0)
  })

  it('returns false when the selected row has no persistent id', () => {
    const outline = new Outline()
    const [target, source] = outline.insertRows([
      { text: 'Target' },
      { text: 'See [Target](#target)', format: 'markdown' },
    ])

    assert.equal(rowLinksToTarget(source, target), false)
  })
})
