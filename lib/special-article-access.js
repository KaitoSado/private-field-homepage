export function getSpecialArticlePassword(article) {
  const username = `${article?.profiles?.username || ""}`.trim().toLowerCase();
  if (username === "kaito-sado") {
    return "ナイショ";
  }
  return "";
}

export function requiresSpecialArticlePassword(article) {
  return Boolean(getSpecialArticlePassword(article));
}

export function getSpecialArticleAccessCookieName(articleId) {
  return `fieldcard-special-access-${articleId}`;
}
