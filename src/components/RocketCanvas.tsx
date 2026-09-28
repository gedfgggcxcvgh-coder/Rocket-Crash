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
  cashedOutWonAmount?: number;
  crashMultiplier?: number;
  activeEvent?: ActiveFlightEvent | null;
  onClaimEventReward?: (event: ActiveFlightEvent) => void;
  shieldSavedBet?: boolean;
  equippedSkinId?: RocketSkinId;
  jackpotPool?: number;
  onOpenGarage?: () => void;
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

interface Shockwave {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  color: string;
  alpha: number;
}

export const RocketCanvas: React.FC<RocketCanvasProps> = ({
  phase,
  multiplier,
  countdown,
  userBet,
  userCashedOut,
  userCashoutMultiplier,
  cashedOutWonAmount,
  crashMultiplier,
  activeEvent,
  onClaimEventReward,
  shieldSavedBet,
  equippedSkinId,
  jackpotPool,
  onOpenGarage,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const starsRef = useRef<Star[]>([]);
  const warpLinesRef = useRef<WarpLine[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const shockwavesRef = useRef<Shockwave[]>([]);
  const shakeRef = useRef<{ x: number; y: number; intensity: number }>({ x: 0, y: 0, intensity: 0 });
  const prevPhaseRef = useRef<GamePhase>(phase);
  const prevCashedOutRef = useRef<boolean>(userCashedOut);
  const lastMilestoneRef = useRef<number>(1);

  // Synchronized refs for continuous, stutter-free 60/120 FPS canvas loop
  const phaseRef = useRef<GamePhase>(phase);
  const multiplierRef = useRef<number>(multiplier);
  const countdownRef = useRef<number>(countdown);
  const userBetRef = useRef<number>(userBet);
  const userCashedOutRef = useRef<boolean>(userCashedOut);
  const userCashoutMultiplierRef = useRef<number | undefined>(userCashoutMultiplier);
  const crashMultiplierRef = useRef<number | undefined>(crashMultiplier);
  const activeEventRef = useRef<ActiveFlightEvent | null | undefined>(activeEvent);
  const equippedSkinIdRef = useRef<RocketSkinId | undefined>(equippedSkinId);

  phaseRef.current = phase;
  multiplierRef.current = multiplier;
  countdownRef.current = countdown;
  userBetRef.current = userBet;
  userCashedOutRef.current = userCashedOut;
  userCashoutMultiplierRef.current = userCashoutMultiplier;
  crashMultiplierRef.current = crashMultiplier;
  activeEventRef.current = activeEvent;
  equippedSkinIdRef.current = equippedSkinId;

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
        const rect = canvas.getBoundingClientRect();
        const w = rect.width;
        const h = rect.height;
        const rocketPos = getRocketPosition(multiplier, w, h);
        
        shakeRef.current.intensity = 30;

        // Big fiery explosion shockwave ring
        shockwavesRef.current.push({
          x: rocketPos.x,
          y: rocketPos.y,
          radius: 12,
          maxRadius: Math.min(w * 0.45, 240),
          color: '#EF4444',
          alpha: 1.0,
        });

        // Explosion particle color matching equipped skin
        const skin = getSkinById(equippedSkinId || 'STANDARD');
        const colors = [...skin.particleColorHex, '#FFFFFF', '#EF4444', '#F97316'];

        for (let i = 0; i < 160; i++) {
          const angle = Math.random() * Math.PI * 2;
          const speed = Math.random() * 12 + 2;
          const pType = equippedSkinId === 'DRAGONFIRE' && Math.random() > 0.5 ? 'star' : 'explosion';

          particlesRef.current.push({
            x: rocketPos.x,
            y: rocketPos.y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            life: 1,
            maxLife: Math.random() * 50 + 30,
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
    if (phaseRef.current === 'COUNTDOWN') {
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
      const curPhase = phaseRef.current;
      const curMult = multiplierRef.current;
      const curCountdown = countdownRef.current;
      const curSkinId = equippedSkinIdRef.current || 'STANDARD';
      const curEvent = activeEventRef.current;

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
      } else if (curPhase === 'FLYING' && curMult > 4) {
        const subtleTremble = Math.min((curMult - 4) * 0.35, 4.0);
        offsetX = (Math.random() - 0.5) * subtleTremble;
        offsetY = (Math.random() - 0.5) * subtleTremble;
      }

      ctx.save();
      ctx.translate(offsetX, offsetY);

      // 1. Deep Space Canvas Background
      ctx.fillStyle = '#060a13';
      ctx.fillRect(-20, -20, w + 40, h + 40);

      // Cosmic Atmosphere Gradient based on multiplier
      drawCosmicNebula(ctx, w, h, curMult, curSkinId);

      // 2. Celestial background bodies (Earth, Moon, Mars)
      drawCelestialBodies(ctx, w, h, curMult);

      // 3. Stars rendering with parallax speed
      const starSpeedFactor = curPhase === 'FLYING' ? Math.min(1 + Math.log(curMult) * 2.2, 10) : 0.4;
      ctx.fillStyle = '#ffffff';
      starsRef.current.forEach(star => {
        if (curPhase === 'FLYING') {
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
      if (curPhase === 'FLYING' && curMult >= 25) {
        drawWarpLines(ctx, w, h, curMult);
      }

      // 4. Grid & Telemetry Altitude Scale
      drawGrid(ctx, w, h, curMult);

      // 5. Trajectory Path & Custom Thruster Particles
      const rocketPos = getRocketPosition(curMult, w, h);

      // Milestone Sonic Boom Detection
      if (curPhase === 'COUNTDOWN') {
        lastMilestoneRef.current = 1;
      } else if (curPhase === 'FLYING') {
        const milestones = [2, 5, 10, 25, 50, 100, 250, 500];
        for (const m of milestones) {
          if (curMult >= m && lastMilestoneRef.current < m) {
            lastMilestoneRef.current = m;
            shockwavesRef.current.push({
              x: rocketPos.x,
              y: rocketPos.y,
              radius: 12,
              maxRadius: Math.min(w * 0.4, 200),
              color: m >= 50 ? '#FBBF24' : m >= 10 ? '#C084FC' : m >= 5 ? '#34D399' : '#38BDF8',
              alpha: 0.95,
            });
            break;
          }
        }
      }

      // Draw expanding sonic boom shockwaves
      for (let i = shockwavesRef.current.length - 1; i >= 0; i--) {
        const sw = shockwavesRef.current[i];
        sw.radius += 5.5;
        sw.alpha *= 0.93;
        if (sw.alpha <= 0.02 || sw.radius >= sw.maxRadius) {
          shockwavesRef.current.splice(i, 1);
          continue;
        }
        ctx.save();
        ctx.strokeStyle = sw.color;
        ctx.globalAlpha = sw.alpha;
        ctx.lineWidth = 3;
        ctx.shadowColor = sw.color;
        ctx.shadowBlur = 16;
        ctx.beginPath();
        ctx.arc(sw.x, sw.y, sw.radius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      if (curPhase === 'FLYING') {
        drawTrajectory(ctx, w, h, rocketPos, curMult, curSkinId);

        // Spawn custom rocket thruster particles based on equipped skin
        const exhaustX = rocketPos.x - Math.cos(rocketPos.angle) * 24;
        const exhaustY = rocketPos.y - Math.sin(rocketPos.angle) * 24;

        const skin = getSkinById(curSkinId);
        const pColors = skin.particleColorHex;

        // Custom particle generation per skin
        for (let i = 0; i < 4; i++) {
          const spread = (Math.random() - 0.5) * 0.45;
          const pAngle = rocketPos.angle + Math.PI + spread;
          const pSpeed = Math.random() * 4.5 + 2;

          let particleType: 'flame' | 'star' | 'ring' | 'spark' = 'flame';
          if (curSkinId === 'DRAGONFIRE' && Math.random() > 0.4) {
            particleType = 'star';
          } else if (curSkinId === 'UFO_ALIEN' && Math.random() > 0.6) {
            particleType = 'ring';
          } else if (curSkinId === 'CYBERPUNK' && Math.random() > 0.5) {
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
            color: curSkinId === 'CYBERPUNK' ? 'rgba(168, 85, 247, 0.25)' : 'rgba(148, 163, 184, 0.35)',
            type: 'smoke',
          });
        }
      }

      // 6. Update & draw particles
      updateAndDrawParticles(ctx);

      // 7. Draw Active Event Visuals
      if (curEvent && curPhase === 'FLYING') {
        if (curEvent.type === 'WARP_NITRO') {
          drawWarpLines(ctx, w, h, 95);
        } else if (curEvent.type === 'ENGINE_OVERHEAT') {
          const alpha = (0.5 + 0.5 * Math.sin(Date.now() * 0.012)) * 0.45;
          ctx.save();
          ctx.strokeStyle = `rgba(239, 68, 68, ${alpha})`;
          ctx.lineWidth = 14;
          ctx.strokeRect(0, 0, w, h);
          ctx.restore();
        } else if (curEvent.type === 'COSMIC_AIRDROP') {
          drawCosmicCrate(ctx, w, h);
        } else if (curEvent.type === 'LUCKY_ENVELOPE') {
          drawLuckyEnvelope(ctx, w, h);
        } else if (curEvent.type === 'BLACK_HOLE_GRAVITY') {
          drawBlackHole(ctx, w, h);
        } else if (curEvent.type === 'VIP_DIAMOND_CHEST') {
          drawDiamondChest(ctx, w, h);
        } else if (curEvent.type === 'COSMIC_JACKPOT_RAIN') {
          drawShootingStars(ctx, w, h);
        } else if (curEvent.type === 'SOLAR_FLARE_BOOST') {
          drawSolarFlare(ctx, w, h);
        }
      }

      // 8. Draw Custom Rocket Ship Model
      if (curPhase !== 'CRASHED') {
        drawRocket(ctx, rocketPos.x, rocketPos.y, rocketPos.angle, curPhase === 'FLYING', curMult, curSkinId);

        // Draw Alien Shield bubble if active
        if (curEvent && curEvent.type === 'ALIEN_SHIELD' && curPhase === 'FLYING') {
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
  }, []);

  // Cosmic Nebula atmosphere
  function drawCosmicNebula(ctx: CanvasRenderingContext2D, w: number, h: number, mult: number, skinId: RocketSkinId = 'STANDARD') {
    const skin = getSkinById(skinId);
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

  // Draw aerospace telemetry coordinate grid with active altitude scale
  function drawGrid(ctx: CanvasRenderingContext2D, w: number, h: number, curMult: number = 1.0) {
    ctx.save();

    // Altitude telemetry levels
    const altitudeLevels = [
      { mult: 50.0, label: '50.0x', yRatio: 0.18 },
      { mult: 20.0, label: '20.0x', yRatio: 0.30 },
      { mult: 10.0, label: '10.0x', yRatio: 0.42 },
      { mult: 5.0,  label: '5.0x',  yRatio: 0.54 },
      { mult: 2.0,  label: '2.0x',  yRatio: 0.66 },
      { mult: 1.2,  label: '1.2x',  yRatio: 0.78 },
    ];

    altitudeLevels.forEach(lvl => {
      const y = h * lvl.yRatio;
      const isReached = curMult >= lvl.mult;

      ctx.beginPath();
      ctx.strokeStyle = isReached ? 'rgba(56, 189, 248, 0.28)' : 'rgba(51, 65, 85, 0.15)';
      ctx.lineWidth = isReached ? 1.2 : 0.8;
      ctx.setLineDash([4, 6]);
      ctx.moveTo(w * 0.05, y);
      ctx.lineTo(w * 0.92, y);
      ctx.stroke();
      ctx.setLineDash([]);

      // Right-side telemetry pill
      ctx.font = 'bold 10px monospace';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      if (isReached) {
        ctx.fillStyle = lvl.mult >= 20 ? '#C084FC' : lvl.mult >= 10 ? '#38BDF8' : '#34D399';
        ctx.shadowColor = ctx.fillStyle;
        ctx.shadowBlur = 8;
      } else {
        ctx.fillStyle = '#475569';
        ctx.shadowBlur = 0;
      }
      ctx.fillText(lvl.label, w * 0.97, y);
      ctx.shadowBlur = 0;
    });

    // Launch ground baseline
    ctx.strokeStyle = 'rgba(71, 85, 105, 0.5)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(w * 0.05, h * 0.86);
    ctx.lineTo(w * 0.95, h * 0.86);
    ctx.stroke();

    // Launch pad indicator
    ctx.fillStyle = '#1E293B';
    ctx.fillRect(w * 0.08, h * 0.855, w * 0.10, 5);
    const pulseLight = Math.sin(Date.now() * 0.005) > 0 ? '#10B981' : '#059669';
    ctx.fillStyle = pulseLight;
    ctx.beginPath();
    ctx.arc(w * 0.09, h * 0.84, 2.5, 0, Math.PI * 2);
    ctx.arc(w * 0.17, h * 0.84, 2.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  // Draw glowing trajectory ribbon
  function drawTrajectory(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    rocketPos: { x: number; y: number },
    mult: number,
    skinId: RocketSkinId = 'STANDARD'
  ) {
    const startX = w * 0.12;
    const startY = h * 0.82;

    const skin = getSkinById(skinId);
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
    mult: number,
    skinId: RocketSkinId = 'STANDARD'
  ) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);

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

  // Draw Swirling Black Hole Void
  function drawBlackHole(ctx: CanvasRenderingContext2D, w: number, h: number) {
    ctx.save();
    const bx = w * 0.65;
    const by = h * 0.32;
    const t = Date.now() * 0.003;

    const grad = ctx.createRadialGradient(bx, by, 10, bx, by, 75);
    grad.addColorStop(0, '#000000');
    grad.addColorStop(0.3, 'rgba(168, 85, 247, 0.8)');
    grad.addColorStop(0.7, 'rgba(6, 182, 212, 0.4)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(bx, by, 75, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#000000';
    ctx.shadowColor = '#C084FC';
    ctx.shadowBlur = 20;
    ctx.beginPath();
    ctx.arc(bx, by, 22, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#22D3EE';
    ctx.lineWidth = 1.8;
    for (let i = 0; i < 3; i++) {
      const angle = t + (i * Math.PI * 2) / 3;
      ctx.beginPath();
      ctx.arc(bx, by, 38 + Math.sin(t * 2 + i) * 6, angle, angle + Math.PI * 0.8);
      ctx.stroke();
    }
    ctx.restore();
  }

  // Draw Royal Diamond Chest
  function drawDiamondChest(ctx: CanvasRenderingContext2D, w: number, h: number) {
    if (activeEvent?.rewardClaimed) return;
    ctx.save();
    const t = Date.now() * 0.002;
    const cx = w * 0.52 + Math.sin(t) * (w * 0.12);
    const cy = h * 0.28 + Math.cos(t * 1.3) * (h * 0.06);

    ctx.strokeStyle = 'rgba(103, 232, 249, 0.35)';
    ctx.lineWidth = 2;
    for (let i = 0; i < 8; i++) {
      const angle = t * 0.5 + (i * Math.PI) / 4;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(angle) * 45, cy + Math.sin(angle) * 45);
      ctx.stroke();
    }

    const chestGrad = ctx.createLinearGradient(cx - 16, cy - 12, cx + 16, cy + 12);
    chestGrad.addColorStop(0, '#0284C7');
    chestGrad.addColorStop(0.5, '#38BDF8');
    chestGrad.addColorStop(1, '#0369A1');

    ctx.fillStyle = chestGrad;
    ctx.shadowColor = '#38BDF8';
    ctx.shadowBlur = 22;
    ctx.fillRect(cx - 16, cy - 12, 32, 26);

    ctx.fillStyle = '#F59E0B';
    ctx.fillRect(cx - 16, cy - 3, 32, 6);

    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.moveTo(cx, cy - 6);
    ctx.lineTo(cx + 6, cy);
    ctx.lineTo(cx, cy + 6);
    ctx.lineTo(cx - 6, cy);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }

  // Draw Shooting Stars Rain
  function drawShootingStars(ctx: CanvasRenderingContext2D, w: number, h: number) {
    ctx.save();
    const t = Date.now() * 0.003;
    ctx.strokeStyle = '#FCD34D';
    ctx.lineWidth = 2;
    ctx.shadowColor = '#F59E0B';
    ctx.shadowBlur = 12;

    for (let i = 0; i < 6; i++) {
      const progress = ((t * 0.8 + i * 0.18) % 1.0);
      const sx = w * 0.85 - progress * (w * 0.8);
      const sy = h * 0.1 + progress * (h * 0.7);

      ctx.globalAlpha = Math.sin(progress * Math.PI);
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(sx + 30, sy - 20);
      ctx.stroke();

      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(sx, sy, 3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  // Draw Solar Flare Wave
  function drawSolarFlare(ctx: CanvasRenderingContext2D, w: number, h: number) {
    ctx.save();
    const sx = w * 0.85;
    const sy = h * 0.15;
    const pulse = 1 + 0.1 * Math.sin(Date.now() * 0.01);

    const grad = ctx.createRadialGradient(sx, sy, 20, sx, sy, 160 * pulse);
    grad.addColorStop(0, 'rgba(254, 240, 138, 0.45)');
    grad.addColorStop(0.4, 'rgba(245, 158, 11, 0.25)');
    grad.addColorStop(0.8, 'rgba(239, 68, 68, 0.12)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
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
    <div className="relative w-full h-[290px] xs:h-[330px] sm:h-[380px] md:h-[480px] bg-slate-950 rounded-2xl overflow-hidden border border-slate-800 shadow-2xl flex items-center justify-center select-none">
      {/* Canvas */}
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full block" />

      {/* Center HUD: Multiplier or Countdown */}
      <div className="relative z-10 flex flex-col items-center pointer-events-none px-4 text-center">
        {phase === 'COUNTDOWN' && (
          <div className="flex flex-col items-center animate-in fade-in zoom-in-95 duration-200">
            <span className="text-xs uppercase tracking-widest text-slate-400 font-semibold mb-2">
              Chuẩn bị phóng trong
            </span>
            <div className="relative flex items-center justify-center w-28 h-28">
              {/* Single, smooth SVG Progress Gauge */}
              <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r="42"
                  className="stroke-slate-800/80"
                  strokeWidth="5"
                  fill="rgba(15, 23, 42, 0.75)"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="42"
                  className="stroke-amber-400 transition-all duration-100 ease-linear"
                  strokeWidth="5"
                  fill="none"
                  strokeDasharray={263.89}
                  strokeDashoffset={263.89 * (1 - Math.max(0, Math.min(1, countdown / 5.0)))}
                  strokeLinecap="round"
                  style={{ filter: 'drop-shadow(0 0 8px rgba(251, 191, 36, 0.7))' }}
                />
              </svg>
              <span className="absolute text-3xl font-display font-black text-amber-400 font-mono-numbers drop-shadow-md">
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
          <div className="flex flex-col items-center animate-in fade-in duration-150 pointer-events-auto">
            {/* Surprise Flight Event Banner */}
            {activeEvent && (
              <div className="mb-3 animate-in slide-in-from-top-3 duration-200 pointer-events-auto z-30">
                {activeEvent.type === 'COSMIC_AIRDROP' ||
                activeEvent.type === 'LUCKY_ENVELOPE' ||
                activeEvent.type === 'COSMIC_JACKPOT_RAIN' ||
                activeEvent.type === 'VIP_DIAMOND_CHEST' ? (
                  !activeEvent.rewardClaimed ? (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (activeEvent && onClaimEventReward) {
                          onClaimEventReward(activeEvent);
                        }
                      }}
                      className={`px-5 py-2.5 rounded-xl font-black text-xs md:text-sm flex items-center gap-2 shadow-2xl transition-all hover:scale-110 active:scale-95 cursor-pointer border-2 animate-bounce pointer-events-auto z-30 select-none ${
                        activeEvent.type === 'VIP_DIAMOND_CHEST'
                          ? 'bg-gradient-to-r from-cyan-500 via-sky-400 to-blue-600 text-white border-cyan-200 shadow-cyan-500/80 hover:brightness-125'
                          : activeEvent.type === 'COSMIC_JACKPOT_RAIN'
                          ? 'bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 text-slate-950 border-yellow-100 shadow-amber-500/80 hover:brightness-125'
                          : activeEvent.type === 'COSMIC_AIRDROP'
                          ? 'bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-600 text-white border-emerald-200 shadow-emerald-500/80 hover:brightness-125'
                          : 'bg-gradient-to-r from-red-600 via-rose-500 to-amber-500 text-white border-yellow-300 shadow-red-500/80 hover:brightness-125'
                      }`}
                    >
                      <span className="text-lg">
                        {activeEvent.type === 'VIP_DIAMOND_CHEST' && '💎'}
                        {activeEvent.type === 'COSMIC_JACKPOT_RAIN' && '⭐'}
                        {activeEvent.type === 'COSMIC_AIRDROP' && '🎁'}
                        {activeEvent.type === 'LUCKY_ENVELOPE' && '🧧'}
                      </span>
                      <span className="font-bold">{activeEvent.title} (+{activeEvent.rewardAmount?.toLocaleString('vi-VN')} Xu)</span>
                      <span className="bg-slate-950/40 px-2.5 py-1 rounded-lg text-[11px] font-black underline tracking-wider uppercase text-yellow-300 border border-yellow-400/30">
                        BẤM NHẬN!
                      </span>
                    </button>
                  ) : (
                    <div className="px-4 py-2 rounded-full bg-emerald-950/90 border border-emerald-400 text-emerald-300 text-xs font-bold flex items-center gap-1.5 shadow-lg pointer-events-auto">
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
                        : activeEvent.type === 'BLACK_HOLE_GRAVITY'
                        ? 'bg-slate-950/90 text-purple-300 border-purple-500 shadow-purple-500/50 ring-2 ring-purple-500/60'
                        : activeEvent.type === 'SOLAR_FLARE_BOOST'
                        ? 'bg-amber-950/90 text-amber-300 border-amber-400 shadow-amber-500/50 ring-1 ring-amber-400/50'
                        : 'bg-red-950/90 text-red-300 border-red-500 shadow-red-500/50 ring-2 ring-red-500/60'
                    }`}
                  >
                    <span>
                      {activeEvent.type === 'WARP_NITRO' && '⚡'}
                      {activeEvent.type === 'ALIEN_SHIELD' && '🛡️'}
                      {activeEvent.type === 'ENGINE_OVERHEAT' && '⚠️'}
                      {activeEvent.type === 'BLACK_HOLE_GRAVITY' && '🕳️'}
                      {activeEvent.type === 'SOLAR_FLARE_BOOST' && '☀️'}
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

            {/* Current user payout ticker if actively flying without cashout */}
            {userBet > 0 && !userCashedOut && (
              <div className="mt-3 py-1.5 px-4 rounded-full bg-slate-900/80 backdrop-blur-md border border-emerald-500/30 text-emerald-400 text-sm font-semibold flex items-center gap-1.5 shadow-md shadow-emerald-500/10">
                <span>Tiền nhận nếu dừng ngay:</span>
                <span className="font-mono-numbers text-base font-bold text-white">
                  +{(Math.floor(userBet * multiplier)).toLocaleString('vi-VN')} Xu
                </span>
              </div>
            )}

            {/* Small compact pill celebration badge when user has cashed out */}
            {userCashedOut && (
              <div className="mt-2.5 py-1 px-3.5 rounded-full bg-emerald-950/85 backdrop-blur-sm border border-emerald-500/40 text-emerald-300 text-xs font-semibold flex items-center gap-1.5 shadow-sm">
                <span>✨ Đã chốt thành công tại</span>
                {userCashoutMultiplier && (
                  <span className="font-mono-numbers font-bold text-white">
                    {userCashoutMultiplier.toFixed(2)}x
                  </span>
                )}
                <span className="text-emerald-400 font-bold">
                  (+{((cashedOutWonAmount || (userCashoutMultiplier ? Math.floor(userBet * userCashoutMultiplier) : 0))).toLocaleString('vi-VN')} Xu)
                </span>
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
                  🎉 Tuyệt vời! Bạn đã chốt lời an toàn (+{((cashedOutWonAmount || (userCashoutMultiplier ? Math.floor(userBet * userCashoutMultiplier) : 0))).toLocaleString('vi-VN')} Xu) trước khi tên lửa nổ.
                </span>
              ) : (
                'Vòng đấu kết thúc. Chuẩn bị ván mới!'
              )}
            </p>
          </div>
        )}
      </div>

      {/* Top HUD Header inside Rocket Arena: Clean, Responsive Flex Layout */}
      <div className="absolute top-2.5 inset-x-2.5 sm:inset-x-4 z-20 flex items-center justify-between gap-1.5 sm:gap-3 pointer-events-none">
        {/* Left: Status badge */}
        <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-slate-900/85 border border-slate-800 text-[11px] text-slate-300 font-mono-numbers backdrop-blur-md shrink-0 shadow-sm">
          <span
            className={`w-2 h-2 rounded-full ${
              phase === 'FLYING'
                ? 'bg-emerald-500 animate-pulse'
                : phase === 'CRASHED'
                ? 'bg-red-500'
                : 'bg-amber-400 animate-pulse'
            }`}
          />
          <span className="font-bold">
            {phase === 'FLYING' ? 'ĐANG BAY' : phase === 'CRASHED' ? 'ĐÃ NỔ' : 'CHỜ PHÓNG'}
          </span>
        </div>

        {/* Center: Jackpot Pool Capsule */}
        <div className="flex items-center gap-1 sm:gap-1.5 bg-gradient-to-r from-amber-950/90 via-slate-900/95 to-amber-950/90 border border-amber-500/60 rounded-full px-2.5 sm:px-3.5 py-1 shadow-md shadow-amber-500/15 backdrop-blur-md min-w-0">
          <Trophy className="w-3.5 h-3.5 text-amber-400 shrink-0 animate-bounce" />
          <div className="flex items-center gap-1 text-[11px] sm:text-xs truncate">
            <span className="font-extrabold text-amber-300 uppercase hidden xs:inline">Hũ:</span>
            <span className="font-mono-numbers font-black text-amber-400 text-xs sm:text-sm drop-shadow-[0_0_8px_rgba(251,191,36,0.6)]">
              {(jackpotPool || 18500000).toLocaleString('vi-VN')}
            </span>
            <span className="text-[10px] font-bold text-amber-500">Xu</span>
          </div>
        </div>

        {/* Right: Gara Button */}
        <button
          type="button"
          onClick={onOpenGarage}
          className="pointer-events-auto flex items-center gap-1 px-2 sm:px-2.5 py-1 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 hover:border-amber-500/60 text-xs text-amber-300 font-bold shadow-md active:scale-95 transition-all cursor-pointer backdrop-blur-md shrink-0"
          title="Mở Gara & Đổi Skin Tên Lửa"
        >
          <span className="text-sm">{getSkinById(equippedSkinId || 'STANDARD').icon}</span>
          <span className="text-[10px] bg-amber-500/20 text-amber-400 px-1 py-0.2 rounded font-black border border-amber-500/30">
            GARA
          </span>
        </button>
      </div>
    </div>
  );
};
