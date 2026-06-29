import { describe, it, expect } from 'vitest'
import { sortByPinnedAndArchived, togglePinned, toggleArchived } from '../utils/pinned'

describe('sortByPinnedAndArchived', () => {
  it('places pinned papers before normal and archived ones', () => {
    expect(sortByPinnedAndArchived(['a.json', 'b.json', 'c.json'], ['c.json'], [])).toEqual([
      'c.json', 'a.json', 'b.json'
    ])
  })

  it('places archived papers after normal and pinned ones', () => {
    expect(sortByPinnedAndArchived(['a.json', 'b.json', 'c.json'], [], ['a.json'])).toEqual([
      'b.json', 'c.json', 'a.json'
    ])
  })

  it('puts pinned first, normal in middle, archived last', () => {
    expect(
      sortByPinnedAndArchived(['a.json', 'b.json', 'c.json', 'd.json'], ['d.json'], ['a.json'])
    ).toEqual(['d.json', 'b.json', 'c.json', 'a.json'])
  })

  it('preserves original relative order within each group', () => {
    expect(
      sortByPinnedAndArchived(['a.json', 'b.json', 'c.json', 'd.json'], ['c.json', 'a.json'], ['d.json', 'b.json'])
    ).toEqual(['a.json', 'c.json', 'b.json', 'd.json'])
  })

  it('returns original order when nothing is pinned or archived', () => {
    expect(sortByPinnedAndArchived(['a.json', 'b.json'], [], [])).toEqual(['a.json', 'b.json'])
  })

  it('returns original order when everything is pinned', () => {
    expect(sortByPinnedAndArchived(['a.json', 'b.json'], ['a.json', 'b.json'], [])).toEqual([
      'a.json', 'b.json'
    ])
  })

  it('returns original order when everything is archived', () => {
    expect(sortByPinnedAndArchived(['a.json', 'b.json'], [], ['a.json', 'b.json'])).toEqual([
      'a.json', 'b.json'
    ])
  })

  it('ignores pinned names that are not in fileNames', () => {
    expect(sortByPinnedAndArchived(['a.json', 'b.json'], ['ghost.json', 'b.json'], [])).toEqual([
      'b.json', 'a.json'
    ])
  })

  it('ignores archived names that are not in fileNames', () => {
    expect(sortByPinnedAndArchived(['a.json', 'b.json'], [], ['ghost.json', 'a.json'])).toEqual([
      'b.json', 'a.json'
    ])
  })
})

describe('togglePinned', () => {
  it('adds a fileName that is not yet pinned', () => {
    expect(togglePinned(['a.json'], 'b.json')).toEqual(['a.json', 'b.json'])
  })

  it('removes a fileName that is already pinned', () => {
    expect(togglePinned(['a.json', 'b.json'], 'a.json')).toEqual(['b.json'])
  })

  it('handles an empty list by adding the fileName', () => {
    expect(togglePinned([], 'a.json')).toEqual(['a.json'])
  })

  it('handles removing the only pinned item', () => {
    expect(togglePinned(['a.json'], 'a.json')).toEqual([])
  })
})

describe('toggleArchived', () => {
  it('adds a fileName that is not yet archived', () => {
    expect(toggleArchived(['a.json'], 'b.json')).toEqual(['a.json', 'b.json'])
  })

  it('removes a fileName that is already archived', () => {
    expect(toggleArchived(['a.json', 'b.json'], 'a.json')).toEqual(['b.json'])
  })

  it('handles an empty list by adding the fileName', () => {
    expect(toggleArchived([], 'a.json')).toEqual(['a.json'])
  })

  it('handles removing the only archived item', () => {
    expect(toggleArchived(['a.json'], 'a.json')).toEqual([])
  })
})
