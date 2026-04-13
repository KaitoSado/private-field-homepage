export function canCreateApplication({ viewerId, ownerId, listingStatus, viewerAccountStatus = "active", hasProfile = true, isBlocked = false }) {
  if (!viewerId) {
    return { allowed: false, reason: "ログインが必要です。" };
  }

  if (!hasProfile) {
    return { allowed: false, reason: "先にプロフィールを作成してください。" };
  }

  if (viewerAccountStatus !== "active") {
    return { allowed: false, reason: "このアカウントでは問い合わせできません。" };
  }

  if (viewerId === ownerId) {
    return { allowed: false, reason: "自分の掲載には問い合わせできません。" };
  }

  if (listingStatus !== "published") {
    return { allowed: false, reason: "公開中の掲載にだけ問い合わせできます。" };
  }

  if (isBlocked) {
    return { allowed: false, reason: "ブロック関係があるため送信できません。" };
  }

  return { allowed: true, reason: "" };
}

export function canAccessThread({ viewerId, participantIds = [], isAdmin = false }) {
  if (isAdmin) return true;
  if (!viewerId) return false;
  return participantIds.includes(viewerId);
}

export function canSendMessage({ viewerId, senderId, participantIds = [], threadStatus = "active", isBlocked = false }) {
  if (!viewerId || viewerId !== senderId) {
    return { allowed: false, reason: "送信者を確認できません。" };
  }

  if (!participantIds.includes(viewerId)) {
    return { allowed: false, reason: "このスレッドには参加していません。" };
  }

  if (threadStatus !== "active") {
    return { allowed: false, reason: "このスレッドには送信できません。" };
  }

  if (isBlocked) {
    return { allowed: false, reason: "ブロック済みユーザーには送信できません。" };
  }

  return { allowed: true, reason: "" };
}

export function canManageMarketplace(profile) {
  return Boolean(profile && profile.role === "admin" && profile.account_status !== "suspended");
}

export function canUpdateApplicationStatus({ viewerId, ownerId, applicantId, nextStatus, currentStatus, isAdmin = false }) {
  if (isAdmin) return { allowed: true, reason: "" };

  if (nextStatus === "cancelled") {
    if (viewerId === applicantId && currentStatus === "pending") return { allowed: true, reason: "" };
    return { allowed: false, reason: "キャンセルできるのは未対応の申請者だけです。" };
  }

  if (viewerId !== ownerId) {
    return { allowed: false, reason: "承認・拒否できるのは掲載者だけです。" };
  }

  if (!["accepted", "rejected", "completed"].includes(nextStatus)) {
    return { allowed: false, reason: "不正なステータスです。" };
  }

  if (currentStatus === "cancelled" || currentStatus === "rejected") {
    return { allowed: false, reason: "この申請は更新できません。" };
  }

  return { allowed: true, reason: "" };
}

export function canReviewApplication({ reviewerId, revieweeId, applicationStatus, isParticipant, hasExistingReview }) {
  if (!reviewerId) return { allowed: false, reason: "ログインが必要です。" };
  if (reviewerId === revieweeId) return { allowed: false, reason: "自分自身はレビューできません。" };
  if (!isParticipant) return { allowed: false, reason: "当事者だけがレビューできます。" };
  if (!["accepted", "completed"].includes(applicationStatus)) {
    return { allowed: false, reason: "承認後のやりとりだけレビューできます。" };
  }
  if (hasExistingReview) return { allowed: false, reason: "この対象にはすでにレビュー済みです。" };
  return { allowed: true, reason: "" };
}

export function canFavoriteListing({ viewerId, listingStatus }) {
  if (!viewerId) return { allowed: false, reason: "ログインが必要です。" };
  if (listingStatus !== "published") return { allowed: false, reason: "公開中の掲載だけお気に入りできます。" };
  return { allowed: true, reason: "" };
}
