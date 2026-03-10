import { VocabularyItem, ThemeId } from '../types/vocabulary';

export const vocabulary: VocabularyItem[] = [
  // === どうぶつ (10語) ===
  { id: 'inu',     themeId: 'doubutsu', word: 'いぬ',     reading: 'いぬ',     emoji: '🐶', hint: 'わんわん となく',         sortOrder: 1 },
  { id: 'neko',    themeId: 'doubutsu', word: 'ねこ',     reading: 'ねこ',     emoji: '🐱', hint: 'にゃあにゃあ となく',     sortOrder: 2 },
  { id: 'zou',     themeId: 'doubutsu', word: 'ぞう',     reading: 'ぞう',     emoji: '🐘', hint: 'おはなが ながい',         sortOrder: 3 },
  { id: 'kirin',   themeId: 'doubutsu', word: 'きりん',   reading: 'きりん',   ttsText: 'キリン', emoji: '🦒', hint: 'くびが ながい',           sortOrder: 4 },
  { id: 'usagi',   themeId: 'doubutsu', word: 'うさぎ',   reading: 'うさぎ',   emoji: '🐰', hint: 'みみが ながい',           sortOrder: 5 },
  { id: 'kuma',    themeId: 'doubutsu', word: 'くま',     reading: 'くま',     emoji: '🐻', hint: 'おおきくて ふわふわ',     sortOrder: 6 },
  { id: 'saru',    themeId: 'doubutsu', word: 'さる',     reading: 'さる',     emoji: '🐵', hint: 'きに のぼるのが とくい',   sortOrder: 7 },
  { id: 'penguin', themeId: 'doubutsu', word: 'ぺんぎん', reading: 'ぺんぎん', ttsText: 'ペンギン', emoji: '🐧', hint: 'こおりの うえを あるく',   sortOrder: 8 },
  { id: 'raion',   themeId: 'doubutsu', word: 'らいおん', reading: 'らいおん', ttsText: 'ライオン', emoji: '🦁', hint: 'たてがみが りっぱ',       sortOrder: 9 },
  { id: 'panda',   themeId: 'doubutsu', word: 'ぱんだ',   reading: 'ぱんだ',   ttsText: 'パンダ', emoji: '🐼', hint: 'しろくろ もよう',         sortOrder: 10 },

  // === たべもの (10語) ===
  { id: 'ringo',    themeId: 'tabemono', word: 'りんご',       reading: 'りんご',       emoji: '🍎', hint: 'あかい くだもの',         sortOrder: 1 },
  { id: 'banana',   themeId: 'tabemono', word: 'ばなな',       reading: 'ばなな',       ttsText: 'バナナ', emoji: '🍌', hint: 'きいろくて ながい',       sortOrder: 2 },
  { id: 'onigiri',  themeId: 'tabemono', word: 'おにぎり',     reading: 'おにぎり',     emoji: '🍙', hint: 'ごはんを にぎったよ',     sortOrder: 3 },
  { id: 'pan',      themeId: 'tabemono', word: 'ぱん',         reading: 'ぱん',         ttsText: 'パン', emoji: '🍞', hint: 'あさごはんに たべる',      sortOrder: 4 },
  { id: 'mikan',    themeId: 'tabemono', word: 'みかん',       reading: 'みかん',       emoji: '🍊', hint: 'オレンジの くだもの',     sortOrder: 5 },
  { id: 'ichigo',   themeId: 'tabemono', word: 'いちご',       reading: 'いちご',       emoji: '🍓', hint: 'あまくて あかい',         sortOrder: 6 },
  { id: 'tamago',   themeId: 'tabemono', word: 'たまご',       reading: 'たまご',       emoji: '🥚', hint: 'にわとりが うむ',         sortOrder: 7 },
  { id: 'gyuunyuu',themeId: 'tabemono', word: 'ぎゅうにゅう', reading: 'ぎゅうにゅう', emoji: '🥛', hint: 'しろい のみもの',         sortOrder: 8 },
  { id: 'ninjin',   themeId: 'tabemono', word: 'にんじん',     reading: 'にんじん',     emoji: '🥕', hint: 'オレンジの やさい',       sortOrder: 9 },
  { id: 'cake',     themeId: 'tabemono', word: 'けーき',       reading: 'けーき',       ttsText: 'ケーキ', emoji: '🎂', hint: 'おたんじょうびに たべる',  sortOrder: 10 },

  // === いろ (10語) ===
  { id: 'aka',      themeId: 'iro', word: 'あか',     reading: 'あか',     emoji: '🔴', hint: 'りんごの いろ',           sortOrder: 1 },
  { id: 'ao',       themeId: 'iro', word: 'あお',     reading: 'あお',     emoji: '🔵', hint: 'そらの いろ',             sortOrder: 2 },
  { id: 'kiiro',    themeId: 'iro', word: 'きいろ',   reading: 'きいろ',   emoji: '🟡', hint: 'ばななの いろ',           sortOrder: 3 },
  { id: 'midori',   themeId: 'iro', word: 'みどり',   reading: 'みどり',   emoji: '🟢', hint: 'はっぱの いろ',           sortOrder: 4 },
  { id: 'shiro',    themeId: 'iro', word: 'しろ',     reading: 'しろ',     emoji: '⚪', hint: 'ゆきの いろ',             sortOrder: 5 },
  { id: 'kuro',     themeId: 'iro', word: 'くろ',     reading: 'くろ',     emoji: '⚫', hint: 'よるの いろ',             sortOrder: 6 },
  { id: 'orenji',   themeId: 'iro', word: 'おれんじ', reading: 'おれんじ', ttsText: 'オレンジ', emoji: '🟠', hint: 'みかんの いろ',           sortOrder: 7 },
  { id: 'pink',     themeId: 'iro', word: 'ぴんく',   reading: 'ぴんく',   ttsText: 'ピンク', emoji: '🩷', hint: 'さくらの いろ',           sortOrder: 8 },
  { id: 'murasaki', themeId: 'iro', word: 'むらさき', reading: 'むらさき', emoji: '🟣', hint: 'ぶどうの いろ',           sortOrder: 9 },
  { id: 'chairo',   themeId: 'iro', word: 'ちゃいろ', reading: 'ちゃいろ', emoji: '🟤', hint: 'チョコレートの いろ',     sortOrder: 10 },

  // === のりもの (10語) ===
  { id: 'kuruma',     themeId: 'norimono', word: 'くるま',         reading: 'くるま',         emoji: '🚗', hint: 'ぶーぶー',                   sortOrder: 1 },
  { id: 'densha',     themeId: 'norimono', word: 'でんしゃ',       reading: 'でんしゃ',       emoji: '🚃', hint: 'がたんごとん',                 sortOrder: 2 },
  { id: 'hikouki',    themeId: 'norimono', word: 'ひこうき',       reading: 'ひこうき',       emoji: '✈️', hint: 'そらを とぶ',                  sortOrder: 3 },
  { id: 'fune',       themeId: 'norimono', word: 'ふね',           reading: 'ふね',           emoji: '🚢', hint: 'うみを はしる',                sortOrder: 4 },
  { id: 'bus',        themeId: 'norimono', word: 'ばす',           reading: 'ばす',           ttsText: 'バス', emoji: '🚌', hint: 'たくさん のれる',              sortOrder: 5 },
  { id: 'jitensha',   themeId: 'norimono', word: 'じてんしゃ',     reading: 'じてんしゃ',     emoji: '🚲', hint: 'ぺだるを こぐ',              sortOrder: 6 },
  { id: 'shinkansen', themeId: 'norimono', word: 'しんかんせん',   reading: 'しんかんせん',   emoji: '🚅', hint: 'とっても はやい でんしゃ',     sortOrder: 7 },
  { id: 'shoubousha', themeId: 'norimono', word: 'しょうぼうしゃ', reading: 'しょうぼうしゃ', emoji: '🚒', hint: 'あかい くるま ぴーぽー',       sortOrder: 8 },
  { id: 'ambulance',  themeId: 'norimono', word: 'きゅうきゅうしゃ', reading: 'きゅうきゅうしゃ', emoji: '🚑', hint: 'びょういんに はこぶ',    sortOrder: 9 },
  { id: 'rocket',     themeId: 'norimono', word: 'ろけっと',       reading: 'ろけっと',       ttsText: 'ロケット', emoji: '🚀', hint: 'うちゅうに いく',              sortOrder: 10 },
];

export function getVocabByTheme(themeId: ThemeId): VocabularyItem[] {
  return vocabulary.filter(v => v.themeId === themeId).sort((a, b) => a.sortOrder - b.sortOrder);
}

export function getVocabById(id: string): VocabularyItem | undefined {
  return vocabulary.find(v => v.id === id);
}
