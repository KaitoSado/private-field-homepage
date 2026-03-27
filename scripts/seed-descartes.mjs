import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  throw new Error("Supabase env vars are missing.");
}

const supabase = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false }
});

const SIGNATURE_META_MARKER = "[[signature-meta::";

const profileSeed = {
  username: "descartes-fee233",
  display_name: "ルネ・デカルト",
  headline: "方法的懐疑、コギト、解析幾何。",
  bio:
    "17世紀フランスの哲学者・数学者。疑いうるものをひとまず退け、明晰判明なものから思考を建て直す方法を探究しています。哲学、数学、自然学を横断しながら、思考の座標系そのものを組み直すことに関心があります。",
  affiliation: "17世紀フランスの哲学者・数学者",
  focus_area: "哲学 / 数学 / 方法論 / 解析幾何",
  open_to: "哲学、数学、自然学、方法についての対話。",
  location: "La Haye / Leiden / Stockholm",
  page_theme: "signature",
  discoverable: true,
  avatar_url: "/avatars/descartes.svg"
};

const currentEntries = [
  {
    label: "1637",
    title: "方法を整える",
    body: "思考を分割し、順序づけ、確実なものから始める。混乱した問題も、方法を与えれば進められる。"
  },
  {
    label: "1641",
    title: "省察を深める",
    body: "疑いの極まで進み、それでも残る思考の事実を見定める。そこから精神と世界の秩序を再構成する。"
  },
  {
    label: "1649",
    title: "情念を読む",
    body: "身体と精神の結び目を、情念の働きから考える。理性は情念を消すのではなく、方向づける。"
  }
];

const weeklySchedule = {
  mon: { period1: "省察", period2: "書簡", period3: "幾何", period4: "散歩", period5: "草稿整理" },
  tue: { period1: "自然学", period2: "思索", period3: "原稿執筆", period4: "読書", period5: "対話" },
  wed: { period1: "幾何", period2: "懐疑", period3: "書簡", period4: "散歩", period5: "思索" },
  thu: { period1: "原稿執筆", period2: "数学", period3: "対話", period4: "情念論", period5: "整理" },
  fri: { period1: "省察", period2: "自然学", period3: "幾何", period4: "読書", period5: "草稿整理" },
  sat: { period1: "休息", period2: "書簡", period3: "散策", period4: "自由研究", period5: "休息" },
  sun: { period1: "休息", period2: "礼拝", period3: "思索", period4: "書き留め", period5: "休息" }
};

const recordItems = [
  { title: "方法", body: "問題を小さく分け、順序をつくり、飛躍せず進む。" },
  { title: "懐疑", body: "確かなものが残るまで、思考を一度すべて疑ってみる。" },
  { title: "幾何", body: "図形を座標へ写し、考えるための線を引き直す。" },
  { title: "書簡", body: "遠くの知人との往復から、自分の論点を研ぎ澄ます。" },
  { title: "情念", body: "理性と身体が交わるところで、感情の運動を観察する。" }
];

const postsSeed = [
  {
    slug: "discours-de-la-methode",
    title: "方法序説について",
    excerpt: "考える手順そのものを整えることが、真理への最短距離になる。",
    body:
      "複雑な問いに向かうとき、まず必要なのは情熱ではなく方法である。\n\n私は問題を分割し、もっとも単純なものから始め、順に複雑なものへ進むことを重んじる。\n\n方法とは、思考を遅くするためではなく、誤る速度を下げるための技術である。",
    tags: ["philosophy", "method", "descartes"]
  },
  {
    slug: "meditations-on-first-philosophy",
    title: "我思う、ゆえに我あり",
    excerpt: "すべてを疑っても、疑っているこの思考だけは消えない。",
    body:
      "感覚は誤るかもしれない。夢と現実も取り違えるかもしれない。\n\nそれでも、疑っている私の思考そのものは消えない。そこに、思考するものとしての私が現れる。\n\nこの一点から、精神と世界の秩序をもう一度組み立て直すことができる。",
    tags: ["cogito", "meditation", "descartes"]
  },
  {
    slug: "analytic-geometry",
    title: "解析幾何と座標の発明",
    excerpt: "図形を数に、数を図形に変えることで、考えるための空間をつくる。",
    body:
      "幾何学の図形と代数学の式は、別の言語のようでいて、同じ対象を異なる仕方で記述している。\n\n座標を導入すると、空間の中の点は数の関係として書き表せる。\n\n思考の対象を移しかえるための枠組みをつくること。それは哲学にとっても数学にとっても重要である。",
    tags: ["geometry", "mathematics", "cartesian"]
  }
];

function packSignatureAffiliation(affiliation, heading, current, schedule, records, recordHeading) {
  const meta = encodeURIComponent(
    JSON.stringify({
      identity_heading: heading,
      record_heading: recordHeading,
      current_entries: current,
      weekly_schedule: schedule,
      record_items: records
    })
  );

  return `${SIGNATURE_META_MARKER}${meta}]]\n${affiliation}`;
}

const { data: profile, error: profileError } = await supabase
  .from("profiles")
  .select("id, username")
  .eq("username", profileSeed.username)
  .maybeSingle();

if (profileError) {
  throw profileError;
}

if (!profile) {
  throw new Error(`Profile not found for ${profileSeed.username}`);
}

const packedAffiliation = packSignatureAffiliation(
  profileSeed.affiliation,
  "我思う、ゆえに我あり。",
  currentEntries,
  weeklySchedule,
  recordItems,
  "観察項目"
);

const { error: updateError } = await supabase
  .from("profiles")
  .update({
    display_name: profileSeed.display_name,
    headline: profileSeed.headline,
    bio: profileSeed.bio,
    affiliation: packedAffiliation,
    focus_area: profileSeed.focus_area,
    open_to: profileSeed.open_to,
    location: profileSeed.location,
    page_theme: profileSeed.page_theme,
    discoverable: profileSeed.discoverable,
    avatar_url: profileSeed.avatar_url
  })
  .eq("id", profile.id);

if (updateError) {
  throw updateError;
}

const { data: existingPosts, error: postsError } = await supabase
  .from("posts")
  .select("id, slug, published_at")
  .eq("author_id", profile.id);

if (postsError) {
  throw postsError;
}

for (let index = 0; index < postsSeed.length; index += 1) {
  const seed = postsSeed[index];
  const existing = existingPosts?.find((post) => post.slug === seed.slug);
  const publishedAt = new Date(Date.now() - index * 86400000).toISOString();
  const payload = {
    author_id: profile.id,
    title: seed.title,
    slug: seed.slug,
    excerpt: seed.excerpt,
    body: seed.body,
    published: true,
    published_at: existing?.published_at || publishedAt,
    visibility: "public",
    allow_comments: true,
    tags: seed.tags,
    media_items: [],
    cover_image_url: ""
  };

  const { error } = existing
    ? await supabase.from("posts").update(payload).eq("id", existing.id)
    : await supabase.from("posts").insert(payload);

  if (error) {
    throw error;
  }
}

console.log(
  JSON.stringify(
    {
      ok: true,
      username: profileSeed.username,
      profileId: profile.id,
      updatedPosts: postsSeed.map((post) => post.slug)
    },
    null,
    2
  )
);
