package worker

import (
	"context"
	"errors"
	"log"
	"time"

	"github.com/Vero-Ventures/insurflow/services/letter-worker/internal/jobs"
)

type Loop struct {
	processor    *jobs.Processor
	pollInterval time.Duration
	logger       *log.Logger
}

func NewLoop(processor *jobs.Processor, pollInterval time.Duration, logger *log.Logger) *Loop {
	return &Loop{processor: processor, pollInterval: pollInterval, logger: logger}
}

func (l *Loop) Run(ctx context.Context) error {
	for {
		processed, err := l.processor.ProcessNextJob(ctx)
		if err != nil {
			l.logger.Printf("job processing failed: %v", err)
		}

		if processed {
			continue
		}

		select {
		case <-ctx.Done():
			if errors.Is(ctx.Err(), context.Canceled) {
				return nil
			}
			return ctx.Err()
		case <-time.After(l.pollInterval):
		}
	}
}
