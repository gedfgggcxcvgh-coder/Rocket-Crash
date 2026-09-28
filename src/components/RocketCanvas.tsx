import React, { useEffect, useRef } from 'react';
import { GamePhase, ActiveFlightEvent, RocketSkinId } from '../types/game';
import { getAltitudeStage } from '../utils/provablyFair';
import { getSkinById } from '../utils/skins';
import { Trophy } from 'lucide-react';
import confetti from 'canvas-confetti';

interface RocketCanvasProps {
  phase: GamePhase;
  multiplier: number;
  countdown: number;
  userBet: number;
  userCashedOut: boolean;
  userCashoutMultiplier?: number;
  crashMultiplier?: number;
  activeEvent?: ActiveFlightEvent | null;
  onClaimEventReward?: (event: ActiveFlightEvent) => void;
  shieldSavedBet?: boolean;
  equippedSkinId?: RocketSkinId;
  jackpotPool?: number;
}

interface Star {
  x: number;
  y: number;
  size: number;
  opacity: number;
  speed: number;
}

interface WarpLine {
  x: number;
  y: number;
  length: number;
  speed: number;
  opacity: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  type: 'flame' | 'smoke' | 'spark' | 'explosion' | 'star' | 'ring';
}

export const RocketCanvas: React.FC<RocketCanvasProps> = ({
  phase,
  multiplier,
  countdown,
  userBet,
  userCashedOut,
  userCashoutMultiplier,
  crashMultiplier,
  activeEvent,
  onClaimEventReward,
  shieldSavedBet,
  equippedSkinId,
  jackpotPool,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const starsRef = useRef<Star[]>([]);
  const warpLinesRef = useRef<WarpLine[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const shakeRef = useRef<{ x: number; y: number; intensity: number }>({ x: 0, y: 0, intensity: 0 });
  const prevPhaseRef = useRef<GamePhase>(phase);
  const prevCashedOutRef = useRef<boolean>(userCashedOut);

  const currentStage = getAltitudeStage(phase === 'CRASHED' ? (crashMultiplier || multiplier) : multiplier);

  // Trigger confetti when player cashes out
  useEffect(() => {
    if (!prevCashedOutRef.current && userCashedOut) {
      try {
        confetti({
          particleCount: 90,
          spread: 80,
          origin: { y: 0.6 },
          colors: ['#10B981', '#34D399', '#FBBF24', '#60A5FA', '#A855F7'],
        });
      } catch {}
    }
    prevCashedOutRef.current = userCashedOut;
  }, [userCashedOut]);

  // Trigger explosion particles on CRASH
  useEffect(() => {
    if (prevPhaseRef.current !== 'CRASHED' && phase === 'CRASHED') {
      const canvas = canvasRef.current;
      if (canvas) {
        const w = canvas.width;
        const h = canvas.height;
        const rocketPos = getRocketPosition(multiplier, w, h);
        
        shakeRef.current.intensity = 26;

        // Explosion particle color matching equipped skin
        const skin = getSkinById(equippedSkinId || 'STANDARD');
        const colors = [...skin.particleColorHex, '#FFFFFF', '#EF4444', '#F97316'];

        for (let i = 0; i < 150; i++) {
          const angle = Math.random() * Math.PI * 2;
          const speed = Math.random() * 10 + 2;
          const pType = equippedSkinId === 'DRAGONFIRE' && Math.random() > 0.5 ? 'star' : 'explosion';

          particlesRef.current.push({
            x: rocketPos.x,
            y: rocketPos.y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            life: 1,
            maxLife: Math.random() * 45 + 30,
            size: Math.random() * 8 + 3,
            color: colors[Math.floor(Math.random() * colors.length)],
            type: pType,
          });
        }
      }
    }
    prevPhaseRef.current = phase;
  }, [phase, multiplier, equippedSkinId]);

  // Calculate rocket trajectory coordinate based on multiplier
  function getRocketPosition(currentMult: number, width: number, height: number) {
    if (phase === 'COUNTDOWN') {
      return { x: width * 0.12, y: height * 0.82, angle: -0.2 };
    }

    if (currentMult < 30) {
      const progress = Math.min(Math.log(currentMult) / Math.log(30), 1.0);
      const startX = width * 0.12;
      const endX = width * 0.78;
      const startY = height * 0.82;
      const endY = height * 0.24;

      const x = startX + (endX - startX) * Math.pow(progress, 0.7);
      const y = startY - (startY - endY) * Math.pow(progress, 0.85);
      const angle = -0.5 - (0.35 * (1 - progress));
      return { x, y, angle };
    } else {
      // High-altitude cruising orbit
      const t = Date.now() * 0.002;
      const baseX = width * 0.78;
      const baseY = height * 0.24;
      const x = baseX + Math.cos(t) * 14;
      const y = baseY + Math.sin(t * 1.3) * 10;
      const angle = -0.52 + Math.sin(t * 1.2) * 0.08;
      return { x, y, angle };
    }
  }

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);

      // Stars initialization
      if (starsRef.current.length === 0) {
        const starCount = Math.floor((rect.width * rect.height) / 3000);
        starsRef.current = Array.from({ length: starCount }, () => ({
          x: Math.random() * rect.width,
          y: Math.random() * rect.height,
          size: Math.random() * 1.8 + 0.6,
          opacity: Math.random() * 0.7 + 0.3,
          speed: Math.random() * 1.6 + 0.5,
        }));
      }

      // Warp speed lines
      if (warpLinesRef.current.length === 0) {
        warpLinesRef.current = Array.from({ length: 30 }, () => ({
          x: Math.random() * rect.width,
          y: Math.random() * rect.height,
          length: Math.random() * 40 + 20,
          speed: Math.random() * 14 + 10,
          opacity: Math.random() * 0.4 + 0.2,
        }));
      }
    };

    resize();
    window.addEventListener('resize', resize);

    const render = () => {
      const rect = canvas.getBoundingClientRect();
      const w = rect.width;
      const h = rect.height;

      // Dynamic screen shake
      let offsetX = 0;
      let offsetY = 0;
      if (shakeRef.current.intensity > 0.1) {
        offsetX = (Math.random() - 0.5) * shakeRef.current.intensity;
        offsetY = (Math.random() - 0.5) * shakeRef.current.intensity;
        shakeRef.current.intensity *= 0.92;
      } else if (phase === 'FLYING' && multiplier > 4) {
        const subtleTremble = Math.min((multiplier - 4) * 0.35, 4.0);
        offsetX = (Math.random() - 0.5) * subtleTremble;
        offsetY = (Math.random() - 0.5) * subtleTremble;
      }

      ctx.save();
      ctx.translate(offsetX, offsetY);

      // 1. Deep Space Canvas Background
      ctx.fillStyle = '#060a13';
      ctx.fillRect(-20, -20, w + 40, h + 40);

      // Cosmic Atmosphere Gradient based on multiplier
      drawCosmicNebula(ctx, w, h, multiplier);

      // 2. Celestial background bodies (Earth, Moon, Mars)
      drawCelestialBodies(ctx, w, h, multiplier);

      // 3. Stars rendering with parallax speed
      const starSpeedFactor = phase === 'FLYING' ? Math.min(1 + Math.log(multiplier) * 2.2, 10) : 0.4;
      ctx.fillStyle = '#ffffff';
      starsRef.current.forEach(star => {
        if (phase === 'FLYING') {
          star.x -= star.speed * starSpeedFactor * 0.45;
          star.y += star.speed * starSpeedFactor * 0.75;
          if (star.x < 0) star.x = w;
          if (star.y > h) star.y = 0;
        }

        ctx.globalAlpha = star.opacity * (0.6 + 0.4 * Math.sin(Date.now() * 0.003 + star.x));
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.globalAlpha = 1.0;

      // Warp speed lines above 25x
      if (phase === 'FLYING' && multiplier >= 25) {
        drawWarpLines(ctx, w, h, multiplier);
      }

      // 4. Grid & Trajectory Curve
      drawGrid(ctx, w, h);

      // 5. Trajectory Path & Custom Thruster Particles
      const rocketPos = getRocketPosition(multiplier, w, h);

      if (phase === 'FLYING') {
        drawTrajectory(ctx, w, h, rocketPos, multiplier);

        // Spawn custom rocket thruster particles based on equipped skin
        const exhaustX = rocketPos.x - Math.cos(rocketPos.angle) * 24;
        const exhaustY = rocketPos.y - Math.sin(rocketPos.angle) * 24;

        const skin = getSkinById(equippedSkinId || 'STANDARD');
        const pColors = skin.particleColorHex;

        // Custom particle generation per skin
        for (let i = 0; i < 4; i++) {
          const spread = (Math.random() - 0.5) * 0.45;
          const pAngle = rocketPos.angle + Math.PI + spread;
          const pSpeed = Math.random() * 4.5 + 2;

          let particleType: 'flame' | 'star' | 'ring' | 'spark' = 'flame';
          if (equippedSkinId === 'DRAGONFIRE' && Math.random() > 0.4) {
            particleType = 'star';
          } else if (equippedSkinId === 'UFO_ALIEN' && Math.random() > 0.6) {
            particleType = 'ring';
          } else if (equippedSkinId === 'CYBERPUNK' && Math.random() > 0.5) {
            particleType = 'spark';
          }

          particlesRef.current.push({
            x: exhaustX,
            y: exhaustY,
            vx: Math.cos(pAngle) * pSpeed,
            vy: Math.sin(pAngle) * pSpeed,
            life: 1,
            maxLife: Math.random() * 24 + 16,
            size: particleType === 'ring' ? 4 : Math.random() * 5 + 3,
            color: pColors[Math.floor(Math.random() * pColors.length)],
            type: particleType,
          });
        }

        if (Math.random() > 0.25) {
          particlesRef.current.push({
            x: exhaustX + (Math.random() - 0.5) * 8,
            y: exhaustY + (Math.random() - 0.5) * 8,
            vx: -Math.cos(rocketPos.angle) * 1.5 + (Math.random() - 0.5),
            vy: -Math.sin(rocketPos.angle) * 1.5 + (Math.random() - 0.5),
            life: 1,
            maxLife: Math.random() * 35 + 25,
            size: Math.random() * 10 + 6,
            color: equippedSkinId === 'CYBERPUNK' ? 'rgba(168, 85, 247, 0.25)' : 'rgba(148, 163, 184, 0.35)',
            type: 'smoke',
          });
        }
      }

      // 6. Update & draw particles
      updateAndDrawParticles(ctx);

      // 7. Draw Active Event Visuals
      if (activeEvent && phase === 'FLYING') {
        if (activeEvent.type === 'WARP_NITRO') {
          drawWarpLines(ctx, w, h, 95);
        } else if (activeEvent.type === 'ENGINE_OVERHEAT') {
          const alpha = (0.5 + 0.5 * Math.sin(Date.now() * 0.012)) * 0.45;
          ctx.save();
          ctx.strokeStyle = `rgba(239, 68, 68, ${alpha})`;
          ctx.lineWidth = 14;
          ctx.strokeRect(0, 0, w, h);
          ctx.restore();
        } else if (activeEvent.type === 'COSMIC_AIRDROP') {
          drawCosmicCrate(ctx, w, h);
        } else if (activeEvent.type === 'LUCKY_ENVELOPE') {
          drawLuckyEnvelope(ctx, w, h);
        }
      }

      // 8. Draw Custom Rocket Ship Model
      if (phase !== 'CRASHED') {
        drawRocket(ctx, rocketPos.x, rocketPos.y, rocketPos.angle, phase === 'FLYING', multiplier);

        // Draw Alien Shield bubble if active
        if (activeEvent && activeEvent.type === 'ALIEN_SHIELD' && phase === 'FLYING') {
          drawAlienShield(ctx, rocketPos.x, rocketPos.y);
        }
      } else {
        drawCrashEpicenter(ctx, rocketPos.x, rocketPos.y);
      }

      ctx.restore();

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
    };
  }, [phase, multiplier, equippedSkinId]);

  // Cosmic Nebula atmosphere
  function drawCosmicNebula(ctx: CanvasRenderingContext2D, w: number, h: number, mult: number) {
    const skin = getSkinById(equippedSkinId || 'STANDARD');
    const primaryGlow = skin.glowColor || '#EF4444';

    if (mult < 6) {
      const grad = ctx.createRadialGradient(w * 0.75, h * 0.3, 10, w * 0.75, h * 0.3, w * 0.6);
      grad.addColorStop(0, `${primaryGlow}22`);
      grad.addColorStop(0.6, 'rgba(99, 102, 241, 0.04)');
      grad.addColorStop(1, 'rgba(6, 10, 19, 0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);
    } else if (mult < 30) {
      const grad = ctx.createRadialGradient(w * 0.75, h * 0.25, 20, w * 0.75, h * 0.25, w * 0.7);
      grad.addColorStop(0, 'rgba(234, 179, 8, 0.18)');
      grad.addColorStop(0.5, 'rgba(168, 85, 247, 0.10)');
      grad.addColorStop(1, 'rgba(6, 10, 19, 0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);
    } else {
      const grad = ctx.createRadialGradient(w * 0.70, h * 0.25, 20, w * 0.70, h * 0.25, w * 0.85);
      grad.addColorStop(0, 'rgba(236, 72, 153, 0.22)');
      grad.addColorStop(0.4, 'rgba(168, 85, 247, 0.15)');
      grad.addColorStop(0.8, 'rgba(59, 130, 246, 0.08)');
      grad.addColorStop(1, 'rgba(6, 10, 19, 0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);
    }
  }

  // Draw background planets
  function drawCelestialBodies(ctx: CanvasRenderingContext2D, w: number, h: number, mult: number) {
    if (mult < 5.0) {
      ctx.save();
      const earthAlpha = Math.max(0, 1 - (mult - 1) / 4.0);
      ctx.globalAlpha = earthAlpha;

      const gradEarth = ctx.createRadialGradient(0, h * 1.3, h * 0.5, 0, h * 1.3, h * 0.85);
      gradEarth.addColorStop(0, '#1E3A8A');
      gradEarth.addColorStop(0.5, '#0284C7');
      gradEarth.addColorStop(0.8, '#38BDF8');
      gradEarth.addColorStop(1, 'rgba(56, 189, 248, 0)');

      ctx.fillStyle = gradEarth;
      ctx.beginPath();
      ctx.arc(0, h * 1.25, h * 0.65, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    if (mult >= 4.0 && mult < 28.0) {
      ctx.save();
      const moonProgress = (mult - 4.0) / 24.0;
      const moonX = w * 0.85 - moonProgress * (w * 0.5);
      const moonY = h * 0.20 + moonProgress * (h * 0.3);
      const moonAlpha = Math.sin(moonProgress * Math.PI) * 0.75;
      ctx.globalAlpha = moonAlpha;

      ctx.fillStyle = '#E2E8F0';
      ctx.shadowColor = '#FBBF24';
      ctx.shadowBlur = 15;
      ctx.beginPath();
      ctx.arc(moonX, moonY, 18, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = 'rgba(100, 116, 139, 0.4)';
      ctx.shadowBlur = 0;
      ctx.beginPath();
      ctx.arc(moonX - 5, moonY - 3, 4, 0, Math.PI * 2);
      ctx.arc(moonX + 4, moonY + 4, 5, 0, Math.PI * 2);
      ctx.arc(moonX + 3, moonY - 6, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  // Draw hyperspace warp lines
  function drawWarpLines(ctx: CanvasRenderingContext2D, w: number, h: number, mult: number) {
    ctx.save();
    const speed = Math.min((mult - 25) * 0.8 + 12, 35);
    ctx.strokeStyle = mult > 80 ? '#FBBF24' : '#60A5FA';
    ctx.lineWidth = 1.5;

    warpLinesRef.current.forEach(line => {
      line.x -= speed * 0.6;
      line.y += speed * 0.8;
      if (line.x < 0 || line.y > h) {
        line.x = Math.random() * w + w * 0.3;
        line.y = Math.random() * h * 0.6;
      }

      ctx.globalAlpha = line.opacity;
      ctx.beginPath();
      ctx.moveTo(line.x, line.y);
      ctx.lineTo(line.x - line.length * 0.6, line.y + line.length * 0.8);
      ctx.stroke();
    });
    ctx.restore();
  }

  // Draw coordinate grid
  function drawGrid(ctx: CanvasRenderingContext2D, w: number, h: number) {
    ctx.strokeStyle = 'rgba(51, 65, 85, 0.25)';
    ctx.lineWidth = 1;

    const lines = [0.25, 0.45, 0.65, 0.85];
    lines.forEach(ratio => {
      ctx.beginPath();
      ctx.moveTo(w * 0.05, h * ratio);
      ctx.lineTo(w * 0.95, h * ratio);
      ctx.stroke();
    });

    ctx.strokeStyle = 'rgba(71, 85, 105, 0.6)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(w * 0.05, h * 0.86);
    ctx.lineTo(w * 0.95, h * 0.86);
    ctx.stroke();

    ctx.fillStyle = '#334155';
    ctx.fillRect(w * 0.08, h * 0.86, w * 0.12, 6);
    ctx.fillStyle = '#10B981';
    ctx.fillRect(w * 0.10, h * 0.85, 4, 3);
    ctx.fillRect(w * 0.17, h * 0.85, 4, 3);
  }

  // Draw glowing trajectory ribbon
  function drawTrajectory(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    rocketPos: { x: number; y: number },
    mult: number
  ) {
    const startX = w * 0.12;
    const startY = h * 0.82;

    const skin = getSkinById(equippedSkinId || 'STANDARD');
    const trajColor = skin.trailColorHex[0] || (mult >= 20 ? '#A855F7' : mult >= 6 ? '#06B6D4' : '#F59E0B');

    const gradArea = ctx.createLinearGradient(0, startY, 0, rocketPos.y);
    gradArea.addColorStop(0, 'rgba(245, 158, 11, 0)');
    gradArea.addColorStop(1, `${trajColor}22`);

    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.quadraticCurveTo(startX + (rocketPos.x - startX) * 0.55, startY, rocketPos.x, rocketPos.y);
    ctx.lineTo(rocketPos.x, startY);
    ctx.closePath();
    ctx.fillStyle = gradArea;
    ctx.fill();

    ctx.save();
    ctx.strokeStyle = trajColor;
    ctx.lineWidth = 3.5;
    ctx.shadowColor = trajColor;
    ctx.shadowBlur = 14;

    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.quadraticCurveTo(startX + (rocketPos.x - startX) * 0.55, startY, rocketPos.x, rocketPos.y);
    ctx.stroke();
    ctx.restore();
  }

  // Update and render particle physics
  function updateAndDrawParticles(ctx: CanvasRenderingContext2D) {
    for (let i = particlesRef.current.length - 1; i >= 0; i--) {
      const p = particlesRef.current[i];
      p.x += p.vx;
      p.y += p.vy;
      p.life++;

      const progress = p.life / p.maxLife;
      if (progress >= 1) {
        particlesRef.current.splice(i, 1);
        continue;
      }

      ctx.save();
      const alpha = 1 - progress;
      ctx.globalAlpha = Math.max(0, alpha);

      if (p.type === 'flame' || p.type === 'spark') {
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * (1 - progress * 0.4), 0, Math.PI * 2);
        ctx.fill();
      } else if (p.type === 'star') {
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 10;
        const r = p.size * (1 - progress * 0.3);
        ctx.beginPath();
        ctx.moveTo(p.x, p.y - r);
        ctx.lineTo(p.x + r * 0.3, p.y - r * 0.3);
        ctx.lineTo(p.x + r, p.y);
        ctx.lineTo(p.x + r * 0.3, p.y + r * 0.3);
        ctx.lineTo(p.x, p.y + r);
        ctx.lineTo(p.x - r * 0.3, p.y + r * 0.3);
        ctx.lineTo(p.x - r, p.y);
        ctx.lineTo(p.x - r * 0.3, p.y - r * 0.3);
        ctx.closePath();
        ctx.fill();
      } else if (p.type === 'ring') {
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 2;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * (1 + progress * 1.6), 0, Math.PI * 2);
        ctx.stroke();
      } else if (p.type === 'smoke') {
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * (1 + progress * 0.8), 0, Math.PI * 2);
        ctx.fill();
      } else if (p.type === 'explosion') {
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * (1 - progress * 0.5), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  // Draw Rocket Router delegating to skin models
  function drawRocket(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    angle: number,
    isFiring: boolean,
    mult: number
  ) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);

    const skinId = equippedSkinId || 'STANDARD';

    switch (skinId) {
      case 'CYBERPUNK':
        drawCyberpunkRocket(ctx, isFiring);
        break;
      case 'PHOENIX':
        drawPhoenixRocket(ctx, isFiring);
        break;
      case 'UFO_ALIEN':
        drawUfoAlienRocket(ctx, isFiring);
        break;
      case 'DRAGONFIRE':
        drawDragonfireRocket(ctx, isFiring);
        break;
      case 'STANDARD':
      default:
        drawStandardRocket(ctx, isFiring);
        break;
    }

    ctx.restore();
  }

  // 1. STANDARD ROCKET MODEL
  function drawStandardRocket(ctx: CanvasRenderingContext2D, isFiring: boolean) {
    if (isFiring) {
      const flameLength = 28 + Math.random() * 14;
      const flameGrad = ctx.createLinearGradient(-18, 0, -18 - flameLength, 0);
      flameGrad.addColorStop(0, '#FFFFFF');
      flameGrad.addColorStop(0.2, '#FBBF24');
      flameGrad.addColorStop(0.7, '#EF4444');
      flameGrad.addColorStop(1, 'rgba(239, 68, 68, 0)');

      ctx.beginPath();
      ctx.moveTo(-16, -5);
      ctx.lineTo(-18 - flameLength, 0);
      ctx.lineTo(-16, 5);
      ctx.closePath();
      ctx.fillStyle = flameGrad;
      ctx.shadowColor = '#F59E0B';
      ctx.shadowBlur = 14;
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(-16, -2.5);
      ctx.lineTo(-18 - flameLength * 0.5, 0);
      ctx.lineTo(-16, 2.5);
      ctx.closePath();
      ctx.fillStyle = '#FFFFFF';
      ctx.fill();
    }

    ctx.fillStyle = '#334155';
    ctx.fillRect(-18, -4, 4, 8);

    ctx.fillStyle = '#DC2626';
    ctx.beginPath();
    ctx.moveTo(-12, -7);
    ctx.lineTo(-16, -15);
    ctx.lineTo(-5, -7);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(-12, 7);
    ctx.lineTo(-16, 15);
    ctx.lineTo(-5, 7);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#F8FAFC';
    ctx.beginPath();
    ctx.moveTo(-14, -7);
    ctx.lineTo(10, -7);
    ctx.quadraticCurveTo(24, 0, 10, 7);
    ctx.lineTo(-14, 7);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#DC2626';
    ctx.beginPath();
    ctx.moveTo(10, -7);
    ctx.quadraticCurveTo(24, 0, 10, 7);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#0284C7';
    ctx.beginPath();
    ctx.arc(3, 0, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.beginPath();
    ctx.arc(2, -1, 1.8, 0, Math.PI * 2);
    ctx.fill();
  }

  // 2. CYBERPUNK NEON MODEL
  function drawCyberpunkRocket(ctx: CanvasRenderingContext2D, isFiring: boolean) {
    if (isFiring) {
      const flameLength = 34 + Math.random() * 16;
      const flameGrad = ctx.createLinearGradient(-20, 0, -20 - flameLength, 0);
      flameGrad.addColorStop(0, '#FFFFFF');
      flameGrad.addColorStop(0.25, '#22D3EE');
      flameGrad.addColorStop(0.65, '#A855F7');
      flameGrad.addColorStop(1, 'rgba(168, 85, 247, 0)');

      ctx.beginPath();
      ctx.moveTo(-18, -7);
      ctx.lineTo(-20 - flameLength, 0);
      ctx.lineTo(-18, 7);
      ctx.closePath();
      ctx.fillStyle = flameGrad;
      ctx.shadowColor = '#A855F7';
      ctx.shadowBlur = 20;
      ctx.fill();
    }

    ctx.fillStyle = '#1E1B4B';
    ctx.strokeStyle = '#06B6D4';
    ctx.lineWidth = 1.5;
    ctx.shadowColor = '#06B6D4';
    ctx.shadowBlur = 10;

    ctx.beginPath();
    ctx.moveTo(-10, -6);
    ctx.lineTo(-22, -22);
    ctx.lineTo(2, -6);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(-10, 6);
    ctx.lineTo(-22, 22);
    ctx.lineTo(2, 6);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#0F172A';
    ctx.strokeStyle = '#EC4899';
    ctx.lineWidth = 1.5;
    ctx.shadowColor = '#EC4899';
    ctx.shadowBlur = 12;

    ctx.beginPath();
    ctx.moveTo(-18, -6);
    ctx.lineTo(12, -6);
    ctx.lineTo(28, 0);
    ctx.lineTo(12, 6);
    ctx.lineTo(-18, 6);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#22D3EE';
    ctx.shadowColor = '#22D3EE';
    ctx.shadowBlur = 12;
    ctx.fillRect(4, -3, 10, 6);

    ctx.fillStyle = '#EC4899';
    ctx.fillRect(-10, -1, 12, 2);
  }

  // 3. PHOENIX FLAME MODEL
  function drawPhoenixRocket(ctx: CanvasRenderingContext2D, isFiring: boolean) {
    if (isFiring) {
      const flameLength = 36 + Math.random() * 20;
      const flameGrad = ctx.createLinearGradient(-16, 0, -16 - flameLength, 0);
      flameGrad.addColorStop(0, '#FEF08A');
      flameGrad.addColorStop(0.3, '#F59E0B');
      flameGrad.addColorStop(0.7, '#DC2626');
      flameGrad.addColorStop(1, 'rgba(220, 38, 38, 0)');

      ctx.beginPath();
      ctx.moveTo(-16, -9);
      ctx.lineTo(-16 - flameLength, -2);
      ctx.lineTo(-16 - flameLength * 1.2, 0);
      ctx.lineTo(-16 - flameLength, 2);
      ctx.lineTo(-16, 9);
      ctx.closePath();
      ctx.fillStyle = flameGrad;
      ctx.shadowColor = '#F59E0B';
      ctx.shadowBlur = 22;
      ctx.fill();
    }

    const wingGrad = ctx.createLinearGradient(-10, 0, 10, -20);
    wingGrad.addColorStop(0, '#DC2626');
    wingGrad.addColorStop(0.6, '#EA580C');
    wingGrad.addColorStop(1, '#F59E0B');

    ctx.fillStyle = wingGrad;
    ctx.shadowColor = '#EA580C';
    ctx.shadowBlur = 12;

    ctx.beginPath();
    ctx.moveTo(-8, -5);
    ctx.quadraticCurveTo(-18, -20, -10, -22);
    ctx.quadraticCurveTo(2, -18, 8, -5);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(-8, 5);
    ctx.quadraticCurveTo(-18, 20, -10, 22);
    ctx.quadraticCurveTo(2, 18, 8, 5);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#EA580C';
    ctx.beginPath();
    ctx.moveTo(-16, -6);
    ctx.lineTo(10, -6);
    ctx.quadraticCurveTo(26, 0, 10, 6);
    ctx.lineTo(-16, 6);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#F59E0B';
    ctx.beginPath();
    ctx.moveTo(10, -6);
    ctx.lineTo(26, -2);
    ctx.lineTo(32, 0);
    ctx.lineTo(26, 2);
    ctx.lineTo(10, 6);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#FEF08A';
    ctx.shadowColor = '#FBBF24';
    ctx.shadowBlur = 15;
    ctx.beginPath();
    ctx.moveTo(14, -6);
    ctx.lineTo(18, -14);
    ctx.lineTo(22, -5);
    ctx.closePath();
    ctx.fill();
  }

  // 4. UFO ALIEN SAUCER MODEL
  function drawUfoAlienRocket(ctx: CanvasRenderingContext2D, isFiring: boolean) {
    if (isFiring) {
      const beamLen = 30 + Math.random() * 12;
      const beamGrad = ctx.createLinearGradient(-18, 0, -18 - beamLen, 0);
      beamGrad.addColorStop(0, '#A7F3D0');
      beamGrad.addColorStop(0.3, '#34D399');
      beamGrad.addColorStop(0.8, '#10B981');
      beamGrad.addColorStop(1, 'rgba(16, 185, 129, 0)');

      ctx.fillStyle = beamGrad;
      ctx.shadowColor = '#10B981';
      ctx.shadowBlur = 20;
      ctx.fillRect(-18 - beamLen, -5, beamLen, 10);
    }

    ctx.fillStyle = 'rgba(103, 232, 249, 0.45)';
    ctx.strokeStyle = '#22D3EE';
    ctx.lineWidth = 1.5;
    ctx.shadowColor = '#22D3EE';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.ellipse(0, -6, 14, 12, 0, Math.PI, 0);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#34D399';
    ctx.shadowBlur = 0;
    ctx.beginPath();
    ctx.arc(0, -8, 5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#0F172A';
    ctx.beginPath();
    ctx.ellipse(-2, -9, 1.8, 2.5, -0.3, 0, Math.PI * 2);
    ctx.ellipse(2, -9, 1.8, 2.5, 0.3, 0, Math.PI * 2);
    ctx.fill();

    const discGrad = ctx.createLinearGradient(-22, 0, 22, 0);
    discGrad.addColorStop(0, '#0F766E');
    discGrad.addColorStop(0.5, '#14B8A6');
    discGrad.addColorStop(1, '#0D9488');

    ctx.fillStyle = discGrad;
    ctx.strokeStyle = '#5EEAD4';
    ctx.lineWidth = 1.5;
    ctx.shadowColor = '#10B981';
    ctx.shadowBlur = 15;
    ctx.beginPath();
    ctx.ellipse(0, 2, 24, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    const colors = ['#FBBF24', '#34D399', '#38BDF8', '#F43F5E'];
    const timeIdx = Math.floor(Date.now() / 180);
    [-18, -9, 0, 9, 18].forEach((offset, idx) => {
      ctx.fillStyle = colors[(idx + timeIdx) % colors.length];
      ctx.shadowColor = ctx.fillStyle;
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(offset, 4, 2, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  // 5. DRAGONFIRE IMPERIAL STARSHIP MODEL
  function drawDragonfireRocket(ctx: CanvasRenderingContext2D, isFiring: boolean) {
    if (isFiring) {
      const flameLength = 38 + Math.random() * 18;
      const flameGrad = ctx.createLinearGradient(-20, 0, -20 - flameLength, 0);
      flameGrad.addColorStop(0, '#FFFFFF');
      flameGrad.addColorStop(0.2, '#FEF08A');
      flameGrad.addColorStop(0.6, '#F59E0B');
      flameGrad.addColorStop(1, 'rgba(245, 158, 11, 0)');

      ctx.beginPath();
      ctx.moveTo(-18, -8);
      ctx.lineTo(-20 - flameLength, 0);
      ctx.lineTo(-18, 8);
      ctx.closePath();
      ctx.fillStyle = flameGrad;
      ctx.shadowColor = '#F59E0B';
      ctx.shadowBlur = 24;
      ctx.fill();
    }

    const goldGrad = ctx.createLinearGradient(-15, -15, 15, 15);
    goldGrad.addColorStop(0, '#F59E0B');
    goldGrad.addColorStop(0.5, '#FCD34D');
    goldGrad.addColorStop(1, '#B45309');

    ctx.fillStyle = goldGrad;
    ctx.strokeStyle = '#FEF08A';
    ctx.lineWidth = 1.5;
    ctx.shadowColor = '#F59E0B';
    ctx.shadowBlur = 16;

    ctx.beginPath();
    ctx.moveTo(-12, -6);
    ctx.lineTo(-20, -20);
    ctx.lineTo(-4, -18);
    ctx.lineTo(6, -6);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(-12, 6);
    ctx.lineTo(-20, 20);
    ctx.lineTo(-4, 18);
    ctx.lineTo(6, 6);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(-18, -6);
    ctx.lineTo(14, -6);
    ctx.lineTo(28, 0);
    ctx.lineTo(14, 6);
    ctx.lineTo(-18, 6);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#38BDF8';
    ctx.shadowColor = '#38BDF8';
    ctx.shadowBlur = 15;
    ctx.beginPath();
    ctx.moveTo(-2, -5);
    ctx.lineTo(4, 0);
    ctx.lineTo(-2, 5);
    ctx.lineTo(-8, 0);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#FEF08A';
    ctx.beginPath();
    ctx.arc(18, -2, 1.8, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawCrashEpicenter(ctx: CanvasRenderingContext2D, x: number, y: number) {
    ctx.save();
    const grad = ctx.createRadialGradient(x, y, 5, x, y, 45);
    grad.addColorStop(0, 'rgba(239, 68, 68, 0.9)');
    grad.addColorStop(0.5, 'rgba(249, 115, 22, 0.5)');
    grad.addColorStop(1, 'rgba(239, 68, 68, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(x, y, 45, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // Draw UFO and glowing shield around rocket
  function drawAlienShield(ctx: CanvasRenderingContext2D, rx: number, ry: number) {
    ctx.save();
    const pulse = 1 + 0.05 * Math.sin(Date.now() * 0.008);
    const shieldRadius = 38 * pulse;

    ctx.save();
    ctx.strokeStyle = '#22D3EE';
    ctx.lineWidth = 2.5;
    ctx.shadowColor = '#06B6D4';
    ctx.shadowBlur = 18;
    ctx.beginPath();
    ctx.arc(rx, ry, shieldRadius, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = 'rgba(6, 182, 212, 0.16)';
    ctx.fill();
    ctx.restore();

    const ufoX = rx + 24;
    const ufoY = ry - 42 + Math.sin(Date.now() * 0.006) * 5;

    ctx.strokeStyle = 'rgba(34, 211, 238, 0.35)';
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(ufoX, ufoY + 6);
    ctx.lineTo(rx, ry - 15);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = '#67E8F9';
    ctx.shadowColor = '#38BDF8';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(ufoX, ufoY - 4, 8, Math.PI, 0);
    ctx.fill();

    ctx.fillStyle = '#0891B2';
    ctx.beginPath();
    ctx.ellipse(ufoX, ufoY, 18, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    const colors = ['#FBBF24', '#34D399', '#F43F5E'];
    [-10, 0, 10].forEach((ox, i) => {
      ctx.fillStyle = colors[(i + Math.floor(Date.now() / 250)) % colors.length];
      ctx.beginPath();
      ctx.arc(ufoX + ox, ufoY + 1, 1.8, 0, Math.PI * 2);
      ctx.fill();
    });

    ctx.restore();
  }

  // Draw floating golden cosmic supply crate
  function drawCosmicCrate(ctx: CanvasRenderingContext2D, w: number, h: number) {
    if (activeEvent?.rewardClaimed) return;
    ctx.save();
    const t = Date.now() * 0.002;
    const cx = w * 0.55 + Math.sin(t * 1.2) * (w * 0.15);
    const cy = h * 0.28 + Math.cos(t * 0.8) * (h * 0.08);

    ctx.strokeStyle = 'rgba(251, 191, 36, 0.5)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(cx - 24, cy - 35);
    ctx.lineTo(cx - 10, cy - 8);
    ctx.moveTo(cx + 24, cy - 35);
    ctx.lineTo(cx + 10, cy - 8);
    ctx.stroke();

    ctx.fillStyle = '#F59E0B';
    ctx.beginPath();
    ctx.arc(cx, cy - 35, 26, Math.PI, 0);
    ctx.fill();

    ctx.fillStyle = '#FBBF24';
    ctx.shadowColor = '#F59E0B';
    ctx.shadowBlur = 15;
    ctx.fillRect(cx - 14, cy - 8, 28, 24);

    ctx.fillStyle = '#DC2626';
    ctx.fillRect(cx - 3, cy - 8, 6, 24);
    ctx.fillRect(cx - 14, cy + 2, 28, 5);

    ctx.fillStyle = Math.sin(Date.now() * 0.015) > 0 ? '#10B981' : '#EF4444';
    ctx.beginPath();
    ctx.arc(cx, cy - 10, 2.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  // Draw floating lucky red envelope
  function drawLuckyEnvelope(ctx: CanvasRenderingContext2D, w: number, h: number) {
    if (activeEvent?.rewardClaimed) return;
    ctx.save();
    const t = Date.now() * 0.0025;
    const ex = w * 0.48 + Math.cos(t) * (w * 0.18);
    const ey = h * 0.25 + Math.sin(t * 1.5) * (h * 0.06);

    ctx.save();
    ctx.translate(ex, ey);
    ctx.rotate(Math.sin(t * 1.2) * 0.15);

    ctx.fillStyle = '#DC2626';
    ctx.shadowColor = '#EF4444';
    ctx.shadowBlur = 14;
    ctx.fillRect(-12, -18, 24, 34);

    ctx.fillStyle = '#FBBF24';
    ctx.beginPath();
    ctx.moveTo(-12, -18);
    ctx.lineTo(0, -6);
    ctx.lineTo(12, -18);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.arc(0, 0, 4.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
    ctx.restore();
  }

  // Dynamic multiplier color class
  const getMultiplierColor = (val: number) => {
    if (phase === 'CRASHED') return 'text-red-500 drop-shadow-[0_0_25px_rgba(239,68,68,0.85)]';
    if (val < 2.0) return 'text-amber-400 drop-shadow-[0_0_12px_rgba(251,191,36,0.5)]';
    if (val < 6.0) return 'text-emerald-400 drop-shadow-[0_0_20px_rgba(52,211,153,0.7)]';
    if (val < 20.0) return 'text-cyan-300 drop-shadow-[0_0_25px_rgba(103,232,249,0.8)]';
    if (val < 80.0) return 'text-purple-300 drop-shadow-[0_0_30px_rgba(216,180,254,0.9)] animate-pulse';
    return 'text-yellow-200 drop-shadow-[0_0_40px_rgba(254,240,138,1)] animate-pulse';
  };

  return (
    <div className="relative w-full h-[370px] md:h-[480px] bg-slate-950 rounded-2xl overflow-hidden border border-slate-800 shadow-2xl flex items-center justify-center select-none">
      {/* Canvas */}
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full block" />

      {/* Center HUD: Multiplier or Countdown */}
      <div className="relative z-10 flex flex-col items-center pointer-events-none px-4 text-center">
        {phase === 'COUNTDOWN' && (
          <div className="flex flex-col items-center animate-in fade-in zoom-in-95 duration-200">
            <span className="text-xs uppercase tracking-widest text-slate-400 font-semibold mb-1">
              Chuẩn bị phóng trong
            </span>
            <div className="relative flex items-center justify-center w-24 h-24 rounded-full border-4 border-amber-500/40 bg-slate-900/80 backdrop-blur-md shadow-lg shadow-amber-500/10">
              <span className="text-3xl font-display font-bold text-amber-400 font-mono-numbers">
                {countdown.toFixed(1)}s
              </span>
            </div>
            <p className="mt-3 text-xs text-slate-400">
              {userBet > 0 ? (
                <span className="text-emerald-400 font-medium">
                  Đã đặt cược {userBet.toLocaleString('vi-VN')} Xu • Sẵn sàng bay cao!
                </span>
              ) : (
                'Đặt cược ngay trước khi đồng hồ về 0!'
              )}
            </p>
          </div>
        )}

        {phase === 'FLYING' && (
          <div className="flex flex-col items-center animate-in fade-in duration-150">
            {/* Surprise Flight Event Banner */}
            {activeEvent && (
              <div className="mb-3 animate-in slide-in-from-top-3 duration-200">
                {activeEvent.type === 'COSMIC_AIRDROP' || activeEvent.type === 'LUCKY_ENVELOPE' ? (
                  !activeEvent.rewardClaimed ? (
                    <button
                      type="button"
                      onClick={() => onClaimEventReward?.(activeEvent)}
                      className={`px-4 py-2 rounded-xl font-black text-xs md:text-sm flex items-center gap-2 shadow-2xl transition-all hover:scale-105 active:scale-95 cursor-pointer border-2 animate-bounce ${
                        activeEvent.type === 'COSMIC_AIRDROP'
                          ? 'bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 text-slate-950 border-yellow-100 shadow-amber-500/50'
                          : 'bg-gradient-to-r from-red-600 via-rose-500 to-amber-500 text-white border-yellow-300 shadow-red-500/50'
                      }`}
                    >
                      <span className="text-base">{activeEvent.type === 'COSMIC_AIRDROP' ? '🎁' : '🧧'}</span>
                      <span>{activeEvent.title} (+{activeEvent.rewardAmount?.toLocaleString('vi-VN')} Xu)</span>
                      <span className="bg-slate-950/25 px-2 py-0.5 rounded text-[11px] font-black underline tracking-wide">
                        BẤM NHẬN!
                      </span>
                    </button>
                  ) : (
                    <div className="px-3.5 py-1.5 rounded-full bg-emerald-950/90 border border-emerald-400 text-emerald-300 text-xs font-bold flex items-center gap-1.5 shadow-md">
                      <span>✨ Đã nhận thành công +{activeEvent.rewardAmount?.toLocaleString('vi-VN')} Xu vào ví!</span>
                    </div>
                  )
                ) : (
                  <div
                    className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-2 border shadow-lg backdrop-blur-md animate-pulse ${
                      activeEvent.type === 'WARP_NITRO'
                        ? 'bg-purple-950/90 text-purple-300 border-purple-400 shadow-purple-500/40 ring-1 ring-purple-400/50'
                        : activeEvent.type === 'ALIEN_SHIELD'
                        ? 'bg-cyan-950/90 text-cyan-300 border-cyan-400 shadow-cyan-500/40 ring-1 ring-cyan-400/50'
                        : 'bg-red-950/90 text-red-300 border-red-500 shadow-red-500/50 ring-2 ring-red-500/60'
                    }`}
                  >
                    <span>
                      {activeEvent.type === 'WARP_NITRO' && '⚡'}
                      {activeEvent.type === 'ALIEN_SHIELD' && '🛡️'}
                      {activeEvent.type === 'ENGINE_OVERHEAT' && '⚠️'}
                    </span>
                    <span>{activeEvent.title}</span>
                  </div>
                )}
              </div>
            )}

            {/* Cosmic Stage Badge */}
            <div
              className="py-1 px-3 rounded-full text-xs font-bold tracking-wider mb-2 border backdrop-blur-md flex items-center gap-1.5 shadow-md"
              style={{
                backgroundColor: `${currentStage.color}20`,
                borderColor: `${currentStage.color}60`,
                color: currentStage.color,
              }}
            >
              <span>{currentStage.badge}</span>
              <span className="opacity-70">• {currentStage.name}</span>
            </div>

            <div
              className={`text-6xl md:text-8xl lg:text-9xl font-black font-display tracking-tight font-mono-numbers transition-all ${getMultiplierColor(
                multiplier
              )}`}
            >
              {multiplier.toFixed(2)}x
            </div>

            {/* Current user payout ticker if playing */}
            {userBet > 0 && !userCashedOut && (
              <div className="mt-3 py-1.5 px-4 rounded-full bg-slate-900/80 backdrop-blur-md border border-emerald-500/30 text-emerald-400 text-sm font-semibold flex items-center gap-1.5 shadow-md shadow-emerald-500/10">
                <span>Tiền nhận nếu dừng ngay:</span>
                <span className="font-mono-numbers text-base font-bold text-white">
                  +{(Math.floor(userBet * multiplier)).toLocaleString('vi-VN')} Xu
                </span>
              </div>
            )}

            {userCashedOut && userCashoutMultiplier && (
              <div className="mt-3 py-1 px-3.5 rounded-full bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-xs font-semibold">
                Đã chốt thành công tại {userCashoutMultiplier.toFixed(2)}x (+
                {Math.floor(userBet * userCashoutMultiplier).toLocaleString('vi-VN')} Xu)
              </div>
            )}
          </div>
        )}

        {phase === 'CRASHED' && (
          <div className="flex flex-col items-center animate-in zoom-in-90 duration-200">
            {shieldSavedBet ? (
              <div className="px-4 py-1.5 rounded-full bg-cyan-950/90 border border-cyan-400 text-cyan-300 text-xs font-bold tracking-wider uppercase mb-2 animate-bounce flex items-center gap-1.5">
                <span>🛡️ KHIÊN UFO HẤP THỤ VỤ NỔ: ĐÃ HOÀN 100% TIỀN CƯỢC!</span>
              </div>
            ) : (
              <div className="px-4 py-1 rounded-full bg-red-950/80 border border-red-500/50 text-red-400 text-xs font-bold tracking-wider uppercase mb-2">
                💥 BÙM! TÊN LỬA ĐÃ NỔ
              </div>
            )}

            <div className="text-6xl md:text-8xl lg:text-9xl font-black font-display tracking-tight text-red-500 font-mono-numbers drop-shadow-[0_0_35px_rgba(239,68,68,0.8)]">
              {(crashMultiplier || multiplier).toFixed(2)}x
            </div>
            <div className="mt-1 text-xs text-slate-400 flex items-center gap-1.5">
              <span>Đạt tầng:</span>
              <span className="font-bold text-slate-200">{currentStage.name}</span>
            </div>
            <p className="mt-2 text-xs text-slate-400 max-w-sm text-center">
              {shieldSavedBet ? (
                <span className="text-cyan-300 font-semibold">
                  May mắn có khiên năng lượng UFO che chở! Toàn bộ {userBet.toLocaleString('vi-VN')} Xu đã được bảo toàn và hoàn về ví!
                </span>
              ) : userBet > 0 && !userCashedOut ? (
                <span className="text-red-400 font-semibold">
                  Rất tiếc! Bạn chưa kịp dừng lại và mất {userBet.toLocaleString('vi-VN')} Xu.
                </span>
              ) : userCashedOut ? (
                <span className="text-emerald-400 font-semibold">
                  Tuyệt vời! Bạn đã chốt lời thành công trước khi tên lửa nổ.
                </span>
              ) : (
                'Vòng đấu kết thúc. Chuẩn bị ván mới!'
              )}
            </p>
          </div>
        )}
      </div>

      {/* Jackpot Pool HUD Banner */}
      <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 bg-gradient-to-r from-amber-950/90 via-slate-900/95 to-amber-950/90 border border-amber-500/60 rounded-full px-4 py-1.5 shadow-lg shadow-amber-500/20 backdrop-blur-md">
        <Trophy className="w-4 h-4 text-amber-400 animate-bounce" />
        <div className="flex items-center gap-1.5 text-xs">
          <span className="font-extrabold text-amber-300 tracking-wide uppercase text-[11px]">Hũ Jackpot:</span>
          <span className="font-mono-numbers font-black text-amber-400 text-sm drop-shadow-[0_0_8px_rgba(251,191,36,0.6)]">
            {(jackpotPool || 15850000).toLocaleString('vi-VN')}
          </span>
          <span className="text-[10px] font-bold text-amber-500">Xu</span>
        </div>
      </div>

      {/* Corner telemetry info */}
      <div className="absolute top-3 left-4 z-10 flex items-center gap-2 text-xs text-slate-400 font-mono-numbers">
        <span className="flex items-center gap-1.5">
          <span
            className={`w-2 h-2 rounded-full ${
              phase === 'FLYING'
                ? 'bg-emerald-500 animate-pulse'
                : phase === 'CRASHED'
                ? 'bg-red-500'
                : 'bg-amber-400'
            }`}
          />
          {phase === 'FLYING' ? 'ĐANG BAY' : phase === 'CRASHED' ? 'ĐÃ NỔ' : 'CHỜ PHÓNG'}
        </span>
      </div>

      <div className="absolute top-3 right-4 z-10 text-xs text-slate-400 font-mono-numbers hidden sm:flex items-center gap-2">
        <span className="text-slate-500 font-medium">Trang Phục:</span>
        <span className="text-amber-400 font-bold">{getSkinById(equippedSkinId || 'STANDARD').name}</span>
      </div>
    </div>
  );
};
