import { describe, test, expect } from 'vitest'
import { applyAnnotations } from '../configUtils'
import type { AppConfig } from '../configUtils'

const emptyConfig: AppConfig = {
  recentDirs: [],
  lastOpenedParent: ''
}

describe('applyAnnotations', () => {
  test('sets pinned, archived, and notes on an empty config', () => {
    const result = applyAnnotations(
      emptyConfig,
      '/data/results',
      ['a.tables.json', 'b.tables.json'],
      ['c.tables.json'],
      { 'a.tables.json': 'important' }
    )
    expect(result).toEqual({
      recentDirs: [],
      lastOpenedParent: '',
      pinnedPapers: { '/data/results': ['a.tables.json', 'b.tables.json'] },
      archivedPapers: { '/data/results': ['c.tables.json'] },
      paperNotes: { '/data/results': { 'a.tables.json': 'important' } }
    })
  })

  test('merges with existing entries for other directories', () => {
    const config: AppConfig = {
      recentDirs: [],
      lastOpenedParent: '',
      pinnedPapers: { '/other': ['x.tables.json'] },
      archivedPapers: { '/other': ['y.tables.json'] },
      paperNotes: { '/other': { 'x.tables.json': 'note' } }
    }
    const result = applyAnnotations(
      config,
      '/data/results',
      ['a.tables.json'],
      [],
      {}
    )
    expect(result).toEqual({
      recentDirs: [],
      lastOpenedParent: '',
      pinnedPapers: { '/other': ['x.tables.json'], '/data/results': ['a.tables.json'] },
      archivedPapers: { '/other': ['y.tables.json'], '/data/results': [] },
      paperNotes: { '/other': { 'x.tables.json': 'note' }, '/data/results': {} }
    })
  })

  test('overwrites existing entry for the same directory', () => {
    const config: AppConfig = {
      recentDirs: [],
      lastOpenedParent: '',
      pinnedPapers: { '/data/results': ['old.tables.json'] },
      archivedPapers: { '/data/results': ['stale.tables.json'] },
      paperNotes: { '/data/results': { 'old.tables.json': 'stale note' } }
    }
    const result = applyAnnotations(
      config,
      '/data/results',
      ['new.tables.json'],
      [],
      { 'new.tables.json': 'fresh note' }
    )
    expect(result).toEqual({
      recentDirs: [],
      lastOpenedParent: '',
      pinnedPapers: { '/data/results': ['new.tables.json'] },
      archivedPapers: { '/data/results': [] },
      paperNotes: { '/data/results': { 'new.tables.json': 'fresh note' } }
    })
  })

  test('does not mutate the input config', () => {
    const config: AppConfig = {
      recentDirs: [],
      lastOpenedParent: '',
      pinnedPapers: { '/data/results': ['a.tables.json'] }
    }
    applyAnnotations(config, '/data/results', ['b.tables.json'], [], {})
    expect(config.pinnedPapers).toEqual({ '/data/results': ['a.tables.json'] })
  })

  test('preserves other config fields', () => {
    const config: AppConfig = {
      recentDirs: ['/previous'],
      lastOpenedParent: '/parent',
      userName: 'alice'
    }
    const result = applyAnnotations(config, '/data/results', [], [], {})
    expect(result.recentDirs).toEqual(['/previous'])
    expect(result.lastOpenedParent).toEqual('/parent')
    expect(result.userName).toEqual('alice')
  })
})
