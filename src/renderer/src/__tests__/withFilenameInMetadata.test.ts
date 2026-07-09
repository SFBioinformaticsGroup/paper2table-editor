import { describe, it, expect } from 'vitest'
import { withFilenameInMetadata } from '../actions/withFilenameInMetadata'
import type { TablesFile } from '../types'

describe('withFilenameInMetadata', () => {
  it('adds filename to metadata when metadata is absent', () => {
    const file: TablesFile = { tables: [] }
    const result = withFilenameInMetadata(file, 'paper1.tables.json')
    expect(result.metadata).toEqual({ filename: 'paper1.tables.json' })
  })

  it('adds filename to metadata when metadata is an empty object', () => {
    const file: TablesFile = { tables: [], metadata: {} }
    const result = withFilenameInMetadata(file, 'paper1.tables.json')
    expect(result.metadata).toEqual({ filename: 'paper1.tables.json' })
  })

  it('adds filename alongside existing metadata fields', () => {
    const file: TablesFile = { tables: [], metadata: { reader: 'tablemerge', agreement_method: 'simple-count' } }
    const result = withFilenameInMetadata(file, 'paper1.tables.json')
    expect(result.metadata).toEqual({ reader: 'tablemerge', agreement_method: 'simple-count', filename: 'paper1.tables.json' })
  })

  it('returns the file unchanged when filename is already present in metadata', () => {
    const file: TablesFile = { tables: [], metadata: { filename: 'original.tables.json' } }
    const result = withFilenameInMetadata(file, 'other.tables.json')
    expect(result).toBe(file)
    expect(result.metadata).toEqual({ filename: 'original.tables.json' })
  })

  it('does not mutate the original file', () => {
    const file: TablesFile = { tables: [], metadata: { reader: 'tablemerge' } }
    withFilenameInMetadata(file, 'paper1.tables.json')
    expect(file.metadata).toEqual({ reader: 'tablemerge' })
  })

  it('does not mutate the original metadata object', () => {
    const metadata = { reader: 'tablemerge' }
    const file: TablesFile = { tables: [], metadata }
    withFilenameInMetadata(file, 'paper1.tables.json')
    expect(metadata).toEqual({ reader: 'tablemerge' })
  })
})
