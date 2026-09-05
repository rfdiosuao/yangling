/**
 * 摄像头封装(纯本地)
 * - getUserMedia 请求 + 权限拒绝处理
 * - HTTPS/localhost 限制提示
 * - 资源释放(停止轨道)
 * 保证:不上传任何帧,只在本机浏览器处理。
 */

export const CAMERA_STATUS = {
  IDLE: 'idle',
  REQUESTING: 'requesting',
  ACTIVE: 'active',
  DENIED: 'denied',
  UNSUPPORTED: 'unsupported',
  ERROR: 'error',
}

export function isSecureContext() {
  return typeof window !== 'undefined' && (window.isSecureContext || location.hostname === 'localhost' || location.hostname === '127.0.0.1')
}

/**
 * 请求摄像头
 * @returns {Promise<{status, stream?, error?}>}
 */
export async function requestCamera() {
  if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
    return { status: CAMERA_STATUS.UNSUPPORTED, error: '当前环境不支持摄像头(需 HTTPS 或 localhost)' }
  }
  if (!isSecureContext()) {
    return { status: CAMERA_STATUS.UNSUPPORTED, error: '摄像头需要 HTTPS 或 localhost 环境' }
  }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
      audio: false,
    })
    return { status: CAMERA_STATUS.ACTIVE, stream }
  } catch (err) {
    if (err?.name === 'NotAllowedError' || err?.name === 'PermissionDeniedError') {
      return { status: CAMERA_STATUS.DENIED, error: '摄像头权限被拒绝,已回退到动画指引' }
    }
    return { status: CAMERA_STATUS.ERROR, error: '摄像头启动失败:' + (err?.message || '未知错误') }
  }
}

/** 释放摄像头资源 */
export function stopCamera(stream) {
  if (stream) {
    stream.getTracks().forEach((t) => t.stop())
  }
}

/** 把 MediaStream 绑到 video 元素 */
export function attachStream(videoEl, stream) {
  if (!videoEl || !stream) return
  videoEl.srcObject = stream
  videoEl.play().catch(() => {})
}
