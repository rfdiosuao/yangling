import { useEffect, useRef } from 'react'
import './background.css'

/**
 * 墨夜星尘背景(炸版 v3)
 * 参照秒哒获奖作品的暗色冲击配方:
 * 1. 星点矩阵(呼吸闪烁)
 * 2. 节气金光斑跟随鼠标(流体晕染)
 * 3. 墨夜 + 缓慢漂移的"星尘流"(细丝粒子)
 * 纯前端零依赖,断网可跑。性能:单 canvas RAF。
 */
export default function BreathingBackground() {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const DPR = Math.min(window.devicePixelRatio || 1, 2)
    let rafId = 0
    let points = []
    let dust = []
    let mouse = { x: -9999, y: -9999 }
    let t0 = performance.now()

    const season = getComputedStyle(document.documentElement)
      .getPropertyValue('--yl-season').trim() || '#e0b45a'

    function resize() {
      const w = window.innerWidth, h = window.innerHeight
      canvas.width = w * DPR; canvas.height = h * DPR
      canvas.style.width = w + 'px'; canvas.style.height = h + 'px'
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0)

      const grid = 26
      points = []
      const cols = Math.ceil(w / grid), rows = Math.ceil(h / grid)
      for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
        points.push({
          px: c * grid + (Math.random() - 0.5) * grid * 2,
          py: r * grid + (Math.random() - 0.5) * grid * 2,
          phase: Math.random() * Math.PI * 2,
          sizeVar: 0.3 + Math.random() * 1.4,
          speed: 1 + Math.random() * 2.5,
        })
      }
      // 星尘流粒子(漂移细丝)
      dust = Array.from({ length: 40 }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.3,
        vy: -0.15 - Math.random() * 0.4,
        r: 0.5 + Math.random() * 1.5,
        a: 0.2 + Math.random() * 0.6,
        tw: Math.random() * Math.PI * 2,
      }))
    }

    function frame() {
      const t = (performance.now() - t0) / 1000
      const w = window.innerWidth, h = window.innerHeight
      ctx.clearRect(0, 0, w, h)

      // 星点
      for (const p of points) {
        const wave = 0.5 + 0.3 * Math.sin(t * p.speed + p.phase)
        ctx.globalAlpha = 0.16 * wave
        ctx.fillStyle = '#e8ddc4'
        ctx.beginPath()
        ctx.arc(p.px, p.py, 1.3 * p.sizeVar * (0.6 + wave * 0.6), 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.globalAlpha = 1

      // 星尘流
      for (const d of dust) {
        d.x += d.vx; d.y += d.vy
        if (d.y < -10) { d.y = h + 10; d.x = Math.random() * w }
        if (d.x < -10) d.x = w + 10
        if (d.x > w + 10) d.x = -10
        const tw = 0.4 + 0.4 * Math.sin(t * 1.5 + d.tw)
        ctx.globalAlpha = d.a * tw
        ctx.fillStyle = season
        ctx.beginPath()
        ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.globalAlpha = 1

      // 跟随鼠标的金色光晕
      const idleX = w * 0.5 + Math.sin(t * 0.25) * 160
      const idleY = h * 0.32 + Math.cos(t * 0.18) * 100
      const md = Math.hypot(mouse.x - w / 2, mouse.y - h / 2)
      const gx = md < 560 ? mouse.x : idleX
      const gy = md < 560 ? mouse.y : idleY

      const g = ctx.createRadialGradient(gx, gy, 0, gx, gy, 420)
      g.addColorStop(0, 'rgba(224,180,90,0.10)')
      g.addColorStop(0.55, 'rgba(224,180,90,0.035)')
      g.addColorStop(1, 'rgba(224,180,90,0)')
      ctx.fillStyle = g
      ctx.fillRect(0, 0, w, h)

      // 顶部边缘金色微光(苍穹线)
      const top = ctx.createLinearGradient(0, 0, 0, 200)
      top.addColorStop(0, 'rgba(224,180,90,0.06)')
      top.addColorStop(1, 'rgba(224,180,90,0)')
      ctx.fillStyle = top
      ctx.fillRect(0, 0, w, 200)

      rafId = requestAnimationFrame(frame)
    }

    function onMouseMove(e) { mouse.x = e.clientX; mouse.y = e.clientY }
    resize(); frame()
    window.addEventListener('resize', resize)
    window.addEventListener('mousemove', onMouseMove)
    return () => {
      cancelAnimationFrame(rafId)
      window.removeEventListener('resize', resize)
      window.removeEventListener('mousemove', onMouseMove)
    }
  }, [])

  return <canvas ref={canvasRef} className="yl-bg" aria-hidden="true" />
}
