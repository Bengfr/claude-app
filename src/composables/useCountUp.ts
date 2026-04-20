import { ref, watch, type Ref } from 'vue'

/** Animates a displayed number from 0 up to `target` over `duration` ms. */
export function useCountUp(target: Ref<number>, duration = 600): Ref<number> {
  const display = ref(0)
  let raf = 0

  watch(target, (to) => {
    cancelAnimationFrame(raf)
    const from = display.value
    const start = performance.now()
    function tick(now: number) {
      const t = Math.min(1, (now - start) / duration)
      // Ease out cubic
      const ease = 1 - Math.pow(1 - t, 3)
      display.value = Math.round(from + (to - from) * ease)
      if (t < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
  }, { immediate: true })

  return display
}
