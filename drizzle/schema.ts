import { pgSequence, pgEnum } from "drizzle-orm/pg-core";

export const assetType = pgEnum("asset_type", [
  "rrsp",
  "tfsa",
  "non_registered",
  "rrif",
  "lira",
  "lif",
  "real_estate",
  "life_insurance",
  "business_interest",
  "pension",
  "stock_options",
  "cryptocurrency",
  "collectibles",
  "other",
]);
export const clientStatus = pgEnum("client_status", [
  "draft",
  "active",
  "archived",
]);
export const debtType = pgEnum("debt_type", [
  "mortgage",
  "heloc",
  "car_loan",
  "student_loan",
  "personal_loan",
  "credit_card",
  "line_of_credit",
  "business_loan",
  "other",
]);
export const healthRating = pgEnum("health_rating", [
  "preferred_plus",
  "preferred",
  "standard_plus",
  "standard",
  "substandard",
]);
export const sex = pgEnum("sex", ["M", "F"]);
export const state = pgEnum("state", [
  "AB",
  "BC",
  "MB",
  "NB",
  "NL",
  "NS",
  "NT",
  "NU",
  "ON",
  "PE",
  "QC",
  "SK",
  "YT",
]);

export const pgDrizzlePostIdSeq = pgSequence("pg-drizzle_post_id_seq", {
  startWith: "1",
  increment: "1",
  minValue: "1",
  maxValue: "2147483647",
  cache: "1",
  cycle: false,
});
