import { describe, it, expect } from 'vitest'
import { cn } from '@/lib/utils'

describe('cn()', () => {
  it('concatenates plain class names', () => {
    expect(cn('foo', 'bar')).toBe('foo bar')
  })

  it('skips falsy values', () => {
    expect(cn('foo', null as any, undefined as any, false as any, 0 as any, '', 'bar'))
      .toBe('foo bar')
  })

  it('dedupes Tailwind conflicts via tailwind-merge (last-wins)', () => {
    // spacing
    expect(cn('p-2', 'p-4')).toBe('p-4')
    // colors
    expect(cn('text-red-500', 'text-blue-500')).toBe('text-blue-500')
    // display
    expect(cn('inline', 'block')).toBe('block')
  })

  it('merges complex inputs and resolves conflicts', () => {
    const result = cn(
      'px-2 py-1 text-sm',
      { 'text-gray-500': true, 'text-green-500': false },
      ['rounded', ['rounded-md']],
      'px-4', // overrides px-2
      null,
      undefined
    )
    // px-2 overridden by px-4, rounded overridden by rounded-md, final text color is gray-500
    expect(result).toBe('py-1 text-sm text-gray-500 rounded-md px-4')
  })
})