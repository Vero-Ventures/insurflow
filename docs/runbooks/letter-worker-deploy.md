# Letter Worker Deploy

## Fly.io

1. Create the app once:

```bash
cd services/letter-worker
fly launch --no-deploy
```

2. Set secrets:

```bash
fly secrets set DATABASE_URL=... GEMINI_API_KEY=...
```

3. Enable async worker mode in the Vercel app:

```bash
vercel env add LETTER_WORKER_ENABLED production
```

4. Deploy:

```bash
fly deploy --config fly.toml
```

## AWS ECS/Fargate (Terraform-managed)

1. Build and push the worker image to ECR.
2. Create secure SSM parameters for `DATABASE_URL` and `GEMINI_API_KEY`.
3. Set Terraform variables for `database_url_parameter_arn`, `gemini_api_key_parameter_arn`, and `image_tag`.
4. Apply `infra/aws-worker/`.
5. For validation deploys, set `desired_count=1`.
6. Enable `LETTER_WORKER_ENABLED=true` in the Vercel app environment for the environment you are validating.
7. Scale back to `desired_count=0` when validation is done if you want to avoid ongoing cost.

## Verification

- enqueue a letter job from the app
- verify worker logs show claim + completion
- confirm status endpoint returns `completed`
