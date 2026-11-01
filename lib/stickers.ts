import { ProgressState, Word } from '@/lib/types';
import { getWord, units } from '@/lib/content';
import { Rng } from '@/lib/engine/random';

export interface Sticker {
  /** The course word the sticker shows; also its id. */
  wordId: string;
  emoji: string;
}

export interface StickerPage {
  unitId: string;
  stickers: Sticker[];
}

/** One page per unit, each sticker a word from that unit, so collecting is also revision. */
export const STICKER_PAGES: StickerPage[] = [
  { unitId: 'u1', stickers: s('你好 👋', '早晨 🌅', '拜拜 🙋', '多謝 🎁', '唔該 🙏', '學生 🎒', '名 📛', '好 👍') },
  { unitId: 'u2', stickers: s('一 1️⃣', '二 2️⃣', '三 3️⃣', '四 4️⃣', '五 5️⃣', '八 8️⃣', '九 9️⃣', '十 🔟') },
  { unitId: 'u3', stickers: s('茶 🍵', '咖啡 ☕', '奶茶 🧋', '飯 🍚', '麵 🍜', '雞 🐔', '魚 🐟', '點心 🥟') },
  { unitId: 'u4', stickers: s('爸爸 👨', '媽媽 👩', '哥哥 👦', '家姐 👧', '屋企 🏠', '朋友 🤝', '老師 🧑‍🏫', '醫生 🧑‍⚕️') },
  { unitId: 'u5', stickers: s('今日 📅', '時間 ⏰', '夜 🌙', '生日 🎂', '快樂 😄', '週末 🎉', '年 🎆', '月 🗓️') },
  { unitId: 'u6', stickers: s('地鐵 🚇', '巴士 🚌', '的士 🚕', '學校 🏫', '銀行 🏦', '餐廳 🍽️', '車站 🚉', '左 ⬅️') },
  { unitId: 'u7', stickers: s('錢 💰', '衫 👕', '褲 👖', '鞋 👟', '紅色 🔴', '藍色 🔵', '黑色 ⚫', '白色 ⚪') },
  { unitId: 'u8', stickers: s('天氣 🌤️', '熱 🥵', '凍 🥶', '落雨 🌧️', '開心 😊', '肚餓 😋', '瞓覺 😴', '沖涼 🚿') },
];

function s(...entries: string[]): Sticker[] {
  return entries.map((e) => {
    const [wordId, emoji] = e.split(' ');
    return { wordId, emoji };
  });
}

/** Bonus stars for filling a page. */
export const PAGE_BONUS_STARS = 5;

export function stickerWord(sticker: Sticker): Word {
  return getWord(sticker.wordId)!;
}

export function pageFor(unitId: string): StickerPage | undefined {
  return STICKER_PAGES.find((p) => p.unitId === unitId);
}

export function isPageComplete(state: ProgressState, page: StickerPage): boolean {
  return page.stickers.every((st) => (state.stickers[st.wordId] ?? 0) > 0);
}

export function collectedCount(state: ProgressState): number {
  return STICKER_PAGES.reduce((n, p) => n + p.stickers.filter((st) => state.stickers[st.wordId]).length, 0);
}

export const TOTAL_STICKERS = STICKER_PAGES.reduce((n, p) => n + p.stickers.length, 0);

/** Picks a sticker from a page, preferring ones not collected yet. */
export function pickSticker(state: ProgressState, unitId: string, rng: Rng): Sticker | undefined {
  const page = pageFor(unitId);
  if (!page) return undefined;
  const missing = page.stickers.filter((st) => !state.stickers[st.wordId]);
  const pool = missing.length > 0 ? missing : page.stickers;
  return pool[Math.floor(rng() * pool.length)];
}

/** Units whose sticker page can be earned from, for practice sessions. */
export function openUnitIds(state: ProgressState): string[] {
  return units.filter((u) => u.index <= state.unlockedUnitIndex).map((u) => u.id);
}
