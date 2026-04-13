import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  GERMAN_SOURCE_DIR,
  cleanText,
  normalizeGermanKey,
  normalizeGermanRecord,
  readGermanSeed,
  writeCsv
} from "./german-vocabulary-utils.mjs";

const REVIEW_PATH = resolve(GERMAN_SOURCE_DIR, "ドイツ単語_訳確認リスト.csv");
const REPORT_PATH = resolve(GERMAN_SOURCE_DIR, "ドイツ単語_訳確認レポート.json");

const CONFIDENCE_RANK = {
  high: 3,
  medium: 2,
  low: 1
};

const CURATED_SUGGESTIONS = new Map([
  ["achtung", ["注意", "機械翻訳が警告語を名詞の危険として寄せすぎている", "high"]],
  ["affe", ["猿", "類人猿より一般語としては猿", "high"]],
  ["ahnung", ["予感、見当", "Ahnung はアイデアよりも予感・見当・心当たり", "high"]],
  ["alter", ["年齢", "Alter は形容詞 alt ではなく名詞として年齢が基本", "high"]],
  ["automat", ["自動販売機、券売機", "Automat はオートマチックではなく機械装置・販売機", "high"]],
  ["bach", ["小川", "der Bach は作曲家名ではなく普通名詞では小川", "high"]],
  ["bäcker", ["パン屋", "Bäcker は人・店としてパン屋", "high"]],
  ["band|das|bänder", ["テープ、リボン、帯", "das Band は音楽バンドではなく帯状のもの", "high"]],
  ["bank|die|bänke", ["ベンチ", "複数形 Bänke なので金融機関ではなくベンチ", "high"]],
  ["bekannte", ["知人", "Bekannte は知っている人・知人", "high"]],
  ["begriff", ["概念、用語", "Begriff は表現より概念・用語", "high"]],
  ["bedeutung", ["意味、重要性", "Bedeutung は意味と重要性の両方を持つ", "medium"]],
  ["bedingung", ["条件", "Bedingung は状態ではなく条件", "high"]],
  ["brief", ["手紙", "Brief は英語 brief ではなく手紙", "high"]],
  ["dose", ["缶、容器", "Dose は用量より缶・容器が基本", "high"]],
  ["einsteigen", ["乗り込む、乗車する", "分離動詞の機械翻訳が命令形に崩れやすい", "high"]],
  ["eventuell", ["場合によっては、ひょっとすると", "eventuell は英語 eventually ではない", "high"]],
  ["fast", ["ほとんど", "fast は速いではなく副詞のほとんど", "high"]],
  ["gift", ["毒", "das Gift は英語 gift ではなく毒", "high"]],
  ["handy", ["携帯電話、スマホ", "Handy は便利なではなく携帯電話", "high"]],
  ["kaution", ["保証金、敷金", "Kaution は注意ではなく保証金", "high"]],
  ["konkurrenz", ["競争、競合相手", "Konkurrenz はカタカナの競合より意味を明示したい", "medium"]],
  ["körper", ["体、身体", "Körper は物体の意味もあるが初学者向けは体", "medium"]],
  ["kriegen", ["得る、受け取る", "口語の kriegen は戦争ではなく bekommen に近い", "high"]],
  ["leib", ["身体、からだ", "Leib は生命ではなく身体", "medium"]],
  ["mist", ["くそ、ひどいもの", "Mist は堆肥だけでなく口語の悪態として出やすい", "medium"]],
  ["rat", ["助言、評議会", "Rat はネズミではなく助言・評議会", "high"]],
  ["rezept", ["処方箋、レシピ", "Rezept は処方箋と料理レシピの両方", "high"]],
  ["rock", ["スカート", "false friend: der Rock は音楽ロックではなくスカート", "high"]],
  ["gehalt|der|gehalte", ["内容、含有量", "der Gehalt は内容・含有量。das Gehalt なら給料", "high"]],
  ["gehalt|das|gehälter", ["給料", "das Gehalt は給料", "high"]],
  ["schloss|das|schlösser", ["城、錠", "Schloss はロック音楽ではなく城・錠", "high"]],
  ["see|der|seen", ["湖", "der See は湖。die See なら海", "high"]],
  ["see|die|", ["海", "die See は海。der See なら湖", "high"]],
  ["steuer", ["税、ハンドル", "Steuer は性で意味が分かれる多義語", "medium"]],
  ["wange", ["頬", "Wange は姓ではなく頬", "high"]],
  ["wirt", ["主人、店主", "Wirt は宿主・店主で文脈注意", "medium"]],
  ["zoll", ["税関、関税、インチ", "Zoll は税関・関税・インチの多義語", "medium"]]
]);

const SUSPICIOUS_MEANINGS = new Map([
  ["アイデア", "英語寄り・意味がずれている可能性"],
  ["オートマチック", "カタカナ直訳でドイツ語の普通語義とずれる可能性"],
  ["サイン", "英語 sign 寄りの直訳で、Zeichen などは記号・印の可能性"],
  ["サービス", "Dienst / Bedienung などは文脈により接客・勤務・奉仕"],
  ["ゾーン", "Zone は領域・区域が自然な場合が多い"],
  ["タスク", "Aufgabe などは課題・任務が自然な場合が多い"],
  ["ライン", "Linie / Zeile などは線・行・路線の可能性"],
  ["ロック", "false friend か文脈違いの可能性"],
  ["入れ", "命令形のような誤訳の可能性"],
  ["状態", "Bedingung / Zustand などの区別が必要"],
  ["表現", "Ausdruck / Begriff などの区別が必要"]
]);

const ACCEPTED_KATAKANA = new Set([
  "アルコール", "エネルギー", "カメラ", "ガソリン", "キロメートル", "コンピューター",
  "ジャム", "スポーツ", "タクシー", "テニス", "テレビ", "ホテル", "ビール", "ピアノ",
  "メートル", "ラジオ", "レストラン"
]);

const REVIEW_HEADERS = [
  "order",
  "lemma_de",
  "display_de",
  "article",
  "pos",
  "current_meaning_ja",
  "suggested_meaning_ja",
  "reason",
  "confidence",
  "action",
  "notes"
];

function isKatakanaOnly(value) {
  return /^[ァ-ヶー・]+$/.test(value);
}

function isVerbLikeJapanese(value) {
  return /(する|した|している|される)$/.test(value);
}

function looksLikeJapaneseVerbMeaning(value) {
  return /(う|く|ぐ|す|つ|ぬ|ぶ|む|る)$/.test(value);
}

function getReviewKey(record) {
  return [
    normalizeGermanKey(record.normalized_key || record.lemma_de || record.display_de),
    normalizeGermanKey(record.article),
    normalizeGermanKey(record.plural)
  ].join("|");
}

function getCuratedSuggestion(record) {
  return CURATED_SUGGESTIONS.get(getReviewKey(record))
    || CURATED_SUGGESTIONS.get(normalizeGermanKey(record.normalized_key || record.lemma_de || record.display_de));
}

function upsertIssue(issuesByKey, record, issue) {
  const key = getReviewKey(record);
  const existing = issuesByKey.get(key);
  const next = {
    order: record.order || "",
    lemma_de: record.lemma_de || record.display_de || "",
    display_de: record.display_de || record.lemma_de || "",
    article: record.article || "",
    pos: record.part_of_speech || "",
    current_meaning_ja: record.meaning_ja || "",
    suggested_meaning_ja: issue.suggested || "",
    reason: issue.reason,
    confidence: issue.confidence,
    action: issue.action,
    notes: record.notes || ""
  };

  if (!existing) {
    issuesByKey.set(key, next);
    return;
  }

  const existingRank = CONFIDENCE_RANK[existing.confidence] || 0;
  const nextRank = CONFIDENCE_RANK[next.confidence] || 0;
  existing.reason = [...new Set([existing.reason, next.reason].filter(Boolean))].join(" / ");
  if (!existing.suggested_meaning_ja && next.suggested_meaning_ja) {
    existing.suggested_meaning_ja = next.suggested_meaning_ja;
  }
  if (nextRank > existingRank) {
    existing.confidence = next.confidence;
    existing.action = next.action;
    if (next.suggested_meaning_ja) existing.suggested_meaning_ja = next.suggested_meaning_ja;
  }
}

function auditRecord(record, issuesByKey) {
  const key = normalizeGermanKey(record.normalized_key || record.lemma_de || record.display_de);
  const meaning = cleanText(record.meaning_ja);
  const pos = cleanText(record.part_of_speech);
  if (!meaning) {
    upsertIssue(issuesByKey, record, {
      reason: "日本語訳が空",
      confidence: "high",
      action: "review-required"
    });
    return;
  }

  const curated = getCuratedSuggestion(record);
  if (curated && meaning !== curated[0]) {
    upsertIssue(issuesByKey, record, {
      suggested: curated[0],
      reason: curated[1],
      confidence: curated[2],
      action: curated[2] === "high" ? "auto-fixable" : "review-required"
    });
  }

  const suspiciousReason = SUSPICIOUS_MEANINGS.get(meaning);
  if (suspiciousReason) {
    upsertIssue(issuesByKey, record, {
      reason: suspiciousReason,
      confidence: "medium",
      action: "review-required"
    });
  }

  if (pos === "noun" && meaning === "古い") {
    upsertIssue(issuesByKey, record, {
      reason: "名詞化された語を形容詞として訳している可能性",
      confidence: "medium",
      action: "review-required"
    });
  }

  if (pos === "noun" && isVerbLikeJapanese(meaning)) {
    upsertIssue(issuesByKey, record, {
      reason: "名詞なのに日本語訳が動詞句になっている",
      confidence: "medium",
      action: "review-required"
    });
  }

  if (pos === "verb" && !looksLikeJapaneseVerbMeaning(meaning)) {
    upsertIssue(issuesByKey, record, {
      reason: "動詞なのに日本語訳が名詞形・語幹訳に崩れている可能性",
      confidence: "medium",
      action: "review-required"
    });
  }

  if (isKatakanaOnly(meaning) && !ACCEPTED_KATAKANA.has(meaning)) {
    upsertIssue(issuesByKey, record, {
      reason: "カタカナ直訳。false friend や文脈違いの可能性",
      confidence: "low",
      action: "review-required"
    });
  }
}

const records = readGermanSeed().map(normalizeGermanRecord);
const issuesByKey = new Map();

for (const record of records) {
  auditRecord(record, issuesByKey);
}

const reviewRows = [...issuesByKey.values()].sort((left, right) => {
  const confidenceDiff = (CONFIDENCE_RANK[right.confidence] || 0) - (CONFIDENCE_RANK[left.confidence] || 0);
  if (confidenceDiff) return confidenceDiff;
  return Number(left.order || 0) - Number(right.order || 0);
});

writeCsv(REVIEW_PATH, reviewRows, REVIEW_HEADERS);

const summary = {
  generated_at: new Date().toISOString(),
  total_entries: records.length,
  review_candidates: reviewRows.length,
  auto_fixable: reviewRows.filter((row) => row.action === "auto-fixable").length,
  by_confidence: {
    high: reviewRows.filter((row) => row.confidence === "high").length,
    medium: reviewRows.filter((row) => row.confidence === "medium").length,
    low: reviewRows.filter((row) => row.confidence === "low").length
  },
  outputs: {
    review_csv: REVIEW_PATH,
    report_json: REPORT_PATH
  }
};

writeFileSync(REPORT_PATH, `${JSON.stringify(summary, null, 2)}\n`);

console.log(`Wrote ${reviewRows.length} German meaning review candidates to ${REVIEW_PATH}`);
console.log(JSON.stringify(summary, null, 2));
