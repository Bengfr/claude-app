import { useEffect, useState } from 'react'

export function useCountUp(target: number, duration = 900) {
  const [val, setVal] = useState(0)
  useEffect(() => {
    let raf: number
    const start = performance.now()
    function tick(now: number) {
      const t = Math.min((now - start) / duration, 1)
      const eased = 1 - Math.pow(1 - t, 3)
      setVal(Math.round(eased * target))
      if (t < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target, duration])
  return val
}
