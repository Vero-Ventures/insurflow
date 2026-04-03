package config

import (
	"fmt"
	"os"
	"time"
)

type Config struct {
	DatabaseURL  string
	GeminiAPIKey string
	GeminiModel  string
	PollInterval time.Duration
}

func Load() (Config, error) {
	config := Config{
		DatabaseURL:  os.Getenv("DATABASE_URL"),
		GeminiAPIKey: os.Getenv("GEMINI_API_KEY"),
		GeminiModel:  getenv("GEMINI_MODEL", "gemini-2.5-flash"),
		PollInterval: 2 * time.Second,
	}

	if config.DatabaseURL == "" {
		return Config{}, fmt.Errorf("DATABASE_URL is required")
	}
	if config.GeminiAPIKey == "" {
		return Config{}, fmt.Errorf("GEMINI_API_KEY is required")
	}

	if raw := os.Getenv("POLL_INTERVAL"); raw != "" {
		interval, err := time.ParseDuration(raw)
		if err != nil {
			return Config{}, fmt.Errorf("parse POLL_INTERVAL: %w", err)
		}
		config.PollInterval = interval
	}

	return config, nil
}

func getenv(key string, fallback string) string {
	value := os.Getenv(key)
	if value == "" {
		return fallback
	}
	return value
}
