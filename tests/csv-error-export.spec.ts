import { describe, it, expect } from 'vitest'
import { errorsToCsv } from '../src/adapters/csv-export-browser'

describe('errorsToCsv', () => {
  it('emits header and escapes fields', () => {
    const csv = errorsToCsv([
      { row: 2, column: 'Start', message: 'Start は YYYY-MM-DD 形式で入力してください', value: '2025/01/01' },
      { row: 3, column: 'TaskName', message: 'TaskName は必須です', value: '"bad,name"' },
    ] as any)
    const lines = csv.trim().split('\n')
    expect(lines[0]).toBe('Row,Column,Message,Value')
    expect(lines[1]).toContain('2,Start,Start は YYYY-MM-DD 形式で入力してください,2025/01/01')
    // value containing quotes and comma: CSV wraps in quotes and doubles inner quotes
    expect(lines[2]).toContain('3,TaskName,TaskName は必須です,"""bad,name"""')
  })
})
