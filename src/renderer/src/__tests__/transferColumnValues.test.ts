import { describe, it, expect } from 'vitest'
import { transferColumnValues } from '../actions/transferColumnValues'
import type { Row, TablesFile } from '../types'

function makeFile(...tables: TablesFile['tables']): TablesFile {
  return { tables }
}

function flatTable(rows: Row[], page = 1): TablesFile['tables'][number] {
  return { rows, page }
}

function fragmentedTable(...groups: Row[][]): TablesFile['tables'][number] {
  return {
    table_fragments: groups.map((rows, i) => ({ rows, page: i + 1 })),
  }
}

describe('transferColumnValues', () => {
  describe('destination column does not exist — behaves like rename', () => {
    it('renames the source column to the destination', () => {
      const file = makeFile(
        flatTable([
          { city: 'Bogotá', country: 'Colombia' },
          { city: 'Santiago', country: 'Chile' },
        ])
      )
      const result = transferColumnValues(file, 0, 0, 'city', 'capital', true)
      expect((result.tables[0] as { rows: Row[] }).rows).toEqual([
        { capital: 'Bogotá', country: 'Colombia' },
        { capital: 'Santiago', country: 'Chile' },
      ])
    })

    it('preserves column order when renaming', () => {
      const file = makeFile(
        flatTable([{ city: 'Bogotá', region: 'Cundinamarca', continent: 'América del Sur' }])
      )
      const result = transferColumnValues(file, 0, 0, 'region', 'province', true)
      expect(Object.keys((result.tables[0] as { rows: Row[] }).rows[0])).toEqual([
        'city', 'province', 'continent',
      ])
    })
  })

  describe('destination column already exists — overwrite dest with source values', () => {
    it('replaces destination column values with source values and removes source', () => {
      const file = makeFile(
        flatTable([
          { city: 'Bogotá', capital: 'old-value', country: 'Colombia' },
          { city: 'Santiago', capital: 'other-old', country: 'Chile' },
        ])
      )
      const result = transferColumnValues(file, 0, 0, 'city', 'capital', true)
      expect((result.tables[0] as { rows: Row[] }).rows).toEqual([
        { capital: 'Bogotá', country: 'Colombia' },
        { capital: 'Santiago', country: 'Chile' },
      ])
    })

    it('keeps destination value when source key is absent from a row', () => {
      const file = makeFile(
        flatTable([
          { city: 'Bogotá', capital: 'old' },
          { capital: 'kept' },
        ])
      )
      const result = transferColumnValues(file, 0, 0, 'city', 'capital', true)
      expect((result.tables[0] as { rows: Row[] }).rows).toEqual([
        { capital: 'Bogotá' },
        { capital: 'kept' },
      ])
    })

    it('preserves destination column position', () => {
      const file = makeFile(
        flatTable([{ city: 'Bogotá', region: 'Cundinamarca', continent: 'América del Sur' }])
      )
      const result = transferColumnValues(file, 0, 0, 'continent', 'region', true)
      expect(Object.keys((result.tables[0] as { rows: Row[] }).rows[0])).toEqual([
        'city', 'region',
      ])
    })
  })

  describe('editColumnsGlobally = false — only the targeted fragment is modified', () => {
    it('only modifies the targeted fragment, leaving others with their original columns', () => {
      const file = makeFile(
        fragmentedTable(
          [{ city: 'Bogotá', region: 'Cundinamarca' }],
          [{ city: 'Santiago', region: 'Metropolitana' }]
        )
      )
      const result = transferColumnValues(file, 0, 0, 'city', 'region', false)
      const fragments = (result.tables[0] as { table_fragments: { rows: Row[] }[] }).table_fragments
      expect(fragments[0].rows[0]).toEqual({ region: 'Bogotá' })
      expect(fragments[1].rows[0]).toEqual({ city: 'Santiago', region: 'Metropolitana' })
    })

    it('applies a rename only to the targeted fragment', () => {
      const file = makeFile(
        fragmentedTable(
          [{ city: 'Bogotá' }],
          [{ city: 'Santiago' }]
        )
      )
      const result = transferColumnValues(file, 0, 1, 'city', 'capital', false)
      const fragments = (result.tables[0] as { table_fragments: { rows: Row[] }[] }).table_fragments
      expect(fragments[0].rows[0]).toEqual({ city: 'Bogotá' })
      expect(fragments[1].rows[0]).toEqual({ capital: 'Santiago' })
    })
  })

  describe('editColumnsGlobally = true — all fragments are modified', () => {
    it('transfers values in all fragments', () => {
      const file = makeFile(
        fragmentedTable(
          [{ city: 'Bogotá' }],
          [{ city: 'Santiago' }]
        )
      )
      const result = transferColumnValues(file, 0, 0, 'city', 'capital', true)
      const fragments = (result.tables[0] as { table_fragments: { rows: Row[] }[] }).table_fragments
      expect(fragments[0].rows[0]).toEqual({ capital: 'Bogotá' })
      expect(fragments[1].rows[0]).toEqual({ capital: 'Santiago' })
    })
  })

  describe('edge cases', () => {
    it('returns the file unchanged when source and destination are the same', () => {
      const file = makeFile(flatTable([{ city: 'Bogotá' }]))
      const result = transferColumnValues(file, 0, 0, 'city', 'city', true)
      expect(result).toBe(file)
    })

    it('leaves other tables untouched', () => {
      const other = flatTable([{ city: 'Caracas' }], 5)
      const file = makeFile(flatTable([{ city: 'Bogotá', country: 'Colombia' }]), other)
      const result = transferColumnValues(file, 0, 0, 'city', 'capital', true)
      expect(result.tables[1]).toBe(other)
    })
  })
})
