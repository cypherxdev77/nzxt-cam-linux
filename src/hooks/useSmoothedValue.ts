import { useEffect, useRef, useState } from 'react'

/**
 * Interpolates a value linearly toward the target over `durationMs`.
 * Gives a smooth btop-like animation between temperature polling ticks.
 */
export function useSmoothedValue(target: number, durationMs = 600): number {
  const [display, setDisplay] = useState(target)
  const fromRef  = useRef(target)
  const startRef = useRef<number | null>(null)
  const rafRef   = useRef<number | null>(null)

  useEffect(() => {
    fromRef.current  = display
    startRef.current = null

    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)

    const animate = (now: number) => {
      if (startRef.current === null) startRef.current = now
      const elapsed = now - startRef.current
      const t = Math.min(elapsed / durationMs, 1)
      // ease-out cubic
      const ease = 1 - Math.pow(1 - t, 3)
      setDisplay(fromRef.current + (target - fromRef.current) * ease)
      if (t < 1) rafRef.current = requestAnimationFrame(animate)
    }

    rafRef.current = requestAnimationFrame(animate)
    return () => { if (rafRef.current !== null) cancelAnimationFrame(rafRef.current) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, durationMs])

  return display
}
