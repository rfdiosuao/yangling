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

// wasm 已复制到 public/mediapipe-wasm/(离线可用,绕过包 exports 限制)
const WASM_BASE = '/mediapipe-wasm'
// 模型:官方 CDN(需网络;离线时 PoseGuide 会回退手动完成)
const MODEL_URL = 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task'

let landmarkerPromise = null

/** 懒加载单例 PoseLandmarker */
export function getPoseLandmarker() {
  if (!landmarkerPromise) {
    landmarkerPromise = (async () => {
      const vision = await FilesetResolver.forVisionTasks(WASM_BASE)
      return PoseLandmarker.createFromOptions(vision, {
        baseOptions: { modelAssetPath: MODEL_URL, delegate: 'GPU' },
        runningMode: 'VIDEO',
        numPoses: 1,
        minPoseDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5,
      })
    })()
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
  // 归一化到视频尺寸(MediaPipe 返回 0-1)
  return landmarks.map((p) => ({
    x: p.x * video.videoWidth,
    y: p.y * video.videoHeight,
    z: p.z || 0,
    visibility: p.visibility || 0,
  }))
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
}
