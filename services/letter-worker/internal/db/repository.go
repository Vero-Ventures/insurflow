package db

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/Vero-Ventures/insurflow/services/letter-worker/internal/jobs"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

const processingLeaseTimeout = 15 * time.Minute

var ErrStaleLease = errors.New("stale job lease")

type Repository struct {
	pool *pgxpool.Pool
}

func NewRepository(pool *pgxpool.Pool) *Repository {
	return &Repository{pool: pool}
}

func Connect(ctx context.Context, databaseURL string) (*pgxpool.Pool, error) {
	pool, err := pgxpool.New(ctx, databaseURL)
	if err != nil {
		return nil, fmt.Errorf("connect pgx pool: %w", err)
	}

	return pool, nil
}

func (r *Repository) ClaimNextJob(ctx context.Context) (*jobs.Job, error) {
	query := `
with next_job as (
	select id
	from letter_generation_job
	where (
		status = 'queued'
		or (
			status = 'processing'
			and started_at < $1
		)
	)
	  and deleted_at is null
	  and attempts < max_attempts
	order by requested_at asc
	for update skip locked
	limit 1
)
update letter_generation_job as job
set status = 'processing',
	attempts = job.attempts + 1,
	started_at = now(),
	updated_at = now()
from next_job
where job.id = next_job.id
returning job.id, job.prompt, job.model, job.temperature::float4, job.max_output_tokens, job.attempts, job.max_attempts
`

	var job jobs.Job
	err := r.pool.QueryRow(ctx, query, time.Now().UTC().Add(-processingLeaseTimeout)).Scan(
		&job.ID,
		&job.Prompt,
		&job.Model,
		&job.Temperature,
		&job.MaxOutputTokens,
		&job.Attempts,
		&job.MaxAttempts,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}

	return &job, nil
}

func (r *Repository) MarkCompleted(ctx context.Context, jobID string, attempt int, letter string, generatedAt time.Time) error {
	tag, err := r.pool.Exec(ctx, `
update letter_generation_job
set status = 'completed',
	result_letter = $2,
	result_generated_at = $3,
	completed_at = now(),
	error_code = null,
	error_message = null,
	updated_at = now()
where id = $1
	and status = 'processing'
	and attempts = $4
`, jobID, letter, generatedAt, attempt)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return ErrStaleLease
	}
	return nil
}

func (r *Repository) MarkFailed(ctx context.Context, jobID string, attempt int, errorCode string, errorMessage string) error {
	tag, err := r.pool.Exec(ctx, `
update letter_generation_job
set status = 'failed',
	error_code = $2,
	error_message = $3,
	failed_at = now(),
	updated_at = now()
where id = $1
	and status = 'processing'
	and attempts = $4
`, jobID, errorCode, errorMessage, attempt)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return ErrStaleLease
	}
	return nil
}

func (r *Repository) MarkRetryableFailure(ctx context.Context, jobID string, attempt int, errorCode string, errorMessage string) error {
	tag, err := r.pool.Exec(ctx, `
update letter_generation_job
set status = 'queued',
	error_code = $2,
	error_message = $3,
	started_at = null,
	updated_at = now()
where id = $1
	and status = 'processing'
	and attempts = $4
`, jobID, errorCode, errorMessage, attempt)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return ErrStaleLease
	}
	return nil
}
