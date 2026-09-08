/**
 * MediaPipe 姿态检测封装(本地推理,不上传)
 * - 加载 PoseLandmarker 模型(wasm 本地)
 * - 视频帧 → 33 个关键点 → 骨架连线绘制 → 角度计算
 * 数据流:本地帧 → 关键点 → 达标判断,全程浏览器内完成
 */
import { FilesetResolver, PoseLandmarker } from '@mediapipe/tasks-vision'

// MediaPipe 姿态关键点索引(33 点)
export const POSE_JOINTS = {
  nose: 0, leftShoulder: 11, rightShoulder: 12,
  leftElbow: 13, rightElbow: 14,
  leftWrist: 15, rightWrist: 16,
  leftHip: 23, rightHip: 24,
  leftKnee: 25, rightKnee: 26,
  leftAnkle: 27, rightAnkle: 28,
  leftEar: 7, rightEar: 8,
  leftIndex: 19, rightIndex: 20,
}

// 骨架连线(绘制用)
export const SKELETON_LINES = [
  [11, 13], [13, 15],            // 左肩-肘-腕
  [12, 14], [14, 16],            // 右肩-肘-腕
  [11, 12],                       // 双肩
  [11, 23], [12, 24],            // 肩-髋
  [23, 24],                       // 双髋
  [23, 25], [25, 27],            // 左腿
  [24, 26], [26, 28],            // 右腿
  [7, 11], [8, 12],              // 耳-肩
]

// wasm 与模型均已本地化(public/mediapipe-wasm、public/mediapipe),现场零网络可用
// BASE_URL 拼接,兼容 GH Pages 子路径部署
// 精度优先:使用 full 模型(9.4MB,本地加载);lite 版留作降级备选
const WASM_BASE = import.meta.env.BASE_URL + 'mediapipe-wasm'
const MODEL_URL = import.meta.env.BASE_URL + 'mediapipe/pose_landmarker_full.task'
const FALLBACK_MODEL_URL = import.meta.env.BASE_URL + 'mediapipe/pose_landmarker_lite.task'

let landmarkerPromise = null

// ---- 关键点平滑(EMA)----
// 连续帧关键点抖动会让角度数字乱跳,指数移动平均可显著降低抖动
// alpha 越小越平滑,但响应越慢;0.35 兼顾稳定与跟手
const SMOOTH_ALPHA = 0.35
const poseSmoothCache = new Map() // key: 关键点索引 → { x, y, z }

/** 重置平滑缓存(切换摄像头/视频源时调用) */
export function resetPoseSmoothing() {
  poseSmoothCache.clear()
}

/** 对关键点应用 EMA 平滑 */
function smoothLandmark(p, idx) {
  const cached = poseSmoothCache.get(idx)
  if (!cached) {
    poseSmoothCache.set(idx, { x: p.x, y: p.y, z: p.z })
    return { x: p.x, y: p.y, z: p.z, visibility: p.visibility }
  }
  const a = SMOOTH_ALPHA
  const s = {
    x: cached.x + a * (p.x - cached.x),
    y: cached.y + a * (p.y - cached.y),
    z: cached.z + a * ((p.z || 0) - cached.z),
  }
  poseSmoothCache.set(idx, s)
  return { x: s.x, y: s.y, z: s.z, visibility: p.visibility }
}

/** 懒加载单例 PoseLandmarker(GPU 优先,失败自动降级 CPU) */
export function getPoseLandmarker() {
  if (!landmarkerPromise) {
    landmarkerPromise = (async () => {
      const vision = await FilesetResolver.forVisionTasks(WASM_BASE)
      const shared = {
        runningMode: 'VIDEO',
        numPoses: 1,
        minPoseDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5,
      }
      try {
        // GPU 加速优先(集成显卡/移动端常不支持,失败走 CPU 兜底)
        return await PoseLandmarker.createFromOptions(vision, {
          ...shared,
          baseOptions: { modelAssetPath: MODEL_URL, delegate: 'GPU' },
        })
      } catch (e) {
        console.warn('[yangling] GPU delegate 初始化失败,降级 CPU:', e)
        return PoseLandmarker.createFromOptions(vision, {
          ...shared,
          baseOptions: { modelAssetPath: MODEL_URL, delegate: 'CPU' },
        })
      }
    })().catch((e) => {
      // 初始化失败可重试(下次调用重建单例)
      landmarkerPromise = null
      throw e
    })
  }
  return landmarkerPromise
}

/**
 * 从一帧视频检测姿态关键点
 * @param {PoseLandmarker} landmarker
 * @param {HTMLVideoElement} video
 * @returns {Array|null} 33 个关键点 {x,y,z,visibility} 或 null(未检测到人)
 */
export function detectPose(landmarker, video, timestamp) {
  if (!landmarker || !video || video.readyState < 2) return null
  const result = landmarker.detectForVideo(video, timestamp)
  const landmarks = result?.landmarks?.[0]
  if (!landmarks) return null
  // 归一化到视频尺寸(MediaPipe 返回 0-1),并做 EMA 平滑抑制抖动
  return landmarks.map((p, idx) => {
    const px = p.x * video.videoWidth
    const py = p.y * video.videoHeight
    return smoothLandmark({ x: px, y: py, z: p.z || 0, visibility: p.visibility || 0 }, idx)
  })
}

/**
 * 计算两个关键点连线与水平方向的夹角(用于肩颈/手臂姿态)
 * @param {Array} landmarks 33 关键点
 * @param {number} idxA 起点索引
 * @param {number} idxB 终点索引
 * @returns {number|null} 角度(0-180)
 */
export function jointAngle(landmarks, idxA, idxB) {
  const a = landmarks[idxA]
  const b = landmarks[idxB]
  if (!a || !b || a.visibility < 0.3 || b.visibility < 0.3) return null
  const dx = b.x - a.x
  const dy = b.y - a.y
  // 与水平方向的夹角
  const angle = Math.abs((Math.atan2(dy, dx) * 180) / Math.PI)
  return Math.round(angle)
}

/**
 * 在 canvas 上绘制骨架
 * @param {HTMLCanvasElement} canvas
 * @param {Array} landmarks 33 关键点
 */
export function drawSkeleton(canvas, landmarks) {
  const ctx = canvas.getContext('2d')
  if (!ctx || !landmarks) return
  ctx.clearRect(0, 0, canvas.width, canvas.height)

  // 连线
  ctx.strokeStyle = '#e0b45a'
  ctx.lineWidth = 2
  for (const [a, b] of SKELETON_LINES) {
    const pa = landmarks[a]
    const pb = landmarks[b]
    if (pa && pb && pa.visibility > 0.3 && pb.visibility > 0.3) {
      ctx.beginPath()
      ctx.moveTo(pa.x, pa.y)
      ctx.lineTo(pb.x, pb.y)
      ctx.stroke()
    }
  }

  // 关键点
  ctx.fillStyle = '#d0523f'
  for (const p of landmarks) {
    if (p.visibility > 0.3) {
      ctx.beginPath()
      ctx.arc(p.x, p.y, 4, 0, Math.PI * 2)
      ctx.fill()
    }
  }
}

/** 释放 MediaPipe 实例 */
export async function releasePoseLandmarker() {
  if (landmarkerPromise) {
    const lm = await landmarkerPromise
    try { lm.close() } catch {}
    landmarkerPromise = null
  }
  resetPoseSmoothing()
}
