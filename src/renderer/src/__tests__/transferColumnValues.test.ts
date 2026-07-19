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
          { drug: 'aspirin', dose: '500mg' },
          { drug: 'ibuprofen', dose: '200mg' },
        ])
      )
      const result = transferColumnValues(file, 0, 0, 'drug', 'medication')
      expect((result.tables[0] as { rows: Row[] }).rows).toEqual([
        { medication: 'aspirin', dose: '500mg' },
        { medication: 'ibuprofen', dose: '200mg' },
      ])
    })

    it('preserves column order when renaming', () => {
      const file = makeFile(
        flatTable([{ alpha: '1', beta: '2', gamma: '3' }])
      )
      const result = transferColumnValues(file, 0, 0, 'beta', 'delta')
      expect(Object.keys((result.tables[0] as { rows: Row[] }).rows[0])).toEqual([
        'alpha', 'delta', 'gamma',
      ])
    })
  })

  describe('destination column already exists — overwrite dest with source values', () => {
    it('replaces destination column values with source values and removes source', () => {
      const file = makeFile(
        flatTable([
          { drug: 'aspirin', medication: 'old-value', dose: '500mg' },
          { drug: 'ibuprofen', medication: 'other-old', dose: '200mg' },
        ])
      )
      const result = transferColumnValues(file, 0, 0, 'drug', 'medication')
      expect((result.tables[0] as { rows: Row[] }).rows).toEqual([
        { medication: 'aspirin', dose: '500mg' },
        { medication: 'ibuprofen', dose: '200mg' },
      ])
    })

    it('keeps destination value when source key is absent from a row', () => {
      const file = makeFile(
        flatTable([
          { drug: 'aspirin', medication: 'old' },
          { medication: 'kept' },
        ])
      )
      const result = transferColumnValues(file, 0, 0, 'drug', 'medication')
      expect((result.tables[0] as { rows: Row[] }).rows).toEqual([
        { medication: 'aspirin' },
        { medication: 'kept' },
      ])
    })

    it('preserves destination column position', () => {
      const file = makeFile(
        flatTable([{ code: 'X', label: 'existing', notes: 'n' }])
      )
      const result = transferColumnValues(file, 0, 0, 'notes', 'label')
      expect(Object.keys((result.tables[0] as { rows: Row[] }).rows[0])).toEqual([
        'code', 'label',
      ])
    })
  })

  describe('fragmentIdx scoping — only the targeted fragment is modified', () => {
    it('only modifies the targeted fragment, leaving others with their original columns', () => {
      const file = makeFile(
        fragmentedTable(
          [{ dose: '5mg', value: 'frag0-original' }],
          [{ dose: '10mg', value: 'frag1-original' }]
        )
      )
      const result = transferColumnValues(file, 0, 0, 'dose', 'value')
      const fragments = (result.tables[0] as { table_fragments: { rows: Row[] }[] }).table_fragments
      expect(fragments[0].rows[0]).toEqual({ value: '5mg' })
      expect(fragments[1].rows[0]).toEqual({ dose: '10mg', value: 'frag1-original' })
    })

    it('applies a rename only to the targeted fragment', () => {
      const file = makeFile(
        fragmentedTable(
          [{ dose: '5mg' }],
          [{ dose: '10mg' }]
        )
      )
      const result = transferColumnValues(file, 0, 1, 'dose', 'dosage')
      const fragments = (result.tables[0] as { table_fragments: { rows: Row[] }[] }).table_fragments
      expect(fragments[0].rows[0]).toEqual({ dose: '5mg' })
      expect(fragments[1].rows[0]).toEqual({ dosage: '10mg' })
    })
  })

  describe('edge cases', () => {
    it('returns the file unchanged when source and destination are the same', () => {
      const file = makeFile(flatTable([{ dose: '5mg' }]))
      const result = transferColumnValues(file, 0, 0, 'dose', 'dose')
      expect(result).toBe(file)
    })

    it('leaves other tables untouched', () => {
      const other = flatTable([{ name: 'X' }], 5)
      const file = makeFile(flatTable([{ drug: 'A', dose: '5mg' }]), other)
      const result = transferColumnValues(file, 0, 0, 'drug', 'medication')
      expect(result.tables[1]).toBe(other)
    })
  })
})
