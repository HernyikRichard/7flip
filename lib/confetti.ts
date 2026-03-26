import confetti from 'canvas-confetti'

/**
 * Flip 7 konfetti — arany/lila burst, két oldalról + középről.
 * Csak böngészőben fut (server-side safe).
 */
export function fireFlip7Confetti() {
  if (typeof window === 'undefined') return

  const colors = ['#f59e0b', '#fbbf24', '#fcd34d', '#6366f1', '#a78bfa', '#ffffff']

  // Középső főrobbanás
  confetti({
    particleCount: 100,
    spread: 70,
    origin: { x: 0.5, y: 0.55 },
    colors,
    startVelocity: 40,
    gravity: 0.9,
    scalar: 1.1,
  })

  // Bal oldal
  confetti({
    particleCount: 50,
    angle: 60,
    spread: 55,
    origin: { x: 0, y: 0.65 },
    colors,
    startVelocity: 45,
    gravity: 0.85,
  })

  // Jobb oldal
  confetti({
    particleCount: 50,
    angle: 120,
    spread: 55,
    origin: { x: 1, y: 0.65 },
    colors,
    startVelocity: 45,
    gravity: 0.85,
  })
}
