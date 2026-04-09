"use client";

import { useEffect, useMemo, useState } from "react";
import {
  RESEARCH_PROJECT_PROGRESS_OPTIONS,
  RESEARCH_PROJECT_RISK_OPTIONS,
  RESEARCH_PROJECT_TYPE_OPTIONS,
  getResearchProjectOverallProgress,
  getResearchProjectRiskClass,
  getResearchProjectRiskLabel,
  getResearchProjectStageLabel,
  getResearchProjectStageShortLabel,
  getResearchProjectStageTrack,
  getResearchProjectStages,
  getResearchProjectTypeLabel,
  getResearchRoleLabel,
  isResearchDueSoon,
  isResearchOverdue
} from "@/lib/research-progress";

function buildEmptyProjectForm(members) {
  const assignableMembers = (members || []).filter((member) => member.role !== "viewer");
  const defaultLead = assignableMembers[0]?.id || "";
  const defaultType = RESEARCH_PROJECT_TYPE_OPTIONS[0];
  const defaultStage = getResearchProjectStages(defaultType)[0] || "theme_definition";

  return {
    id: "",
    title: "",
    projectType: defaultType,
    currentStage: defaultStage,
    stageProgress: 0,
    riskLevel: "on_track",
    leadUserId: defaultLead,
    memberIds: defaultLead ? [defaultLead] : [],
    nextMilestoneTitle: "",
    nextMilestoneDueOn: "",
    summaryText: "",
    blockerNote: "",
    decisionNeeded: false,
    isActive: true
  };
}

function buildProjectForm(project, members) {
  if (!project) return buildEmptyProjectForm(members);

  return {
    id: project.id,
    title: project.title || "",
    projectType: project.project_type || RESEARCH_PROJECT_TYPE_OPTIONS[0],
    currentStage: project.current_stage || getResearchProjectStages(project.project_type)[0] || "theme_definition",
    stageProgress: Number(project.stage_progress || 0),
    riskLevel: project.risk_level || "on_track",
    leadUserId: project.lead_user_id || project.lead?.id || "",
    memberIds: (project.members || []).map((member) => member.id),
    nextMilestoneTitle: project.next_milestone_title || "",
    nextMilestoneDueOn: project.next_milestone_due_on || "",
    summaryText: project.summary_text || "",
    blockerNote: project.blocker_note || "",
    decisionNeeded: Boolean(project.decision_needed),
    isActive: project.is_active !== false
  };
}

function getSelectedValues(event) {
  return Array.from(event.target.selectedOptions || []).map((option) => option.value);
}

function compareProjects(left, right) {
  const rank = {
    blocked: 0,
    needs_decision: 1,
    at_risk: 2,
    on_track: 3
  };
  const riskDiff = (rank[left.risk_level] ?? 9) - (rank[right.risk_level] ?? 9);
  if (riskDiff !== 0) return riskDiff;

  const leftDue = left.next_milestone_due_on ? new Date(left.next_milestone_due_on).getTime() : Number.POSITIVE_INFINITY;
  const rightDue = right.next_milestone_due_on ? new Date(right.next_milestone_due_on).getTime() : Number.POSITIVE_INFINITY;
  if (leftDue !== rightDue) return leftDue - rightDue;

  return (right.overall_progress || 0) - (left.overall_progress || 0);
}

export function ResearchProjectPortfolio({ dashboard, slug, session, canManageProjects, onReload }) {
  const members = dashboard?.members || [];
  const projects = useMemo(() => [...(dashboard?.projects || [])].sort(compareProjects), [dashboard?.projects]);
  const assignableMembers = useMemo(
    () => members.filter((member) => member.role !== "viewer"),
    [members]
  );
  const [projectForm, setProjectForm] = useState(() => buildEmptyProjectForm(assignableMembers));
  const [projectStatus, setProjectStatus] = useState("");
  const [projectSubmitting, setProjectSubmitting] = useState(false);

  useEffect(() => {
    setProjectForm((current) => {
      if (current.id) {
        const currentProject = projects.find((item) => item.id === current.id);
        return currentProject ? buildProjectForm(currentProject, assignableMembers) : buildEmptyProjectForm(assignableMembers);
      }

      if (current.leadUserId) return current;
      return buildEmptyProjectForm(assignableMembers);
    });
  }, [assignableMembers, projects]);

  const memberPortfolio = useMemo(() => {
    return assignableMembers
      .map((member) => {
        const assignedProjects = projects.filter((project) => project.members?.some((item) => item.id === member.id));
        return {
          member,
          assignedProjects,
          blockedCount: assignedProjects.filter((project) => project.risk_level === "blocked").length,
          dueSoonCount: assignedProjects.filter((project) => isResearchDueSoon(project.next_milestone_due_on)).length
        };
      })
      .sort((left, right) => {
        if (right.blockedCount !== left.blockedCount) return right.blockedCount - left.blockedCount;
        if (right.dueSoonCount !== left.dueSoonCount) return right.dueSoonCount - left.dueSoonCount;
        const leftName = left.member.profile?.display_name || left.member.profile?.username || "";
        const rightName = right.member.profile?.display_name || right.member.profile?.username || "";
        return leftName.localeCompare(rightName, "ja");
      });
  }, [assignableMembers, projects]);

  const stageCounts = (dashboard?.pipeline_summary?.by_stage || []).filter((item) => item.count > 0);

  function resetProjectForm() {
    setProjectForm(buildEmptyProjectForm(assignableMembers));
  }

  function handleProjectTypeChange(nextType) {
    const stages = getResearchProjectStages(nextType);
    setProjectForm((current) => ({
      ...current,
      projectType: nextType,
      currentStage: stages.includes(current.currentStage) ? current.currentStage : stages[0]
    }));
  }

  function handleLeadChange(nextLeadUserId) {
    setProjectForm((current) => ({
      ...current,
      leadUserId: nextLeadUserId,
      memberIds: [...new Set([nextLeadUserId, ...current.memberIds.filter(Boolean)])]
    }));
  }

  function handleMemberChange(event) {
    const selectedValues = getSelectedValues(event);
    setProjectForm((current) => ({
      ...current,
      memberIds: [...new Set([current.leadUserId, ...selectedValues.filter(Boolean)])]
    }));
  }

  function handleEditProject(project) {
    setProjectForm(buildProjectForm(project, assignableMembers));
    setProjectStatus("");
  }

  async function handleProjectSubmit(event) {
    event.preventDefault();
    if (!session?.access_token) {
      setProjectStatus("プロジェクト管理にはログインが必要です。");
      return;
    }

    setProjectSubmitting(true);
    setProjectStatus("");

    try {
      const response = await fetch("/api/research-projects", {
        method: projectForm.id ? "PATCH" : "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          projectId: projectForm.id || undefined,
          groupSlug: slug,
          title: projectForm.title,
          projectType: projectForm.projectType,
          currentStage: projectForm.currentStage,
          stageProgress: Number(projectForm.stageProgress),
          riskLevel: projectForm.riskLevel,
          leadUserId: projectForm.leadUserId,
          memberIds: projectForm.memberIds,
          nextMilestoneTitle: projectForm.nextMilestoneTitle,
          nextMilestoneDueOn: projectForm.nextMilestoneDueOn,
          summaryText: projectForm.summaryText,
          blockerNote: projectForm.blockerNote,
          decisionNeeded: projectForm.decisionNeeded,
          isActive: projectForm.isActive
        })
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.error || "研究ラインを更新できませんでした。");
      }

      resetProjectForm();
      await onReload();
      setProjectStatus(projectForm.id ? "研究ラインを更新しました。" : "研究ラインを作成しました。");
    } catch (error) {
      setProjectStatus(error.message || "研究ラインを更新できませんでした。");
    } finally {
      setProjectSubmitting(false);
    }
  }

  return (
    <section className="research-progress-portfolio">
      <section className="research-progress-summary-grid">
        <article className="surface research-progress-summary-card">
          <span>案件数</span>
          <strong>{dashboard?.pipeline_summary?.active_count || 0}</strong>
        </article>
        <article className="surface research-progress-summary-card">
          <span>直近締切</span>
          <strong>{dashboard?.pipeline_summary?.due_soon_count || 0}</strong>
        </article>
        <article className="surface research-progress-summary-card">
          <span>停滞案件</span>
          <strong>{dashboard?.pipeline_summary?.blocked_count || 0}</strong>
        </article>
        <article className="surface research-progress-summary-card">
          <span>注意案件</span>
          <strong>{dashboard?.pipeline_summary?.at_risk_count || 0}</strong>
        </article>
        <article className="surface research-progress-summary-card">
          <span>判断待ち</span>
          <strong>{dashboard?.pipeline_summary?.needs_decision_count || 0}</strong>
        </article>
      </section>

      <section className="surface research-progress-board-card">
        <div className="research-progress-section-head">
          <div>
            <h2>研究室パイプライン</h2>
            <p>研究計画、研究費申請、ポスター、論文投稿までを一本の線で見ます。主役は週報ではなくプロジェクトです。</p>
          </div>
        </div>

        {stageCounts.length ? (
          <div className="research-project-stage-strip">
            {stageCounts.map((item) => (
              <div key={item.stage_key} className="research-project-stage-pill">
                <span>{getResearchProjectStageShortLabel(item.stage_key)}</span>
                <strong>{item.count}</strong>
              </div>
            ))}
          </div>
        ) : null}

        <div className="research-progress-table-wrap">
          <table className="research-progress-table">
            <thead>
              <tr>
                <th>project</th>
                <th>lead / team</th>
                <th>line</th>
                <th>現在地</th>
                <th>次の締切</th>
                <th>risk</th>
                {canManageProjects ? <th>manage</th> : null}
              </tr>
            </thead>
            <tbody>
              {projects.length ? (
                projects.map((project) => {
                  const track = getResearchProjectStageTrack(project.project_type, project.current_stage);
                  const dueSoon = isResearchDueSoon(project.next_milestone_due_on);
                  const overdue = isResearchOverdue(project.next_milestone_due_on);

                  return (
                    <tr key={project.id}>
                      <td>
                        <div className="research-progress-cell-stack">
                          <strong>{project.title}</strong>
                          <span>{getResearchProjectTypeLabel(project.project_type)}</span>
                          {project.summary_text ? <small>{project.summary_text}</small> : null}
                        </div>
                      </td>
                      <td>
                        <div className="research-progress-cell-stack">
                          <strong>{project.lead?.display_name || project.lead?.username || "lead"}</strong>
                          <span>@{project.lead?.username || "user"}</span>
                          <small>{(project.members || []).map((item) => item.profile?.display_name || item.profile?.username).filter(Boolean).join(" / ") || "未設定"}</small>
                        </div>
                      </td>
                      <td>
                        <div className="research-project-track" aria-label={`${project.title} の研究ライン`}>
                          {track.map((stage) => (
                            <div
                              key={stage.key}
                              className={`research-project-track-step is-${stage.state}`}
                              title={stage.label}
                            >
                              {stage.shortLabel}
                            </div>
                          ))}
                        </div>
                      </td>
                      <td>
                        <div className="research-progress-cell-stack">
                          <strong>{getResearchProjectStageLabel(project.current_stage)}</strong>
                          <span>{project.stage_progress}% / 全体 {project.overall_progress || getResearchProjectOverallProgress(project.project_type, project.current_stage, project.stage_progress)}%</span>
                        </div>
                      </td>
                      <td>
                        <div className="research-progress-cell-stack">
                          <strong>{project.next_milestone_title || "未設定"}</strong>
                          <span>{project.next_milestone_due_on || "締切未設定"}</span>
                          {overdue ? <small>期限超過</small> : null}
                          {!overdue && dueSoon ? <small>2週間以内</small> : null}
                        </div>
                      </td>
                      <td>
                        <div className="research-progress-cell-stack">
                          <span className={getResearchProjectRiskClass(project.risk_level)}>
                            {getResearchProjectRiskLabel(project.risk_level)}
                          </span>
                          {project.decision_needed ? <span className="research-progress-chip">判断待ち</span> : null}
                          {project.blocker_note ? <small>{project.blocker_note}</small> : null}
                        </div>
                      </td>
                      {canManageProjects ? (
                        <td>
                          <button type="button" className="button button-secondary button-small" onClick={() => handleEditProject(project)}>
                            編集
                          </button>
                        </td>
                      ) : null}
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={canManageProjects ? 7 : 6}>
                    <div className="research-progress-note-box">
                      <p>まだ研究ラインがありません。案件を 1 本作ると、研究室全体の現在地が一覧で見えます。</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="research-progress-main-grid">
        <section className="surface research-progress-history-card">
          <div className="research-progress-section-head">
            <div>
              <h2>メンバー別の現在地</h2>
              <p>誰がどの案件を持ち、どこで詰まりやすいかを人単位で見ます。</p>
            </div>
          </div>

          <div className="research-progress-table-wrap">
            <table className="research-progress-table">
              <thead>
                <tr>
                  <th>member</th>
                  <th>担当案件</th>
                  <th>ホットスポット</th>
                </tr>
              </thead>
              <tbody>
                {memberPortfolio.map((entry) => (
                  <tr key={entry.member.id}>
                    <td>
                      <div className="research-progress-cell-stack">
                        <strong>{entry.member.profile?.display_name || entry.member.profile?.username || "member"}</strong>
                        <span>@{entry.member.profile?.username || "user"}</span>
                        <small>{getResearchRoleLabel(entry.member.role)}</small>
                      </div>
                    </td>
                    <td>
                      <div className="research-progress-cell-stack">
                        {entry.assignedProjects.length ? (
                          entry.assignedProjects.map((project) => (
                            <small key={project.id}>
                              {project.title} / {getResearchProjectStageLabel(project.current_stage)}
                            </small>
                          ))
                        ) : (
                          <span>担当案件なし</span>
                        )}
                      </div>
                    </td>
                    <td>
                      <div className="research-progress-cell-stack">
                        {entry.blockedCount ? <span className="research-progress-chip is-danger">停滞 {entry.blockedCount}</span> : null}
                        {entry.dueSoonCount ? <span className="research-progress-chip is-warning">締切接近 {entry.dueSoonCount}</span> : null}
                        {!entry.blockedCount && !entry.dueSoonCount ? <span>安定</span> : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {canManageProjects ? (
          <aside className="surface research-progress-form-card">
            <div className="research-progress-section-head">
              <div>
                <h2>{projectForm.id ? "研究ラインを更新" : "研究ラインを作成"}</h2>
                <p>group owner が案件単位で現在地と次の締切を管理します。</p>
              </div>
            </div>

            <form className="research-progress-form" onSubmit={handleProjectSubmit}>
              <label>
                <span>プロジェクト名</span>
                <input
                  value={projectForm.title}
                  onChange={(event) => setProjectForm((current) => ({ ...current, title: event.target.value }))}
                  placeholder="例: HCI 2026 春学会"
                  maxLength={160}
                  required
                />
              </label>

              <div className="research-progress-form-row">
                <label>
                  <span>プロジェクト種別</span>
                  <select value={projectForm.projectType} onChange={(event) => handleProjectTypeChange(event.target.value)}>
                    {RESEARCH_PROJECT_TYPE_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {getResearchProjectTypeLabel(option)}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>担当者</span>
                  <select value={projectForm.leadUserId} onChange={(event) => handleLeadChange(event.target.value)}>
                    {assignableMembers.map((member) => (
                      <option key={member.id} value={member.id}>
                        {member.profile?.display_name || member.profile?.username || "member"}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="research-progress-form-row">
                <label>
                  <span>現在ステージ</span>
                  <select
                    value={projectForm.currentStage}
                    onChange={(event) => setProjectForm((current) => ({ ...current, currentStage: event.target.value }))}
                  >
                    {getResearchProjectStages(projectForm.projectType).map((stage) => (
                      <option key={stage} value={stage}>
                        {getResearchProjectStageLabel(stage)}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>段階内進捗</span>
                  <select
                    value={String(projectForm.stageProgress)}
                    onChange={(event) => setProjectForm((current) => ({ ...current, stageProgress: Number(event.target.value) }))}
                  >
                    {RESEARCH_PROJECT_PROGRESS_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}%
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="research-progress-form-row">
                <label>
                  <span>risk</span>
                  <select
                    value={projectForm.riskLevel}
                    onChange={(event) => setProjectForm((current) => ({ ...current, riskLevel: event.target.value }))}
                  >
                    {RESEARCH_PROJECT_RISK_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {getResearchProjectRiskLabel(option)}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="research-progress-toggle">
                  <input
                    type="checkbox"
                    checked={projectForm.decisionNeeded}
                    onChange={(event) => setProjectForm((current) => ({ ...current, decisionNeeded: event.target.checked }))}
                  />
                  <span>判断待ち</span>
                </label>
              </div>

              <label>
                <span>担当メンバー</span>
                <select multiple value={projectForm.memberIds} onChange={handleMemberChange}>
                  {assignableMembers.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.profile?.display_name || member.profile?.username || "member"}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <span>次の締切タイトル</span>
                <input
                  value={projectForm.nextMilestoneTitle}
                  onChange={(event) => setProjectForm((current) => ({ ...current, nextMilestoneTitle: event.target.value }))}
                  placeholder="例: 学会要旨提出"
                  maxLength={160}
                />
              </label>

              <label>
                <span>次の締切日</span>
                <input
                  type="date"
                  value={projectForm.nextMilestoneDueOn}
                  onChange={(event) => setProjectForm((current) => ({ ...current, nextMilestoneDueOn: event.target.value }))}
                />
              </label>

              <label>
                <span>案件の要約</span>
                <textarea
                  value={projectForm.summaryText}
                  onChange={(event) => setProjectForm((current) => ({ ...current, summaryText: event.target.value }))}
                  placeholder="この案件の狙いと現状を短く書く。"
                  rows={3}
                />
              </label>

              <label>
                <span>詰まり / 管理メモ</span>
                <textarea
                  value={projectForm.blockerNote}
                  onChange={(event) => setProjectForm((current) => ({ ...current, blockerNote: event.target.value }))}
                  placeholder="意思決定待ち、予算待ち、分析停滞など。"
                  rows={3}
                />
              </label>

              <div className="research-project-form-actions">
                <button type="submit" className="button button-primary" disabled={projectSubmitting}>
                  {projectSubmitting ? "保存中..." : projectForm.id ? "研究ラインを更新" : "研究ラインを作成"}
                </button>
                {projectForm.id ? (
                  <button
                    type="button"
                    className="button button-secondary"
                    onClick={() => {
                      resetProjectForm();
                      setProjectStatus("");
                    }}
                  >
                    新規作成に戻る
                  </button>
                ) : null}
              </div>
            </form>

            {projectStatus ? <p className="form-status">{projectStatus}</p> : null}
          </aside>
        ) : null}
      </section>
    </section>
  );
}
