import { RocketSkin, RocketSkinId } from '../types/game';

export const ROCKET_SKINS: RocketSkin[] = [
  {
    id: 'STANDARD',
    name: 'Tên Lửa Cổ Điển',
    price: 0,
    description: 'Tên lửa tiêu chuẩn đáng tin cậy của Hạm Đội Vũ Trụ.',
    effectDescription: 'Vệt khói lửa Cam-Đỏ truyền thống, thân tên lửa gốm trắng tinh.',
    rarity: 'THƯỜNG',
    glowColor: '#EF4444',
    icon: '🚀',
    trailColorHex: ['#EF4444', '#F97316', '#FBBF24'],
    particleColorHex: ['#EF4444', '#F97316', '#FBBF24'],
  },
  {
    id: 'CYBERPUNK',
    name: 'Cyberpunk Neon',
    price: 300000,
    description: 'Động cơ năng lượng Plasma Neon Xanh Tím từ thành phố tương lai.',
    effectDescription: 'Thân tiêm kích tàng hình, tia Laser Neon Xanh - Tím & hạt điện tử bão tố.',
    rarity: 'HIẾM',
    glowColor: '#A855F7',
    icon: '⚡',
    trailColorHex: ['#A855F7', '#EC4899', '#06B6D4'],
    particleColorHex: ['#C084FC', '#F472B6', '#22D3EE', '#FFFFFF'],
  },
  {
    id: 'PHOENIX',
    name: 'Phượng Hoàng Lửa',
    price: 1000000,
    description: 'Đốt cháy không gian bằng vệt lửa vĩnh cửu của Phượng Hoàng.',
    effectDescription: 'Mô hình Phượng Hoàng Lửa với vương miện ngọn lửa, đuôi rực cháy & tàn tro lấp lánh.',
    rarity: 'CỰC HIẾM',
    glowColor: '#EA580C',
    icon: '🔥',
    trailColorHex: ['#DC2626', '#EA580C', '#F59E0B'],
    particleColorHex: ['#F87171', '#FB923C', '#FBBF24', '#FEF08A'],
  },
  {
    id: 'UFO_ALIEN',
    name: 'UFO Ngoại Lai',
    price: 2500000,
    description: 'Đĩa bay ngoài hành tinh mang công nghệ phản trọng lực.',
    effectDescription: 'Đĩa bay UFO với phi công Alien 👽, đèn xoay đa sắc & luồng Plasma xanh ngọc lục bảo.',
    rarity: 'HUYỀN THOẠI',
    glowColor: '#10B981',
    icon: '🛸',
    trailColorHex: ['#10B981', '#34D399', '#A7F3D0'],
    particleColorHex: ['#10B981', '#059669', '#6EE7B7', '#34D399'],
  },
  {
    id: 'DRAGONFIRE',
    name: 'Rồng Vũ Trụ Hoàng Gia',
    price: 5000000,
    description: 'Động cơ Vàng Kim Hoàng Gia tỏa ánh sáng kim cương lấp lánh.',
    effectDescription: 'Thánh chiến cơ Rồng Vàng bọc giáp Hoàng Gia, lõi Kim Cương & mưa sao sa ánh kim.',
    rarity: 'THẦN THOẠI',
    glowColor: '#F59E0B',
    icon: '👑',
    trailColorHex: ['#F59E0B', '#FBBF24', '#FEF08A'],
    particleColorHex: ['#F59E0B', '#FCD34D', '#FFFFFF', '#FEF08A'],
  },
];

export function getSkinById(id: RocketSkinId = 'STANDARD'): RocketSkin {
  return ROCKET_SKINS.find(s => s.id === id) || ROCKET_SKINS[0];
}
