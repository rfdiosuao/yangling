/**
 * 姿态估计引擎(骨架版)
 * 定义"动作-关键点-达标角度"契约,输出 { done, hint }。
 * 先用静态阈值 mock 验证 UI 链路,后续接 MediaPipe Pose。
 *
 * 数据流:本地帧 → 姿态关键点 → 达标判断(不上传任何画面)
 */

// 动作契约:每个动作定义关键点对 + 达标角度范围
export const POSE_CONTRACTS = {
  'move-shoulder': {
    name: '肩颈拉伸',
    target: '肩井穴',
    joints: ['shoulder', 'elbow'],       // 关键点对
    targetAngle: 90,                      // 达标角度(度)
    tolerance: 20,                        // 容差(度)
    hint: '手臂抬起,肘部与肩同高,感受肩颈拉伸',
  },
  'acupoint-neiguan': {
    name: '按揉内关穴',
    target: '内关穴',
    joints: ['wrist', 'elbow'],
    targetAngle: 180,
    tolerance: 15,
    hint: '手臂伸直,掌心向上,找到腕横纹上 2 寸',
  },
  'acupoint-zusanli': {
    name: '搓揉足三里',
    target: '足三里',
    joints: ['knee', 'ankle'],
    targetAngle: 90,
    tolerance: 25,
    hint: '屈膝坐姿,小腿与地面垂直,按揉膝下 3 寸',
  },
  'acupoint-yongquan': {
    name: '搓揉涌泉穴',
    target: '涌泉穴',
    joints: ['ankle', 'toe'],
    targetAngle: 120,
    tolerance: 30,
    hint: '脚掌内收,找到足底前 1/3 凹陷处',
  },
  'acupoint-fengchi': {
    name: '按揉风池穴',
    target: '风池穴',
    joints: ['ear', 'neck'],
    targetAngle: 45,
    tolerance: 20,
    hint: '头微后仰,拇指按揉后发际凹陷处',
  },
}

// 关键点索引(MediaPipe Pose 约定)
export const JOINT_INDEX = {
  shoulder: 11,   // 左肩
  elbow: 13,      // 左肘
  wrist: 15,      // 左腕
  hip: 23,
  knee: 25,
  ankle: 27,
  ear: 7,
  neck: 0,
  toe: 31,
}

/**
 * 计算三点夹角(度)
 * @param {object} a 起点 {x,y}
 * @param {object} b 顶点 {x,y}
 * @param {object} c 终点 {x,y}
 */
export function angleBetween(a, b, c) {
  const v1 = { x: a.x - b.x, y: a.y - b.y }
  const v2 = { x: c.x - b.x, y: c.y - b.y }
  const dot = v1.x * v2.x + v1.y * v2.y
  const len1 = Math.hypot(v1.x, v1.y)
  const len2 = Math.hypot(v2.x, v2.y)
  if (len1 === 0 || len2 === 0) return 0
  const cos = Math.max(-1, Math.min(1, dot / (len1 * len2)))
  return (Math.acos(cos) * 180) / Math.PI
}

/**
 * 评估一次姿态反馈
 * @param {string} actionId 动作 id(对应 POSE_CONTRACTS 键)
 * @param {object} feedback 姿态关键点 { joints: { shoulder:{x,y}, elbow:{x,y}, ... } } 或 { angle }
 * @returns {{ done: boolean, hint: string, angle: number|null }}
 */
export function estimatePose(actionId, feedback) {
  const contract = POSE_CONTRACTS[actionId]
  if (!contract) {
    return { done: false, hint: '未识别的动作', angle: null }
  }

  // 支持直接传角度(测试/手动场景),或传关键点计算
  let angle = null
  if (typeof feedback?.angle === 'number') {
    angle = feedback.angle
  } else if (feedback?.joints) {
    const [p1, p2, p3] = contract.joints.length === 2
      ? [feedback.joints[contract.joints[0]], feedback.joints.vertex, feedback.joints[contract.joints[1]]]
      : [null, null, null]
    if (p1 && p2 && p3) {
      angle = angleBetween(p1, p2, p3)
    }
  }

  if (angle === null) {
    return { done: false, hint: contract.hint, angle: null }
  }

  const diff = Math.abs(angle - contract.targetAngle)
  const done = diff <= contract.tolerance
  return {
    done,
    hint: done ? '✅ 动作到位,保持 3 秒' : contract.hint + `(当前 ${Math.round(angle)}°,目标 ${contract.targetAngle}°)`,
    angle: Math.round(angle),
  }
}
