import React from 'react'

type Props = { children: React.ReactNode, fallback?: React.ReactNode }
type State = { hasError: boolean, message?: string }

export default class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }
  static getDerivedStateFromError(error: any) {
    return { hasError: true, message: String(error?.message || error) }
  }
  componentDidCatch(error: any, info: any) {
    // eslint-disable-next-line no-console
    console.error('UI error:', error, info)
  }
  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? <div style={{ color: '#b00', fontSize: 12 }}>エラーが発生しました: {this.state.message}</div>
    }
    return this.props.children
  }
}

