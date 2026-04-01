import { NextResponse } from "next/server";
import { getSpecialArticleById } from "@/lib/data";
import {
  getSpecialArticleAccessCookieName,
  getSpecialArticlePassword,
  requiresSpecialArticlePassword
} from "@/lib/special-article-access";

export async function POST(request) {
  const body = await request.json().catch(() => ({}));
  const articleId = `${body.articleId || ""}`.trim();
  const password = `${body.password || ""}`;

  if (!articleId) {
    return NextResponse.json({ error: "記事が見つかりません。" }, { status: 400 });
  }

  const article = await getSpecialArticleById(articleId);
  if (!article) {
    return NextResponse.json({ error: "記事が見つかりません。" }, { status: 404 });
  }

  if (!requiresSpecialArticlePassword(article)) {
    return NextResponse.json({ ok: true });
  }

  if (password !== getSpecialArticlePassword(article)) {
    return NextResponse.json({ error: "パスワードが違います。" }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(getSpecialArticleAccessCookieName(articleId), "granted", {
    httpOnly: true,
    sameSite: "lax",
    secure: true,
    path: `/special-articles/${articleId}`,
    maxAge: 60 * 60 * 12
  });
  return response;
}
