const fs = require('fs');
const vm = require('vm');
const path = require('path');
const base = __dirname;
const files = [
  'n5-codex-vocab.js',
  'ayaya-n4-codex-vocab.js',
  'grammar-data.js',
  'card-data.js',
];
const ctx = { window: {} };
ctx.globalThis = ctx;
vm.createContext(ctx);
for (const file of files) {
  vm.runInContext(fs.readFileSync(path.join(base, file), 'utf8'), ctx, { filename: file });
}
const w = ctx.window;
const result = {
  n5_entries: w.AYAYA_N5_CODEX_VOCAB.entries.length,
  n4_entries: w.AYAYA_N4_CODEX_VOCAB.entries.length,
  grammar_entries: w.AYAYA_GRAMMAR_DATA.entries.length,
  kana_cards: w.AYAYA_JP_CARD_DATA.makeKanaCards().length,
  vocab_cards: w.AYAYA_JP_CARD_DATA.makeVocabCards().length,
  grammar_cards: w.AYAYA_JP_CARD_DATA.makeGrammarCards().length,
};
result.total_cards_from_api = result.kana_cards + result.vocab_cards + result.grammar_cards;
console.log(JSON.stringify(result, null, 2));
