export const UNIVERSITY_OPTIONS = [
  { key: "tokyo", name: "東京大学", area: "関東", type: "国立" },
  { key: "kyoto", name: "京都大学", area: "関西", type: "国立" },
  { key: "tohoku", name: "東北大学", area: "東北", type: "国立" },
  { key: "osaka", name: "大阪大学", area: "関西", type: "国立" },
  { key: "nagoya", name: "名古屋大学", area: "東海", type: "国立" },
  { key: "kyushu", name: "九州大学", area: "九州", type: "国立" },
  { key: "hokkaido", name: "北海道大学", area: "北海道", type: "国立" },
  { key: "tokyo-science", name: "東京科学大学", area: "関東", type: "国立" },
  { key: "hitotsubashi", name: "一橋大学", area: "関東", type: "国立" },
  { key: "tsukuba", name: "筑波大学", area: "関東", type: "国立" },
  { key: "kobe", name: "神戸大学", area: "関西", type: "国立" },
  { key: "hiroshima", name: "広島大学", area: "中国", type: "国立" },
  { key: "chiba", name: "千葉大学", area: "関東", type: "国立" },
  { key: "okayama", name: "岡山大学", area: "中国", type: "国立" },
  { key: "kanazawa", name: "金沢大学", area: "北陸", type: "国立" },
  { key: "kumamoto", name: "熊本大学", area: "九州", type: "国立" },
  { key: "yokohama-national", name: "横浜国立大学", area: "関東", type: "国立" },
  { key: "tokyo-foreign-studies", name: "東京外国語大学", area: "関東", type: "国立" },
  { key: "ochanomizu", name: "お茶の水女子大学", area: "関東", type: "国立" },
  { key: "electro-communications", name: "電気通信大学", area: "関東", type: "国立" },
  { key: "tokyo-metropolitan", name: "東京都立大学", area: "関東", type: "公立" },
  { key: "osaka-metropolitan", name: "大阪公立大学", area: "関西", type: "公立" },
  { key: "yokohama-city", name: "横浜市立大学", area: "関東", type: "公立" },
  { key: "akita-international", name: "国際教養大学", area: "東北", type: "公立" },
  { key: "keio", name: "慶應義塾大学", area: "関東", type: "私立" },
  { key: "waseda", name: "早稲田大学", area: "関東", type: "私立" },
  { key: "sophia", name: "上智大学", area: "関東", type: "私立" },
  { key: "tokyo-science-private", name: "東京理科大学", area: "関東", type: "私立" },
  { key: "meiji", name: "明治大学", area: "関東", type: "私立" },
  { key: "aoyama-gakuin", name: "青山学院大学", area: "関東", type: "私立" },
  { key: "rikkyo", name: "立教大学", area: "関東", type: "私立" },
  { key: "chuo", name: "中央大学", area: "関東", type: "私立" },
  { key: "hosei", name: "法政大学", area: "関東", type: "私立" },
  { key: "doshisha", name: "同志社大学", area: "関西", type: "私立" },
  { key: "ritsumeikan", name: "立命館大学", area: "関西", type: "私立" },
  { key: "kwansei-gakuin", name: "関西学院大学", area: "関西", type: "私立" },
  { key: "kansai", name: "関西大学", area: "関西", type: "私立" },
  { key: "gakushuin", name: "学習院大学", area: "関東", type: "私立" },
  { key: "icu", name: "国際基督教大学", area: "関東", type: "私立" },
  { key: "shibaura", name: "芝浦工業大学", area: "関東", type: "私立" },
  { key: "kindai", name: "近畿大学", area: "関西", type: "私立" },
  { key: "nihon", name: "日本大学", area: "関東", type: "私立" },
  { key: "toyo", name: "東洋大学", area: "関東", type: "私立" },
  { key: "komazawa", name: "駒澤大学", area: "関東", type: "私立" },
  { key: "senshu", name: "専修大学", area: "関東", type: "私立" },
  { key: "tsuda", name: "津田塾大学", area: "関東", type: "私立" },
  { key: "tokyo-womans", name: "東京女子大学", area: "関東", type: "私立" },
  { key: "japan-womens", name: "日本女子大学", area: "関東", type: "私立" },
  { key: "apu", name: "立命館アジア太平洋大学", area: "九州", type: "私立" }
];

export const UNIVERSITY_BY_KEY = new Map(UNIVERSITY_OPTIONS.map((university) => [university.key, university]));

export function isValidUniversityKey(key) {
  return UNIVERSITY_BY_KEY.has(`${key || ""}`.trim());
}

export function getUniversityLabel(key) {
  return UNIVERSITY_BY_KEY.get(`${key || ""}`.trim())?.name || "";
}
