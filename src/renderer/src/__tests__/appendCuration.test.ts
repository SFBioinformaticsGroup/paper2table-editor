import { describe, it, expect } from 'vitest'
import { appendCuration } from '../actions/appendCuration'
import type { Curation, Row, TablesFile } from '../types'

function makeFile(...tables: TablesFile['tables']): TablesFile {
  return { tables }
}

function flatTable(rows: Row[], page = 1): TablesFile['tables'][number] {
  return { rows, page }
}

const curation: Curation = { curator: 'Alice', timestamp: '2024-06-25', description: 'first pass' }

describe('appendCuration', () => {
  it('adds the curation to metadata.curations when no curations exist yet', () => {
    const file = makeFile(flatTable([{ drug: 'aspirin' }]))
    const result = appendCuration(file, curation)
    expect(result.metadata).toEqual({
      curations: [{ curator: 'Alice', timestamp: '2024-06-25', description: 'first pass' }],
    })
  })

  it('appends to an existing curations array, preserving earlier entries', () => {
    const earlier: Curation = { curator: 'Bob', timestamp: '2024-01-01', description: 'initial' }
    const file: TablesFile = { tables: [], metadata: { curations: [earlier] } }
    const result = appendCuration(file, curation)
    expect(result.metadata?.['curations']).toEqual([
      { curator: 'Bob', timestamp: '2024-01-01', description: 'initial' },
      { curator: 'Alice', timestamp: '2024-06-25', description: 'first pass' },
    ])
  })

  it('preserves other metadata fields alongside curations', () => {
    const file: TablesFile = {
      tables: [],
      metadata: { reader: 'tablemerge', agreement_method: 'simple-count' },
    }
    const result = appendCuration(file, curation)
    expect(result.metadata?.reader).toBe('tablemerge')
    expect(result.metadata?.agreement_method).toBe('simple-count')
    expect(Array.isArray(result.metadata?.['curations'])).toBe(true)
  })

  it('creates a metadata object when the file has none', () => {
    const file = makeFile(flatTable([]))
    const result = appendCuration(file, { curator: 'Alice', timestamp: '2024-06-25', description: '' })
    expect(result.metadata).toEqual({
      curations: [{ curator: 'Alice', timestamp: '2024-06-25', description: '' }],
    })
  })

  it('does not mutate the original file metadata', () => {
    const file: TablesFile = { tables: [], metadata: {} }
    appendCuration(file, curation)
    expect(file.metadata).toEqual({})
  })

  it('does not mutate the original curations array', () => {
    const originalCurations: Curation[] = [{ curator: 'Bob', timestamp: '2024-01-01', description: 'old' }]
    const file: TablesFile = { tables: [], metadata: { curations: originalCurations } }
    appendCuration(file, curation)
    expect(originalCurations).toHaveLength(1)
  })

  it('accepts an empty description', () => {
    const file = makeFile(flatTable([]))
    const result = appendCuration(file, { curator: 'Alice', timestamp: '2024-06-25', description: '' })
    const curations = result.metadata?.['curations'] as Curation[]
    expect(curations[0].description).toBe('')
  })
})
