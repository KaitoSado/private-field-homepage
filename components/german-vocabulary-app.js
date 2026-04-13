"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";
import {
  DEFAULT_GERMAN_REVIEW_DAY_OFFSETS,
  GERMAN_MODE_TABS,
  GERMAN_POS_OPTIONS,
  GERMAN_VOCABULARY_LIBRARY,
  compactGermanProgressMap,
  createEmptyGermanProgress,
  getGermanPosLabel,
  getGermanProgressForId,
  getGermanRecommendedIds,
  getGermanReviewStepLabel,
  isGermanLongTermProgress,
  mergeGermanSyncedProgressMaps,
  normalizeGermanReviewDayOffsets,
  recordGermanStudyAttempt
} from "@/lib/german-content";

const STORAGE_BASE_KEY = "new-commune:german-vocabulary:v1";
const DEFAULT_QUESTION_SECONDS = 4;
const DEFAULT_ANSWER_SECONDS = 5;
const ACTIVE_MODE_IDS = new Set(GERMAN_MODE_TABS.map((tab) => tab.id));
const ACTIVE_POS_IDS = new Set(GERMAN_POS_OPTIONS.map((option) => option.id));
const GERMAN_REVIEW_PRESETS = [
  { id: "standard", label: "標準", days: DEFAULT_GERMAN_REVIEW_DAY_OFFSETS },
  { id: "short", label: "短期", days: [0, 1, 2, 3, 7] },
  { id: "middle", label: "中期", days: [0, 1, 3, 7, 14] }
];

function getGermanArticleTone(article) {
  if (article === "der") return "masculine";
  if (article === "die") return "feminine";
  if (article === "das") return "neuter";
  return "unknown";
}

function getGermanGenderLabel(gender) {
  if (gender === "masculine") return "男性";
  if (gender === "feminine") return "女性";
  if (gender === "neuter") return "中性";
  if (gender === "plural") return "複数扱い";
  return "";
}

export function GermanVocabularyApp() {
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const [hydrated, setHydrated] = useState(false);
  const [session, setSession] = useState(null);
  const [storageOwnerId, setStorageOwnerId] = useState("");
  const [progressMap, setProgressMap] = useState(() => createEmptyGermanProgress());
  const [attemptHistory, setAttemptHistory] = useState([]);
  const [mode, setMode] = useState("study");
  const [posFilter, setPosFilter] = useState("all");
  const [questionSeconds, setQuestionSeconds] = useState(DEFAULT_QUESTION_SECONDS);
  const [answerSeconds, setAnswerSeconds] = useState(DEFAULT_ANSWER_SECONDS);
  const [reviewDayOffsets, setReviewDayOffsets] = useState(DEFAULT_GERMAN_REVIEW_DAY_OFFSETS);
  const [isAutoSpeakEnabled, setIsAutoSpeakEnabled] = useState(true);
  const [studyTimerPhase, setStudyTimerPhase] = useState("question");
  const [syncStatus, setSyncStatus] = useState("local");
  const [syncError, setSyncError] = useState("");
  const [selectedEntryId, setSelectedEntryId] = useState(GERMAN_VOCABULARY_LIBRARY[0]?.id || "");
  const [sessionStep, setSessionStep] = useState(1);
  const [queueSeed, setQueueSeed] = useState(0);
  const [sessionAnsweredIds, setSessionAnsweredIds] = useState(() => new Set());
  const [judgeFlash, setJudgeFlash] = useState("");
  const judgeFlashTimer = useRef(null);
  const answerRevealedAtRef = useRef(0);
  const studySessionRef = useRef({ id: `de-${Date.now()}`, startedAt: Date.now(), wordCount: 0 });

  const entryMap = useMemo(
    () => Object.fromEntries(GERMAN_VOCABULARY_LIBRARY.map((entry) => [entry.id, entry])),
    []
  );
  const storageKey = storageOwnerId ? `${STORAGE_BASE_KEY}:${storageOwnerId}` : "";

  useEffect(() => {
    let mounted = true;

    async function loadSessionOwner() {
      const {
        data: { session }
      } = await supabase.auth.getSession();

      if (!mounted) return;
      setSession(session);
      setStorageOwnerId(session?.user?.id || "guest");
    }

    loadSessionOwner();

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setStorageOwnerId(nextSession?.user?.id || "guest");
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  useEffect(() => {
    if (typeof window === "undefined" || !storageKey) return;

    let cancelled = false;
    setHydrated(false);

    async function hydrateGermanProgress() {
      const localSnapshot = readLocalGermanSnapshot(storageKey);
      const remoteResult = session?.user?.id
        ? await fetchRemoteGermanSnapshot(supabase, session.user.id)
        : { snapshot: null, error: "" };

      if (cancelled) return;

      const mergedSnapshot = mergeGermanSnapshots(localSnapshot, remoteResult.snapshot);
      applyGermanSnapshot(mergedSnapshot);

      if (session?.user?.id && !remoteResult.error) {
        setSyncStatus("synced");
        setSyncError("");
      } else if (session?.user?.id) {
        setSyncStatus("local");
        setSyncError(remoteResult.error);
      } else {
        setSyncStatus("local");
        setSyncError("");
      }

      setHydrated(true);
    }

    hydrateGermanProgress();

    return () => {
      cancelled = true;
    };
  }, [entryMap, session?.user?.id, storageKey, supabase]);

  useEffect(() => {
    if (!hydrated || typeof window === "undefined" || !storageKey) return;

    const snapshot = buildGermanSnapshot({
      progressMap,
      attemptHistory,
      settings: {
        mode,
        posFilter,
        questionSeconds,
        answerSeconds,
        reviewDayOffsets,
        isAutoSpeakEnabled,
        selectedEntryId
      }
    });

    window.localStorage.setItem(storageKey, JSON.stringify(snapshot));

    if (!session?.user?.id) return;

    setSyncStatus("syncing");
    setSyncError("");
    const syncTimer = window.setTimeout(async () => {
      const result = await saveRemoteGermanSnapshot(supabase, session.user.id, snapshot);
      if (result.ok) {
        setSyncStatus("synced");
        setSyncError("");
      } else {
        setSyncStatus("local");
        setSyncError(result.message);
      }
    }, 900);

    return () => window.clearTimeout(syncTimer);
  }, [answerSeconds, attemptHistory, hydrated, isAutoSpeakEnabled, mode, posFilter, progressMap, questionSeconds, reviewDayOffsets, selectedEntryId, session?.user?.id, storageKey, supabase]);

  useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const baseRecommendedIds = useMemo(
    () => getGermanRecommendedIds(progressMap, { posFilter, seed: queueSeed }),
    [posFilter, progressMap, queueSeed]
  );
  const recommendedIds = useMemo(() => {
    const filteredIds = baseRecommendedIds.filter((id) => !sessionAnsweredIds.has(id));
    return filteredIds.length ? filteredIds : baseRecommendedIds;
  }, [baseRecommendedIds, sessionAnsweredIds]);

  useEffect(() => {
    if (hydrated && queueSeed === 0) {
      const nextSeed = Date.now();
      const nextIds = getGermanRecommendedIds(progressMap, { posFilter, seed: nextSeed });
      setQueueSeed(nextSeed);
      if (nextIds.length) setSelectedEntryId(nextIds[0]);
    }
  }, [hydrated, posFilter, progressMap, queueSeed]);

  useEffect(() => {
    if (mode === "study" && recommendedIds.length && !recommendedIds.includes(selectedEntryId)) {
      setSelectedEntryId(recommendedIds[0]);
    }
  }, [mode, recommendedIds, selectedEntryId]);

  useEffect(() => {
    setStudyTimerPhase("question");
  }, [mode, selectedEntryId]);

  useEffect(() => {
    if (!hydrated || mode !== "study" || !recommendedIds.length) return;
    if (studyTimerPhase === "ready") return;

    const duration = studyTimerPhase === "question" ? questionSeconds : answerSeconds;
    const timer = window.setTimeout(() => {
      setStudyTimerPhase((current) => {
        if (current === "question") {
          answerRevealedAtRef.current = Date.now();
          return "answer";
        }
        if (current === "answer") return "ready";
        return current;
      });
    }, duration * 1000);

    return () => window.clearTimeout(timer);
  }, [answerSeconds, hydrated, mode, questionSeconds, recommendedIds.length, studyTimerPhase]);

  const selectedEntry = entryMap[selectedEntryId] || GERMAN_VOCABULARY_LIBRARY[0];
  const selectedProgress = getGermanProgressForId(progressMap, selectedEntry?.id);
  const isSelectedLongTerm = isGermanLongTermProgress(selectedProgress);
  const studyPosition = recommendedIds.indexOf(selectedEntry?.id);
  const sessionTotal = recommendedIds.length;
  const isAnswerVisible = studyTimerPhase !== "question";
  const activeTimerSeconds = studyTimerPhase === "question" ? questionSeconds : answerSeconds;
  const longTermWordList = useMemo(() => {
    return GERMAN_VOCABULARY_LIBRARY
      .map((entry) => {
        const progress = getGermanProgressForId(progressMap, entry.id);
        return {
          entryId: entry.id,
          headword: entry.headword,
          meaning: entry.meaning,
          isLongTerm: isGermanLongTermProgress(progress),
          longTermAt: progress.longTermAt || progress.lastSeenAt || 0,
          correctCount: progress.correctCount
        };
      })
      .filter((entry) => entry.isLongTerm)
      .sort((left, right) => right.longTermAt - left.longTermAt);
  }, [progressMap]);
  const longTermCount = longTermWordList.length;
  const progressRatio = GERMAN_VOCABULARY_LIBRARY.length ? longTermCount / GERMAN_VOCABULARY_LIBRARY.length : 0;
  const wrongWordList = useMemo(() => {
    const now = Date.now();

    return GERMAN_VOCABULARY_LIBRARY
      .map((entry) => {
        const progress = getGermanProgressForId(progressMap, entry.id);
        return {
          entryId: entry.id,
          headword: entry.headword,
          meaning: entry.meaning,
          wrongCount: progress.incorrectCount,
          reviewStep: progress.reviewStep,
          nextReviewAt: progress.nextReviewAt,
          lastAnsweredAt: progress.lastSeenAt,
          isDue: progress.nextReviewAt > 0 && progress.nextReviewAt <= now
        };
      })
      .filter((entry) => entry.wrongCount > 0 && !isGermanLongTermProgress(getGermanProgressForId(progressMap, entry.entryId)))
      .sort((left, right) => {
        if (left.isDue !== right.isDue) return left.isDue ? -1 : 1;
        if (left.reviewStep !== right.reviewStep) return left.reviewStep - right.reviewStep;
        return right.lastAnsweredAt - left.lastAnsweredAt;
      });
  }, [progressMap]);
  const visibleWrongWords = wrongWordList.slice(0, 36);
  const hiddenWrongWords = wrongWordList.slice(36);
  const visibleLongTermWords = longTermWordList.slice(0, 36);
  const hiddenLongTermWords = longTermWordList.slice(36);
  const pendingFutureReviewCount = wrongWordList.filter((entry) => entry.nextReviewAt > Date.now()).length;
  const dataCoverage = useMemo(() => {
    const nouns = GERMAN_VOCABULARY_LIBRARY.filter((entry) => entry.pos === "noun");
    const meaningCount = GERMAN_VOCABULARY_LIBRARY.filter((entry) => entry.meaning !== "意味未登録").length;
    const nounGenderCount = nouns.filter((entry) => entry.article && entry.gender).length;
    const nounPluralCount = nouns.filter((entry) => entry.plural).length;

    return {
      meaningCount,
      nounCount: nouns.length,
      nounGenderCount,
      nounPluralCount
    };
  }, []);

  const studyStats = useMemo(() => {
    const now = Date.now();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const todayMs = todayStart.getTime();
    const todayAttempts = attemptHistory.filter((attempt) => attempt.answeredAt >= todayMs && attempt.result !== "skip");
    const todayWords = new Set(todayAttempts.map((attempt) => attempt.entryId)).size;
    const judgedAttempts = todayAttempts.filter((attempt) => attempt.responseMs != null && attempt.responseMs > 0);
    const quickCount = judgedAttempts.filter((attempt) => attempt.responseMs <= 2000).length;
    return {
      todayWords,
      quickCount,
      judgedCount: judgedAttempts.length,
      quickRatio: judgedAttempts.length ? quickCount / judgedAttempts.length : 0
    };
  }, [attemptHistory]);

  function handleSelectEntry(entryId) {
    setSelectedEntryId(entryId);
    setMode("study");
  }

  function handleSelectMemoryEntry(entryId) {
    setSelectedEntryId(entryId);
    setMode("memory");
  }

  function handlePosFilterChange(nextPosFilter) {
    const nextSeed = Date.now();
    const nextIds = getGermanRecommendedIds(progressMap, { posFilter: nextPosFilter, seed: nextSeed });
    setSessionAnsweredIds(new Set());
    setPosFilter(nextPosFilter);
    setSessionStep(1);
    setQueueSeed(nextSeed);
    if (nextIds.length) setSelectedEntryId(nextIds[0]);
  }

  function handleQuestionSecondsChange(event) {
    setQuestionSeconds(clampStudySeconds(Number(event.target.value)));
    setStudyTimerPhase("question");
  }

  function handleAnswerSecondsChange(event) {
    setAnswerSeconds(clampStudySeconds(Number(event.target.value)));
    setStudyTimerPhase("question");
  }

  function applyTimingPreset(nextQuestionSeconds, nextAnswerSeconds) {
    setQuestionSeconds(clampStudySeconds(nextQuestionSeconds));
    setAnswerSeconds(clampStudySeconds(nextAnswerSeconds));
    setStudyTimerPhase("question");
  }

  function handleReviewDayChange(index, value) {
    const nextReviewDayOffsets = [...reviewDayOffsets];
    nextReviewDayOffsets[index] = clampReviewDayOffset(Number(value));
    setReviewDayOffsets(normalizeGermanReviewDayOffsets(nextReviewDayOffsets));
  }

  function applyReviewPreset(days) {
    setReviewDayOffsets(normalizeGermanReviewDayOffsets(days));
  }

  function advanceWithProgress(nextProgressMap, blockedIds = sessionAnsweredIds) {
    const baseNextIds = getGermanRecommendedIds(nextProgressMap, { posFilter, seed: queueSeed });
    let nextIds = baseNextIds.filter((id) => !blockedIds.has(id));

    if (!nextIds.length) {
      setSessionAnsweredIds(new Set());
      nextIds = baseNextIds;
      if (!nextIds.length) {
        setSessionStep(1);
        return;
      }
    }

    const currentIndex = nextIds.indexOf(selectedEntry.id);
    if (currentIndex < 0) {
      setSelectedEntryId(nextIds[0]);
      setSessionStep((current) => Math.min(current + 1, nextIds.length));
      return;
    }

    const nextIndex = (currentIndex + 1) % nextIds.length;

    if (nextIndex === 0) {
      const nextSeed = Date.now();
      const reshuffledBaseIds = getGermanRecommendedIds(nextProgressMap, { posFilter, seed: nextSeed });
      const reshuffledIds = reshuffledBaseIds.filter((id) => !blockedIds.has(id));
      setQueueSeed(nextSeed);
      setSessionStep(1);
      if (reshuffledIds.length) {
        setSelectedEntryId(reshuffledIds[0]);
      } else {
        setSessionAnsweredIds(new Set());
        if (reshuffledBaseIds.length) setSelectedEntryId(reshuffledBaseIds[0]);
      }
    } else {
      setSelectedEntryId(nextIds[nextIndex]);
      setSessionStep((current) => Math.min(current + 1, nextIds.length));
    }
  }

  function handleStudyAction(wasCorrect) {
    if (mode !== "study" || !recommendedIds.length || !selectedEntry) return;

    if (judgeFlashTimer.current) clearTimeout(judgeFlashTimer.current);
    setJudgeFlash(wasCorrect ? "correct" : "wrong");
    judgeFlashTimer.current = setTimeout(() => setJudgeFlash(""), 350);

    const now = Date.now();
    const responseMs = answerRevealedAtRef.current > 0 ? now - answerRevealedAtRef.current : null;
    studySessionRef.current.wordCount += 1;
    const nextProgressMap = recordGermanStudyAttempt(progressMap, selectedEntry, wasCorrect, now, reviewDayOffsets);
    const nextSessionAnsweredIds = new Set(sessionAnsweredIds);
    nextSessionAnsweredIds.add(selectedEntry.id);

    setProgressMap(nextProgressMap);
    setSessionAnsweredIds(nextSessionAnsweredIds);
    setAttemptHistory((current) => [
      {
        id: `${selectedEntry.id}-${now}`,
        entryId: selectedEntry.id,
        headword: selectedEntry.headword,
        result: wasCorrect ? "correct" : "wrong",
        answeredAt: now,
        responseMs,
        timerPhase: studyTimerPhase,
        sessionId: studySessionRef.current.id
      },
      ...current
    ].slice(0, 2500));
    advanceWithProgress(nextProgressMap, nextSessionAnsweredIds);
  }

  function handleSkipEntry() {
    if (mode !== "study" || !recommendedIds.length || !selectedEntry) return;
    if (judgeFlashTimer.current) clearTimeout(judgeFlashTimer.current);
    setJudgeFlash("skip");
    judgeFlashTimer.current = setTimeout(() => setJudgeFlash(""), 350);

    const now = Date.now();
    const nextSessionAnsweredIds = new Set(sessionAnsweredIds);
    nextSessionAnsweredIds.add(selectedEntry.id);
    setSessionAnsweredIds(nextSessionAnsweredIds);
    setAttemptHistory((current) => [
      {
        id: `${selectedEntry.id}-${now}`,
        entryId: selectedEntry.id,
        headword: selectedEntry.headword,
        result: "skip",
        answeredAt: now,
        responseMs: null,
        timerPhase: studyTimerPhase,
        sessionId: studySessionRef.current.id
      },
      ...current
    ].slice(0, 2500));
    advanceWithProgress(progressMap, nextSessionAnsweredIds);
  }

  useEffect(() => {
    if (!hydrated || !isAutoSpeakEnabled || mode !== "study" || !recommendedIds.length || !selectedEntry) return;
    const timer = window.setTimeout(() => handleSpeak(selectedEntry.coreChunk || selectedEntry.headword), 180);
    return () => window.clearTimeout(timer);
  }, [hydrated, isAutoSpeakEnabled, mode, recommendedIds.length, selectedEntry?.coreChunk, selectedEntry?.headword, selectedEntry?.id]);

  useEffect(() => {
    if (mode !== "study" || !recommendedIds.length) return;

    const onKeyDown = (event) => {
      if (event.repeat) return;
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        handleStudyAction(false);
      }
      if (event.key === "ArrowRight") {
        event.preventDefault();
        handleStudyAction(true);
      }
      if (event.key === "ArrowUp") {
        event.preventDefault();
        handleSkipEntry();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  function handleSpeak(text) {
    if (typeof window === "undefined" || !window.speechSynthesis || !text) return;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "de-DE";
    utterance.rate = 0.9;
    utterance.pitch = 1;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  }

  function handleStopSpeech() {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
  }

  function applyGermanSnapshot(snapshot) {
    const settings = normalizeGermanSnapshotSettings(snapshot.settings || {});

    setProgressMap(compactGermanProgressMap(snapshot.progressMap || {}));
    setAttemptHistory(Array.isArray(snapshot.attemptHistory) ? snapshot.attemptHistory : []);
    setMode(settings.mode);
    setPosFilter(settings.posFilter);
    setQuestionSeconds(settings.questionSeconds);
    setAnswerSeconds(settings.answerSeconds);
    setReviewDayOffsets(settings.reviewDayOffsets);
    setIsAutoSpeakEnabled(settings.isAutoSpeakEnabled);
    setSelectedEntryId(entryMap[settings.selectedEntryId] ? settings.selectedEntryId : GERMAN_VOCABULARY_LIBRARY[0].id);
    setStudyTimerPhase("question");
  }

  if (!selectedEntry) {
    return (
      <div className="english-shell">
        <section className="surface english-review-card">
          <h2>ドイツ語データがありません</h2>
          <p className="english-feedback-text">seed JSON を確認してください。</p>
        </section>
      </div>
    );
  }

  return (
    <div className="english-shell">
      <section className="english-main-grid">
        <section className="surface english-stage-card">
          {mode === "study" ? (
            <div className="english-pane-stack">
              <div className="english-study-topline">
                <span>残り {sessionTotal} / {GERMAN_VOCABULARY_LIBRARY.length}</span>
                <span>{Math.max(0, studyPosition + 1)}問目</span>
              </div>

              {recommendedIds.length ? (
                <section className="english-study-card">
                  <div className="english-study-sheet">
                    {selectedEntry.pos === "noun" && selectedEntry.article ? (
                      <p className="english-study-word german-study-word">
                        <span className={`german-article-mark is-${getGermanArticleTone(selectedEntry.article)}`}>
                          {selectedEntry.article}
                        </span>
                        <span>{selectedEntry.headword}</span>
                      </p>
                    ) : (
                      <p className="english-study-word">{selectedEntry.headword}</p>
                    )}

                    <div className="english-study-timer">
                      <div className="english-study-timer-line">
                        <i
                          key={`${selectedEntry.id}-${studyTimerPhase}-${sessionStep}`}
                          style={{ "--timer-duration": `${activeTimerSeconds}s` }}
                        />
                      </div>
                      {studyTimerPhase !== "ready" && (
                        <span>{studyTimerPhase === "question" ? `${questionSeconds}秒` : `${answerSeconds}秒`}</span>
                      )}
                    </div>

                    <div className={`english-study-answer ${isAnswerVisible ? "is-visible" : "is-hidden"}`}>
                      <strong>{selectedEntry.meaning}</strong>
                    </div>

                    <div
                      className={`english-family-strip german-form-strip ${isAnswerVisible ? "is-visible" : "is-hidden"}`}
                      aria-label="ドイツ語の変化情報"
                    >
                      <div>
                        <span className="english-family-chip german-form-chip">
                          <strong>{getGermanPosLabel(selectedEntry.pos)}</strong>
                        </span>
                        {selectedEntry.gender ? (
                          <span className="english-family-chip german-form-chip">
                            <strong>{getGermanGenderLabel(selectedEntry.gender)}</strong>
                            <small>性</small>
                          </span>
                        ) : null}
                        {selectedEntry.plural ? (
                          <span className="english-family-chip german-form-chip">
                            <strong>{selectedEntry.plural}</strong>
                            <small>複数形</small>
                          </span>
                        ) : null}
                      </div>
                    </div>

                    <div className="english-judge-row">
                      <button
                        type="button"
                        className={`english-judge-button is-skip${judgeFlash === "skip" ? " is-active" : ""}`}
                        onClick={handleSkipEntry}
                        aria-label="スキップ"
                      >
                        <span>↑</span>
                        <small>流す</small>
                      </button>
                      <button
                        type="button"
                        className={`english-judge-button is-wrong${judgeFlash === "wrong" ? " is-active" : ""}`}
                        onClick={() => handleStudyAction(false)}
                        aria-label="間違えた"
                      >
                        <span>×</span>
                        <small>まだ</small>
                      </button>
                      <button
                        type="button"
                        className={`english-judge-button is-correct${judgeFlash === "correct" ? " is-active" : ""}`}
                        onClick={() => handleStudyAction(true)}
                        aria-label="正解した"
                      >
                        <span>○</span>
                        <small>わかる</small>
                      </button>
                    </div>
                  </div>
                </section>
              ) : (
                <section className="english-review-card">
                  <div className="english-section-head">
                    <h3>{pendingFutureReviewCount ? "いま出せる復習はありません" : "この条件の単語はすべて長期記憶に入りました"}</h3>
                    <span>{pendingFutureReviewCount ? `${pendingFutureReviewCount}語待機` : `${longTermCount}語`}</span>
                  </div>
                  <p className="english-feedback-text">
                    {pendingFutureReviewCount
                      ? "復習予定日の前なので、間違えた単語はまだ通常キューに戻していません。品詞フィルタを変えるか、次の復習タイミングを待ちます。"
                      : "品詞フィルタを変えるか、長期記憶リストを確認できます。"}
                  </p>
                </section>
              )}

              <div className="english-progress-rail">
                <div className="english-progress-rail-line">
                  <i style={{ width: `${Math.max(0, progressRatio * 100)}%` }} />
                </div>
                <div className="english-progress-rail-copy">
                  <span>長期記憶 {longTermCount}</span>
                  <span>残り {sessionTotal}</span>
                </div>
              </div>

              <div className="english-action-row">
                <button type="button" className="button button-secondary" onClick={() => handleSpeak(selectedEntry.coreChunk || selectedEntry.headword)}>
                  単語を聞く
                </button>
                <button type="button" className="button button-secondary" onClick={() => setIsAutoSpeakEnabled((current) => !current)}>
                  自動再生 {isAutoSpeakEnabled ? "ON" : "OFF"}
                </button>
                <button type="button" className="button button-secondary" onClick={handleStopSpeech}>
                  停止
                </button>
                <button type="button" className="button button-secondary" onClick={() => setMode("history")}>
                  見直しリスト
                </button>
              </div>

              <section className="english-about">
                <h2 className="english-about-title">ドイツ語単語を<br />長期記憶へ送る</h2>
                <div className="english-about-grid">
                  <article className="english-about-item">
                    <span>1</span>
                    <div>
                      <strong>単語を聞いて、即判定</strong>
                      <p>ドイツ語音声を自動再生し、思い出せたら右、曖昧なら左。手を止めずに単語を回します。</p>
                    </div>
                  </article>
                  <article className="english-about-item">
                    <span>2</span>
                    <div>
                      <strong>間違えた語だけ復習へ</strong>
                      <p>初回で正解した語は長期記憶へ除外。間違えた語は5ステージを抜けるまで残ります。</p>
                    </div>
                  </article>
                  <article className="english-about-item">
                    <span>3</span>
                    <div>
                      <strong>名詞の性も後から補える</strong>
                      <p>seed の冠詞・性・複数形・日本語訳を埋めれば、そのまま学習カードに反映できます。</p>
                    </div>
                  </article>
                </div>
              </section>
            </div>
          ) : null}

          {mode === "history" ? (
            <div className="english-pane-stack">
              <section className="english-review-card">
                <div className="english-section-head">
                  <h3>間違えた単語一覧</h3>
                  <span>{wrongWordList.length}語</span>
                </div>
                {renderWrongWordList()}
              </section>
            </div>
          ) : null}

          {mode === "memory" ? (
            <div className="english-pane-stack">
              <section className="english-review-card">
                <div className="english-section-head">
                  <h3>長期記憶リスト</h3>
                  <span>{longTermWordList.length}語</span>
                </div>
                {renderLongTermWordList()}
              </section>
            </div>
          ) : null}
        </section>

        <aside className="english-side-stack">
          <section className="surface english-side-card">
            <div className="english-mode-row" role="tablist" aria-label="German content modes">
              {GERMAN_MODE_TABS.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  className={`english-mode-chip ${mode === tab.id ? "is-active" : ""}`}
                  onClick={() => setMode(tab.id)}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </section>

          <section className="surface english-side-card">
            <div className="english-topic-row" role="tablist" aria-label="品詞フィルタ">
              {GERMAN_POS_OPTIONS.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  className={`english-topic-chip ${posFilter === option.id ? "is-active" : ""}`}
                  onClick={() => handlePosFilterChange(option.id)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </section>

          <section className="surface english-side-card english-stats-card">
            <div className="english-stats-row">
              <div className="english-stat-block">
                <strong>{studyStats.todayWords}</strong>
                <small>今日の語数</small>
              </div>
              <div className="english-stat-block">
                <strong>{wrongWordList.length}</strong>
                <small>見直し</small>
              </div>
              <div className="english-stat-block">
                <div className="english-quick-bar">
                  <i style={{ width: `${Math.round(studyStats.quickRatio * 100)}%` }} />
                </div>
                <small>即答 {studyStats.quickCount}/{studyStats.judgedCount}</small>
              </div>
            </div>
          </section>

          <section className="surface english-side-card">
            <div className="english-section-head">
              <h3>データ補完</h3>
              <span>{dataCoverage.meaningCount}/{GERMAN_VOCABULARY_LIBRARY.length}</span>
            </div>
            <dl className="english-stat-list">
              <div>
                <dt>日本語訳</dt>
                <dd>{dataCoverage.meaningCount}</dd>
              </div>
              <div>
                <dt>名詞の冠詞/性</dt>
                <dd>{dataCoverage.nounGenderCount}/{dataCoverage.nounCount}</dd>
              </div>
              <div>
                <dt>複数形</dt>
                <dd>{dataCoverage.nounPluralCount}</dd>
              </div>
            </dl>
          </section>

          <section className="surface english-side-card">
            <div className="english-section-head">
              <h3>この単語の状態</h3>
              <span>{attemptHistory.filter((entry) => entry.entryId === selectedEntry.id).length}件</span>
            </div>
            <dl className="english-stat-list">
              <div>
                <dt>見た回数</dt>
                <dd>{selectedProgress.seenCount}</dd>
              </div>
              <div>
                <dt>不正解</dt>
                <dd>{selectedProgress.incorrectCount}</dd>
              </div>
              <div>
                <dt>次の復習</dt>
                <dd>{formatNextReview(selectedProgress.nextReviewAt)}</dd>
              </div>
              <div>
                <dt>復習段階</dt>
                <dd>{isSelectedLongTerm ? "長期記憶" : getGermanReviewStepLabel(selectedProgress.reviewStep, reviewDayOffsets)}</dd>
              </div>
            </dl>
          </section>

          <section className="surface english-side-card">
            <div className="english-section-head">
              <h3>表示時間</h3>
              <span>{questionSeconds}s / {answerSeconds}s</span>
            </div>
            <div className="english-timing-grid">
              <label>
                <span>出題</span>
                <input type="number" min="1" max="30" step="1" value={questionSeconds} onChange={handleQuestionSecondsChange} />
                <small>秒</small>
              </label>
              <label>
                <span>答え</span>
                <input type="number" min="1" max="30" step="1" value={answerSeconds} onChange={handleAnswerSecondsChange} />
                <small>秒</small>
              </label>
            </div>
            <div className="english-timing-presets">
              <button type="button" onClick={() => applyTimingPreset(4, 5)}>4 / 5</button>
              <button type="button" onClick={() => applyTimingPreset(2, 3)}>2 / 3</button>
              <button type="button" onClick={() => applyTimingPreset(6, 6)}>6 / 6</button>
            </div>
          </section>

          <section className="surface english-side-card">
            <div className="english-section-head">
              <h3>復習間隔</h3>
            </div>
            <div className="english-review-schedule-grid">
              {reviewDayOffsets.map((day, index) => (
                <label key={`german-review-day-${index}`}>
                  <span>{index + 1}</span>
                  <input
                    type="number"
                    min="0"
                    max="365"
                    step="1"
                    value={day}
                    disabled={index === 0}
                    onChange={(event) => handleReviewDayChange(index, event.target.value)}
                  />
                  <small>日後</small>
                </label>
              ))}
            </div>
            <div className="english-timing-presets">
              {GERMAN_REVIEW_PRESETS.map((preset) => (
                <button key={preset.id} type="button" onClick={() => applyReviewPreset(preset.days)}>
                  {preset.label}
                </button>
              ))}
            </div>
          </section>

          <section className="surface english-side-card">
            <div className="english-section-head">
              <h3>同期</h3>
              <span className="english-stage-pill solid">{getSyncLabel(syncStatus, session)}</span>
            </div>
            {syncError ? <p className="english-error-text">{syncError}</p> : null}
          </section>

          <section className="surface english-side-card">
            <div className="english-section-head">
              <h3>メモ</h3>
            </div>
            <p className="english-side-copy">{selectedEntry.nuance}</p>
          </section>
        </aside>
      </section>
    </div>
  );

  function renderWrongWordList() {
    if (!wrongWordList.length) {
      return <p className="english-feedback-text">まだ間違えた単語はありません。× にした語だけが、復習ステージ付きでここに残ります。</p>;
    }

    return (
      <div className="english-history-list is-compact is-main">
        {visibleWrongWords.map((entry) => {
          const progress = getGermanProgressForId(progressMap, entry.entryId);
          return (
            <button key={entry.entryId} type="button" className="english-history-row is-dense" onClick={() => handleSelectEntry(entry.entryId)}>
              <span className="english-history-word">
                <strong>{entry.headword}</strong>
                <small>{entry.meaning}</small>
              </span>
              <span className="english-history-line">
                <em>{getGermanReviewStepLabel(progress.reviewStep, reviewDayOffsets)}</em>
                <small>×{entry.wrongCount} / {formatNextReview(progress.nextReviewAt)}</small>
              </span>
            </button>
          );
        })}

        {hiddenWrongWords.length ? (
          <details className="english-history-fold is-main">
            <summary>さらに {hiddenWrongWords.length} 語</summary>
            <div className="english-history-list is-compact is-main">
              {hiddenWrongWords.map((entry) => {
                const progress = getGermanProgressForId(progressMap, entry.entryId);
                return (
                  <button key={entry.entryId} type="button" className="english-history-row is-dense" onClick={() => handleSelectEntry(entry.entryId)}>
                    <span className="english-history-word">
                      <strong>{entry.headword}</strong>
                      <small>{entry.meaning}</small>
                    </span>
                    <span className="english-history-line">
                      <em>{getGermanReviewStepLabel(progress.reviewStep, reviewDayOffsets)}</em>
                      <small>×{entry.wrongCount} / {formatNextReview(progress.nextReviewAt)}</small>
                    </span>
                  </button>
                );
              })}
            </div>
          </details>
        ) : null}
      </div>
    );
  }

  function renderLongTermWordList() {
    if (!longTermWordList.length) {
      return <p className="english-feedback-text">まだ長期記憶に入った単語はありません。初回で○にした語、または復習5ステージを抜けた語がここに入ります。</p>;
    }

    return (
      <div className="english-history-list is-compact is-main">
        {visibleLongTermWords.map((entry) => (
          <button key={entry.entryId} type="button" className="english-history-row is-dense" onClick={() => handleSelectMemoryEntry(entry.entryId)}>
            <span className="english-history-word">
              <strong>{entry.headword}</strong>
              <small>{entry.meaning}</small>
            </span>
            <span className="english-history-line">
              <em>長期</em>
              <small>○{entry.correctCount}</small>
            </span>
          </button>
        ))}

        {hiddenLongTermWords.length ? (
          <details className="english-history-fold is-main">
            <summary>さらに {hiddenLongTermWords.length} 語</summary>
            <div className="english-history-list is-compact is-main">
              {hiddenLongTermWords.map((entry) => (
                <button key={entry.entryId} type="button" className="english-history-row is-dense" onClick={() => handleSelectMemoryEntry(entry.entryId)}>
                  <span className="english-history-word">
                    <strong>{entry.headword}</strong>
                    <small>{entry.meaning}</small>
                  </span>
                  <span className="english-history-line">
                    <em>長期</em>
                    <small>○{entry.correctCount}</small>
                  </span>
                </button>
              ))}
            </div>
          </details>
        ) : null}
      </div>
    );
  }
}

function buildGermanSnapshot({ progressMap, attemptHistory, settings }) {
  return {
    progressMap: compactGermanProgressMap(progressMap),
    attemptHistory: Array.isArray(attemptHistory) ? attemptHistory.slice(0, 2500) : [],
    settings: normalizeGermanSnapshotSettings(settings),
    savedAt: Date.now()
  };
}

function readLocalGermanSnapshot(storageKey) {
  if (typeof window === "undefined") return createEmptyGermanSnapshot();

  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return createEmptyGermanSnapshot();
    return normalizeGermanSnapshot(JSON.parse(raw));
  } catch (_error) {
    return createEmptyGermanSnapshot();
  }
}

async function fetchRemoteGermanSnapshot(supabase, userId) {
  try {
    const { data, error } = await supabase
      .from("german_progress")
      .select("progress_map, attempt_history, settings, updated_at")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      return { snapshot: null, error: "Supabase の german_progress テーブルが未適用、または読み込みに失敗しました。localStorage に退避しています。" };
    }

    if (!data) return { snapshot: null, error: "" };

    return {
      snapshot: normalizeGermanSnapshot({
        progressMap: data.progress_map,
        attemptHistory: data.attempt_history,
        settings: data.settings,
        savedAt: data.updated_at ? new Date(data.updated_at).getTime() : 0
      }),
      error: ""
    };
  } catch (_error) {
    return { snapshot: null, error: "Supabase 同期の確認に失敗しました。localStorage に退避しています。" };
  }
}

async function saveRemoteGermanSnapshot(supabase, userId, snapshot) {
  try {
    const { error } = await supabase
      .from("german_progress")
      .upsert({
        user_id: userId,
        progress_map: snapshot.progressMap,
        attempt_history: snapshot.attemptHistory,
        settings: snapshot.settings
      });

    if (error) {
      return { ok: false, message: "Supabase の german_progress テーブルが未適用、または保存に失敗しました。localStorage には保存済みです。" };
    }

    return { ok: true, message: "" };
  } catch (_error) {
    return { ok: false, message: "Supabase 同期に失敗しました。localStorage には保存済みです。" };
  }
}

function mergeGermanSnapshots(localSnapshot, remoteSnapshot) {
  if (!remoteSnapshot) return normalizeGermanSnapshot(localSnapshot);
  if (!localSnapshot) return normalizeGermanSnapshot(remoteSnapshot);

  const local = normalizeGermanSnapshot(localSnapshot);
  const remote = normalizeGermanSnapshot(remoteSnapshot);

  return normalizeGermanSnapshot({
    progressMap: mergeGermanSyncedProgressMaps(local.progressMap, remote.progressMap),
    attemptHistory: mergeAttemptHistory(local.attemptHistory, remote.attemptHistory),
    settings: (remote.savedAt || 0) > (local.savedAt || 0) ? remote.settings : local.settings,
    savedAt: Math.max(local.savedAt || 0, remote.savedAt || 0)
  });
}

function normalizeGermanSnapshot(snapshot = {}) {
  return {
    progressMap: compactGermanProgressMap(snapshot.progressMap || {}),
    attemptHistory: Array.isArray(snapshot.attemptHistory) ? snapshot.attemptHistory.slice(0, 2500) : [],
    settings: normalizeGermanSnapshotSettings(snapshot.settings || {}),
    savedAt: Number(snapshot.savedAt) || 0
  };
}

function createEmptyGermanSnapshot() {
  return {
    progressMap: createEmptyGermanProgress(),
    attemptHistory: [],
    settings: normalizeGermanSnapshotSettings({}),
    savedAt: 0
  };
}

function normalizeGermanSnapshotSettings(settings = {}) {
  return {
    mode: ACTIVE_MODE_IDS.has(settings.mode) ? settings.mode : "study",
    posFilter: ACTIVE_POS_IDS.has(settings.posFilter) ? settings.posFilter : "all",
    questionSeconds: clampStudySeconds(settings.questionSeconds ?? DEFAULT_QUESTION_SECONDS),
    answerSeconds: clampStudySeconds(settings.answerSeconds ?? DEFAULT_ANSWER_SECONDS),
    reviewDayOffsets: normalizeGermanReviewDayOffsets(settings.reviewDayOffsets),
    isAutoSpeakEnabled: settings.isAutoSpeakEnabled !== false,
    selectedEntryId: settings.selectedEntryId || GERMAN_VOCABULARY_LIBRARY[0]?.id || ""
  };
}

function mergeAttemptHistory(left = [], right = []) {
  const map = new Map();
  for (const entry of [...left, ...right]) {
    if (!entry?.id) continue;
    map.set(entry.id, entry);
  }
  return [...map.values()]
    .sort((a, b) => (b.answeredAt || 0) - (a.answeredAt || 0))
    .slice(0, 2500);
}

function clampStudySeconds(value) {
  if (!Number.isFinite(value)) return DEFAULT_QUESTION_SECONDS;
  return Math.max(1, Math.min(30, Math.round(value)));
}

function clampReviewDayOffset(value) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(365, Math.round(value)));
}

function formatNextReview(value) {
  if (!value) return "未設定";
  const date = new Date(value);
  const today = new Date();
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const targetStart = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();

  if (targetStart <= todayStart) return "今日";
  const days = Math.ceil((targetStart - todayStart) / (24 * 60 * 60 * 1000));
  return `${days}日後`;
}

function getSyncLabel(syncStatus, session) {
  if (!session?.user?.id) return "local";
  if (syncStatus === "synced") return "synced";
  if (syncStatus === "syncing") return "syncing";
  return "local";
}
