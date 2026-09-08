export const AMBIENT_PRESETS = {
  cup: { tempo: 54, notes: [261.63, 329.63, 392] },
  move: { tempo: 58, notes: [220, 277.18, 329.63] },
  breath: { tempo: 48, notes: [196, 246.94, 293.66] },
}

export function getAmbientPreset(type) {
  return AMBIENT_PRESETS[type] || AMBIENT_PRESETS.breath
}

export function startAmbient(type, AudioContextClass = globalThis.AudioContext || globalThis.webkitAudioContext) {
  if (!AudioContextClass) return { stop() {}, supported: false }
  const context = new AudioContextClass()
  const master = context.createGain()
  master.gain.setValueAtTime(0.0001, context.currentTime)
  master.gain.exponentialRampToValueAtTime(0.055, context.currentTime + 1.8)
  master.connect(context.destination)
  const oscillators = getAmbientPreset(type).notes.map((frequency, index) => {
    const oscillator = context.createOscillator()
    const gain = context.createGain()
    oscillator.type = index === 0 ? 'sine' : 'triangle'
    oscillator.frequency.value = frequency / (index === 2 ? 2 : 1)
    gain.gain.value = index === 0 ? 0.5 : 0.22
    oscillator.connect(gain).connect(master)
    oscillator.start()
    return oscillator
  })
  return {
    supported: true,
    stop() {
      master.gain.cancelScheduledValues(context.currentTime)
      master.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.35)
      setTimeout(() => { oscillators.forEach(item => item.stop()); context.close() }, 380)
    },
  }
}
