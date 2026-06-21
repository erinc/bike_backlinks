import { Outline } from 'bike/app'
import { BacklinkIndex, findBacklinks, rowLinksToTarget } from '../app/backlinks'

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

  it('updates one changed source row without rebuilding the full index', () => {
    const outline = new Outline()
    outline.root.ensuredPersistentId
    const [target, source] = outline.insertRows([
      { persistentId: 'target', text: 'Target' },
      { text: 'No link yet' },
    ])
    const index = new BacklinkIndex(outline)

    assert.equal(index.getBacklinks(target).length, 0)

    source.text.replace([0, source.text.count], 'See Target')
    source.text.addAttribute('a', '#target', [4, 10])
    index.applyChange({
      type: 'rowChanged',
      rowId: source.id,
      change: {
        type: 'replacedText',
        at: 0,
        replacedText: source.text,
        insertedText: source.text,
      },
    })

    assert.equal(index.getBacklinks(target).length, 1)
  })

  it('removes deleted source rows from the index', () => {
    const outline = new Outline()
    outline.root.ensuredPersistentId
    const [target, source] = outline.insertRows([
      { persistentId: 'target', text: 'Target' },
      { text: 'See [Target](#target)', format: 'markdown' },
    ])
    const index = new BacklinkIndex(outline)

    assert.equal(index.getBacklinks(target).length, 1)
    index.applyChange({ type: 'siblingsRemoved', siblings: [source] })

    assert.equal(index.getBacklinks(target).length, 0)
  })

  it('records the nearest calendar day id from backlink source ancestors', () => {
    const outline = new Outline()
    outline.root.ensuredPersistentId
    const [target] = outline.insertRows([
      { persistentId: 'target', text: 'Target' },
    ])
    const [year] = outline.insertRows([{ persistentId: '2026/00/00', text: '2026' }])
    const [month] = outline.insertRows([{ persistentId: '2026/06/00', text: 'June 2026' }], year)
    const [day] = outline.insertRows([{ persistentId: '2026/06/18', text: 'June 18, 2026' }], month)
    const [source] = outline.insertRows([
      { text: 'See [Target](#target)', format: 'markdown' },
    ], day)

    const backlinks = new BacklinkIndex(outline).getBacklinks(target)

    assert.equal(backlinks.length, 1)
    assert.equal(backlinks[0].rowId, source.id)
    assert.equal(backlinks[0].calendarDate, '2026/06/18')
  })
})
