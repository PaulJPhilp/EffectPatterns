import { useState, useEffect } from "react"
import { Effect, Exit } from "effect"

/**
 * Hook to run an Effect and manage its state in React
 */
export function useEffectState<A, E>(
  effect: Effect.Effect<A, E, never>,
  deps: React.DependencyList = []
): {
  data: A | null
  error: E | null
  isLoading: boolean
  isSuccess: boolean
  isError: boolean
} {
  const [data, setData] = useState<A | null>(null)
  const [error, setError] = useState<E | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    setIsLoading(true)
    setError(null)

    const runEffect = async () => {
      const exit = await Effect.runPromiseExit(effect)

      if (Exit.isSuccess(exit)) {
        setData(exit.value)
        setIsLoading(false)
      } else {
        setError(exit.cause as E)
        setIsLoading(false)
      }
    }

    runEffect()
  }, deps)

  return {
    data,
    error,
    isLoading,
    isSuccess: data !== null && error === null,
    isError: error !== null,
  }
}

/**
 * Hook to create an Effect callback
 */
export function useEffectCallback<A, E, Args extends unknown[]>(
  effectFn: (...args: Args) => Effect.Effect<A, E, never>
): [
  (...args: Args) => Promise<void>,
  {
    data: A | null
    error: E | null
    isLoading: boolean
    isSuccess: boolean
    isError: boolean
  }
] {
  const [data, setData] = useState<A | null>(null)
  const [error, setError] = useState<E | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const execute = async (...args: Args) => {
    setIsLoading(true)
    setError(null)

    const exit = await Effect.runPromiseExit(effectFn(...args))

    if (Exit.isSuccess(exit)) {
      setData(exit.value)
      setIsLoading(false)
    } else {
      setError(exit.cause as E)
      setIsLoading(false)
    }
  }

  return [
    execute,
    {
      data,
      error,
      isLoading,
      isSuccess: data !== null && error === null,
      isError: error !== null,
    },
  ]
}
