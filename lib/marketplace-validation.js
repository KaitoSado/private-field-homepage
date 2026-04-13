import { z } from "zod";

export const SERVICE_TYPES = ["roomshare", "carshare", "dating"];
export const LISTING_TYPES = ["room", "car", "dating_profile"];
export const LISTING_STATUSES = ["draft", "published", "paused", "archived", "rejected"];
export const APPLICATION_STATUSES = ["pending", "accepted", "rejected", "cancelled", "completed"];
export const REPORT_STATUSES = ["open", "reviewing", "resolved", "dismissed"];
export const GENDER_PREFERENCES = ["any", "female", "male", "non_binary", "same_gender"];
export const ROOM_TYPES = ["private", "shared", "entire_home", "dorm", "other"];

const urlString = z
  .string()
  .trim()
  .max(600)
  .refine((value) => {
    if (!value) return false;
    try {
      const parsed = new URL(value);
      return parsed.protocol === "https:" || parsed.protocol === "http:";
    } catch {
      return false;
    }
  }, "画像URLは http または https のURLにしてください。");

const looseString = (max) =>
  z.preprocess((value) => normalizeText(value).slice(0, max), z.string().max(max));

const requiredString = (max, message) => looseString(max).pipe(z.string().min(1, message));

const integerField = (min, max, fallback = 0) =>
  z.preprocess((value) => normalizeInteger(value, fallback), z.number().int().min(min).max(max));

const optionalIntegerField = (min, max) =>
  z.preprocess((value) => {
    if (value === null || value === undefined || `${value}`.trim() === "") return null;
    return normalizeInteger(value, null);
  }, z.number().int().min(min).max(max).nullable());

const booleanField = (fallback = false) =>
  z.preprocess((value) => {
    if (value === null || value === undefined || value === "") return fallback;
    return value === true || value === "true" || value === "on" || value === "yes" || value === "1";
  }, z.boolean());

const imageArrayField = z.preprocess((value) => {
  if (Array.isArray(value)) return value.map((item) => normalizeText(item)).filter(Boolean);
  return normalizeText(value)
    .split(/[\n,]/)
    .map((item) => item.trim())
    .filter(Boolean);
}, z.array(urlString).max(8));

const dateOrNullField = z.preprocess((value) => {
  const normalized = normalizeText(value);
  if (!normalized) return null;
  return normalized;
}, z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable());

export const roomListingSchema = z.object({
  id: looseString(80).optional(),
  service_type: z.literal("roomshare").default("roomshare"),
  listing_type: z.literal("room").default("room"),
  title: requiredString(120, "タイトルを入力してください。"),
  description: requiredString(4000, "説明を入力してください。"),
  location_text: requiredString(120, "エリアを入力してください。"),
  price: integerField(0, 2000000, 0),
  status: z.enum(LISTING_STATUSES).default("draft"),
  images: imageArrayField.default([]),
  room_detail: z.object({
    rent: integerField(0, 2000000, 0),
    utilities: integerField(0, 500000, 0),
    deposit: integerField(0, 5000000, 0),
    initial_cost: integerField(0, 5000000, 0),
    available_from: dateOrNullField.default(null),
    capacity: integerField(1, 20, 1),
    room_type: z.enum(ROOM_TYPES).default("private"),
    gender_preference: z.enum(GENDER_PREFERENCES).default("any"),
    smoking_allowed: booleanField(false),
    pets_allowed: booleanField(false),
    nearest_station: looseString(120).default(""),
    house_rules: looseString(2000).default("")
  })
});

export const marketplaceProfileSchema = z.object({
  username: looseString(30).optional(),
  display_name: requiredString(80, "表示名を入力してください。"),
  bio: looseString(1000).default(""),
  age_label: looseString(40).default(""),
  location: looseString(80).default(""),
  avatar_url: z.preprocess((value) => {
    const normalized = normalizeText(value);
    return normalized || null;
  }, urlString.nullable()).default(null)
});

export const applicationCreateSchema = z.object({
  listing_id: requiredString(80, "掲載が見つかりません。"),
  message: requiredString(2000, "問い合わせ本文を入力してください。"),
  requested_start_on: dateOrNullField.default(null),
  requested_end_on: dateOrNullField.default(null)
});

export const applicationStatusSchema = z.object({
  id: requiredString(80, "申請が見つかりません。"),
  status: z.enum(["accepted", "rejected", "cancelled", "completed"])
});

export const messageCreateSchema = z.object({
  thread_id: requiredString(80, "スレッドが見つかりません。"),
  body: requiredString(3000, "メッセージを入力してください。")
});

export const reportCreateSchema = z.object({
  target_type: z.enum(["user", "listing", "message"]),
  target_id: requiredString(80, "通報対象が見つかりません。"),
  reason: requiredString(120, "通報理由を入力してください。"),
  details: looseString(1000).default("")
});

export const reviewCreateSchema = z.object({
  application_id: requiredString(80, "対象のやりとりが見つかりません。"),
  reviewee_id: requiredString(80, "レビュー相手が見つかりません。"),
  rating: integerField(1, 5, 5),
  comment: looseString(1000).default("")
});

export const blockCreateSchema = z.object({
  blocked_id: requiredString(80, "ブロック対象が見つかりません。")
});

export const favoriteToggleSchema = z.object({
  listing_id: requiredString(80, "掲載が見つかりません。"),
  favorite: booleanField(true)
});

export const adminActionSchema = z.object({
  resource: z.enum(["listing", "user", "report", "application"]),
  id: requiredString(80, "対象が見つかりません。"),
  action: requiredString(80, "操作が見つかりません。"),
  reason: looseString(500).default("")
});

export const roomSearchSchema = z.object({
  q: looseString(80).default(""),
  area: looseString(80).default(""),
  minRent: optionalIntegerField(0, 2000000).default(null),
  maxRent: optionalIntegerField(0, 2000000).default(null),
  availableFrom: dateOrNullField.default(null),
  genderPreference: z.enum(["", ...GENDER_PREFERENCES]).default(""),
  petsAllowed: z.enum(["", "true", "false"]).default(""),
  smokingAllowed: z.enum(["", "true", "false"]).default(""),
  sort: z.enum(["newest", "rent_asc", "rent_desc"]).default("newest"),
  page: integerField(1, 1000, 1).default(1),
  pageSize: integerField(1, 60, 12).default(12)
});

export function parseWithSchema(schema, input) {
  const result = schema.safeParse(input || {});
  if (result.success) {
    return { ok: true, data: result.data, errors: [] };
  }

  return {
    ok: false,
    data: null,
    errors: result.error.issues.map((issue) => issue.message)
  };
}

export function normalizeRoomListingPayload(input) {
  const normalized = {
    ...input,
    room_detail: {
      rent: input?.rent,
      utilities: input?.utilities,
      deposit: input?.deposit,
      initial_cost: input?.initial_cost,
      available_from: input?.available_from,
      capacity: input?.capacity,
      room_type: input?.room_type,
      gender_preference: input?.gender_preference,
      smoking_allowed: input?.smoking_allowed,
      pets_allowed: input?.pets_allowed,
      nearest_station: input?.nearest_station,
      house_rules: input?.house_rules
    }
  };

  const parsed = parseWithSchema(roomListingSchema, normalized);
  if (!parsed.ok) return parsed;

  return {
    ok: true,
    data: {
      ...parsed.data,
      price: parsed.data.room_detail.rent || parsed.data.price
    },
    errors: []
  };
}

export function normalizeRoomSearchParams(source) {
  const input = source instanceof URLSearchParams ? Object.fromEntries(source.entries()) : source || {};
  const parsed = parseWithSchema(roomSearchSchema, input);
  if (parsed.ok) return parsed.data;
  return roomSearchSchema.parse({});
}

export function filterRoomListingsForSearch(listings, filters) {
  const normalizedFilters = normalizeRoomSearchParams(filters);
  const query = normalizeText(normalizedFilters.q).toLowerCase();
  const area = normalizeText(normalizedFilters.area).toLowerCase();

  const filtered = (listings || []).filter((listing) => {
    const detail = normalizeRoomDetail(listing);
    const haystack = [
      listing.title,
      listing.description,
      listing.location_text,
      detail.nearest_station,
      detail.house_rules,
      listing.owner?.display_name,
      listing.owner?.username
    ]
      .join(" ")
      .toLowerCase();

    if (query && !haystack.includes(query)) return false;
    if (area && !normalizeText(listing.location_text).toLowerCase().includes(area)) return false;
    if (normalizedFilters.minRent !== null && detail.rent < normalizedFilters.minRent) return false;
    if (normalizedFilters.maxRent !== null && detail.rent > normalizedFilters.maxRent) return false;
    if (normalizedFilters.availableFrom && detail.available_from && detail.available_from > normalizedFilters.availableFrom) return false;
    if (normalizedFilters.genderPreference && detail.gender_preference !== normalizedFilters.genderPreference) return false;
    if (normalizedFilters.petsAllowed && String(Boolean(detail.pets_allowed)) !== normalizedFilters.petsAllowed) return false;
    if (normalizedFilters.smokingAllowed && String(Boolean(detail.smoking_allowed)) !== normalizedFilters.smokingAllowed) return false;
    return true;
  });

  return filtered.sort((left, right) => {
    const leftRent = normalizeRoomDetail(left).rent;
    const rightRent = normalizeRoomDetail(right).rent;
    if (normalizedFilters.sort === "rent_asc") return leftRent - rightRent;
    if (normalizedFilters.sort === "rent_desc") return rightRent - leftRent;
    return new Date(right.created_at || 0).getTime() - new Date(left.created_at || 0).getTime();
  });
}

export function normalizeRoomDetail(listing) {
  const detail = Array.isArray(listing?.room_details) ? listing.room_details[0] : listing?.room_details || listing?.room_detail || {};
  return {
    rent: normalizeInteger(detail.rent ?? listing?.price, 0),
    utilities: normalizeInteger(detail.utilities, 0),
    deposit: normalizeInteger(detail.deposit, 0),
    initial_cost: normalizeInteger(detail.initial_cost, 0),
    available_from: normalizeText(detail.available_from),
    capacity: normalizeInteger(detail.capacity, 1),
    room_type: normalizeText(detail.room_type) || "private",
    gender_preference: normalizeText(detail.gender_preference) || "any",
    smoking_allowed: Boolean(detail.smoking_allowed),
    pets_allowed: Boolean(detail.pets_allowed),
    nearest_station: normalizeText(detail.nearest_station),
    house_rules: normalizeText(detail.house_rules)
  };
}

export function normalizeText(value) {
  return `${value ?? ""}`.trim();
}

export function normalizeInteger(value, fallback = 0) {
  if (value === null && fallback === null) return null;
  const parsed = Number.parseInt(`${value ?? ""}`, 10);
  if (!Number.isFinite(parsed)) return fallback;
  return parsed;
}
