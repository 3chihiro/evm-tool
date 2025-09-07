import React from 'react'

export type Command<T> = {
  apply: (state: T) => T
  revert: (state: T) => T
}

export function createUseHistory<T>(initial: T) {
  return function useHistory() {
    const [past, setPast] = React.useState<T[]>([])
    const [present, setPresent] = React.useState<T>(initial)
    const [future, setFuture] = React.useState<T[]>([])

    const run = React.useCallback((cmd: Command<T>) => {
      setPast((p) => [...p, present])
      setPresent(cmd.apply(present))
      setFuture([])
    }, [present])

    const undo = React.useCallback(() => {
      setPast((p) => {
        if (!p.length) return p
        const prev = p[p.length - 1]
        setFuture((f) => [present, ...f])
        setPresent(prev)
        return p.slice(0, -1)
      })
    }, [present])

    const redo = React.useCallback(() => {
      setFuture((f) => {
        if (!f.length) return f
        const next = f[0]
        setPast((p) => [...p, present])
        setPresent(next)
        return f.slice(1)
      })
    }, [present])

    return { past, present, future, run, undo, redo, set: setPresent }
  }
}

