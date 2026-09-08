export function selectAudio(tracks = [], history = [], random = Math.random) {
  const available = tracks.filter(t => t.enabled !== false && t.url)
  if (!available.length) return null
  let pool = available.filter(t => !history.includes(t.id))
  if (!pool.length) pool = available.filter(t => t.id !== history.at(-1))
  if (!pool.length) pool = available
  return pool[Math.min(pool.length - 1, Math.max(0, Math.floor(random() * pool.length)))]
}
