export function parseMobileRoute(hash = '') {
  const value = String(hash).replace(/^#/, '')
  if (value === 'admin') return { tab: 'home', admin: true }
  return { tab: ['home', 'knowledge', 'motion'].includes(value) ? value : 'home', admin: false }
}
