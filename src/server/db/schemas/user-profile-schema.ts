import { relations } from "drizzle-orm";
import { index, pgTable, text, timestamp } from "drizzle-orm/pg-core";

import { user } from "./auth-schema";
import { stateEnum } from "./enums-schema";
import { timestampsNoSoftDelete } from "./schema-helpers";

export const userProfile = pgTable(
  "user_profile",
  {
    userId: text("user_id")
      .primaryKey()
      .references(() => user.id, { onDelete: "cascade" }),
    firstName: text("first_name").notNull(),
    lastName: text("last_name").notNull(),
    state: stateEnum("state").notNull(),
    householdStatus: text("household_status").notNull(),
    primaryGoal: text("primary_goal").notNull(),
    communicationPreference: text("communication_preference").notNull(),
    onboardingCompletedAt: timestamp("onboarding_completed_at", {
      withTimezone: true,
    }).notNull(),
    ...timestampsNoSoftDelete(),
  },
  (t) => [
    index("user_profile_state_idx").on(t.state),
    index("user_profile_primary_goal_idx").on(t.primaryGoal),
  ],
);

export const userProfileRelations = relations(userProfile, ({ one }) => ({
  user: one(user, { fields: [userProfile.userId], references: [user.id] }),
}));
