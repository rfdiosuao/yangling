import { checkRisk } from '../core/safety/index.js'

export const DEFAULT_QUESTION = '白露时嗓子干，下午讲话多，今天怎么养？'
export const QUESTIONS = ['隔夜茶能喝吗', '晚上泡脚好吗', '八段锦适合每天练吗']
export const STATES = ['没睡好', '肩颈紧', '最近很累', '压力大', '胃口差', '心里烦']
export const EXERCISES = [
  { name: '双手托天', hint: '手臂再抬高一点', steps: ['双脚自然站立，与肩同宽，保持呼吸平稳。', '双手交叉，掌心缓缓向上托举，抬到舒适的位置。', '双肩放松，缓缓放下双手，重复练习。'], score: 86 },
  { name: '左右开弓', hint: '手肘与肩膀保持同高', steps: ['双脚站稳，膝盖自然微屈。', '一手向侧方舒展，另一手缓缓拉向胸侧。', '放松还原，再换另一侧，动作轻柔。'], score: 82 },
  { name: '肩颈舒展', hint: '肩膀放松，慢慢来', steps: ['坐稳或站稳，背部自然挺直。', '双肩缓缓上提，再随呼气放松。', '在舒适范围内缓慢向两侧转头，出现不适就停止。'], score: 90 },
]

const defaultAnswer = {
  title: '可以这样做',
  lines: ['多喝温水，少说话，让嗓子适当休息。', '饮食以滋润为主，如梨、百合、银耳等，避免辛辣刺激。', '保持室内空气湿润，注意早晚温差，适当增减衣物。'],
  sources: [
    { title: '秋季养生：润燥饮食建议', body: '示例知识条目：日常注意饮水和用嗓休息；饮食选择需结合个人过敏史和健康状况。' },
    { title: '常见食疗与调养', body: '示例知识条目：梨、百合、银耳等作为普通食材使用，饮食并非疾病治疗。' },
    { title: '白露节气起居建议', body: '示例知识条目：季节变化时关注早晚温差，按实际天气和舒适度调整衣物。' },
  ],
}

export function makeAnswer(question) {
  const text = question.trim()
  const risk = checkRisk(text)
  if (risk.level === 'red_flag') return { title: '请优先寻求医疗帮助', lines: [risk.disclaimer], sources: [], urgent: true }
  if (/隔夜|茶/.test(text)) return { title: '现泡现喝更安心', lines: ['茶水是否适合饮用，与存放时间和保存条件有关。', '有异味、变色或长时间在室温下放置的茶水，建议倒掉。', '用干净茶具，现泡现喝；睡前尽量少喝浓茶。'], sources: [{ title: '饮茶与存放 · 示例知识条目', body: '这是原型内置的生活常识示例，尚未连接经过医学审核的外部知识库。' }] }
  if (/泡脚/.test(text)) return { title: '以舒适、温和为宜', lines: ['可以把温水泡脚作为睡前放松的一部分，水温以舒适为宜。', '时间不宜过长，出现不适立即停止。', '脚部有伤口、感觉减退或基础疾病时，先向医生咨询。'], sources: [{ title: '睡前放松 · 示例知识条目', body: '原型示例内容。泡脚不用于诊断或治疗疾病，特殊健康情况应先咨询专业人员。' }] }
  if (/八段锦|开弓|托天/.test(text)) return { title: '循序渐进，量力而行', lines: ['可以根据自身状态安排温和练习，不必勉强追求次数。', '先熟悉动作，再逐步增加时长，保持自然呼吸。', '出现疼痛、头晕或其他不适时停止练习，必要时就医。'], sources: [{ title: '八段锦入门 · 示例知识条目', body: '原型中的动作示范与分数用于演示交互，不是医学或专业动作评定。' }] }
  if (/白露|嗓|干|秋/.test(text)) return defaultAnswer
  if (/睡|累|疲|压力|肩|颈/.test(text)) return { title: '先给自己一点休息', lines: ['暂时放下手头的事，喝几口温水。', '久坐后起身走动，在舒适范围内轻轻舒展。', '今晚留出规律的休息时间；如果不适持续，及时咨询医生。'], sources: [{ title: '日常休息与放松 · 示例知识条目', body: '原型内置示例，仅用于体验问答流程，不构成针对个人的诊疗建议。' }] }
  return { title: '还需要了解一点', lines: ['这条问题暂时没有匹配到已整理的知识条目。', '可以补充具体感受、持续时间，或选择上方示例问题。'], sources: [], unmatched: true }
}

export function makePlan(text) {
  const risk = checkRisk(text)
  if (risk.level === 'red_flag') return { urgent: true, message: risk.disclaimer }
  const sleepy = /睡|累|疲/.test(text)
  const tense = /肩|颈|压力|紧/.test(text)
  return { message: `为「${text}」安排一点轻养生`, cards: [
    { type: 'cup', title: '一杯', subtitle: sleepy ? '喝几口温水，慢慢醒来' : '喝一杯温热养生茶', detail: '准备一杯温水，小口慢饮，给自己一点休息时间。', action: '我喝好了' },
    { type: 'move', title: '一动', subtitle: tense ? '轻轻舒展肩颈 3 分钟' : '做3分钟舒展动作', detail: '放下手机，双肩轻轻上提再放松，在舒适范围内活动。', action: '开始跟练' },
    { type: 'breath', title: '一息', subtitle: sleepy ? '闭上眼睛，自然呼吸' : '静下心来深呼吸', detail: '找一个舒适的位置，放松肩膀，跟随自己的节奏自然呼吸。', action: '开始放松' },
  ] }
}

// Screen-coordinate geometry only. Scores are exercise feedback, not clinical assessment.
export function scorePose(points, exercise) {
  if (!points) return null
  const visible = index => points[index] && points[index].visibility >= 0.45 ? points[index] : null
  const sides = [
    { shoulder: visible(11), elbow: visible(13), wrist: visible(15), hip: visible(23) },
    { shoulder: visible(12), elbow: visible(14), wrist: visible(16), hip: visible(24) },
  ].filter(side => side.shoulder && side.elbow && side.wrist && side.hip)
  if (!sides.length) return null
  const torsoValues = sides.map(side => Math.hypot(side.shoulder.x - side.hip.x, side.shoulder.y - side.hip.y)).filter(value => value >= 1)
  if (!torsoValues.length) return null
  const torso = torsoValues.reduce((sum, value) => sum + value, 0) / torsoValues.length
  const level = sides.length === 2 ? Math.abs(sides[0].shoulder.y - sides[1].shoulder.y) / torso : 0
  const height = sides.reduce((sum, side) => sum + (side.shoulder.y - side.wrist.y) / torso, 0) / sides.length
  const armLevel = sides.reduce((sum, side) => sum + Math.abs(side.elbow.y - side.shoulder.y) / torso, 0) / sides.length
  const aligned = sides.length === 2
    ? Math.abs((sides[0].shoulder.x + sides[1].shoulder.x - sides[0].hip.x - sides[1].hip.x) / 2) / torso < .2
    : true
  const armGood = exercise === 0 ? height > .8 : exercise === 1 ? armLevel < .22 : level < .12
  const confidenceBonus = sides.length === 2 ? 0 : -5
  return { score: Math.max(0, Math.round(55 + (armGood ? 25 : 8) + (level < .12 ? 10 : 3) + (aligned ? 10 : 2) + confidenceBonus)), armGood, relaxed: level < .12, aligned, partial: sides.length === 1, hint: armGood ? (sides.length === 1 ? '已识别一侧动作，尽量让另一侧也入镜' : '动作到位，保持自然呼吸') : EXERCISES[exercise].hint }
}
