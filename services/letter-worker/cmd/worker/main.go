package main

import (
	"context"
	"log"
	"os"
	"os/signal"
	"syscall"

	"github.com/Vero-Ventures/insurflow/services/letter-worker/internal/config"
	workerdb "github.com/Vero-Ventures/insurflow/services/letter-worker/internal/db"
	"github.com/Vero-Ventures/insurflow/services/letter-worker/internal/gemini"
	"github.com/Vero-Ventures/insurflow/services/letter-worker/internal/jobs"
	"github.com/Vero-Ventures/insurflow/services/letter-worker/internal/worker"
)

func main() {
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	logger := log.New(os.Stdout, "letter-worker ", log.LstdFlags|log.LUTC)

	cfg, err := config.Load()
	if err != nil {
		logger.Fatalf("load config: %v", err)
	}

	pool, err := workerdb.Connect(ctx, cfg.DatabaseURL)
	if err != nil {
		logger.Fatalf("connect database: %v", err)
	}
	defer pool.Close()

	repo := workerdb.NewRepository(pool)
	client := gemini.NewClient(cfg.GeminiAPIKey)
	processor := jobs.NewProcessor(repo, client)
	loop := worker.NewLoop(processor, cfg.PollInterval, logger)

	if err := loop.Run(ctx); err != nil {
		logger.Fatalf("worker loop exited: %v", err)
	}
}
