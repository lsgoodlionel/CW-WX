import { useCallback, useEffect, useState } from 'react'

interface AsyncState<T> {
  data: T | null
  loading: boolean
  reload: () => void
  setData: (value: T | null) => void
}

/**
 * 简单的数据加载 hook:挂载与依赖变化时执行,暴露 reload 供操作后刷新。
 * 错误已由 request 层统一 toast,这里只维护 loading 状态。
 */
export function useAsync<T>(loader: () => Promise<T>, deps: unknown[] = []): AsyncState<T> {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [tick, setTick] = useState(0)

  // loader 通常是内联箭头函数,用 deps 显式声明依赖
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const run = useCallback(loader, deps)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    run()
      .then((res) => {
        if (!cancelled) setData(res)
      })
      .catch(() => {
        if (!cancelled) setData(null)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [run, tick])

  const reload = useCallback(() => setTick((t) => t + 1), [])

  return { data, loading, reload, setData }
}
