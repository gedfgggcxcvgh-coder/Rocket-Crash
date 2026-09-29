import { ComCutBoss, ComCutBetType, ComCutActiveEvent, ComCutEventType } from '../types/game';

export const COMCUT_BOSSES: ComCutBoss[] = [
  {
    id: 'son_nontay',
    name: 'Sơn_NonTay',
    avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=SonNonTay',
    title: 'Tập Sự Lắc Bát 🥄',
    difficulty: 'DỄ',
    quote: 'Đố ông bắt được cầu Cơm của tui đấy! Đánh nhỏ 50k - 200k thôi nha!',
    icon: '🥄',
    border: 'border-emerald-500/60',
    glow: 'shadow-emerald-500/20',
    recommendedWagers: [50000, 100000, 200000],
    preferredSide: 'CUT',
    trashTalk: {
      pick: [
        'Tui chọn cửa này, ông dám theo ngược lại không? 😜',
        'Cầu này linh cảm mách bảo chuẩn bài luôn nè!',
      ],
      win: [
        'Hehe non tay nhưng húp trọn bát nha! Cảm ơn người anh em! 🍚✨',
        'Thấy chưa! Lắc bát cũng cần cái duyên đấy ông giáo ạ!',
      ],
      lose: [
        'Ủa alo?? Sao xúc xắc nó lộn tèo leo vậy nè trời! 😭',
        'Cay quá má ơi, ván sau tui phục thù gấp đôi!',
      ],
    },
  },
  {
    id: 'thay_boi',
    name: 'Thầy_Bói_RaCầu',
    avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=ThayBoi',
    title: 'Thần Số Bát Quái 🔮',
    difficulty: 'VỪA',
    quote: 'Quẻ bát quái hôm nay hiển linh, cầu bệt 4 tay Cơm chắc nịch vào tiền!',
    icon: '🔮',
    border: 'border-cyan-500/60',
    glow: 'shadow-cyan-500/25',
    recommendedWagers: [200000, 500000, 1000000],
    preferredSide: 'COM',
    trashTalk: {
      pick: [
        'Quẻ dịch số 9: Trời tròn đất vuông, ván này ắt sinh tài lộc! ☯️',
        'Bát quái xoay vần, cửa này ánh kim quang tỏa sáng!',
      ],
      win: [
        'Thầy phán cấm có trật! Mau quỳ lạy thần tài đi thí chủ! 🔮🙏',
        'Húp trọn hũ bát quái! Phong thủy hôm nay trợ mạng thầy!',
      ],
      lose: [
        'Âm dương đảo điên, có kẻ phá quẻ làm nhiễu loạn từ trường rồi! 🌀',
        'Khà khà, quẻ lỡ chút xíu, ván sau chân lý sẽ sáng tỏ!',
      ],
    },
  },
  {
    id: 'tuan_becau',
    name: 'Tuấn_BẻCầu',
    avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=TuanBeCau',
    title: 'Sát Thủ Đảo Kèo ⚡',
    difficulty: 'KHÓ',
    quote: 'Càng bệt dài tao càng bẻ ngược! Đố mày gồng qua nổi 3 hiệp!',
    icon: '⚡',
    border: 'border-amber-500/70',
    glow: 'shadow-amber-500/30',
    recommendedWagers: [500000, 1000000, 2500000],
    preferredSide: 'RANDOM',
    trashTalk: {
      pick: [
        'Cầu bệt à? Bố mày bẻ gãy cổ luôn! Xem ai lì hơn ai! 🥊',
        'Đi theo lối mòn thì chỉ có húp cứt, tao đi cửa bất ngờ!',
      ],
      win: [
        'Bẻ ngọt xớt! Đã bảo non tay thì đừng vào sới của Tuấn này! ⚡🔥',
        'Tiền về túi tao! Bẻ cầu là một nghệ thuật mà mày chưa đủ tuổi!',
      ],
      lose: [
        'Đù má gãy tay thật rồi... Cầu này bị ma ám à? 💀',
        'Được lắm, hiệp sau tao khô máu cho mày biết tay!',
      ],
    },
  },
  {
    id: 'than_com_bao',
    name: 'Thần_Cơm_Bão_x30',
    avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=ComBao',
    title: 'Thợ Săn Bão Tam Hoa 🌪️',
    difficulty: 'CAO THỦ',
    quote: 'Chơi Cơm Cứt mà không săn Bão thì về nhà bú sữa mẹ đi con trai!',
    icon: '🌪️',
    border: 'border-purple-500/80',
    glow: 'shadow-purple-500/35',
    recommendedWagers: [1000000, 2500000, 5000000],
    preferredSide: 'BAO',
    trashTalk: {
      pick: [
        'Mùi bão bốc lên nồng nặc rồi! Một phát x30 đổi đời luôn! 🌪️💎',
        'Bát rung kiểu này tam hoa chuẩn bị xuất thế, mày theo không kịp đâu!',
      ],
      win: [
        'BÃO VỀ RỒI HÁ HÁ!! Húp sạch sành sanh cả vốn lẫn lời! 🌪️👑',
        'Đẳng cấp thợ săn bão! Tiền đè chết người là có thật!',
      ],
      lose: [
        'Hụt một nút bão cay dái thật! Không sao, chí lớn không sợ thua vặt!',
        'Bão đang tích tụ năng lượng thôi, lần tới mày sẽ khóc thét!',
      ],
    },
  },
  {
    id: 'anh_ba_baosan',
    name: 'AnhBa_BaoSàn',
    avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=AnhBa',
    title: 'Bá Chủ Bát Vàng Vũ Trụ 👑',
    difficulty: 'ÁC MỘNG',
    quote: 'Cả cái sới này tao bao hết! Bước vào đây là một sống hai chết!',
    icon: '👑',
    border: 'border-yellow-400',
    glow: 'shadow-yellow-500/50',
    recommendedWagers: [2000000, 5000000, 10000000],
    preferredSide: 'COM',
    trashTalk: {
      pick: [
        'Cọc tiền này tao vứt vào đây xem mày có gan đỡ không! 💸🔥',
        'Bát này của Anh Ba, mày chỉ có cửa ngước nhìn thôi con trai!',
      ],
      win: [
        'Quy luật của kẻ mạnh: Tiền luôn về tay Anh Ba! Tạ ơn đi nhóc! 👑💰',
        'Một nốt nhạc bay màu số dư! Luyện thêm chục năm nữa rồi tái đấu!',
      ],
      lose: [
        'Khá khen cho mày! Bát này may mắn đấy, nhưng cuộc chơi chưa kết thúc!',
        'Hảo hán đấy! Anh Ba công nhận bản lĩnh của mày!',
      ],
    },
  },
];

// Com & Cut Dynamic Events Definitions
export const COMCUT_EVENTS_CONFIG: Array<{
  type: ComCutEventType;
  title: string;
  description: string;
  icon: string;
  badge: string;
  color: string;
  bgGradient: string;
  multiplierBoost?: number;
}> = [
  {
    type: 'GOLDEN_STORM',
    title: 'BÁO ĐỘNG BÃO VÀNG x35',
    description: 'Bát thần linh phát sáng cực độ! Tỷ lệ ăn Bão Cơm & Bão Cứt được buff từ x30 lên x35!',
    icon: '🌪️',
    badge: 'SIÊU BÃO x35',
    color: 'text-yellow-400',
    bgGradient: 'from-amber-500/30 via-yellow-500/20 to-orange-500/30 border-yellow-400/80',
    multiplierBoost: 35,
  },
  {
    type: 'RED_ENVELOPE',
    title: 'LÌ XÌ ĐẠI GIA RƠI',
    description: 'Bao lì xì may mắn từ Đại Gia All-in đang bay lơ lửng trên bàn! Bấm nhận ngay 50K - 200K Xu!',
    icon: '🧧',
    badge: 'LÌ XÌ FREE',
    color: 'text-rose-400',
    bgGradient: 'from-rose-500/30 via-red-500/20 to-amber-500/30 border-rose-500/80',
  },
  {
    type: 'FORTUNE_SHIELD',
    title: 'KHIÊN BẢO HIỂM THẦN TÀI',
    description: 'Thần Tài ban phúc: Nếu phiên này bạn đặt cược thua sẽ được hoàn lại 50% tiền cược!',
    icon: '🛡️',
    badge: 'BẢO HIỂM 50%',
    color: 'text-emerald-400',
    bgGradient: 'from-emerald-500/30 via-teal-500/20 to-slate-900 border-emerald-400/80',
  },
  {
    type: 'CHICKEN_FEAST',
    title: 'TIỆC CƠM GÀ THƯỞNG ĐẬM x10',
    description: 'Bữa tiệc thơm lừng: Cửa Cơm Gà (tổng điểm 13 hoặc 14) được x10 tiền thưởng (gốc x8)!',
    icon: '🍗',
    badge: 'CƠM GÀ x10',
    color: 'text-amber-400',
    bgGradient: 'from-amber-600/30 via-yellow-500/20 to-slate-900 border-amber-400/80',
    multiplierBoost: 10,
  },
  {
    type: 'LUCKY_FRENZY',
    title: 'GIỜ VÀNG FRENZY x2.1',
    description: 'Khung giờ may mắn toàn sàn: Tỷ lệ ăn cả CƠM và CỨT được đẩy lên 2.10x (gốc 1.98x)!',
    icon: '🔥',
    badge: 'TỶ LỆ x2.10',
    color: 'text-orange-400',
    bgGradient: 'from-orange-500/30 via-red-500/20 to-amber-500/30 border-orange-400/80',
    multiplierBoost: 2.1,
  },
  {
    type: 'GOLDEN_POOP',
    title: 'CỨT PHÁT QUANG MAY MẮN',
    description: 'Cầu cứt bốc khói phát quang: Ván này ra Cứt người chơi nhận thêm +100.000 Xu an ủi và x2 EXP!',
    icon: '💩✨',
    badge: 'CỨT VÀNG +100K',
    color: 'text-amber-300',
    bgGradient: 'from-yellow-600/30 via-amber-700/20 to-slate-900 border-amber-300/80',
  },
  {
    type: 'DOUBLE_COM_RAIN',
    title: 'MƯA CƠM HẢI SẢN x2.50',
    description: 'Cơn mưa cơm thơm phức trút xuống bàn! Cửa CƠM được x2.50 tỷ lệ trả thưởng (gốc x1.98)!',
    icon: '🍚✨',
    badge: 'CƠM x2.50',
    color: 'text-emerald-300',
    bgGradient: 'from-emerald-600/30 via-teal-500/20 to-slate-900 border-emerald-400/80',
    multiplierBoost: 2.5,
  },
  {
    type: 'POOP_REVERSAL',
    title: 'CẢNH BÁO BẺ CẦU THẦN THÁNH',
    description: 'Thánh Bẻ Cầu nhập cuộc: Nếu ván này bẻ cầu (Cơm sang Cứt hoặc ngược lại), người trúng nhận thêm +30% Jackpot Bẻ Cầu!',
    icon: '⚡🔄',
    badge: 'BẺ CẦU +30%',
    color: 'text-purple-300',
    bgGradient: 'from-purple-600/30 via-violet-500/20 to-slate-900 border-purple-400/80',
  },
  {
    type: 'MYSTERY_LUCKY_WHEEL',
    title: 'VÒNG QUAY BÁT QUÁI THẦN TÀI',
    description: 'Bát quái hiển linh giữa bàn cược! Bấm vào để QUAY NGAY nhận ngẫu nhiên 50K - 500K Xu lộc!',
    icon: '🎡',
    badge: 'QUAY LỘC MIỄN PHÍ',
    color: 'text-cyan-300',
    bgGradient: 'from-cyan-600/30 via-blue-500/20 to-slate-900 border-cyan-400/80',
  },
  {
    type: 'METEOR_JACKPOT',
    title: 'MƯA THIÊN THẠCH VÀNG NỔ HŨ',
    description: 'Hũ Bão Thiên Thạch nổ tung! Mọi người chơi đặt cược trúng BÃO hoặc CƠM GÀ ván này được cộng thêm +500.000 Xu từ Quỹ Thưởng!',
    icon: '☄️',
    badge: 'HŨ THIÊN THẠCH +500K',
    color: 'text-orange-300',
    bgGradient: 'from-red-600/30 via-orange-500/20 to-slate-900 border-orange-400/80',
  },
  {
    type: 'GOD_OF_WEALTH_BLESSING',
    title: 'THẦN TÀI GIÁNG LÂM - X2 EXP',
    description: 'Thần Tài hạ phàm: Toàn bộ cược được x2 điểm EXP Cấp Bậc Rank và tặng ngay 88,888 Xu lộc may mắn!',
    icon: '👑✨',
    badge: 'THẦN TÀI +88.888 Xu',
    color: 'text-yellow-300',
    bgGradient: 'from-amber-500/30 via-yellow-500/25 to-slate-900 border-yellow-300/80',
  },
];

// Helper to determine boss decision in Solo 1v1
export function getBossPick(boss: ComCutBoss, userPick: ComCutBetType): ComCutBetType {
  const rand = Math.random();

  // If boss is "Tuấn_BẻCầu", high tendency to pick the OPPOSITE of the user!
  if (boss.id === 'tuan_becau') {
    if (userPick === 'COM') return 'CUT';
    if (userPick === 'CUT') return 'COM';
    return rand < 0.5 ? 'COM' : 'CUT';
  }

  // If boss is "Thần_Cơm_Bão", chance to pick Bão!
  if (boss.id === 'than_com_bao' && rand < 0.4) {
    return rand < 0.5 ? 'BAO_COM' : 'BAO_CUT';
  }

  // If user chose COM, boss will usually contest or counter
  if (boss.preferredSide === 'COM') {
    return rand < 0.65 ? 'COM' : 'CUT';
  } else if (boss.preferredSide === 'CUT') {
    return rand < 0.65 ? 'CUT' : 'COM';
  }

  // Default: picks opposite 60% of the time to create exciting head-to-head friction!
  if (userPick === 'COM') {
    return rand < 0.65 ? 'CUT' : 'COM';
  } else if (userPick === 'CUT') {
    return rand < 0.65 ? 'COM' : 'CUT';
  }

  return rand < 0.5 ? 'COM' : 'CUT';
}

// Generate exciting solo dice roll
export function rollSoloDices(): { dices: [number, number, number]; total: number; outcome: 'COM' | 'CUT'; isBao: boolean; isBaoCom: boolean; isBaoCut: boolean } {
  const d1 = Math.floor(Math.random() * 6) + 1;
  const d2 = Math.floor(Math.random() * 6) + 1;
  const d3 = Math.floor(Math.random() * 6) + 1;
  const total = d1 + d2 + d3;
  const isBao = d1 === d2 && d2 === d3;
  const isBaoCom = isBao && d1 >= 4;
  const isBaoCut = isBao && d1 <= 3;
  const outcome: 'COM' | 'CUT' = isBao ? (d1 >= 4 ? 'COM' : 'CUT') : (total >= 11 ? 'COM' : 'CUT');

  return {
    dices: [d1, d2, d3],
    total,
    outcome,
    isBao,
    isBaoCom,
    isBaoCut,
  };
}

// Check if a pick won given the roll
export function checkPickWin(pick: ComCutBetType, roll: { outcome: 'COM' | 'CUT'; total: number; isBao: boolean; isBaoCom: boolean; isBaoCut: boolean }): boolean {
  if (pick === 'COM') return roll.outcome === 'COM' && !roll.isBao;
  if (pick === 'CUT') return roll.outcome === 'CUT' && !roll.isBao;
  if (pick === 'BAO_COM') return roll.isBaoCom;
  if (pick === 'BAO_CUT') return roll.isBaoCut;
  if (pick === 'COM_GA') return roll.total === 13 || roll.total === 14;
  if (pick === 'CUT_RUOI') return roll.total === 7 || roll.total === 8;
  return false;
}
