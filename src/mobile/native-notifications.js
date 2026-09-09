import { Capacitor, registerPlugin } from '@capacitor/core'
import { LocalNotifications } from '@capacitor/local-notifications'
import {reminderSlots,reminderMessage} from './reminder-schedule.js'
export const isAndroidApp=()=>Capacitor.getPlatform()==='android'
const DeviceSettings=registerPlugin('DeviceSettings')
export function openNotificationSettings(){return DeviceSettings.openNotifications()}
export const REMINDER_ID=4101, CHANNEL_ID='yangling-wellness'
const owned=()=>Array.from({length:100},(_,i)=>({id:REMINDER_ID+i}))
export function buildNotifications(reminder,alias){
  return reminderSlots(reminder).map((time,i)=>{
    const message=reminderMessage(reminder,alias,i),[hour,minute]=time.split(':').map(Number)
    return {id:REMINDER_ID+i,channelId:CHANNEL_ID,title:message.title,body:message.body,
      schedule:{on:{hour,minute},repeats:true,allowWhileIdle:true},smallIcon:'ic_stat_yangling',extra:{route:message.route,ritual:message.ritual}}
  })
}
export async function nativePermission(request=false){return(await LocalNotifications[request?'requestPermissions':'checkPermissions']()).display}
let queue=Promise.resolve()
export function syncNativeReminder(reminder,alias,{request=false,plugin=LocalNotifications}={}){
  const task=async()=>{
    if(!reminder.enabled){await plugin.cancel({notifications:owned()});return 'disabled'}
    const permission=await plugin[request?'requestPermissions':'checkPermissions']()
    if(permission.display!=='granted')return permission.display
    const next=buildNotifications(reminder,alias)
    if(!next.length)throw new Error('No reminder times')
    await plugin.createChannel({id:CHANNEL_ID,name:'养令养生提醒',importance:3,visibility:0,vibration:true})
    const pending=(await plugin.getPending()).notifications.filter(n=>n.id>=REMINDER_ID&&n.id<REMINDER_ID+100)
    const signature=n=>JSON.stringify([n.id,n.title,n.body,n.schedule?.on?.hour,n.schedule?.on?.minute,n.extra?.route,n.extra?.ritual])
    if(pending.length===next.length&&next.every(n=>pending.some(p=>signature(p)===signature(n))))return 'granted'
    await plugin.cancel({notifications:owned()})
    await plugin.schedule({notifications:next})
    return 'granted'
  }
  const result=queue.then(task,task);queue=result.catch(()=>{});return result
}
export function listenForReminder(onOpen){return LocalNotifications.addListener('localNotificationActionPerformed',event=>onOpen(event.notification?.extra||{}))}
