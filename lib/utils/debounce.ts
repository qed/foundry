export function debounce<T extends unknown[]>(
  func: (...args: T) => void | Promise<void>,
  wait: number
) {
  let timeout: ReturnType<typeof setTimeout> | null = null

  return (...args: T) => {
    if (timeout) clearTimeout(timeout)
    timeout = setTimeout(() => {
      func(...args)
      timeout = null
    }, wait)
  }
}
