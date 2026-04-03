# Letter Worker Architecture

## Overview

- Vercel-hosted Next.js app enqueues letter-generation jobs in Postgres.
- A Go worker claims queued jobs, calls Gemini, and writes result/status back.
- Client UI polls the job status endpoint until the job completes or fails.

## Deployment Targets

- Primary low-cost runtime: Fly.io
- Terraform-managed AWS validation target: ECS/Fargate in `infra/aws-worker/`
- App-side async mode is gated by `LETTER_WORKER_ENABLED=true`; when disabled, the route falls back to synchronous generation so previews/dev do not enqueue dead-end jobs.

## Worker Contract

- Input: `letter_generation_job.prompt`, `letter_generation_job.model`
- Success: write `result_letter`, `result_generated_at`, `completed_at`, `status=completed`
- Failure: write `error_code`, `error_message`, `failed_at`, `status=failed`

## Current Scope

- Reasons-Why letter generation only
- No preview worker environments
- No PDF generation yet
- No carrier workflow migration
