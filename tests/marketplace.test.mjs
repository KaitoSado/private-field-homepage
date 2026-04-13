import assert from "node:assert/strict";
import test from "node:test";
import {
  canAccessThread,
  canCreateApplication,
  canFavoriteListing,
  canManageMarketplace,
  canSendMessage,
  canUpdateApplicationStatus
} from "../lib/marketplace-access.js";
import {
  filterRoomListingsForSearch,
  normalizeRoomListingPayload,
  normalizeRoomSearchParams,
  parseWithSchema,
  reportCreateSchema,
  roomListingSchema
} from "../lib/marketplace-validation.js";

test("未ログインユーザーは問い合わせできない", () => {
  const decision = canCreateApplication({
    viewerId: "",
    ownerId: "owner",
    listingStatus: "published"
  });

  assert.equal(decision.allowed, false);
});

test("自分の掲載には問い合わせできない", () => {
  const decision = canCreateApplication({
    viewerId: "user-a",
    ownerId: "user-a",
    listingStatus: "published"
  });

  assert.equal(decision.allowed, false);
});

test("他人のチャットスレッドは閲覧できない", () => {
  assert.equal(canAccessThread({ viewerId: "user-c", participantIds: ["user-a", "user-b"] }), false);
  assert.equal(canAccessThread({ viewerId: "user-a", participantIds: ["user-a", "user-b"] }), true);
});

test("掲載作成時のバリデーション", () => {
  const invalid = normalizeRoomListingPayload({
    title: "",
    description: "説明",
    location_text: "湘南台",
    rent: "70000"
  });

  assert.equal(invalid.ok, false);

  const valid = normalizeRoomListingPayload({
    title: "静かな個室",
    description: "駅徒歩圏の個室です。",
    location_text: "湘南台",
    rent: "70000",
    images: "https://example.com/room.jpg"
  });

  assert.equal(valid.ok, true);
  assert.equal(valid.data.price, 70000);
});

test("検索フィルター", () => {
  const listings = [
    {
      id: "1",
      title: "湘南台の個室",
      description: "ペット相談可",
      location_text: "湘南台",
      created_at: "2026-01-02T00:00:00Z",
      room_details: [{ rent: 68000, pets_allowed: true, smoking_allowed: false, gender_preference: "any" }]
    },
    {
      id: "2",
      title: "三田の部屋",
      description: "禁煙",
      location_text: "三田",
      created_at: "2026-01-01T00:00:00Z",
      room_details: [{ rent: 92000, pets_allowed: false, smoking_allowed: false, gender_preference: "female" }]
    }
  ];

  const filters = normalizeRoomSearchParams({ area: "湘南", maxRent: "80000", petsAllowed: "true" });
  const result = filterRoomListingsForSearch(listings, filters);

  assert.equal(result.length, 1);
  assert.equal(result[0].id, "1");
});

test("お気に入りは公開掲載だけ許可し、重複防止はDB uniqueに任せる設計", () => {
  assert.equal(canFavoriteListing({ viewerId: "user-a", listingStatus: "published" }).allowed, true);
  assert.equal(canFavoriteListing({ viewerId: "user-a", listingStatus: "draft" }).allowed, false);
});

test("管理者以外は管理画面に入れない", () => {
  assert.equal(canManageMarketplace({ role: "user", account_status: "active" }), false);
  assert.equal(canManageMarketplace({ role: "admin", account_status: "active" }), true);
});

test("ブロック済みユーザーとのメッセージ制限", () => {
  const decision = canSendMessage({
    viewerId: "user-a",
    senderId: "user-a",
    participantIds: ["user-a", "user-b"],
    threadStatus: "active",
    isBlocked: true
  });

  assert.equal(decision.allowed, false);
});

test("通報作成の入力検証", () => {
  const parsed = parseWithSchema(reportCreateSchema, {
    target_type: "listing",
    target_id: "listing-1",
    reason: "fraud",
    details: "説明と写真が一致しない"
  });

  assert.equal(parsed.ok, true);
});

test("Application のステータス更新", () => {
  const ownerDecision = canUpdateApplicationStatus({
    viewerId: "owner",
    ownerId: "owner",
    applicantId: "applicant",
    nextStatus: "accepted",
    currentStatus: "pending"
  });
  const strangerDecision = canUpdateApplicationStatus({
    viewerId: "stranger",
    ownerId: "owner",
    applicantId: "applicant",
    nextStatus: "accepted",
    currentStatus: "pending"
  });

  assert.equal(ownerDecision.allowed, true);
  assert.equal(strangerDecision.allowed, false);
});

test("roomListingSchema はサービス固有情報を room_detail に分離する", () => {
  const parsed = parseWithSchema(roomListingSchema, {
    title: "個室",
    description: "説明",
    location_text: "日吉",
    price: 60000,
    images: [],
    room_detail: {
      rent: 60000,
      utilities: 5000,
      deposit: 60000,
      initial_cost: 100000,
      capacity: 1
    }
  });

  assert.equal(parsed.ok, true);
  assert.equal(parsed.data.listing_type, "room");
  assert.equal(parsed.data.room_detail.rent, 60000);
});
