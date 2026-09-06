import { useCallback, useEffect, useRef, useState } from 'react'
import { estimatePose } from '../../core/motion/pose-engine.js'
import { requestCamera, stopCamera, attachStream, CAMERA_STATUS, isSecureContext } from '../../core/motion/camera.js'
import { getPoseLandmarker, detectPose, drawSkeleton, jointAngle, releasePoseLandmarker, POSE_JOINTS } from '../../core/motion/pose-detector.js'
import './PoseGuide.css'

/**
 * 动作跟随引导(PoseGuide)
 * - 分步指引 + 动画占位
 * - 用户授权 → 本地视频预览 + MediaPipe 姿态关键点 + 骨架叠加 + 实时角度
 * - 未授权/失败/模型加载失败 → 回退动画指引 + 手动"完成"
 * - 摄像头画面纯本地处理,不上传
 */
export default function PoseGuide({ action = {}, onComplete, compact = false }) {
  const animationId = action.animation || 'move-shoulder'
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const landmarkerRef = useRef(null)
  const [camStatus, setCamStatus] = useState(CAMERA_STATUS.IDLE)
  const [streamRef, setStreamRef] = useState(null)
  const [poseResult, setPoseResult] = useState(null)
  const [expanded, setExpanded] = useState(!compact)
  const [manualDone, setManualDone] = useState(false)
  const [camError, setCamError] = useState('')
  const [modelLoading, setModelLoading] = useState(false)
  const rafRef = useRef(null)

  // 检测循环:每帧 → MediaPipe 关键点 → 骨架绘制 → 角度 → 达标判断
  const runDetectionLoop = useCallback(async (video) => {
    try {
      setModelLoading(true)
      const landmarker = await getPoseLandmarker()
      landmarkerRef.current = landmarker
      setModelLoading(false)

      const tick = () => {
        if (video.readyState >= 2 && video.videoWidth > 0) {
          const ts = performance.now()
          const landmarks = detectPose(landmarker, video, ts)
          if (landmarks) {
            // 骨架叠加
            if (canvasRef.current) {
              canvasRef.current.width = video.videoWidth
              canvasRef.current.height = video.videoHeight
              drawSkeleton(canvasRef.current, landmarks)
            }
            // 实时角度:按动作取关键点对(简化:肩-肘-腕 或 耳-肩)
            let angle = null
            if (animationId === 'move-shoulder' || animationId === 'acupoint-fengchi') {
              angle = jointAngle(landmarks, POSE_JOINTS.leftShoulder, POSE_JOINTS.leftElbow)
            } else if (animationId === 'acupoint-neiguan') {
              angle = jointAngle(landmarks, POSE_JOINTS.leftElbow, POSE_JOINTS.leftWrist)
            } else {
              angle = jointAngle(landmarks, POSE_JOINTS.leftShoulder, POSE_JOINTS.leftElbow)
            }
            if (angle !== null) {
              const result = estimatePose(animationId, { angle })
              setPoseResult(result)
              if (result.done && onComplete) onComplete()
            }
          }
        }
        rafRef.current = requestAnimationFrame(tick)
      }
      tick()
    } catch (e) {
      setModelLoading(false)
      setCamStatus(CAMERA_STATUS.ERROR)
      setCamError('姿态模型加载失败,已回退到手动完成:' + (e?.message || ''))
      stopCamera(streamRef)
    }
  }, [animationId, onComplete, streamRef])

  // 摄像头状态机
  const handleEnableCamera = useCallback(async () => {
    setCamStatus(CAMERA_STATUS.REQUESTING)
    const res = await requestCamera()
    if (res.status === CAMERA_STATUS.ACTIVE) {
      setStreamRef(res.stream)
      setCamStatus(CAMERA_STATUS.ACTIVE)
      setTimeout(() => {
        if (videoRef.current) {
          attachStream(videoRef.current, res.stream)
          runDetectionLoop(videoRef.current)
        }
      }, 80)
    } else {
      setCamStatus(res.status)
      setCamError(res.error || '摄像头不可用')
    }
  }, [runDetectionLoop])

  const handleManualComplete = useCallback(() => {
    setManualDone(true)
    if (onComplete) onComplete()
  }, [onComplete])

  // 卸载时释放摄像头 + MediaPipe
  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      if (streamRef) stopCamera(streamRef)
      releasePoseLandmarker()
    }
  }, [streamRef])

  if (!expanded) {
    return (
      <button className="yl-btn yl-btn--ghost pose-expand" onClick={() => setExpanded(true)}>
        ▶ 展开动作跟随
      </button>
    )
  }

  return (
    <div className="pose-guide">
      {/* 头部:动作名 + 目标穴位 */}
      <div className="pose-head">
        <div>
          <h4 className="pose-title font-serif">{action.title || '动作跟随'}</h4>
          <p className="pose-target yl-faint">
            {action.acupoint ? `目标穴位:${action.acupoint} · ${action.location || ''}` : action.method || '跟着示范做'}
          </p>
        </div>
        <span className="pose-badge">本地处理 · 不上传</span>
      </div>

      {/* 主区域:动画指引 / 摄像头预览 / 回退 */}
      <div className="pose-stage">
        {camStatus === CAMERA_STATUS.ACTIVE ? (
          <div className="pose-camera">
            <video ref={videoRef} className="pose-video" playsInline muted aria-label="本地摄像头预览(仅本机处理)" />
            <canvas ref={canvasRef} className="pose-canvas" aria-label="姿态关键点骨架叠加" />
            <div className="pose-overlay">
              <span className="pose-skeleton-hint">
                {modelLoading ? '加载姿态模型…' : poseResult?.done ? '✅ 动作到位' : poseResult?.hint || '调整姿势,靠近目标角度'}
              </span>
              {poseResult && !poseResult.done && <span className="pose-angle">{poseResult.angle}°</span>}
            </div>
            <div className="pose-camera-actions">
              <button className="yl-btn yl-btn--ghost" onClick={() => { stopCamera(streamRef); setCamStatus(CAMERA_STATUS.IDLE); setPoseResult(null) }}>
                关闭摄像头
              </button>
              <button className="yl-btn yl-btn--ghost" onClick={handleManualComplete} disabled={manualDone}>
                {manualDone ? '✓ 已完成' : '手动完成'}
              </button>
            </div>
          </div>
        ) : (
          <div className="pose-animation">
            {/* 动画指引占位(后续接 Lottie/素材) */}
            <div className="pose-demo-figure" aria-hidden="true">
              <div className="pose-demo-circle" />
              <div className="pose-demo-arm" />
            </div>
            <p className="pose-demo-hint">{action.method || '跟着节奏,缓慢完成动作,保持自然呼吸'}</p>

            <div className="pose-actions">
              {camStatus === CAMERA_STATUS.IDLE && isSecureContext() && (
                <button className="yl-btn yl-btn--season" onClick={handleEnableCamera}>
                  📷 开启摄像头跟做
                </button>
              )}
              {(camStatus === CAMERA_STATUS.DENIED || camStatus === CAMERA_STATUS.UNSUPPORTED || camStatus === CAMERA_STATUS.ERROR) && (
                <p className="pose-error yl-faint">{camError || '摄像头不可用'}</p>
              )}
              <button className="yl-btn yl-btn--ghost" onClick={handleManualComplete} disabled={manualDone}>
                {manualDone ? '✓ 已完成' : '手动完成(无需摄像头)'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 分步指引 */}
      <ol className="pose-steps">
        {(action.steps || ['缓慢开始', '保持姿势 3 秒', '缓慢还原']).map((s, i) => (
          <li key={i} className="pose-step">{s}</li>
        ))}
      </ol>

      <p className="pose-note yl-faint">动作识别仅为跟做反馈,不构成医疗诊断或训练评估。</p>
    </div>
  )
}
