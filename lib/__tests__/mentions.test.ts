import { describe, it, expect } from 'vitest'
import { parseMentions, buildMentionString, hasMentions } from '@/lib/mentions/parse'

describe('parseMentions', () => {
  it('parses a single user mention', () => {
    const content = 'Hello @[Alice](user:550e8400-e29b-41d4-a716-446655440000) world'
    const result = parseMentions(content)
    expect(result).toHaveLength(1)
    expect(result[0].name).toBe('Alice')
    expect(result[0].type).toBe('user')
    expect(result[0].id).toBe('550e8400-e29b-41d4-a716-446655440000')
  })

  it('parses multiple mentions of different types', () => {
    const content = '@[Alice](user:aaa-bbb) see @[Auth Doc](blueprint:ccc-ddd)'
    const result = parseMentions(content)
    expect(result).toHaveLength(2)
    expect(result[0].type).toBe('user')
    expect(result[1].type).toBe('blueprint')
  })

  it('ignores invalid mention types', () => {
    const content = '@[Thing](invalid_type:abc-123)'
    const result = parseMentions(content)
    expect(result).toHaveLength(0)
  })

  it('returns empty array for no mentions', () => {
    expect(parseMentions('just plain text')).toHaveLength(0)
  })

  it('captures offset and length', () => {
    const content = 'prefix @[Bob](user:abc-def) suffix'
    const result = parseMentions(content)
    expect(result[0].offset).toBe(7)
    expect(result[0].length).toBe(20)
  })

  it('handles all valid mention types', () => {
    const types = ['user', 'requirement_doc', 'blueprint', 'work_order', 'artifact']
    for (const type of types) {
      const content = `@[Name](${type}:abc-def)`
      const result = parseMentions(content)
      expect(result).toHaveLength(1)
      expect(result[0].type).toBe(type)
    }
  })
})

describe('buildMentionString', () => {
  it('builds a valid mention string', () => {
    const result = buildMentionString('Alice', 'user', 'abc-123')
    expect(result).toBe('@[Alice](user:abc-123)')
  })

  it('round-trips through parse', () => {
    const mention = buildMentionString('Doc Name', 'blueprint', 'aabb-ccdd-eeff')
    const parsed = parseMentions(mention)
    expect(parsed).toHaveLength(1)
    expect(parsed[0].name).toBe('Doc Name')
    expect(parsed[0].type).toBe('blueprint')
    expect(parsed[0].id).toBe('aabb-ccdd-eeff')
  })
})

describe('hasMentions', () => {
  it('returns true when mentions exist', () => {
    expect(hasMentions('Hello @[Alice](user:abc-123)')).toBe(true)
  })

  it('returns false for plain text', () => {
    expect(hasMentions('just regular text')).toBe(false)
  })

  it('returns false for partial mention syntax', () => {
    expect(hasMentions('@[incomplete')).toBe(false)
  })
})
