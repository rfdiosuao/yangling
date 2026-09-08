import { describe, it, expect, vi } from 'vitest'
import { reminderNotification, syncNativeReminder, REMINDER_ID } from '../src/mobile/native-notifications.js'

function device(display = 'granted', pending = []) {
  return {
    checkPermissions: async () => ({ display }), requestPermissions: async () => ({ display }),
    createChannel: vi.fn(async () => {}), getPending: async () => ({ notifications: pending }),
    cancel: vi.fn(async () => {}), schedule: vi.fn(async () => {}),
  }
}
describe('Android offline reminders', () => {
  it('schedules the selected interval and cancels only its own reminder', async () => {
    const plugin = device()
    expect(await syncNativeReminder({ enabled: true, intervalMin: 30 }, '小养', { plugin })).toBe('granted')
    expect(plugin.schedule.mock.calls[0][0].notifications[0].schedule).toMatchObject({ every: 'minute', count: 30 })
    await syncNativeReminder({ enabled: false }, '小养', { plugin })
    expect(plugin.cancel).toHaveBeenLastCalledWith({ notifications: [{ id: REMINDER_ID }] })
  })
  it('does not schedule after denied permission or postpone an existing matching schedule', async () => {
    const denied = device('denied')
    expect(await syncNativeReminder({ enabled: true }, '', { plugin: denied })).toBe('denied')
    expect(denied.schedule).not.toHaveBeenCalled()
    const plugin = device('granted', [reminderNotification(45, '朋友')])
    await syncNativeReminder({ enabled: true, intervalMin: 45 }, '朋友', { plugin })
    expect(plugin.schedule).not.toHaveBeenCalled()
  })
})
