import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import React from 'react'
import App from '../src/App'

describe('App snapshot', () => {
  it('renders three panes', () => {
    const { asFragment, getByText } = render(<App />)
    expect(getByText('EVM Tool UI Shell')).toBeTruthy()
    expect(getByText('ガント（ダミー）')).toBeTruthy()
    expect(getByText('タスク一覧')).toBeTruthy()
    expect(getByText('EVM（ダミー）')).toBeTruthy()
    expect(asFragment()).toMatchSnapshot()
  })
})

