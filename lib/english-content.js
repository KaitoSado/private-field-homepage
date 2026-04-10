import { ENGLISH_TARGET1900_LIBRARY } from "./english-target1900";

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const ENGLISH_REVIEW_STEPS = [
  { delayMs: 8 * MINUTE, label: "学習直後" },
  { delayMs: 1 * DAY, label: "1日後" },
  { delayMs: 3 * DAY, label: "3日後" },
  { delayMs: 8 * DAY, label: "8日後" },
  { delayMs: 30 * DAY, label: "30日後" }
];

export const ENGLISH_MODE_TABS = [
  { id: "study", label: "単語" },
  { id: "history", label: "見直しリスト" }
];

export const ENGLISH_TOPIC_OPTIONS = [
  { id: "all", label: "すべて" },
  { id: "campus", label: "大学" },
  { id: "science", label: "科学" },
  { id: "work", label: "仕事" },
  { id: "social", label: "会話" },
  { id: "media", label: "ニュース" },
  { id: "travel", label: "移動" }
];

export const ENGLISH_THEORY_PILLARS = [
  {
    id: "chunk",
    title: "Chunk First",
    body: "単語単体ではなく、まず使えるかたまりとして入れる。"
  },
  {
    id: "constraint",
    title: "High Constraint",
    body: "最初は意味が強く読める文脈で、意味と形をすばやく結びつける。"
  },
  {
    id: "shadow",
    title: "Shadow Right Away",
    body: "意味を掴んだ直後に音で真似して、音韻ループごと覚える。"
  },
  {
    id: "diversity",
    title: "Context Diversity",
    body: "別トピックの文脈へ散らして、未知の場面にも転移できる形へ育てる。"
  },
  {
    id: "transfer",
    title: "Light Output",
    body: "穴埋めや選択で軽く産出し、使える知識へ寄せる。"
  }
];

const ENGLISH_SAMPLE_CHUNK_LIBRARY = [
  {
    id: "raise-an-issue",
    headword: "issue",
    coreChunk: "raise an issue",
    meaning: "問題や懸念を持ち出す",
    nuance: "ただ話題にするだけでなく、検討すべき論点として表に出す感覚です。",
    grammarNote: "`raise + issue` で固定気味に使われます。`make an issue` より自然です。",
    relatedChunks: ["bring it up", "flag a risk", "point out"],
    starterExamples: [
      {
        topic: "work",
        text: "If you notice a safety risk, raise an issue before the meeting ends.",
        cloze: "If you notice a safety risk, _____ before the meeting ends.",
        ja: "安全上のリスクに気づいたら、会議が終わる前にその問題を提起して。"
      },
      {
        topic: "science",
        text: "The reviewer raised an issue about the sample size in the paper.",
        cloze: "The reviewer _____ about the sample size in the paper.",
        ja: "査読者は、その論文のサンプル数について問題を提起した。"
      }
    ],
    diverseExamples: [
      {
        topic: "campus",
        text: "Students raised an issue about the library closing too early.",
        cloze: "Students _____ about the library closing too early.",
        ja: "学生たちは図書館の閉館が早すぎる件を取り上げた。"
      },
      {
        topic: "media",
        text: "The documentary raises an issue that most viewers ignore.",
        cloze: "The documentary _____ that most viewers ignore.",
        ja: "そのドキュメンタリーは、多くの視聴者が見過ごす問題を浮かび上がらせる。"
      },
      {
        topic: "social",
        text: "I do not want to raise an issue at dinner, but we should talk about it later.",
        cloze: "I do not want to _____ at dinner, but we should talk about it later.",
        ja: "夕食の席で問題提起はしたくないけれど、あとで話したほうがいい。"
      }
    ],
    shadowPrompts: [
      "I want to raise an issue before we move on.",
      "She raised an issue about the schedule."
    ]
  },
  {
    id: "be-likely-to",
    headword: "likely",
    coreChunk: "be likely to",
    meaning: "〜しそうだ / 〜する可能性が高い",
    nuance: "主観の勘ではなく、状況から見て起こりやすいと述べる感じです。",
    grammarNote: "`be likely to + 動詞`。`likely` のあとに `that` 節を直接置くより、この形が基本です。",
    relatedChunks: ["be expected to", "be prone to", "tend to"],
    starterExamples: [
      {
        topic: "science",
        text: "This material is likely to crack if the room gets too dry.",
        cloze: "This material _____ crack if the room gets too dry.",
        ja: "この材料は、部屋が乾きすぎるとひび割れしやすい。"
      },
      {
        topic: "media",
        text: "The storm is likely to delay trains tonight.",
        cloze: "The storm _____ delay trains tonight.",
        ja: "今夜の嵐で電車が遅れそうだ。"
      }
    ],
    diverseExamples: [
      {
        topic: "campus",
        text: "First-year students are likely to get lost on the first day.",
        cloze: "First-year students _____ get lost on the first day.",
        ja: "新入生は初日に迷いやすい。"
      },
      {
        topic: "work",
        text: "The client is likely to ask for one more revision.",
        cloze: "The client _____ ask for one more revision.",
        ja: "クライアントはもう一度修正を求める可能性が高い。"
      },
      {
        topic: "travel",
        text: "We are likely to miss the transfer if we stop here.",
        cloze: "We _____ miss the transfer if we stop here.",
        ja: "ここで止まると、乗り継ぎに間に合わない可能性が高い。"
      }
    ],
    shadowPrompts: [
      "It is likely to rain after sunset.",
      "They are likely to notice the mistake."
    ]
  },
  {
    id: "not-sure-if",
    headword: "sure",
    coreChunk: "I’m not sure if",
    meaning: "〜かどうか確信がない",
    nuance: "断定を避けつつ会話を進める、柔らかい保留表現です。",
    grammarNote: "`if` の後ろは平叙文の語順です。会話ではそのまま質問の前置きに使えます。",
    relatedChunks: ["I wonder if", "I’m not certain whether", "It depends on"],
    starterExamples: [
      {
        topic: "social",
        text: "I’m not sure if this joke works in English.",
        cloze: "_____ this joke works in English.",
        ja: "この冗談が英語で通じるかどうか自信がない。"
      },
      {
        topic: "campus",
        text: "I’m not sure if the classroom has changed this week.",
        cloze: "_____ the classroom has changed this week.",
        ja: "今週、教室が変わったかどうか確信がない。"
      }
    ],
    diverseExamples: [
      {
        topic: "work",
        text: "I’m not sure if the report is ready to send yet.",
        cloze: "_____ the report is ready to send yet.",
        ja: "そのレポートが送れる状態かまだ確信がない。"
      },
      {
        topic: "travel",
        text: "I’m not sure if this train stops at Yokohama.",
        cloze: "_____ this train stops at Yokohama.",
        ja: "この電車が横浜に止まるか確信がない。"
      },
      {
        topic: "science",
        text: "I’m not sure if the data is clean enough to publish.",
        cloze: "_____ the data is clean enough to publish.",
        ja: "このデータが公開に足るほどきれいかはまだ分からない。"
      }
    ],
    shadowPrompts: [
      "I’m not sure if we have enough time.",
      "I’m not sure if this is the right file."
    ]
  },
  {
    id: "run-out-of",
    headword: "run",
    coreChunk: "run out of",
    meaning: "〜を使い切る / なくなる",
    nuance: "資源や時間が残っていない状態に向かう感覚です。",
    grammarNote: "`run out of + 名詞`。人を主語にしても、ものを主語にしてもよく使います。",
    relatedChunks: ["be short on", "use up", "have left"],
    starterExamples: [
      {
        topic: "travel",
        text: "We ran out of battery before we reached the station.",
        cloze: "We _____ battery before we reached the station.",
        ja: "駅に着く前にバッテリーが切れた。"
      },
      {
        topic: "campus",
        text: "The printer ran out of paper during finals week.",
        cloze: "The printer _____ paper during finals week.",
        ja: "試験期間中にプリンターの紙がなくなった。"
      }
    ],
    diverseExamples: [
      {
        topic: "work",
        text: "We are running out of time, so let’s make one decision now.",
        cloze: "We _____ time, so let’s make one decision now.",
        ja: "時間がなくなってきているから、今ひとつ決めよう。"
      },
      {
        topic: "science",
        text: "The reaction slows down when the cells run out of energy.",
        cloze: "The reaction slows down when the cells _____ energy.",
        ja: "細胞がエネルギーを使い切ると、その反応は遅くなる。"
      },
      {
        topic: "media",
        text: "The article argues that cities will run out of cheap water first.",
        cloze: "The article argues that cities will _____ cheap water first.",
        ja: "その記事は、都市はまず安価な水を使い果たすだろうと論じている。"
      }
    ],
    shadowPrompts: [
      "We are running out of time.",
      "The store ran out of tickets this morning."
    ]
  },
  {
    id: "be-used-to-ing",
    headword: "used",
    coreChunk: "be used to ~ing",
    meaning: "〜することに慣れている",
    nuance: "今はそれが普通になっていて、抵抗が少ない状態です。",
    grammarNote: "`used to` のあとに動詞の原形ではなく `~ing` や名詞が来ます。",
    relatedChunks: ["get used to", "be familiar with", "be comfortable with"],
    starterExamples: [
      {
        topic: "campus",
        text: "She is used to studying in noisy spaces after three years on campus.",
        cloze: "She _____ studying in noisy spaces after three years on campus.",
        ja: "彼女は3年のキャンパス生活で、騒がしい場所で勉強することに慣れている。"
      },
      {
        topic: "work",
        text: "I am used to giving short updates every morning.",
        cloze: "I _____ giving short updates every morning.",
        ja: "私は毎朝短い進捗報告をするのに慣れている。"
      }
    ],
    diverseExamples: [
      {
        topic: "travel",
        text: "They are used to walking even when the weather turns bad.",
        cloze: "They _____ walking even when the weather turns bad.",
        ja: "彼らは天気が悪くなっても歩くのに慣れている。"
      },
      {
        topic: "science",
        text: "Researchers here are used to checking raw logs by hand.",
        cloze: "Researchers here _____ checking raw logs by hand.",
        ja: "ここの研究者たちは生ログを手で確認することに慣れている。"
      },
      {
        topic: "social",
        text: "He is not used to speaking first in a group conversation.",
        cloze: "He is not _____ speaking first in a group conversation.",
        ja: "彼はグループ会話で最初に話すことに慣れていない。"
      }
    ],
    shadowPrompts: [
      "I’m used to working late on Fridays.",
      "She is used to hearing that question."
    ]
  },
  {
    id: "as-a-result",
    headword: "result",
    coreChunk: "as a result",
    meaning: "その結果として",
    nuance: "原因と結果をつなぐ、論理の見える接続表現です。",
    grammarNote: "文頭でも文中でも使えます。`as a result of` にすると後ろに名詞を取れます。",
    relatedChunks: ["therefore", "because of that", "consequently"],
    starterExamples: [
      {
        topic: "science",
        text: "The sample was stored at the wrong temperature. As a result, the signal weakened.",
        cloze: "The sample was stored at the wrong temperature. _____, the signal weakened.",
        ja: "試料は誤った温度で保存された。その結果、信号が弱くなった。"
      },
      {
        topic: "media",
        text: "The platform changed its policy, and as a result many creators left.",
        cloze: "The platform changed its policy, and _____ many creators left.",
        ja: "そのプラットフォームは方針を変え、その結果多くの制作者が離れた。"
      }
    ],
    diverseExamples: [
      {
        topic: "campus",
        text: "He missed the deadline. As a result, he had to join the next class.",
        cloze: "He missed the deadline. _____, he had to join the next class.",
        ja: "彼は締切を逃した。その結果、次のクラスに回ることになった。"
      },
      {
        topic: "work",
        text: "We simplified the form, and as a result response rates improved.",
        cloze: "We simplified the form, and _____ response rates improved.",
        ja: "フォームを簡素化し、その結果回答率が改善した。"
      },
      {
        topic: "social",
        text: "Nobody clarified the plan. As a result, everyone arrived at different times.",
        cloze: "Nobody clarified the plan. _____, everyone arrived at different times.",
        ja: "誰も計画を明確にしなかった。その結果、みんな別々の時間に来た。"
      }
    ],
    shadowPrompts: [
      "As a result, the team had to start over.",
      "The road was closed, and as a result we turned back."
    ]
  },
  {
    id: "look-forward-to",
    headword: "forward",
    coreChunk: "look forward to",
    meaning: "〜を楽しみにする",
    nuance: "先の出来事を前向きに待つ気持ちを表します。",
    grammarNote: "`to` のあとに動詞を置くときは `~ing` です。`look forward to meet` にはなりません。",
    relatedChunks: ["can’t wait to", "be excited about", "hope to"],
    starterExamples: [
      {
        topic: "social",
        text: "I’m looking forward to seeing everyone after exams.",
        cloze: "I’m _____ seeing everyone after exams.",
        ja: "試験のあとにみんなに会うのを楽しみにしている。"
      },
      {
        topic: "work",
        text: "We look forward to hearing your feedback next week.",
        cloze: "We _____ hearing your feedback next week.",
        ja: "来週フィードバックをいただけるのを楽しみにしています。"
      }
    ],
    diverseExamples: [
      {
        topic: "campus",
        text: "New students look forward to joining their first seminar.",
        cloze: "New students _____ joining their first seminar.",
        ja: "新入生は初めてのゼミ参加を楽しみにしている。"
      },
      {
        topic: "travel",
        text: "She is looking forward to walking by the river again.",
        cloze: "She is _____ walking by the river again.",
        ja: "彼女はまた川沿いを歩けるのを楽しみにしている。"
      },
      {
        topic: "media",
        text: "Fans are looking forward to the final episode tonight.",
        cloze: "Fans are _____ the final episode tonight.",
        ja: "ファンは今夜の最終話を楽しみにしている。"
      }
    ],
    shadowPrompts: [
      "I’m looking forward to working with you.",
      "We look forward to seeing the results."
    ]
  },
  {
    id: "it-turns-out-that",
    headword: "turn",
    coreChunk: "it turns out that",
    meaning: "結局〜だと分かる",
    nuance: "最初の想定と違って、あとで分かった事実を示します。",
    grammarNote: "会話でも文章でも使えます。後ろは平叙文です。",
    relatedChunks: ["it turns out", "in the end", "apparently"],
    starterExamples: [
      {
        topic: "science",
        text: "It turns out that the noise came from the sensor, not the sample.",
        cloze: "_____ the noise came from the sensor, not the sample.",
        ja: "結局、ノイズは試料ではなくセンサー由来だと分かった。"
      },
      {
        topic: "social",
        text: "It turns out that she already knew the answer.",
        cloze: "_____ she already knew the answer.",
        ja: "結局、彼女はすでに答えを知っていたと分かった。"
      }
    ],
    diverseExamples: [
      {
        topic: "work",
        text: "It turns out that the simplest plan was the best one.",
        cloze: "_____ the simplest plan was the best one.",
        ja: "結局、いちばん単純な計画が最善だった。"
      },
      {
        topic: "campus",
        text: "It turns out that the room change was posted yesterday.",
        cloze: "_____ the room change was posted yesterday.",
        ja: "結局、教室変更は昨日掲示されていた。"
      },
      {
        topic: "media",
        text: "It turns out that the rumor was only half true.",
        cloze: "_____ the rumor was only half true.",
        ja: "結局、その噂は半分しか本当ではなかった。"
      }
    ],
    shadowPrompts: [
      "It turns out that we were early.",
      "It turns out that he was right."
    ]
  },
  {
    id: "in-charge-of",
    headword: "charge",
    coreChunk: "be in charge of",
    meaning: "〜を担当している / 責任を持っている",
    nuance: "実務レベルの担当だけでなく、責任範囲を持つ感じがあります。",
    grammarNote: "`in charge of + 名詞 / 動名詞` で使います。",
    relatedChunks: ["handle", "take care of", "be responsible for"],
    starterExamples: [
      {
        topic: "work",
        text: "She is in charge of onboarding new team members this month.",
        cloze: "She _____ onboarding new team members this month.",
        ja: "彼女は今月、新しいチームメンバーの受け入れを担当している。"
      },
      {
        topic: "campus",
        text: "I’m in charge of booking the room for the workshop.",
        cloze: "I’m _____ booking the room for the workshop.",
        ja: "私はワークショップの部屋予約を担当している。"
      }
    ],
    diverseExamples: [
      {
        topic: "science",
        text: "He is in charge of cleaning the data before analysis.",
        cloze: "He _____ cleaning the data before analysis.",
        ja: "彼は解析前のデータクリーニングを担当している。"
      },
      {
        topic: "social",
        text: "Who is in charge of choosing the place for dinner?",
        cloze: "Who _____ choosing the place for dinner?",
        ja: "夕食の店選びは誰の担当？"
      },
      {
        topic: "media",
        text: "The producer is in charge of the final cut.",
        cloze: "The producer _____ the final cut.",
        ja: "最終編集はそのプロデューサーの担当だ。"
      }
    ],
    shadowPrompts: [
      "I’m in charge of the schedule this week.",
      "Who is in charge of the final review?"
    ]
  }
];

export const ENGLISH_CHUNK_LIBRARY = ENGLISH_TARGET1900_LIBRARY.length
  ? ENGLISH_TARGET1900_LIBRARY
  : ENGLISH_SAMPLE_CHUNK_LIBRARY;

const ENGLISH_FAMILY_INDEX = ENGLISH_CHUNK_LIBRARY.reduce((familyMap, chunk) => {
  const familyKey = getEnglishFamilyKey(chunk);
  const current = familyMap.get(familyKey) || [];
  familyMap.set(familyKey, [...current, chunk]);
  return familyMap;
}, new Map());

export function getEnglishFamilyMembers(chunkId, { includeSelf = false } = {}) {
  const chunk = ENGLISH_CHUNK_LIBRARY.find((item) => item.id === chunkId);
  if (!chunk) return [];

  const familyMembers = ENGLISH_FAMILY_INDEX.get(getEnglishFamilyKey(chunk)) || [chunk];

  return familyMembers
    .filter((member) => includeSelf || member.id !== chunk.id)
    .sort((left, right) => {
      if ((left.order || 0) !== (right.order || 0)) return (left.order || 0) - (right.order || 0);
      return left.headword.localeCompare(right.headword);
    });
}

function createEmptyEnglishChunkProgress() {
  return {
    stage: "new",
    seenCount: 0,
    shadowCount: 0,
    reviewCount: 0,
    reviewStep: 0,
    correctCount: 0,
    incorrectCount: 0,
    streak: 0,
    ease: 2.3,
    nextReviewAt: 0,
    lastSeenAt: 0,
    lastShadowAt: 0,
    contextsSeen: [],
    notesTone: "gentle"
  };
}

export function createEmptyEnglishProgress() {
  return {};
}

export function getEnglishProgressForId(progressMap, chunkId) {
  return {
    ...createEmptyEnglishChunkProgress(),
    ...(progressMap?.[chunkId] || {})
  };
}

export function compactEnglishProgressMap(progressMap) {
  return Object.fromEntries(
    Object.entries(progressMap || {}).filter(([, progress]) => hasMeaningfulProgress(progress))
  );
}

export function getEnglishDashboard(progressMap, now = Date.now()) {
  const chunks = ENGLISH_CHUNK_LIBRARY.map((chunk) => getEnglishProgressForId(progressMap, chunk.id));
  const dueIds = ENGLISH_CHUNK_LIBRARY.filter((chunk) => {
    const progress = getEnglishProgressForId(progressMap, chunk.id);
    return progress.stage !== "new" && progress.nextReviewAt > 0 && progress.nextReviewAt <= now;
  }).map((chunk) => chunk.id);

  const contexts = new Set(
    chunks.flatMap((progress) => progress.contextsSeen || [])
  );

  return {
    newCount: chunks.filter((progress) => progress.stage === "new").length,
    dueCount: dueIds.length,
    dueIds,
    learnedCount: chunks.filter((progress) => progress.stage !== "new").length,
    masteredCount: chunks.filter((progress) => progress.reviewStep >= ENGLISH_REVIEW_STEPS.length - 1).length,
    shadowCount: chunks.reduce((sum, progress) => sum + progress.shadowCount, 0),
    contextCount: contexts.size
  };
}

export function getEnglishRecommendedChunkIds(progressMap, focusTopic = "all", now = Date.now()) {
  return [...ENGLISH_CHUNK_LIBRARY]
    .sort((left, right) => {
      const leftProgress = getEnglishProgressForId(progressMap, left.id);
      const rightProgress = getEnglishProgressForId(progressMap, right.id);
      const leftDue = leftProgress.stage !== "new" && leftProgress.nextReviewAt > 0 && leftProgress.nextReviewAt <= now;
      const rightDue = rightProgress.stage !== "new" && rightProgress.nextReviewAt > 0 && rightProgress.nextReviewAt <= now;
      const leftTopic = focusTopic === "all" ? 0 : hasTopic(left, focusTopic) ? 1 : 0;
      const rightTopic = focusTopic === "all" ? 0 : hasTopic(right, focusTopic) ? 1 : 0;

      if (leftDue !== rightDue) return leftDue ? -1 : 1;
      if (leftProgress.stage !== rightProgress.stage) return stageRank(leftProgress.stage) - stageRank(rightProgress.stage);
      if (leftTopic !== rightTopic) return rightTopic - leftTopic;
      if (leftProgress.seenCount !== rightProgress.seenCount) return leftProgress.seenCount - rightProgress.seenCount;
      if ((left.order || 0) !== (right.order || 0)) return (left.order || 0) - (right.order || 0);
      return left.coreChunk.localeCompare(right.coreChunk);
    })
    .map((chunk) => chunk.id);
}

export function getExamplesForFocus(chunk, focusTopic = "all") {
  if (focusTopic === "all") return chunk.diverseExamples;
  const matched = chunk.diverseExamples.filter((example) => example.topic === focusTopic);
  const rest = chunk.diverseExamples.filter((example) => example.topic !== focusTopic);
  return [...matched, ...rest];
}

export function markChunkLearned(progressMap, chunk, tone = "gentle", now = Date.now()) {
  const current = getEnglishProgressForId(progressMap, chunk.id);
  const starterTopics = chunk.starterExamples.map((example) => example.topic);
  const reviewStep = clampReviewStep(current.reviewStep);
  const nextReviewAt = current.nextReviewAt && current.nextReviewAt > now
    ? current.nextReviewAt
    : now + getReviewIntervalMs(reviewStep);

  return {
    ...progressMap,
    [chunk.id]: {
      ...current,
      stage: current.stage === "new" ? "learning" : current.stage,
      reviewStep,
      seenCount: current.seenCount + 1,
      lastSeenAt: now,
      nextReviewAt,
      contextsSeen: uniqueStrings([...(current.contextsSeen || []), ...starterTopics]),
      notesTone: tone
    }
  };
}

export function markShadowComplete(progressMap, chunk, topic, durationMs, now = Date.now()) {
  const current = getEnglishProgressForId(progressMap, chunk.id);
  const reviewStep = clampReviewStep(current.reviewStep);
  const nextReviewAt = current.nextReviewAt && current.nextReviewAt > now
    ? current.nextReviewAt
    : now + getReviewIntervalMs(reviewStep);

  return {
    ...progressMap,
    [chunk.id]: {
      ...current,
      stage: current.stage === "new" ? "learning" : current.stage,
      reviewStep,
      shadowCount: current.shadowCount + 1,
      lastShadowAt: now,
      lastSeenAt: now,
      nextReviewAt,
      contextsSeen: uniqueStrings([...(current.contextsSeen || []), topic].filter(Boolean)),
      lastShadowDurationMs: durationMs
    }
  };
}

export function markReviewResult(progressMap, chunkId, quality, topic, now = Date.now()) {
  const current = getEnglishProgressForId(progressMap, chunkId);
  const nextState = getNextReviewState(current, quality >= 2, now);

  return {
    ...progressMap,
    [chunkId]: {
      ...current,
      stage: nextState.stage,
      reviewCount: current.reviewCount + 1,
      reviewStep: nextState.reviewStep,
      correctCount: current.correctCount + (quality >= 2 ? 1 : 0),
      incorrectCount: current.incorrectCount + (quality >= 2 ? 0 : 1),
      streak: quality >= 2 ? current.streak + 1 : 0,
      ease: current.ease,
      nextReviewAt: nextState.nextReviewAt,
      lastSeenAt: now,
      contextsSeen: uniqueStrings([...(current.contextsSeen || []), topic].filter(Boolean))
    }
  };
}

export function recordStudyAttempt(progressMap, chunk, wasCorrect, topic, now = Date.now()) {
  const current = getEnglishProgressForId(progressMap, chunk.id);
  const nextState = getNextReviewState(current, wasCorrect, now);

  return {
    ...progressMap,
    [chunk.id]: {
      ...current,
      stage: nextState.stage,
      seenCount: current.seenCount + 1,
      reviewCount: current.reviewCount + 1,
      reviewStep: nextState.reviewStep,
      correctCount: current.correctCount + (wasCorrect ? 1 : 0),
      incorrectCount: current.incorrectCount + (wasCorrect ? 0 : 1),
      streak: wasCorrect ? current.streak + 1 : 0,
      ease: current.ease,
      nextReviewAt: nextState.nextReviewAt,
      lastSeenAt: now,
      contextsSeen: uniqueStrings([...(current.contextsSeen || []), topic].filter(Boolean))
    }
  };
}

export function getEnglishReviewStepLabel(reviewStep = 0) {
  return ENGLISH_REVIEW_STEPS[clampReviewStep(reviewStep)].label;
}

export function buildMeaningOptions(chunkId) {
  const chunk = ENGLISH_CHUNK_LIBRARY.find((item) => item.id === chunkId);
  const distractors = ENGLISH_CHUNK_LIBRARY.filter((item) => item.id !== chunkId)
    .slice(0, 3)
    .map((item) => item.meaning);

  return shuffleStrings([chunk.meaning, ...distractors]);
}

export function buildChunkOptions(chunkId) {
  const chunk = ENGLISH_CHUNK_LIBRARY.find((item) => item.id === chunkId);
  const distractors = ENGLISH_CHUNK_LIBRARY.filter((item) => item.id !== chunkId)
    .slice(0, 3)
    .map((item) => item.coreChunk);

  return shuffleStrings([chunk.coreChunk, ...distractors]);
}

function stageRank(stage) {
  return ["new", "learning", "reviewing", "solid"].indexOf(stage);
}

function hasTopic(chunk, topic) {
  return [...chunk.starterExamples, ...chunk.diverseExamples].some((example) => example.topic === topic);
}

function getEnglishFamilyKey(chunk) {
  return chunk.family || chunk.headword || chunk.id;
}

function getNextReviewState(current, wasCorrect, now) {
  const currentStep = clampReviewStep(current.reviewStep);
  const isNewItem = current.stage === "new" || current.seenCount === 0;
  const isDue = !current.nextReviewAt || current.nextReviewAt <= now;

  if (isNewItem) {
    return {
      reviewStep: 0,
      nextReviewAt: now + getReviewIntervalMs(0),
      stage: "learning"
    };
  }

  if (!wasCorrect) {
    const reviewStep = Math.max(currentStep - 1, 0);
    return {
      reviewStep,
      nextReviewAt: now + getReviewIntervalMs(reviewStep),
      stage: getStageFromReviewStep(reviewStep)
    };
  }

  if (!isDue) {
    return {
      reviewStep: currentStep,
      nextReviewAt: current.nextReviewAt,
      stage: getStageFromReviewStep(currentStep)
    };
  }

  const reviewStep = Math.min(currentStep + 1, ENGLISH_REVIEW_STEPS.length - 1);
  return {
    reviewStep,
    nextReviewAt: now + getReviewIntervalMs(reviewStep),
    stage: getStageFromReviewStep(reviewStep)
  };
}

function getReviewIntervalMs(reviewStep) {
  return ENGLISH_REVIEW_STEPS[clampReviewStep(reviewStep)].delayMs;
}

function getStageFromReviewStep(reviewStep) {
  if (reviewStep <= 0) return "learning";
  if (reviewStep >= ENGLISH_REVIEW_STEPS.length - 1) return "solid";
  return "reviewing";
}

function uniqueStrings(items) {
  return [...new Set(items)];
}

function hasMeaningfulProgress(progress) {
  if (!progress) return false;
  return Boolean(
    progress.seenCount ||
    progress.shadowCount ||
    progress.reviewCount ||
    progress.correctCount ||
    progress.incorrectCount ||
    progress.streak ||
    progress.nextReviewAt ||
    progress.lastSeenAt ||
    progress.lastShadowAt ||
    progress.lastShadowDurationMs ||
    (progress.contextsSeen && progress.contextsSeen.length) ||
    (progress.stage && progress.stage !== "new") ||
    (progress.reviewStep && progress.reviewStep > 0)
  );
}

function shuffleStrings(values) {
  const copied = [...values];
  for (let index = copied.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [copied[index], copied[swapIndex]] = [copied[swapIndex], copied[index]];
  }
  return copied;
}

function clampReviewStep(value) {
  return Math.max(0, Math.min(ENGLISH_REVIEW_STEPS.length - 1, value || 0));
}
