package jobs

import (
	"context"
	"fmt"
	"time"
)

type Job struct {
	ID              string
	Prompt          string
	Model           string
	Temperature     float32
	MaxOutputTokens int
	Attempts        int
	MaxAttempts     int
}

type Repository interface {
	ClaimNextJob(ctx context.Context) (*Job, error)
	MarkCompleted(ctx context.Context, jobID string, attempt int, letter string, generatedAt time.Time) error
	MarkRetryableFailure(ctx context.Context, jobID string, attempt int, errorCode string, errorMessage string) error
	MarkFailed(ctx context.Context, jobID string, attempt int, errorCode string, errorMessage string) error
}

type Generator interface {
	GenerateText(ctx context.Context, prompt string, model string, temperature float32, maxOutputTokens int) (string, error)
}

type Processor struct {
	repo      Repository
	generator Generator
}

func NewProcessor(repo Repository, generator Generator) *Processor {
	return &Processor{repo: repo, generator: generator}
}

func (p *Processor) ProcessNextJob(ctx context.Context) (bool, error) {
	job, err := p.repo.ClaimNextJob(ctx)
	if err != nil {
		return false, fmt.Errorf("claim next job: %w", err)
	}
	if job == nil {
		return false, nil
	}

	letter, err := p.generator.GenerateText(
		ctx,
		job.Prompt,
		job.Model,
		job.Temperature,
		job.MaxOutputTokens,
	)
	if err != nil {
		if job.Attempts < job.MaxAttempts {
			markErr := p.repo.MarkRetryableFailure(
				ctx,
				job.ID,
				job.Attempts,
				"generation_failed",
				err.Error(),
			)
			if markErr != nil {
				return true, fmt.Errorf("generate text: %w; mark retryable failure: %v", err, markErr)
			}
			return true, fmt.Errorf("generate text: %w", err)
		}

		markErr := p.repo.MarkFailed(ctx, job.ID, job.Attempts, "generation_failed", err.Error())
		if markErr != nil {
			return true, fmt.Errorf("generate text: %w; mark failed: %v", err, markErr)
		}
		return true, fmt.Errorf("generate text: %w", err)
	}

	if err := p.repo.MarkCompleted(ctx, job.ID, job.Attempts, letter, time.Now().UTC()); err != nil {
		return true, fmt.Errorf("mark completed: %w", err)
	}

	return true, nil
}
