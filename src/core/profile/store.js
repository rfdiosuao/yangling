/**
 * M5 画像存储(localStorage,本地优先)
 * 单 key 存整个画像对象;隐私本地化(演示可向评委展示)。
 * 记录模型:方案生成记录(plan)与完成记录(checkin)分离。
 */
const KEY = 'yangling:profile'

function todayKey(d = new Date()) {
  return d.toISOString().slice(0, 10)
}

export function emptyProfile() {
  return {
    schemaVersion: '1.0',
    profileId: 'local-anon-' + Math.random().toString(36).slice(2, 8),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    baseline: { constitution: null, confirmedAt: null, source: null },
    tags: { constitutions: [], states: [] },
    plans: [],      // 方案生成记录(状态采集后)
    checkins: [],   // 打卡完成记录(含完成日期)
    calendar: {
      streak: { current: 0, longest: 0 },
      solarTermProgress: {},
      familyRank: { enabled: false, members: [], myPosition: null },
    },
  }
}

export function loadProfile() {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return emptyProfile()
    const p = JSON.parse(raw)
    return { ...emptyProfile(), ...p }
  } catch {
    return emptyProfile()
  }
}

export function saveProfile(profile) {
  profile.updatedAt = new Date().toISOString()
  localStorage.setItem(KEY, JSON.stringify(profile))
  return profile
}

/** 记录一次方案生成(状态采集后,不视为完成) */
export function addPlan(profile, stateRef, cards, options = {}) {
  const rec = {
    id: 'plan-' + Date.now(),
    capturedAt: new Date().toISOString(),
    stateRef: stateRef || 'unknown',
    cards: cards || [],
    constitution: options.constitution || null,
    completions: {},
  }
  profile.plans.push(rec)
  // 更新体质标签(可能倾向)
  if (options.constitution) {
    const existing = profile.tags.constitutions.find((c) => c.name === options.constitution)
    if (existing) {
      existing.confidence = Math.min(1, (existing.confidence || 0.5) + 0.1)
      existing.observedAt = new Date().toISOString()
    } else {
      profile.tags.constitutions.push({ name: options.constitution, confidence: 0.6, observedAt: new Date().toISOString() })
    }
    profile.baseline = {
      constitution: options.constitution,
      confirmedAt: new Date().toISOString().slice(0, 10),
      source: '对话推断(自我描述标签)',
    }
  }
  if (stateRef) {
    const st = profile.tags.states.find((s) => s.name === stateRef)
    if (st) { st.count += 1; st.lastAt = new Date().toISOString() }
    else profile.tags.states.push({ name: stateRef, count: 1, lastAt: new Date().toISOString() })
  }
  return saveProfile(profile)
}

/** 打卡完成:按真实日期记录,计算连续天数 */
export function checkIn(profile, stateRef, cards, completions = {}) {
  const now = new Date()
  const key = todayKey(now)
  const existing = profile.checkins.find((c) => c.date === key)
  if (existing) {
    // 当天已打卡,更新完成项(不重复计数)
    existing.completions = { ...existing.completions, ...completions }
    existing.cards = Array.from(new Set([...(existing.cards || []), ...(cards || [])]))
    return saveProfile(profile)
  }
  profile.checkins.push({
    id: 'checkin-' + Date.now(),
    date: key,
    capturedAt: now.toISOString(),
    stateRef: stateRef || 'unknown',
    cards: cards || [],
    completions: completions || {},
  })
  recomputeStreak(profile)
  return saveProfile(profile)
}

/** 根据 checkins 的真实日期重新计算连续天数 */
export function recomputeStreak(profile) {
  const dates = new Set(profile.checkins.map((c) => c.date))
  let current = 0
  let cursor = new Date()
  // 今天没打卡则从昨天开始数
  if (!dates.has(todayKey(cursor))) cursor.setDate(cursor.getDate() - 1)
  while (dates.has(todayKey(cursor))) {
    current += 1
    cursor.setDate(cursor.getDate() - 1)
  }
  profile.calendar.streak.current = current
  profile.calendar.streak.longest = Math.max(
    profile.calendar.streak.longest || 0,
    current
  )
  // 节气进度(按 7 天窗口内的完成数,简化)
  const sevenAgo = new Date()
  sevenAgo.setDate(sevenAgo.getDate() - 6)
  const sevenKey = todayKey(sevenAgo)
  const recent = profile.checkins.filter((c) => c.date >= sevenKey)
  profile.calendar.solarTermProgress.bailu = {
    completed: recent.length,
    total: 7,
  }
}

/** 清除全部本地数据(隐私入口) */
export function clearProfile() {
  localStorage.removeItem(KEY)
  return emptyProfile()
}
