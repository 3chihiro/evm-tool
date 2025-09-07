import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import React from 'react'
import App from '../src/App'

describe('App smoke', () => {
  it('renders main panes', () => {
    const { getByText } = render(<App />)
    expect(getByText('EVM Tool UI Shell')).toBeTruthy()
    expect(getByText('ガント')).toBeTruthy()
    expect(getByText('タスク一覧')).toBeTruthy()
    expect(getByText('EVM')).toBeTruthy()
  })
})
