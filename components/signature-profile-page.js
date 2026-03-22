import Link from "next/link";
import { AvatarMark } from "@/components/avatar-mark";
import { SignatureHeroShader } from "@/components/signature-hero-shader";
import { SignatureHeroStage } from "@/components/signature-hero-stage";
import { SignatureInteractiveSection } from "@/components/signature-interactive-section";
import { SignaturePostShelf } from "@/components/signature-post-shelf";
import { ProfileSocialActions } from "@/components/profile-social-actions";
import { ReportAction } from "@/components/report-action";
import { sanitizeExternalUrl } from "@/lib/url";

export function SignatureProfilePage({ profile, posts }) {
  const featuredPosts = posts.slice(0, 3);
  const recentPosts = posts.slice(0, 4);
  const leadCopy = profile.headline || "Researching interaction, building thoughtful systems.";
  const identityBody =
    profile.bio ||
    "知覚、身体、記録、インターフェース。そのあいだを研究と実装の両方から往復しながら、触れる思考と残る体験をつくっています。";
  const collaborationLabel = profile.open_to ? "Open to collaboration" : "Quietly building";
  const links = [
    { label: "Website", href: sanitizeExternalUrl(profile.website_url) },
    { label: "X", href: sanitizeExternalUrl(profile.x_url) },
    { label: "GitHub", href: sanitizeExternalUrl(profile.github_url) },
    { label: "note", href: sanitizeExternalUrl(profile.note_url) }
  ].filter((item) => item.href);
  const infoCards = [
    {
      eyebrow: "Affiliation",
      title: profile.affiliation || "Independent / research-linked",
      body: "所属やいま身を置いている場の輪郭をここに置きます。"
    },
    {
      eyebrow: "Focus",
      title: profile.focus_area || "HCI / Prototyping / Experimental Web",
      body: "問いを立てながら試作し、観察しながら構造へ戻す。その中心にある関心です。"
    },
    {
      eyebrow: "Open to",
      title: "Collaboration",
      body:
        profile.open_to ||
        "研究プロトタイプ、実験用UI、文化系プロジェクト、個人開発の技術相談などを静かに受けています。"
    }
  ];
  const currentSignals = buildCurrentSignals(profile);

  return (
    <main className="signature-page">
      <div className="signature-noise" aria-hidden="true" />
      <div className="signature-glow signature-glow-a" aria-hidden="true" />
      <div className="signature-glow signature-glow-b" aria-hidden="true" />
      <nav className="signature-local-nav" aria-label="Profile sections">
        <a href="#signature-identity">Identity</a>
        <a href="#signature-current">Current</a>
        <a href="#signature-works">Works</a>
        <a href="#signature-thinking">Thinking</a>
        <a href="#signature-contact">Contact</a>
      </nav>

      <SignatureHeroStage>
        <SignatureHeroShader />
        <div className="signature-hero-copy">
          <div className="signature-topline">
            <p className="signature-kicker">A Quiet Field Between Research and Making</p>
            <span className="signature-status-pill">{collaborationLabel}</span>
          </div>
          <AvatarMark profile={profile} size="lg" />
          <p className="signature-eyebrow">@{profile.username}</p>
          <h1>{profile.display_name || profile.username}</h1>
          <p className="signature-lead">{leadCopy}</p>
          <p className="signature-body">{identityBody}</p>

          <div className="hero-actions signature-hero-actions">
            <a className="button button-primary" href="#signature-works">
              作品を見る
            </a>
            <a className="button button-secondary" href="#signature-thinking">
              思考を読む
            </a>
            <a className="button button-ghost" href="#signature-contact">
              連絡する
            </a>
          </div>

          {links.length ? (
            <div className="signature-inline-links">
              {links.map((link) => (
                <a key={link.label} href={link.href} target="_blank" rel="noreferrer">
                  {link.label}
                </a>
              ))}
            </div>
          ) : null}
        </div>

        <aside className="signature-panel">
          <p className="eyebrow">Current Coordinates</p>
          <dl className="signature-coordinates">
            <div>
              <dt>Affiliation</dt>
              <dd>{profile.affiliation || "Not set"}</dd>
            </div>
            <div>
              <dt>Handle</dt>
              <dd>@{profile.username}</dd>
            </div>
            <div>
              <dt>Focus</dt>
              <dd>{profile.focus_area || "Not set"}</dd>
            </div>
            <div>
              <dt>Base</dt>
              <dd>{profile.location || "Tokyo / Remote"}</dd>
            </div>
            <div>
              <dt>Available for</dt>
              <dd>{profile.open_to || "Research prototyping / design engineering"}</dd>
            </div>
          </dl>
          <div className="signature-panel-note">
            <p>観察し、試作し、言葉に戻す。その往復のログとしてこのページを置いています。</p>
          </div>
        </aside>
      </SignatureHeroStage>

      <ProfileSocialActions
        profileId={profile.id}
        username={profile.username}
        initialStats={profile.stats || { follower_count: 0, following_count: 0, public_post_count: posts.length }}
      />
      <ReportAction targetProfileId={profile.id} label="プロフィールを通報" />

      <SignatureInteractiveSection id="signature-identity">
        <div className="signature-section-head">
          <p className="eyebrow">Identity</p>
          <h2>研究し、つくり、観察し続ける。</h2>
        </div>
        <div className="signature-identity-grid">
          <article className="signature-statement-card">
            <p className="signature-body">{identityBody}</p>
            <p className="signature-body">
              {profile.focus_area
                ? `${profile.focus_area} を軸に、研究の仮説と実装の手触りが途切れない形を探しています。`
                : "曖昧な感覚をどう観測し、どう設計へ変換するか。そのあいだにある実践を大切にしています。"}
            </p>
          </article>
          <div className="signature-about-grid">
            {infoCards.map((card) => (
              <article key={card.eyebrow} className="signature-info-card">
                <p className="eyebrow">{card.eyebrow}</p>
                <h3>{card.title}</h3>
                <p>{card.body}</p>
              </article>
            ))}
          </div>
        </div>
      </SignatureInteractiveSection>

      <SignatureInteractiveSection id="signature-current">
        <div className="signature-section-head">
          <p className="eyebrow">Current</p>
          <h2>This week, in motion</h2>
        </div>
        <div className="signature-current-grid">
          {currentSignals.map((signal) => (
            <article key={signal.label} className="signature-current-card">
              <p className="eyebrow">{signal.label}</p>
              <h3>{signal.title}</h3>
              <p>{signal.body}</p>
            </article>
          ))}
        </div>
      </SignatureInteractiveSection>

      <SignatureInteractiveSection id="signature-works">
        <div className="signature-section-head">
          <p className="eyebrow">Works</p>
          <h2>Works shaped by questions</h2>
          <p>完成品ではなく、どんな問いを持って作ったかが見えるように並べています。</p>
        </div>
        {featuredPosts.length ? (
          <SignaturePostShelf username={profile.username} posts={featuredPosts} />
        ) : (
          <div className="signature-post-card empty-state">
            <h3>まだ記事がありません</h3>
            <p>最初の公開記事を追加するとここに出ます。</p>
            </div>
          )}
      </SignatureInteractiveSection>

      {links.length ? (
        <SignatureInteractiveSection id="signature-links">
          <div className="signature-section-head">
            <p className="eyebrow">Links</p>
            <h2>Outside the page</h2>
          </div>
          <div className="link-list">
            {links.map((link) => (
              <a key={link.label} href={link.href} target="_blank" rel="noreferrer" className="button button-secondary">
                {link.label}
              </a>
            ))}
          </div>
        </SignatureInteractiveSection>
      ) : null}

      <SignatureInteractiveSection id="signature-thinking">
        <div className="signature-section-head">
          <p className="eyebrow">Thinking</p>
          <h2>Current signals</h2>
          <p>最近の記録や途中経過を、ログの断片のように並べています。</p>
        </div>

        <div className="signature-signals">
          {recentPosts.length ? (
            recentPosts.map((post) => (
              <Link key={post.id} href={`/@${profile.username}/${post.slug}`} className="signature-signal-line">
                <span className="signature-signal-date">{formatDate(post.published_at || post.updated_at)}</span>
                <div>
                  <strong>{post.title}</strong>
                  <p>{post.excerpt || "本文から紹介文を追加してください。"}</p>
                  {post.tags.length ? (
                    <div className="tag-row">
                      {post.tags.map((tag) => (
                        <span key={tag} className="tag-chip">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>
              </Link>
            ))
          ) : (
            <div className="signature-post-card empty-state">
              <h3>まだ公開記事がありません</h3>
              <p>ここには最新の公開更新が並びます。</p>
            </div>
          )}
        </div>
      </SignatureInteractiveSection>

      <SignatureInteractiveSection id="signature-contact">
        <div className="signature-section-head">
          <p className="eyebrow">Collaboration</p>
          <h2>静かに対話へ開く</h2>
        </div>
        <div className="signature-contact-card">
          <p>
            {profile.open_to ||
              "研究プロトタイプ、実験用UI、文化系プロジェクト、個人開発の技術相談などを受けています。"}
          </p>
          <div className="link-list">
            {links.length ? (
              links.map((link) => (
                <a key={link.label} href={link.href} target="_blank" rel="noreferrer" className="button button-primary">
                  {link.label}
                </a>
              ))
            ) : (
              <Link href="/dashboard" className="button button-secondary">
                リンクを設定する
              </Link>
            )}
          </div>
        </div>
      </SignatureInteractiveSection>
    </main>
  );
}

function buildCurrentSignals(profile) {
  return [
    {
      label: "Base",
      title: profile.location || "Tokyo / Remote",
      body: "現在の活動拠点や、日々の制作と研究が動いている場所。"
    },
    {
      label: "Focus",
      title: profile.focus_area || "Perception / Interfaces / Prototyping",
      body: "いま一番エネルギーを使っている領域。"
    },
    {
      label: "Open to",
      title: profile.open_to || "Research prototyping / technical direction",
      body: "相談できること、いま開いている接点。"
    }
  ];
}

function formatDate(value) {
  if (!value) return "Draft";
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric"
  }).format(new Date(value));
}
