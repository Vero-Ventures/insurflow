WITH ranked_d2c_drafts AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY user_id
      ORDER BY updated_at DESC, created_at DESC, id DESC
    ) AS rn
  FROM "client"
  WHERE
    "status" = 'draft'
    AND "deleted_at" IS NULL
    AND "first_name" = ''
    AND "last_name" = ''
)
UPDATE "client" c
SET
  "deleted_at" = NOW(),
  "updated_at" = NOW()
FROM ranked_d2c_drafts r
WHERE c.id = r.id AND r.rn > 1;

CREATE UNIQUE INDEX "client_one_active_draft_per_user_idx"
  ON "client" USING btree ("user_id")
  WHERE (
    "status" = 'draft'
    AND "deleted_at" IS NULL
    AND "first_name" = ''
    AND "last_name" = ''
  );
