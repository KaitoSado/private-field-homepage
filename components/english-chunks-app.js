"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";
import {
  DEFAULT_ENGLISH_REVIEW_DAY_OFFSETS,
  ENGLISH_CHUNK_LIBRARY,
  ENGLISH_MODE_TABS,
  ENGLISH_POS_OPTIONS,
  ENGLISH_TOPIC_OPTIONS,
  compactEnglishProgressMap,
  createEmptyEnglishProgress,
  getEnglishProgressForId,
  getEnglishDisplayVariant,
  getEnglishFamilyMembers,
  getEnglishRecommendedChunkIds,
  getExamplesForFocus,
  getEnglishReviewStepLabel,
  isEnglishLongTermProgress,
  mergeEnglishSyncedProgressMaps,
  normalizeEnglishReviewDayOffsets,
  recordStudyAttempt,
  markShadowComplete
} from "@/lib/english-content";

const STORAGE_BASE_KEY = "new-commune:english-chunks:v3";
const LEGACY_STORAGE_KEY = "new-commune:english-chunks:v2";
const ACTIVE_MODE_IDS = new Set(ENGLISH_MODE_TABS.map((tab) => tab.id));
const ACTIVE_POS_IDS = new Set(ENGLISH_POS_OPTIONS.map((option) => option.id));
const DEFAULT_QUESTION_SECONDS = 4;
const DEFAULT_ANSWER_SECONDS = 5;
const ENGLISH_REVIEW_PRESETS = [
  { id: "standard", label: "標準", days: DEFAULT_ENGLISH_REVIEW_DAY_OFFSETS },
  { id: "short", label: "短期", days: [0, 1, 2, 3, 7] },
  { id: "middle", label: "中期", days: [0, 1, 3, 7, 14] }
];

export function EnglishChunksApp() {
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const [hydrated, setHydrated] = useState(false);
  const [session, setSession] = useState(null);
  const [storageOwnerId, setStorageOwnerId] = useState("");
  const [progressMap, setProgressMap] = useState(() => createEmptyEnglishProgress());
  const [attemptHistory, setAttemptHistory] = useState([]);
  const [mode, setMode] = useState("study");
  const [focusTopic, setFocusTopic] = useState("all");
  const [posFilter, setPosFilter] = useState("all");
  const [detailMode, setDetailMode] = useState("gentle");
  const [supportMode, setSupportMode] = useState(true);
  const [questionSeconds, setQuestionSeconds] = useState(DEFAULT_QUESTION_SECONDS);
  const [answerSeconds, setAnswerSeconds] = useState(DEFAULT_ANSWER_SECONDS);
  const [reviewDayOffsets, setReviewDayOffsets] = useState(DEFAULT_ENGLISH_REVIEW_DAY_OFFSETS);
  const [isAutoSpeakEnabled, setIsAutoSpeakEnabled] = useState(true);
  const [studyTimerPhase, setStudyTimerPhase] = useState("question");
  const [syncStatus, setSyncStatus] = useState("local");
  const [syncError, setSyncError] = useState("");
  const [selectedChunkId, setSelectedChunkId] = useState(ENGLISH_CHUNK_LIBRARY[0].id);
  const [sessionStep, setSessionStep] = useState(1);
  const [queueSeed, setQueueSeed] = useState(0);
  const [shadowPromptIndex, setShadowPromptIndex] = useState(0);
  const [isScriptVisible, setIsScriptVisible] = useState(true);
  const [judgeFlash, setJudgeFlash] = useState("");
  const judgeFlashTimer = useRef(null);
  const [recordingState, setRecordingState] = useState({
    status: "idle",
    audioUrl: "",
    durationMs: 0,
    feedback: "",
    error: ""
  });

  const recorderRef = useRef(null);
  const streamRef = useRef(null);
  const audioChunksRef = useRef([]);
  const recordStartedAtRef = useRef(0);

  const chunkMap = useMemo(
    () => Object.fromEntries(ENGLISH_CHUNK_LIBRARY.map((chunk) => [chunk.id, chunk])),
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

    async function hydrateEnglishProgress() {
      const localSnapshot = readLocalEnglishSnapshot(storageKey);
      const remoteResult = session?.user?.id
        ? await fetchRemoteEnglishSnapshot(supabase, session.user.id)
        : { snapshot: null, error: "" };

      if (cancelled) return;

      const mergedSnapshot = mergeEnglishSnapshots(localSnapshot, remoteResult.snapshot);
      applyEnglishSnapshot(mergedSnapshot);

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

    hydrateEnglishProgress();

    return () => {
      cancelled = true;
    };
  }, [chunkMap, session?.user?.id, storageKey, supabase]);

  useEffect(() => {
    if (hydrated && queueSeed === 0) {
      const nextSeed = Date.now();
      const nextIds = getEnglishRecommendedChunkIds(progressMap, focusTopic, { posFilter, seed: nextSeed });
      setQueueSeed(nextSeed);
      if (nextIds.length) setSelectedChunkId(nextIds[0]);
    }
  }, [focusTopic, hydrated, posFilter, progressMap, queueSeed]);

  useEffect(() => {
    if (!hydrated || typeof window === "undefined" || !storageKey) return;
    const snapshot = buildEnglishSnapshot({
      progressMap,
      attemptHistory,
      settings: {
        mode,
        focusTopic,
        posFilter,
        detailMode,
        supportMode,
        questionSeconds,
        answerSeconds,
        reviewDayOffsets,
        isAutoSpeakEnabled,
        selectedChunkId
      }
    });

    window.localStorage.setItem(
      storageKey,
      JSON.stringify(snapshot)
    );

    if (!session?.user?.id) return;

    setSyncStatus("syncing");
    setSyncError("");
    const syncTimer = window.setTimeout(async () => {
      const result = await saveRemoteEnglishSnapshot(supabase, session.user.id, snapshot);

      if (result.ok) {
        setSyncStatus("synced");
        setSyncError("");
      } else {
        setSyncStatus("local");
        setSyncError(result.message);
      }
    }, 900);

    return () => window.clearTimeout(syncTimer);
  }, [answerSeconds, attemptHistory, detailMode, focusTopic, hydrated, isAutoSpeakEnabled, mode, posFilter, progressMap, questionSeconds, reviewDayOffsets, selectedChunkId, session?.user?.id, storageKey, supabase, supportMode]);

  useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      cleanupRecording();
    };
  }, []);

  const recommendedIds = useMemo(
    () => getEnglishRecommendedChunkIds(progressMap, focusTopic, { posFilter, seed: queueSeed }),
    [focusTopic, posFilter, progressMap, queueSeed]
  );

  useEffect(() => {
    if (mode === "study" && recommendedIds.length && !recommendedIds.includes(selectedChunkId)) {
      setSelectedChunkId(recommendedIds[0]);
    }
  }, [mode, recommendedIds, selectedChunkId]);

  useEffect(() => {
    setStudyTimerPhase("question");
    setShadowPromptIndex(0);
    setRecordingState((current) => ({ ...current, error: "" }));
  }, [mode, selectedChunkId]);

  useEffect(() => {
    if (!hydrated || mode !== "study" || !recommendedIds.length) return;

    const duration = studyTimerPhase === "question" ? questionSeconds : answerSeconds;
    if (studyTimerPhase === "ready") return;

    const timer = window.setTimeout(() => {
      setStudyTimerPhase((current) => {
        if (current === "question") return "answer";
        if (current === "answer") return "ready";
        return current;
      });
    }, duration * 1000);

    return () => window.clearTimeout(timer);
  }, [answerSeconds, hydrated, mode, questionSeconds, recommendedIds.length, studyTimerPhase]);

  const selectedChunk = chunkMap[selectedChunkId] || ENGLISH_CHUNK_LIBRARY[0];
  const selectedProgress = getEnglishProgressForId(progressMap, selectedChunk.id);
  const isSelectedLongTerm = isEnglishLongTermProgress(selectedProgress);
  const displayedStudyChunk = useMemo(
    () => getEnglishDisplayVariant(selectedChunk, {
      posFilter,
      seed: `${queueSeed}:${sessionStep}:${selectedChunk.id}:${selectedProgress.seenCount}:${selectedProgress.reviewCount}`
    }),
    [posFilter, queueSeed, selectedChunk, selectedProgress.reviewCount, selectedProgress.seenCount, sessionStep]
  );
  const selectedFamilyMembers = useMemo(
    () => shuffleItemsBySeed(
      getEnglishFamilyMembers(selectedChunk.id, {
        includeSelf: true,
        currentVariantId: displayedStudyChunk.variantId
      }).filter((member) => member.id !== displayedStudyChunk.variantId),
      `${queueSeed}:${sessionStep}:${selectedChunk.id}`
    ),
    [displayedStudyChunk.variantId, queueSeed, selectedChunk.id, sessionStep]
  );
  const diverseExamples = getExamplesForFocus(displayedStudyChunk, focusTopic);
  const allExamples = [...displayedStudyChunk.starterExamples, ...diverseExamples];
  const studyExample = allExamples[(selectedProgress.seenCount + selectedProgress.incorrectCount) % allExamples.length];
  const shadowPrompt = displayedStudyChunk.shadowPrompts[shadowPromptIndex % displayedStudyChunk.shadowPrompts.length];
  const studyPosition = recommendedIds.indexOf(selectedChunk.id);
  const safeStudyPosition = Math.max(0, studyPosition);
  const sessionTotal = recommendedIds.length;
  const longTermWordList = useMemo(() => {
    return ENGLISH_CHUNK_LIBRARY
      .map((chunk) => {
        const progress = getEnglishProgressForId(progressMap, chunk.id);
        return {
          chunkId: chunk.id,
          headword: chunk.headword,
          meaning: chunk.meaning,
          isLongTerm: isEnglishLongTermProgress(progress),
          longTermAt: progress.longTermAt || progress.memorizedAt || progress.lastSeenAt || 0,
          correctCount: progress.correctCount
        };
      })
      .filter((entry) => entry.isLongTerm)
      .sort((left, right) => right.longTermAt - left.longTermAt);
  }, [progressMap]);
  const longTermCount = longTermWordList.length;
  const progressRatio = ENGLISH_CHUNK_LIBRARY.length ? longTermCount / ENGLISH_CHUNK_LIBRARY.length : 0;
  const historyForChunk = attemptHistory.filter((entry) => entry.chunkId === selectedChunk.id);
  const wrongWordList = useMemo(() => {
    const now = Date.now();

    return ENGLISH_CHUNK_LIBRARY
      .map((chunk) => {
        const progress = getEnglishProgressForId(progressMap, chunk.id);
        return {
          chunkId: chunk.id,
          headword: chunk.headword,
          meaning: chunk.meaning,
          wrongCount: progress.incorrectCount,
          reviewStep: progress.reviewStep,
          nextReviewAt: progress.nextReviewAt,
          lastAnsweredAt: progress.lastSeenAt,
          isDue: progress.nextReviewAt > 0 && progress.nextReviewAt <= now
        };
      })
      .filter((entry) => entry.wrongCount > 0 && !isEnglishLongTermProgress(getEnglishProgressForId(progressMap, entry.chunkId)))
      .sort((left, right) => {
        if (left.isDue !== right.isDue) return left.isDue ? -1 : 1;
        if (left.reviewStep !== right.reviewStep) return left.reviewStep - right.reviewStep;
        return right.lastAnsweredAt - left.lastAnsweredAt;
      });
  }, [progressMap]);
  const mainVisibleWrongWords = wrongWordList.slice(0, 24);
  const mainHiddenWrongWords = wrongWordList.slice(24);
  const pendingFutureReviewCount = wrongWordList.filter((entry) => entry.nextReviewAt > Date.now()).length;
  const mainVisibleLongTermWords = longTermWordList.slice(0, 36);
  const mainHiddenLongTermWords = longTermWordList.slice(36);
  const isAnswerVisible = studyTimerPhase !== "question";
  const activeTimerSeconds = studyTimerPhase === "question" ? questionSeconds : answerSeconds;

  const handleSelectChunk = (chunkId) => {
    setSelectedChunkId(chunkId);
    setMode("study");
  };

  const handleSelectMemoryChunk = (chunkId) => {
    setSelectedChunkId(chunkId);
    setMode("memory");
  };

  const handlePosFilterChange = (nextPosFilter) => {
    const nextSeed = Date.now();
    const nextIds = getEnglishRecommendedChunkIds(progressMap, focusTopic, { posFilter: nextPosFilter, seed: nextSeed });

    setPosFilter(nextPosFilter);
    setSessionStep(1);
    setQueueSeed(nextSeed);
    if (nextIds.length) setSelectedChunkId(nextIds[0]);
  };

  const handleQuestionSecondsChange = (event) => {
    setQuestionSeconds(clampStudySeconds(Number(event.target.value)));
    setStudyTimerPhase("question");
  };

  const handleAnswerSecondsChange = (event) => {
    setAnswerSeconds(clampStudySeconds(Number(event.target.value)));
    setStudyTimerPhase("question");
  };

  const applyTimingPreset = (nextQuestionSeconds, nextAnswerSeconds) => {
    setQuestionSeconds(clampStudySeconds(nextQuestionSeconds));
    setAnswerSeconds(clampStudySeconds(nextAnswerSeconds));
    setStudyTimerPhase("question");
  };

  const handleReviewDayChange = (index, value) => {
    const nextReviewDayOffsets = [...reviewDayOffsets];
    nextReviewDayOffsets[index] = clampReviewDayOffset(Number(value));
    setReviewDayOffsets(normalizeEnglishReviewDayOffsets(nextReviewDayOffsets));
  };

  const applyReviewPreset = (days) => {
    setReviewDayOffsets(normalizeEnglishReviewDayOffsets(days));
  };

  const handleAdvanceChunk = () => {
    if (!recommendedIds.length) return;
    const nextIndex = (safeStudyPosition + 1) % recommendedIds.length;
    const nextId = recommendedIds[nextIndex];
    setSelectedChunkId(nextId);

    if (nextIndex === 0) {
      const nextSeed = Date.now();
      const nextIds = getEnglishRecommendedChunkIds(progressMap, focusTopic, { posFilter, seed: nextSeed });
      setSessionStep(1);
      setQueueSeed(nextSeed);
      if (nextIds.length) setSelectedChunkId(nextIds[0]);
    } else {
      setSessionStep((current) => Math.min(current + 1, sessionTotal));
    }
  };

  const handleStudyAction = (wasCorrect) => {
    if (mode !== "study" || !recommendedIds.length) return;

    if (judgeFlashTimer.current) clearTimeout(judgeFlashTimer.current);
    setJudgeFlash(wasCorrect ? "correct" : "wrong");
    judgeFlashTimer.current = setTimeout(() => setJudgeFlash(""), 350);

    setProgressMap((current) => recordStudyAttempt(current, selectedChunk, wasCorrect, studyExample.topic, Date.now(), reviewDayOffsets));
    setAttemptHistory((current) => [
      {
        id: `${selectedChunk.id}-${displayedStudyChunk.variantId}-${Date.now()}`,
        chunkId: selectedChunk.id,
        variantId: displayedStudyChunk.variantId,
        headword: displayedStudyChunk.headword,
        result: wasCorrect ? "correct" : "wrong",
        topic: studyExample.topic,
        answeredAt: Date.now()
      },
      ...current
    ]);
    handleAdvanceChunk();
  };

  useEffect(() => {
    if (!hydrated || !isAutoSpeakEnabled || mode !== "study" || !recommendedIds.length) return;
    const timer = window.setTimeout(() => handleSpeak(displayedStudyChunk.headword), 180);
    return () => window.clearTimeout(timer);
  }, [displayedStudyChunk.headword, displayedStudyChunk.variantId, hydrated, isAutoSpeakEnabled, mode, recommendedIds.length, selectedChunk.id]);

  const handleSkipChunk = () => {
    if (mode !== "study" || !recommendedIds.length) return;
    if (judgeFlashTimer.current) clearTimeout(judgeFlashTimer.current);
    setJudgeFlash("skip");
    judgeFlashTimer.current = setTimeout(() => setJudgeFlash(""), 350);
    handleAdvanceChunk();
  };

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
        handleSkipChunk();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  function handleSpeak(text) {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-US";
    utterance.rate = 0.94;
    utterance.pitch = 1;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  }

  function handleStopSpeech() {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
  }

  const handleStartRecording = async () => {
    if (typeof window === "undefined" || !navigator.mediaDevices || !window.MediaRecorder) {
      setRecordingState({
        status: "idle",
        audioUrl: "",
        durationMs: 0,
        feedback: "",
        error: "このブラウザでは録音が使えません。音声再生だけでも先に回せます。"
      });
      return;
    }

    try {
      if (!streamRef.current) {
        streamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });
      }

      if (recordingState.audioUrl) {
        URL.revokeObjectURL(recordingState.audioUrl);
      }

      const recorder = new window.MediaRecorder(streamRef.current);
      audioChunksRef.current = [];
      recorderRef.current = recorder;
      recordStartedAtRef.current = Date.now();

      recorder.addEventListener("dataavailable", (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      });

      recorder.addEventListener("stop", () => {
        const durationMs = Date.now() - recordStartedAtRef.current;
        const audioUrl = URL.createObjectURL(new Blob(audioChunksRef.current, { type: recorder.mimeType || "audio/webm" }));
        const estimateMs = estimateShadowDuration(shadowPrompt);
        setRecordingState({
          status: "ready",
          audioUrl,
          durationMs,
          feedback: getShadowFeedback(durationMs, estimateMs, supportMode),
          error: ""
        });
      });

      recorder.start();
      setRecordingState({
        status: "recording",
        audioUrl: "",
        durationMs: 0,
        feedback: "",
        error: ""
      });
    } catch (_error) {
      setRecordingState({
        status: "idle",
        audioUrl: "",
        durationMs: 0,
        feedback: "",
        error: "録音を始められませんでした。マイク権限を確認してください。"
      });
    }
  };

  const handleStopRecording = () => {
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      recorderRef.current.stop();
    }
  };

  const handleSaveShadow = () => {
    if (!recordingState.durationMs) return;
    setProgressMap((current) => markShadowComplete(
      current,
      selectedChunk,
      getPromptTopic(displayedStudyChunk, shadowPrompt),
      recordingState.durationMs,
      Date.now(),
      reviewDayOffsets
    ));
    setShadowPromptIndex((current) => current + 1);
  };

  function applyEnglishSnapshot(snapshot) {
    const settings = normalizeEnglishSnapshotSettings(snapshot.settings || {});

    setProgressMap(compactEnglishProgressMap(snapshot.progressMap || {}));
    setAttemptHistory(Array.isArray(snapshot.attemptHistory) ? snapshot.attemptHistory : []);
    setMode(settings.mode);
    setFocusTopic(settings.focusTopic);
    setPosFilter(settings.posFilter);
    setDetailMode(settings.detailMode);
    setSupportMode(settings.supportMode);
    setQuestionSeconds(settings.questionSeconds);
    setAnswerSeconds(settings.answerSeconds);
    setReviewDayOffsets(settings.reviewDayOffsets);
    setIsAutoSpeakEnabled(settings.isAutoSpeakEnabled);
    setSelectedChunkId(chunkMap[settings.selectedChunkId] ? settings.selectedChunkId : ENGLISH_CHUNK_LIBRARY[0].id);
    setStudyTimerPhase("question");
  }

  return (
    <div className="english-shell">
      <section className="english-main-grid">
        <section className="surface english-stage-card">
          {mode === "study" ? (
            <div className="english-pane-stack">
              <div className="english-study-topline">
                <span>残り {sessionTotal}</span>
              </div>

              {recommendedIds.length ? (
                <section className="english-study-card">
                  <div className="english-study-sheet">
                    <p className="english-study-word">{displayedStudyChunk.headword}</p>

                    <div className="english-study-timer">
                      <div className="english-study-timer-line">
                        <i
                          key={`${selectedChunk.id}-${displayedStudyChunk.variantId}-${studyTimerPhase}`}
                          style={{ "--timer-duration": `${activeTimerSeconds}s` }}
                        />
                      </div>
                      {studyTimerPhase !== "judge" && (
                        <span>
                          {studyTimerPhase === "question"
                            ? `${questionSeconds}秒`
                            : `${answerSeconds}秒`}
                        </span>
                      )}
                    </div>

                    <div className={`english-study-answer ${isAnswerVisible ? "is-visible" : "is-hidden"}`}>
                      <strong>{displayedStudyChunk.meaning}</strong>
                    </div>

                    {selectedFamilyMembers.length ? (
                      <div className="english-family-strip" aria-label="派生語">
                        <span>派生語</span>
                        <div>
                          {selectedFamilyMembers.map((member) => (
                            <button
                              key={member.id}
                              type="button"
                              className="english-family-chip"
                              onClick={() => handleSelectChunk(member.id)}
                            >
                              <strong>{member.headword}</strong>
                              <small>{getPosLabel(member.pos)}</small>
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : null}

                    <div className="english-judge-row">
                      <button
                        type="button"
                        className={`english-judge-button is-skip${judgeFlash === "skip" ? " is-active" : ""}`}
                        onClick={() => handleSkipChunk()}
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
                <button type="button" className="button button-secondary" onClick={() => handleSpeak(displayedStudyChunk.headword)}>
                  単語を聞く
                </button>
                <button
                  type="button"
                  className="button button-secondary"
                  onClick={() => setIsAutoSpeakEnabled((current) => !current)}
                >
                  自動再生 {isAutoSpeakEnabled ? "ON" : "OFF"}
                </button>
                <button type="button" className="button button-secondary" onClick={handleStopSpeech}>
                  停止
                </button>
                <button type="button" className="button button-secondary" onClick={() => setMode("history")}>
                  見直しリスト
                </button>
              </div>
            </div>
          ) : null}

          {mode === "meaning" ? (
            <div className="english-pane-stack">
              <div className="english-card-head">
                <div>
                  <p className="eyebrow">Meaning</p>
                  <h2>{displayedStudyChunk.headword}</h2>
                </div>
                <div className={`english-stage-pill ${selectedProgress.stage}`}>
                  {getStageLabel(selectedProgress.stage)}
                </div>
              </div>

              <section className="english-meaning-card">
                <div className="english-meaning-main">
                  <p className="english-meaning-japanese">{displayedStudyChunk.meaning}</p>
                  <p className="english-meaning-chunk">{displayedStudyChunk.coreChunk}</p>
                </div>
                <div className="english-note-grid">
                  <article className="english-note-card">
                    <strong>ニュアンス</strong>
                    <p>{displayedStudyChunk.nuance}</p>
                  </article>
                  <article className="english-note-card">
                    <strong>使い方</strong>
                    <p>{displayedStudyChunk.grammarNote}</p>
                  </article>
                </div>
              </section>

              <section className="english-example-block">
                <div className="english-section-head">
                  <h3>例文</h3>
                  <span>{getTopicLabel(studyExample.topic)}</span>
                </div>
                <div className="english-example-list">
                  {allExamples.slice(0, 4).map((example) => (
                    <article key={`${displayedStudyChunk.variantId}-${example.text}`} className="english-example-card">
                      <span className={`english-topic-badge topic-${example.topic}`}>{getTopicLabel(example.topic)}</span>
                      <p>{example.text}</p>
                      <small>{example.ja}</small>
                    </article>
                  ))}
                </div>
              </section>
            </div>
          ) : null}

          {mode === "shadow" ? (
            <div className="english-pane-stack">
              <section className="english-shadow-card">
                <div className="english-section-head">
                  <h3>音をまねる</h3>
                  <span>{displayedStudyChunk.coreChunk}</span>
                </div>

                <div className="english-shadow-chip-row">
                  {displayedStudyChunk.shadowPrompts.map((prompt, index) => (
                    <button
                      key={prompt}
                      type="button"
                      className={`english-shadow-chip ${shadowPromptIndex === index ? "is-active" : ""}`}
                      onClick={() => setShadowPromptIndex(index)}
                    >
                      prompt {index + 1}
                    </button>
                  ))}
                  <button
                    type="button"
                    className={`english-shadow-chip ${isScriptVisible ? "is-active" : ""}`}
                    onClick={() => setIsScriptVisible((current) => !current)}
                  >
                    {isScriptVisible ? "script visible" : "script hidden"}
                  </button>
                </div>

                <div className="english-shadow-prompt">
                  <p>{isScriptVisible ? shadowPrompt : "先に聞いて、あとから追います。"}</p>
                </div>

                <div className="english-action-row">
                  <button type="button" className="button button-secondary" onClick={() => handleSpeak(shadowPrompt)}>
                    音声を再生
                  </button>
                  {recordingState.status !== "recording" ? (
                    <button type="button" className="button button-secondary" onClick={handleStartRecording}>
                      録音する
                    </button>
                  ) : (
                    <button type="button" className="button button-secondary" onClick={handleStopRecording}>
                      録音を止める
                    </button>
                  )}
                  <button
                    type="button"
                    className="button button-primary"
                    onClick={handleSaveShadow}
                    disabled={!recordingState.durationMs}
                  >
                    保存
                  </button>
                </div>

                <div className="english-shadow-feedback">
                  <div>
                    <span>目安</span>
                    <strong>{formatShadowDuration(estimateShadowDuration(shadowPrompt))}</strong>
                  </div>
                  <div>
                    <span>あなた</span>
                    <strong>{recordingState.durationMs ? formatShadowDuration(recordingState.durationMs) : "未録音"}</strong>
                  </div>
                </div>

                {recordingState.audioUrl ? <audio className="english-audio-player" src={recordingState.audioUrl} controls /> : null}
                {recordingState.feedback ? <p className="english-feedback-text">{recordingState.feedback}</p> : null}
                {recordingState.error ? <p className="english-error-text">{recordingState.error}</p> : null}
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

                {renderWrongWordList({
                  visibleEntries: mainVisibleWrongWords,
                  hiddenEntries: mainHiddenWrongWords,
                  variant: "main"
                })}
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

                {renderLongTermWordList({
                  visibleEntries: mainVisibleLongTermWords,
                  hiddenEntries: mainHiddenLongTermWords
                })}
              </section>
            </div>
          ) : null}
        </section>

        <aside className="english-side-stack">
          <section className="surface english-side-card">
            <div className="english-mode-row" role="tablist" aria-label="English content modes">
              {ENGLISH_MODE_TABS.map((tab) => (
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
              {ENGLISH_POS_OPTIONS.map((option) => (
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

          <section className="surface english-side-card">
            <div className="english-section-head">
              <h3>この単語の状態</h3>
              <span>{historyForChunk.length}件</span>
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
                <dd>{isSelectedLongTerm ? "長期記憶" : getEnglishReviewStepLabel(selectedProgress.reviewStep, reviewDayOffsets)}</dd>
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
                <input
                  type="number"
                  min="1"
                  max="30"
                  step="1"
                  value={questionSeconds}
                  onChange={handleQuestionSecondsChange}
                />
                <small>秒</small>
              </label>
              <label>
                <span>答え</span>
                <input
                  type="number"
                  min="1"
                  max="30"
                  step="1"
                  value={answerSeconds}
                  onChange={handleAnswerSecondsChange}
                />
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
                <label key={`review-day-${index}`}>
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
              {ENGLISH_REVIEW_PRESETS.map((preset) => (
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
          </section>

          <section className="surface english-side-card">
            <div className="english-section-head">
              <h3>メモ</h3>
            </div>
            <p className="english-side-copy">
              {detailMode === "gentle" ? displayedStudyChunk.nuance : displayedStudyChunk.grammarNote}
            </p>
          </section>
        </aside>
      </section>
    </div>
  );

  function renderWrongWordList({ visibleEntries, hiddenEntries, variant }) {
    if (!wrongWordList.length) {
      return <p className="english-feedback-text">まだ間違えた単語はありません。○ × の記録は内部に保存され、ここには見直したい語だけが出ます。</p>;
    }

    return (
      <div className={`english-history-list is-compact ${variant === "main" ? "is-main" : "is-side"}`}>
        {visibleEntries.map((entry) => {
          const progress = getEnglishProgressForId(progressMap, entry.chunkId);

          return (
            <button
              key={entry.chunkId}
              type="button"
              className={`english-history-row ${variant === "main" ? "is-dense" : ""}`}
              onClick={() => handleSelectChunk(entry.chunkId)}
            >
              <span className="english-history-word">
                <strong>{entry.headword}</strong>
                <small>{entry.meaning}</small>
              </span>
              <span className="english-history-line">
                <em>{getEnglishReviewStepLabel(progress.reviewStep, reviewDayOffsets)}</em>
                <small>
                  {variant === "main"
                    ? `×${entry.wrongCount} / ${formatNextReview(progress.nextReviewAt)}`
                    : `×${entry.wrongCount}`}
                </small>
              </span>
            </button>
          );
        })}

        {hiddenEntries.length ? (
          <details className={`english-history-fold ${variant === "main" ? "is-main" : "is-side"}`}>
            <summary>さらに {hiddenEntries.length} 語</summary>
            <div className={`english-history-list is-compact ${variant === "main" ? "is-main" : "is-side"}`}>
              {hiddenEntries.map((entry) => {
                const progress = getEnglishProgressForId(progressMap, entry.chunkId);

                return (
                  <button
                    key={entry.chunkId}
                    type="button"
                    className={`english-history-row ${variant === "main" ? "is-dense" : ""}`}
                    onClick={() => handleSelectChunk(entry.chunkId)}
                  >
                    <span className="english-history-word">
                      <strong>{entry.headword}</strong>
                      <small>{entry.meaning}</small>
                    </span>
                    <span className="english-history-line">
                      <em>{getEnglishReviewStepLabel(progress.reviewStep, reviewDayOffsets)}</em>
                      <small>
                        {variant === "main"
                          ? `×${entry.wrongCount} / ${formatNextReview(progress.nextReviewAt)}`
                          : `×${entry.wrongCount}`}
                      </small>
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

  function renderLongTermWordList({ visibleEntries, hiddenEntries }) {
    if (!longTermWordList.length) {
      return <p className="english-feedback-text">まだ長期記憶に入った単語はありません。初回で○にした単語、または復習5ステージを抜けた単語がここに入ります。</p>;
    }

    return (
      <div className="english-history-list is-compact is-main">
        {visibleEntries.map((entry) => (
          <button
            key={entry.chunkId}
            type="button"
            className="english-history-row is-dense"
            onClick={() => handleSelectMemoryChunk(entry.chunkId)}
          >
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

        {hiddenEntries.length ? (
          <details className="english-history-fold is-main">
            <summary>さらに {hiddenEntries.length} 語</summary>
            <div className="english-history-list is-compact is-main">
              {hiddenEntries.map((entry) => (
                <button
                  key={entry.chunkId}
                  type="button"
                  className="english-history-row is-dense"
                  onClick={() => handleSelectMemoryChunk(entry.chunkId)}
                >
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

  function cleanupRecording() {
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      recorderRef.current.stop();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (recordingState.audioUrl) {
      URL.revokeObjectURL(recordingState.audioUrl);
    }
  }
}

function getStageLabel(stage) {
  switch (stage) {
    case "learning":
      return "導入済み";
    case "reviewing":
      return "復習中";
    case "solid":
      return "定着";
    default:
      return "新規";
  }
}

function buildEnglishSnapshot({ progressMap, attemptHistory, settings }) {
  const savedAt = Date.now();

  return {
    progressMap: compactEnglishProgressMap(progressMap),
    attemptHistory: Array.isArray(attemptHistory) ? attemptHistory : [],
    settings: normalizeEnglishSnapshotSettings(settings),
    savedAt
  };
}

function readLocalEnglishSnapshot(storageKey) {
  if (typeof window === "undefined") return createEmptyEnglishSnapshot();

  try {
    const raw = window.localStorage.getItem(storageKey) || window.localStorage.getItem(LEGACY_STORAGE_KEY);
    if (!raw) return createEmptyEnglishSnapshot();
    return normalizeEnglishSnapshot(JSON.parse(raw));
  } catch (_error) {
    return createEmptyEnglishSnapshot();
  }
}

async function fetchRemoteEnglishSnapshot(supabase, userId) {
  try {
    const { data, error } = await supabase
      .from("english_progress")
      .select("progress_map, attempt_history, settings, updated_at")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      return { snapshot: null, error: "Supabase 同期テーブルが未適用、または読み込みに失敗しました。localStorage に退避しています。" };
    }

    if (!data) return { snapshot: null, error: "" };

    return {
      snapshot: normalizeEnglishSnapshot({
        progressMap: data.progress_map,
        attemptHistory: data.attempt_history,
        settings: data.settings,
        savedAt: data.updated_at ? Date.parse(data.updated_at) : 0
      }),
      error: ""
    };
  } catch (_error) {
    return { snapshot: null, error: "Supabase 同期の読み込みに失敗しました。localStorage に退避しています。" };
  }
}

async function saveRemoteEnglishSnapshot(supabase, userId, snapshot) {
  try {
    const { error } = await supabase
      .from("english_progress")
      .upsert({
        user_id: userId,
        progress_map: snapshot.progressMap,
        attempt_history: snapshot.attemptHistory,
        settings: snapshot.settings
      }, { onConflict: "user_id" });

    if (error) {
      return {
        ok: false,
        message: "Supabase 同期テーブルが未適用、または保存に失敗しました。localStorage には保存済みです。"
      };
    }

    return { ok: true, message: "" };
  } catch (_error) {
    return {
      ok: false,
      message: "Supabase 同期保存に失敗しました。localStorage には保存済みです。"
    };
  }
}

function mergeEnglishSnapshots(localSnapshot, remoteSnapshot) {
  const local = normalizeEnglishSnapshot(localSnapshot);
  const remote = normalizeEnglishSnapshot(remoteSnapshot);
  const localIsNewer = (local.savedAt || 0) >= (remote.savedAt || 0);

  return {
    progressMap: mergeEnglishSyncedProgressMaps(remote.progressMap, local.progressMap),
    attemptHistory: mergeAttemptHistory(remote.attemptHistory, local.attemptHistory),
    settings: localIsNewer
      ? { ...remote.settings, ...local.settings }
      : { ...local.settings, ...remote.settings },
    savedAt: Math.max(local.savedAt || 0, remote.savedAt || 0)
  };
}

function normalizeEnglishSnapshot(snapshot) {
  if (!snapshot) return createEmptyEnglishSnapshot();

  return {
    progressMap: compactEnglishProgressMap(snapshot.progressMap || {}),
    attemptHistory: Array.isArray(snapshot.attemptHistory) ? snapshot.attemptHistory : [],
    settings: normalizeEnglishSnapshotSettings(snapshot.settings || snapshot),
    savedAt: Number(snapshot.savedAt) || 0
  };
}

function createEmptyEnglishSnapshot() {
  return {
    progressMap: createEmptyEnglishProgress(),
    attemptHistory: [],
    settings: normalizeEnglishSnapshotSettings({}),
    savedAt: 0
  };
}

function normalizeEnglishSnapshotSettings(settings) {
  const selectedChunkId = settings.selectedChunkId && ENGLISH_CHUNK_LIBRARY.some((chunk) => chunk.id === settings.selectedChunkId)
    ? settings.selectedChunkId
    : ENGLISH_CHUNK_LIBRARY[0].id;

  return {
    mode: settings.mode && ACTIVE_MODE_IDS.has(settings.mode) ? settings.mode : "study",
    focusTopic: settings.focusTopic || "all",
    posFilter: settings.posFilter && ACTIVE_POS_IDS.has(settings.posFilter) ? settings.posFilter : "all",
    detailMode: settings.detailMode || "gentle",
    supportMode: typeof settings.supportMode === "boolean" ? settings.supportMode : true,
    questionSeconds: clampStudySeconds(settings.questionSeconds ?? DEFAULT_QUESTION_SECONDS),
    answerSeconds: clampStudySeconds(settings.answerSeconds ?? DEFAULT_ANSWER_SECONDS),
    reviewDayOffsets: normalizeEnglishReviewDayOffsets(settings.reviewDayOffsets),
    isAutoSpeakEnabled: typeof settings.isAutoSpeakEnabled === "boolean" ? settings.isAutoSpeakEnabled : true,
    selectedChunkId
  };
}

function mergeAttemptHistory(...histories) {
  const byId = new Map();

  for (const history of histories) {
    for (const entry of Array.isArray(history) ? history : []) {
      if (!entry?.id) continue;
      byId.set(entry.id, entry);
    }
  }

  return [...byId.values()].sort((left, right) => (right.answeredAt || 0) - (left.answeredAt || 0));
}

function getPosLabel(pos) {
  switch (pos) {
    case "noun":
      return "名";
    case "verb":
      return "動";
    case "adjective":
      return "形";
    case "adverb":
      return "副";
    case "preposition":
      return "前";
    case "phrase":
      return "句";
    default:
      return "他";
  }
}

function shuffleItemsBySeed(items, seed) {
  return [...items].sort((left, right) => {
    const leftHash = hashString(`${seed}:${left.id}`);
    const rightHash = hashString(`${seed}:${right.id}`);
    if (leftHash !== rightHash) return leftHash - rightHash;
    return left.headword.localeCompare(right.headword);
  });
}

function hashString(value) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function getTopicLabel(topicId) {
  return ENGLISH_TOPIC_OPTIONS.find((topic) => topic.id === topicId)?.label || topicId;
}

function estimateShadowDuration(prompt) {
  const words = prompt.trim().split(/\s+/).filter(Boolean).length;
  return words * 430 + 400;
}

function getShadowFeedback(durationMs, estimateMs, supportMode) {
  const ratio = durationMs / Math.max(estimateMs, 1);

  if (ratio >= 0.82 && ratio <= 1.2) {
    return supportMode
      ? "よいテンポです。完璧さより、止まらず追えている感覚を優先します。"
      : "テンポは十分です。次は語のつながりを崩さずにいきます。";
  }

  if (ratio < 0.82) {
    return supportMode
      ? "少し速めでした。ゆっくりでもよいので、音のまとまりを残します。"
      : "やや速いです。チャンクの切れ目を保ちます。";
  }

  return supportMode
    ? "少し長めでした。止まりながらでも大丈夫です。次は一息で言える部分を増やします。"
    : "少し長めでした。止まる位置を減らします。";
}

function getPromptTopic(chunk, prompt) {
  const example = [...chunk.starterExamples, ...chunk.diverseExamples].find((item) => item.text === prompt);
  return example?.topic || chunk.starterExamples[0]?.topic || "all";
}

function formatShadowDuration(durationMs) {
  if (!durationMs) return "0.0s";
  return `${(durationMs / 1000).toFixed(1)}s`;
}

function formatNextReview(nextReviewAt) {
  if (!nextReviewAt) return "未設定";
  const diff = nextReviewAt - Date.now();
  if (diff <= 0) return "いま";
  if (diff < 60 * 60 * 1000) return `${Math.max(1, Math.round(diff / (60 * 1000)))}分後`;
  if (diff < 24 * 60 * 60 * 1000) return `${Math.max(1, Math.round(diff / (60 * 60 * 1000)))}時間後`;
  return `${Math.max(1, Math.round(diff / (24 * 60 * 60 * 1000)))}日後`;
}

function clampStudySeconds(value) {
  if (!Number.isFinite(value)) return DEFAULT_QUESTION_SECONDS;
  return Math.max(1, Math.min(30, Math.round(value)));
}

function clampReviewDayOffset(value) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(365, Math.round(value)));
}

function formatReviewDayLabel(dayOffset) {
  if (dayOffset <= 0) return "当日";
  if (dayOffset === 1) return "翌日";
  return `${dayOffset}日後`;
}

function getSyncLabel(syncStatus, session) {
  if (!session?.user?.id) return "local";
  if (syncStatus === "syncing") return "syncing";
  if (syncStatus === "synced") return "synced";
  return "local fallback";
}
