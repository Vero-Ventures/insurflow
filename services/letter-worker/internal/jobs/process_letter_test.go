package jobs

import (
	"context"
	"errors"
	"testing"
	"time"
)

type fakeRepository struct {
	claimJob      *Job
	claimErr      error
	completedErr  error
	completedJob  string
	completedText string
	completedTry  int
	retriedJob    string
	retriedCode   string
	retriedTry    int
	failedJob     string
	failedCode    string
	failedTry     int
	failedMessage string
}

func (f *fakeRepository) ClaimNextJob(_ context.Context) (*Job, error) {
	return f.claimJob, f.claimErr
}

func (f *fakeRepository) MarkCompleted(
	_ context.Context,
	jobID string,
	attempt int,
	letter string,
	_ time.Time,
) error {
	f.completedJob = jobID
	f.completedTry = attempt
	f.completedText = letter
	return f.completedErr
}

func (f *fakeRepository) MarkFailed(
	_ context.Context,
	jobID string,
	attempt int,
	errorCode string,
	errorMessage string,
) error {
	f.failedJob = jobID
	f.failedCode = errorCode
	f.failedTry = attempt
	f.failedMessage = errorMessage
	return nil
}

func (f *fakeRepository) MarkRetryableFailure(
	_ context.Context,
	jobID string,
	attempt int,
	errorCode string,
	errorMessage string,
) error {
	f.retriedJob = jobID
	f.retriedCode = errorCode
	f.retriedTry = attempt
	f.failedMessage = errorMessage
	return nil
}

type fakeClient struct {
	text            string
	err             error
	temperature     float32
	maxOutputTokens int
}

func (f *fakeClient) GenerateText(_ context.Context, _ string, _ string, temperature float32, maxOutputTokens int) (string, error) {
	f.temperature = temperature
	f.maxOutputTokens = maxOutputTokens
	return f.text, f.err
}

func TestProcessNextJobReturnsFalseWhenQueueIsEmpty(t *testing.T) {
	repo := &fakeRepository{}
	processor := NewProcessor(repo, &fakeClient{})

	processed, err := processor.ProcessNextJob(context.Background())
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if processed {
		t.Fatalf("expected no job to be processed")
	}
}

func TestProcessNextJobMarksCompletedJobs(t *testing.T) {
	repo := &fakeRepository{
		claimJob: &Job{ID: "job-1", Prompt: "prompt", Model: "gemini-2.5-flash", Temperature: 0.7, MaxOutputTokens: 2048, Attempts: 1, MaxAttempts: 3},
	}
	client := &fakeClient{text: "done"}
	processor := NewProcessor(repo, client)

	processed, err := processor.ProcessNextJob(context.Background())
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if !processed {
		t.Fatalf("expected a job to be processed")
	}
	if repo.completedJob != "job-1" {
		t.Fatalf("expected job to be marked completed, got %q", repo.completedJob)
	}
	if repo.completedText != "done" {
		t.Fatalf("expected completed letter to be saved, got %q", repo.completedText)
	}
	if repo.completedTry != 1 {
		t.Fatalf("expected completion to be fenced to attempt 1, got %d", repo.completedTry)
	}
	if client.temperature != 0.7 {
		t.Fatalf("expected worker to reuse queued temperature, got %v", client.temperature)
	}
	if client.maxOutputTokens != 2048 {
		t.Fatalf("expected worker to reuse queued max output tokens, got %d", client.maxOutputTokens)
	}
	if repo.failedJob != "" {
		t.Fatalf("did not expect failed job marker, got %q", repo.failedJob)
	}
}

func TestProcessNextJobMarksFailedJobs(t *testing.T) {
	repo := &fakeRepository{
		claimJob: &Job{ID: "job-2", Prompt: "prompt", Model: "gemini-2.5-flash", Temperature: 0.7, MaxOutputTokens: 2048, Attempts: 3, MaxAttempts: 3},
	}
	processor := NewProcessor(repo, &fakeClient{err: errors.New("boom")})

	processed, err := processor.ProcessNextJob(context.Background())
	if err == nil {
		t.Fatalf("expected processing error")
	}
	if !processed {
		t.Fatalf("expected a job to be processed")
	}
	if repo.failedJob != "job-2" {
		t.Fatalf("expected job to be marked failed, got %q", repo.failedJob)
	}
	if repo.failedCode != "generation_failed" {
		t.Fatalf("expected failure code to be recorded, got %q", repo.failedCode)
	}
	if repo.failedTry != 3 {
		t.Fatalf("expected terminal failure to be fenced to attempt 3, got %d", repo.failedTry)
	}
}

func TestProcessNextJobRequeuesRetryableFailures(t *testing.T) {
	repo := &fakeRepository{
		claimJob: &Job{ID: "job-3", Prompt: "prompt", Model: "gemini-2.5-flash", Temperature: 0.7, MaxOutputTokens: 2048, Attempts: 1, MaxAttempts: 3},
	}
	processor := NewProcessor(repo, &fakeClient{err: errors.New("temporary")})

	processed, err := processor.ProcessNextJob(context.Background())
	if err == nil {
		t.Fatalf("expected processing error")
	}
	if !processed {
		t.Fatalf("expected a job to be processed")
	}
	if repo.retriedJob != "job-3" {
		t.Fatalf("expected retryable failure marker, got %q", repo.retriedJob)
	}
	if repo.retriedTry != 1 {
		t.Fatalf("expected retryable failure to be fenced to attempt 1, got %d", repo.retriedTry)
	}
	if repo.failedJob != "" {
		t.Fatalf("did not expect terminal failure marker, got %q", repo.failedJob)
	}
}

func TestProcessNextJobReturnsErrorWhenCompletionLeaseIsLost(t *testing.T) {
	repo := &fakeRepository{
		claimJob:     &Job{ID: "job-4", Prompt: "prompt", Model: "gemini-2.5-flash", Temperature: 0.7, MaxOutputTokens: 2048, Attempts: 1, MaxAttempts: 3},
		completedErr: errors.New("stale lease"),
	}
	processor := NewProcessor(repo, &fakeClient{text: "done"})

	processed, err := processor.ProcessNextJob(context.Background())
	if err == nil {
		t.Fatalf("expected completion error")
	}
	if !processed {
		t.Fatalf("expected a job to be processed")
	}
}
