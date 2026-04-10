"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ENGLISH_CHUNK_LIBRARY,
  ENGLISH_MODE_TABS,
  ENGLISH_POS_OPTIONS,
  ENGLISH_TOPIC_OPTIONS,
  compactEnglishProgressMap,
  createEmptyEnglishProgress,
  getEnglishProgressForId,
  getEnglishFamilyMembers,
  getEnglishRecommendedChunkIds,
  getExamplesForFocus,
  getEnglishReviewStepLabel,
  recordStudyAttempt,
  markShadowComplete
} from "@/lib/english-content";

const STORAGE_KEY = "new-commune:english-chunks:v2";
const ACTIVE_MODE_IDS = new Set(ENGLISH_MODE_TABS.map((tab) => tab.id));

export function EnglishChunksApp() {
  const [hydrated, setHydrated] = useState(false);
  const [progressMap, setProgressMap] = useState(() => createEmptyEnglishProgress());
  const [attemptHistory, setAttemptHistory] = useState([]);
  const [mode, setMode] = useState("study");
  const [focusTopic, setFocusTopic] = useState("all");
  const [posFilter, setPosFilter] = useState("all");
  const [detailMode, setDetailMode] = useState("gentle");
  const [supportMode, setSupportMode] = useState(true);
  const [selectedChunkId, setSelectedChunkId] = useState(ENGLISH_CHUNK_LIBRARY[0].id);
  const [studyPhase, setStudyPhase] = useState("front");
  const [sessionStep, setSessionStep] = useState(1);
  const [queueSeed, setQueueSeed] = useState(0);
  const [shadowPromptIndex, setShadowPromptIndex] = useState(0);
  const [isScriptVisible, setIsScriptVisible] = useState(true);
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

  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.progressMap) {
          setProgressMap(compactEnglishProgressMap(parsed.progressMap));
        }
        if (Array.isArray(parsed.attemptHistory)) {
          setAttemptHistory(parsed.attemptHistory);
        }
        if (parsed.mode && ACTIVE_MODE_IDS.has(parsed.mode)) setMode(parsed.mode);
        if (parsed.focusTopic) setFocusTopic(parsed.focusTopic);
        if (parsed.posFilter) setPosFilter(parsed.posFilter);
        if (parsed.detailMode) setDetailMode(parsed.detailMode);
        if (typeof parsed.supportMode === "boolean") setSupportMode(parsed.supportMode);
        if (parsed.selectedChunkId && chunkMap[parsed.selectedChunkId]) {
          setSelectedChunkId(parsed.selectedChunkId);
        }
      }
    } catch (_error) {
      // ignore broken local data
    }

    setHydrated(true);
  }, [chunkMap]);

  useEffect(() => {
    if (hydrated && queueSeed === 0) {
      const nextSeed = Date.now();
      const nextIds = getEnglishRecommendedChunkIds(progressMap, focusTopic, { posFilter, seed: nextSeed });
      setQueueSeed(nextSeed);
      if (nextIds.length) setSelectedChunkId(nextIds[0]);
    }
  }, [focusTopic, hydrated, posFilter, progressMap, queueSeed]);

  useEffect(() => {
    if (!hydrated || typeof window === "undefined") return;
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        progressMap: compactEnglishProgressMap(progressMap),
        attemptHistory,
        mode,
        focusTopic,
        posFilter,
        detailMode,
        supportMode,
        selectedChunkId
      })
    );
  }, [attemptHistory, detailMode, focusTopic, hydrated, mode, posFilter, progressMap, selectedChunkId, supportMode]);

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
    if (recommendedIds.length && !recommendedIds.includes(selectedChunkId)) {
      setSelectedChunkId(recommendedIds[0]);
    }
  }, [recommendedIds, selectedChunkId]);

  useEffect(() => {
    setStudyPhase("front");
    setShadowPromptIndex(0);
    setRecordingState((current) => ({ ...current, error: "" }));
  }, [mode, selectedChunkId]);

  const selectedChunk = chunkMap[selectedChunkId] || ENGLISH_CHUNK_LIBRARY[0];
  const selectedProgress = getEnglishProgressForId(progressMap, selectedChunk.id);
  const selectedFamilyMembers = useMemo(
    () => shuffleItemsBySeed(
      getEnglishFamilyMembers(selectedChunk.id),
      `${queueSeed}:${sessionStep}:${selectedChunk.id}`
    ),
    [queueSeed, selectedChunk.id, sessionStep]
  );
  const diverseExamples = getExamplesForFocus(selectedChunk, focusTopic);
  const allExamples = [...selectedChunk.starterExamples, ...diverseExamples];
  const studyExample = allExamples[(selectedProgress.seenCount + selectedProgress.incorrectCount) % allExamples.length];
  const shadowPrompt = selectedChunk.shadowPrompts[shadowPromptIndex % selectedChunk.shadowPrompts.length];
  const studyPosition = recommendedIds.indexOf(selectedChunk.id);
  const safeStudyPosition = Math.max(0, studyPosition);
  const sessionTotal = recommendedIds.length || ENGLISH_CHUNK_LIBRARY.length;
  const progressRatio = sessionTotal ? sessionStep / sessionTotal : 0;
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
      .filter((entry) => entry.wrongCount > 0)
      .sort((left, right) => {
        if (left.isDue !== right.isDue) return left.isDue ? -1 : 1;
        if (left.reviewStep !== right.reviewStep) return left.reviewStep - right.reviewStep;
        return right.lastAnsweredAt - left.lastAnsweredAt;
      });
  }, [progressMap]);
  const mainVisibleWrongWords = wrongWordList.slice(0, 24);
  const mainHiddenWrongWords = wrongWordList.slice(24);

  const handleSelectChunk = (chunkId) => {
    setSelectedChunkId(chunkId);
    setMode("study");
  };

  const handlePosFilterChange = (nextPosFilter) => {
    const nextSeed = Date.now();
    const nextIds = getEnglishRecommendedChunkIds(progressMap, focusTopic, { posFilter: nextPosFilter, seed: nextSeed });

    setPosFilter(nextPosFilter);
    setSessionStep(1);
    setQueueSeed(nextSeed);
    if (nextIds.length) setSelectedChunkId(nextIds[0]);
  };

  const handleAdvanceChunk = () => {
    if (!recommendedIds.length) return;
    const nextIndex = (safeStudyPosition + 1) % recommendedIds.length;
    const nextId = recommendedIds[nextIndex];
    setSelectedChunkId(nextId);
    setStudyPhase("front");

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

  const handleRevealAnswer = () => {
    if (mode !== "study" || studyPhase === "revealed") return;
    setStudyPhase("revealed");
  };

  const handleStudyAction = (wasCorrect) => {
    if (mode !== "study" || studyPhase !== "revealed") return;

    setProgressMap((current) => recordStudyAttempt(current, selectedChunk, wasCorrect, studyExample.topic));
    setAttemptHistory((current) => [
      {
        id: `${selectedChunk.id}-${Date.now()}`,
        chunkId: selectedChunk.id,
        headword: selectedChunk.headword,
        result: wasCorrect ? "correct" : "wrong",
        topic: studyExample.topic,
        answeredAt: Date.now()
      },
      ...current
    ]);
    handleAdvanceChunk();
  };

  const handleSpeak = (text) => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-US";
    utterance.rate = 0.94;
    utterance.pitch = 1;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  };

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
    setProgressMap((current) => markShadowComplete(current, selectedChunk, getPromptTopic(selectedChunk, shadowPrompt), recordingState.durationMs));
    setShadowPromptIndex((current) => current + 1);
  };

  return (
    <div className="english-shell">
      <section className="english-main-grid">
        <section className="surface english-stage-card">
          {mode === "study" ? (
            <div className="english-pane-stack">
              <div className="english-study-topline">
                <span>{sessionStep} / {sessionTotal}</span>
              </div>

              <section className={`english-study-card ${studyPhase === "revealed" ? "is-revealed" : ""}`}>
                <div className="english-study-sheet">
                  <p className="english-study-word">{selectedChunk.headword}</p>

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

                  {studyPhase === "revealed" ? (
                    <div className="english-study-answer">
                      <span>答え</span>
                      <strong>{selectedChunk.meaning}</strong>
                    </div>
                  ) : null}
                </div>

                {studyPhase === "revealed" ? (
                  <div className="english-judge-stack">
                    <button
                      type="button"
                      className="english-judge-button is-correct"
                      onClick={() => handleStudyAction(true)}
                    >
                      <span>○</span>
                      <small>わかる</small>
                    </button>
                    <button
                      type="button"
                      className="english-judge-button is-wrong"
                      onClick={() => handleStudyAction(false)}
                    >
                      <span>×</span>
                      <small>まだ</small>
                    </button>
                  </div>
                ) : (
                  <div className="english-next-stack">
                    <button
                      type="button"
                      className="english-next-button"
                      onClick={handleRevealAnswer}
                    >
                      次へ
                    </button>
                  </div>
                )}
              </section>

              <div className="english-progress-rail">
                <div className="english-progress-rail-line">
                  <i style={{ width: `${Math.max(6, progressRatio * 100)}%` }} />
                </div>
                <div className="english-progress-rail-copy">
                  <span>start</span>
                  <span>next</span>
                </div>
              </div>

              <div className="english-action-row">
                <button type="button" className="button button-secondary" onClick={() => handleSpeak(selectedChunk.headword)}>
                  単語を聞く
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
                  <h2>{selectedChunk.headword}</h2>
                </div>
                <div className={`english-stage-pill ${selectedProgress.stage}`}>
                  {getStageLabel(selectedProgress.stage)}
                </div>
              </div>

              <section className="english-meaning-card">
                <div className="english-meaning-main">
                  <p className="english-meaning-japanese">{selectedChunk.meaning}</p>
                  <p className="english-meaning-chunk">{selectedChunk.coreChunk}</p>
                </div>
                <div className="english-note-grid">
                  <article className="english-note-card">
                    <strong>ニュアンス</strong>
                    <p>{selectedChunk.nuance}</p>
                  </article>
                  <article className="english-note-card">
                    <strong>使い方</strong>
                    <p>{selectedChunk.grammarNote}</p>
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
                    <article key={`${selectedChunk.id}-${example.text}`} className="english-example-card">
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
                  <span>{selectedChunk.coreChunk}</span>
                </div>

                <div className="english-shadow-chip-row">
                  {selectedChunk.shadowPrompts.map((prompt, index) => (
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
                <dd>{getEnglishReviewStepLabel(selectedProgress.reviewStep)}</dd>
              </div>
            </dl>
          </section>

          <section className="surface english-side-card">
            <div className="english-section-head">
              <h3>メモ</h3>
              <span>note</span>
            </div>
            <p className="english-side-copy">
              {detailMode === "gentle" ? selectedChunk.nuance : selectedChunk.grammarNote}
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
                <em>{getEnglishReviewStepLabel(progress.reviewStep)}</em>
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
                      <em>{getEnglishReviewStepLabel(progress.reviewStep)}</em>
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
