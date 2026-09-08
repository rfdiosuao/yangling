import { Capacitor } from '@capacitor/core'
import { LocalNotifications } from '@capacitor/local-notifications'

export const isAndroidApp = () => Capacitor.getPlatform() === 'android'
export const REMINDER_ID = 4101
export const CHANNEL_ID = 'yangling-wellness'

export function reminderNotification(intervalMin, alias) {
  const interval = [15, 30, 45, 60, 90].includes(Number(intervalMin)) ? Number(intervalMin) : 45
  return {
    id: REMINDER_ID, channelId: CHANNEL_ID,
    title: `${alias || '朋友'}，休息一下吧`,
    body: '喝几口温水，舒展肩颈，给自己一分钟自然呼吸。',
    schedule: { every: 'minute', count: interval, allowWhileIdle: true },
    smallIcon: 'ic_stat_yangling', extra: { route: 'home' },
  }
}

export async function nativePermission(request = false) {
  const result = await LocalNotifications[request ? 'requestPermissions' : 'checkPermissions']()
  return result.display
}

export async function syncNativeReminder(reminder, alias, { request = false, plugin = LocalNotifications } = {}) {
  if (!reminder.enabled) {
    await plugin.cancel({ notifications: [{ id: REMINDER_ID }] })
    return 'disabled'
  }
  const permission = await plugin[request ? 'requestPermissions' : 'checkPermissions']()
  if (permission.display !== 'granted') return permission.display
  await plugin.createChannel({ id: CHANNEL_ID, name: '养令养生提醒', description: '本机定时休息提醒', importance: 3, visibility: 1, vibration: true })
  const notification = reminderNotification(reminder.intervalMin, alias)
  const { notifications } = await plugin.getPending()
  const previous = notifications.find(item => item.id === REMINDER_ID)
  if (previous?.schedule?.count === notification.schedule.count && previous.title === notification.title) return 'granted'
  await plugin.cancel({ notifications: [{ id: REMINDER_ID }] })
  await plugin.schedule({ notifications: [notification] })
  return 'granted'
}

export async function testNativeNotification() {
  if (await nativePermission(true) !== 'granted') return false
  await LocalNotifications.createChannel({ id: CHANNEL_ID, name: '养令养生提醒', importance: 3, visibility: 1 })
  await LocalNotifications.schedule({ notifications: [{ id: 4102, channelId: CHANNEL_ID, title: '养令提醒已就绪', body: '这条通知由安卓系统在本机发出。', smallIcon: 'ic_stat_yangling', schedule: { at: new Date(Date.now() + 5000) } }] })
  return true
}

export function listenForReminder(onOpen) {
  return LocalNotifications.addListener('localNotificationActionPerformed', () => onOpen())
}
