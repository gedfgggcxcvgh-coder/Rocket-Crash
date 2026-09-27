/**
 * Provably Fair Crash Algorithm Simulation
 * Allows transparent mathematical verification of any crash round
 */

import { FlightMode } from '../types/game';

// Simple SHA-256 hash generator in browser Web Crypto API
export async function sha256(message: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export function generateSeed(): string {
  const chars = '0123456789abcdef';
  let seed = '';
  for (let i = 0; i < 32; i++) {
    seed += chars[Math.floor(Math.random() * chars.length)];
  }
  return seed;
}

export interface CosmicStage {
  name: string;
  badge: string;
  color: string;
  min: number;
}

export const COSMIC_STAGES: CosmicStage[] = [
  { min: 1.0, name: 'Khí Quyển Trái Đất', badge: '🌍 Troposphere', color: '#60A5FA' },
  { min: 2.5, name: 'Quỹ Đạo Trái Đất', badge: '🛰️ Low Orbit', color: '#38BDF8' },
  { min: 6.0, name: 'Hành Trình Mặt Trăng', badge: '🌕 Lunar Transit', color: '#FBBF24' },
  { min: 18.0, name: 'Quỹ Đạo Sao Hỏa', badge: '🔴 Mars Approach', color: '#F97316' },
  { min: 50.0, name: 'Vành Đai Thiên Thạch', badge: '☄️ Asteroid Belt', color: '#A855F7' },
  { min: 120.0, name: 'Vũ Trụ Siêu Quang', badge: '🌌 Deep Galaxy Warp', color: '#EC4899' },
  { min: 300.0, name: 'Kỳ Tích Siêu Tân Tinh', badge: '✨ Supernova Jackpot', color: '#EAB308' },
];

export function getAltitudeStage(multiplier: number): CosmicStage {
  let stage = COSMIC_STAGES[0];
  for (const s of COSMIC_STAGES) {
    if (multiplier >= s.min) {
      stage = s;
    }
  }
  return stage;
}

/**
 * Calculates multiplier from seed and hash.
 * Balanced thrill curve: includes unexpected early crashes (1.05x - 1.85x)
 * to keep players on edge, mixed with solid climbs and big cosmic moonshots!
 */
export function calculateMultiplier(seed: string, mode: FlightMode = 'HIGH_FLYER'): number {
  let hashVal = 0;
  for (let i = 0; i < seed.length; i++) {
    hashVal = (hashVal * 31 + seed.charCodeAt(i)) & 0xffffffff;
  }
  // Float between 0.00000 and 0.99999
  const r = (Math.abs(hashVal) % 100000) / 100000;

  let multiplier: number;

  if (mode === 'HIGH_FLYER') {
    // HIGH_FLYER MODE (Balanced Suspense & Thrill):
    // ~5.0% Cú sốc nổ sớm ngay khi vừa nhấc bổng (1.05x - 1.25x) - tạo kịch tính thót tim!
    // ~16.0% Nổ tầm thấp bất ngờ (1.26x - 1.88x) - thử thách lòng tham người chơi
    // ~38.0% Bay đầm, tầm trung đẹp (1.89x - 4.80x) - vùng chốt lời phổ biến
    // ~23.0% Bay cao vượt khí quyển (4.81x - 14.50x)
    // ~12.0% Lên quỹ đạo sâu (14.51x - 45.00x)
    // ~6.0% Siêu bão Moonshot (45.00x - 250.00x+)
    if (r < 0.05) {
      // Nổ chớp nhoáng 1.05x - 1.25x
      const p = r / 0.05;
      multiplier = 1.05 + p * 0.20;
    } else if (r < 0.21) {
      // Nổ sớm 1.26x - 1.88x
      const p = (r - 0.05) / 0.16;
      multiplier = 1.26 + p * 0.62;
    } else if (r < 0.59) {
      // Tầm trung 1.89x - 4.80x
      const p = (r - 0.21) / 0.38;
      multiplier = 1.89 + Math.pow(p, 1.15) * 2.91;
    } else if (r < 0.82) {
      // Bay cao 4.81x - 14.50x
      const p = (r - 0.59) / 0.23;
      multiplier = 4.81 + Math.pow(p, 1.25) * 9.69;
    } else if (r < 0.94) {
      // Quỹ đạo sâu 14.51x - 45.00x
      const p = (r - 0.82) / 0.12;
      multiplier = 14.51 + Math.pow(p, 1.35) * 30.49;
    } else {
      // Moonshot 45.00x - 288.00x
      const p = (r - 0.94) / 0.06;
      multiplier = 45.00 + Math.pow(p, 1.5) * 243.00;
    }
  } else if (mode === 'MOONSHOT') {
    // SĂN MOONSHOT x100+ MODE:
    // Tỉ lệ nổ sớm ~24% để tăng tính rủi ro, nhưng khi bay được thì bứt phá cực mạnh
    if (r < 0.08) {
      multiplier = 1.08 + (r / 0.08) * 0.35; // 1.08x - 1.43x
    } else if (r < 0.25) {
      multiplier = 1.45 + ((r - 0.08) / 0.17) * 1.55; // 1.45x - 3.00x
    } else if (r < 0.55) {
      const p = (r - 0.25) / 0.30;
      multiplier = 3.00 + Math.pow(p, 1.2) * 12.0; // 3.00x - 15.00x
    } else if (r < 0.82) {
      const p = (r - 0.55) / 0.27;
      multiplier = 15.00 + Math.pow(p, 1.35) * 55.0; // 15.00x - 70.00x
    } else {
      const p = (r - 0.82) / 0.18;
      multiplier = 70.00 + Math.pow(p, 1.5) * 430.0; // 70.00x - 500.00x
    }
  } else {
    // CLASSIC BALANCED MODE:
    // Chuẩn sòng: ~8% nổ sát nút 1.05x-1.30x, đường cong house edge tiêu chuẩn
    if (r < 0.08) {
      multiplier = 1.05 + (r / 0.08) * 0.25;
    } else {
      const houseEdge = 0.95;
      const raw = houseEdge / (1 - r);
      multiplier = Math.max(1.15, Math.min(raw, 250.00));
    }
  }

  return parseFloat(multiplier.toFixed(2));
}
