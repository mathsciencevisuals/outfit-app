# GCP Deployment

This repo is now wired for a GCP deployment shape built around:

- Cloud Run for `apps/api`
- Cloud Run for `apps/admin-web`
- Cloud SQL for PostgreSQL
- Memorystore for Redis
- Cloud Storage for uploaded images
- Secret Manager for sensitive runtime configuration
- Artifact Registry for container images
- Cloud Build for image build and Cloud Run deployment
- Expo EAS for `apps/mobile`, pointed at the Cloud Run API URL

The API container no longer runs Prisma migrations on startup. That is intentional: Cloud Run revisions should only be responsible for starting the HTTP server and serving traffic. Run migrations as a separate deployment step after database connectivity is validated.

## Recommended GCP Resources

- Project: one dedicated project for the app stack
- Region: keep everything in one region, for example `europe-west4`
- Artifact Registry repository: `outfit-app`
- Cloud SQL PostgreSQL instance: one instance for the API
- Memorystore Redis instance: one instance for BullMQ / Redis
- Cloud Storage bucket: one bucket for user uploads, for example `fitme-assets`
- Two Cloud Run services:
  - `fitme-api`
  - `fitme-admin-web`
- Two runtime service accounts:
  - `fitme-api-runner`
  - `fitme-admin-runner`

## Required APIs

Enable:

- Cloud Run Admin API
- Cloud Build API
- Artifact Registry API
- Secret Manager API
- Cloud SQL Admin API
- Memorystore for Redis API
- Cloud Storage API
- VPC Access / Compute Engine networking APIs as needed for your VPC setup

## Secrets

Create these Secret Manager secrets:

- `fitme-database-url`
- `fitme-jwt-secret`

Suggested `fitme-database-url` format for Cloud SQL via Unix socket:

```text
postgresql://USER:PASSWORD@localhost:5432/DATABASE?host=/cloudsql/PROJECT:REGION:INSTANCE
```

Cloud Run can mount the Cloud SQL connection when deployed with `--add-cloudsql-instances`, which is the intended path for this repo. Google documents Cloud Run + Cloud SQL configuration here:

- https://docs.cloud.google.com/sql/docs/postgres/connect-run

Cloud Run + Memorystore guidance:

- https://cloud.google.com/memorystore/docs/redis/connect-redis-instance-cloud-run

Cloud Run + Cloud Storage guidance:

- https://cloud.google.com/run/docs/tutorials/network-filesystems-fuse
- https://cloud.google.com/storage/docs/access-control/iam-roles

Cloud Build + Cloud Run deployment guidance:

- https://docs.cloud.google.com/build/docs/deploying-builds/deploy-cloud-run

Cloud Run secrets:

- https://docs.cloud.google.com/run/docs/configuring/services/secrets

## Pre-Deploy Checklist

Before deploying `fitme-api`, validate these items in this order:

1. Artifact Registry repository exists in the same region as Cloud Run.
2. Cloud SQL PostgreSQL exists and is reachable from Cloud Run.
3. Memorystore Redis exists and its private IP is known.
4. The Cloud Storage bucket exists.
5. The Cloud Run runtime service account exists.
6. The runtime service account can access:
   - `roles/secretmanager.secretAccessor`
   - `roles/cloudsql.client`
   - `roles/storage.objectAdmin` on the bucket
7. Secret Manager contains:
   - `fitme-database-url`
   - `fitme-jwt-secret`
   - `fitme-gemini-api-key` if `TRYON_PROVIDER=gemini`
   - `fitme-anthropic-api-key` optionally, if you want Claude fit/style analysis in Gemini try-on results
8. The API deploy command includes:
   - `DATABASE_URL`
   - `JWT_SECRET`
   - `REDIS_URL`
   - `STORAGE_PROVIDER`
   - `GCS_BUCKET`
   - `TRYON_PROVIDER`

If Redis or Storage are not provisioned yet, the current API should not be expected to start successfully because those are required runtime dependencies in the current Nest app configuration.

## Cloud Storage Setup

Create one bucket for uploads. The API currently returns direct public URLs for uploaded objects, so you should either:

- make the bucket publicly readable, or
- front the bucket with a public HTTPS base URL and set `GCS_PUBLIC_BASE_URL`

At minimum, grant the API Cloud Run service account write access to the bucket:

- `roles/storage.objectAdmin` on the bucket for `fitme-api-runner`

If you use direct `storage.googleapis.com` public URLs, set:

- `GCS_PUBLIC_BASE_URL=https://storage.googleapis.com/BUCKET_NAME`

## Deploy API

This repo includes [cloudbuild.api.yaml](/home/pc/projects/outfit-app/cloudbuild.api.yaml).

Before running it, set substitutions that match your project:

- `_REGION`
- `_AR_REPOSITORY`
- `_SERVICE_NAME`
- `_SERVICE_ACCOUNT`
- `_CLOUDSQL_INSTANCE`
- `_VPC_NETWORK`
- `_VPC_SUBNET`
- `_REDIS_URL`
- `_GCS_BUCKET`
- `_GCS_PUBLIC_BASE_URL`

Current runtime assumptions in the build config:

- `STORAGE_PROVIDER=gcs`
- `TRYON_PROVIDER=gemini`

Recommended Cloud Run network setting for this repo:

- use `--vpc-egress=private-ranges-only` when Redis and Cloud SQL are on private/internal addresses
- use `--vpc-egress=all-traffic` only if you explicitly want all outbound traffic forced through the VPC and you have handled broader egress requirements

Recommended API deploy shape:

```bash
gcloud run deploy fitme-api \
  --image REGION-docker.pkg.dev/PROJECT_ID/REPOSITORY/api:TAG \
  --region REGION \
  --service-account fitme-api-runner@PROJECT_ID.iam.gserviceaccount.com \
  --allow-unauthenticated \
  --port 8080 \
  --memory 1Gi \
  --cpu 1 \
  --network VPC_NETWORK \
  --subnet VPC_SUBNET \
  --vpc-egress private-ranges-only \
  --add-cloudsql-instances PROJECT_ID:REGION:CLOUDSQL_INSTANCE \
  --set-env-vars NODE_ENV=production,REDIS_URL=redis://REDIS_INTERNAL_IP:6379,STORAGE_PROVIDER=gcs,GCS_BUCKET=fitme-assets,GCS_PROJECT_ID=PROJECT_ID,GCS_PUBLIC_BASE_URL=https://storage.googleapis.com/fitme-assets,TRYON_PROVIDER=gemini \
  --set-secrets DATABASE_URL=fitme-database-url:latest,JWT_SECRET=fitme-jwt-secret:latest,GEMINI_API_KEY=fitme-gemini-api-key:latest
```

Add `ANTHROPIC_API_KEY=fitme-anthropic-api-key:latest` to `--set-secrets` when Claude fit/style analysis is configured.

Run:

```bash
gcloud builds submit \
  --config cloudbuild.api.yaml \
  --substitutions=_REGION=europe-west4,_AR_REPOSITORY=outfit-app,_SERVICE_NAME=fitme-api,_SERVICE_ACCOUNT=fitme-api-runner@PROJECT_ID.iam.gserviceaccount.com,_CLOUDSQL_INSTANCE=PROJECT_ID:europe-west4:fitme-pg,_VPC_NETWORK=default,_VPC_SUBNET=default,_REDIS_URL=redis://REDIS_INTERNAL_IP:6379,_GCS_BUCKET=fitme-assets,_GCS_PUBLIC_BASE_URL=https://storage.googleapis.com/fitme-assets
```

## Run Database Migrations Separately

Do not rely on Cloud Run service startup to execute Prisma migrations.

Run migrations as a separate command after the database secret and Cloud SQL attachment are confirmed. One workable pattern is a one-off Cloud Run job using the same image:

```bash
gcloud run jobs create fitme-api-migrate \
  --image REGION-docker.pkg.dev/PROJECT_ID/REPOSITORY/api:TAG \
  --region REGION \
  --service-account fitme-api-runner@PROJECT_ID.iam.gserviceaccount.com \
  --add-cloudsql-instances PROJECT_ID:REGION:CLOUDSQL_INSTANCE \
  --set-secrets DATABASE_URL=fitme-database-url:latest \
  --command sh \
  --args=-c,"cd /app/apps/api && pnpm exec prisma migrate deploy"
```

Then execute it:

```bash
gcloud run jobs execute fitme-api-migrate --region REGION --wait
```

If you prefer not to use a Cloud Run job, run `pnpm --filter @fitme/api prisma:migrate` from a trusted CI step that has access to the same database.

## Troubleshooting Order

If Cloud Run says the container did not listen on the port, check these in order:

1. Read the Cloud Run revision logs first.
2. Confirm `JWT_SECRET` is present.
3. Confirm `DATABASE_URL` is valid and reachable.
4. Confirm `REDIS_URL` points to the real Memorystore private IP.
5. Confirm `GCS_BUCKET` exists and the runtime service account has bucket access.
6. Confirm the Cloud Run service is attached to the intended VPC/subnet.

Useful commands:

```bash
gcloud run services describe fitme-api --region REGION
gcloud run revisions list --service fitme-api --region REGION
gcloud logging read 'resource.type="cloud_run_revision" AND resource.labels.service_name="fitme-api"' --limit 50 --format=json
gcloud secrets versions access latest --secret fitme-jwt-secret
gcloud secrets versions access latest --secret fitme-database-url
gcloud redis instances list --region REGION
gcloud sql instances describe CLOUDSQL_INSTANCE
```

## Deploy Admin Web

This repo includes [cloudbuild.admin.yaml](/home/pc/projects/outfit-app/cloudbuild.admin.yaml) and [apps/admin-web/Dockerfile](/home/pc/projects/outfit-app/apps/admin-web/Dockerfile).

Run:

```bash
gcloud builds submit \
  --config cloudbuild.admin.yaml \
  --substitutions=_REGION=europe-west4,_AR_REPOSITORY=outfit-app,_SERVICE_NAME=fitme-admin-web,_SERVICE_ACCOUNT=fitme-admin-runner@PROJECT_ID.iam.gserviceaccount.com,_API_URL=https://YOUR_API_RUN_URL
```

## Mobile Cutover

Mobile still builds through Expo / EAS. After the API is live on Cloud Run:

1. Replace the old backend URL in [apps/mobile/eas.json](/home/pc/projects/outfit-app/apps/mobile/eas.json)
2. Set `EXPO_PUBLIC_API_URL` to the Cloud Run API URL or your custom domain
3. Build a new APK / app bundle with EAS

Expo is still the mobile build/runtime toolchain. GCP replaces Railway and Cloudinary for backend infrastructure, not Expo itself.

## Notes

- The API and admin-web are containerized for GCP.
- The API upload path now targets Cloud Storage.
- The repo still supports local development through Docker Compose and Expo.
- Try-on is still configured to use `mock` by default until you provide a real HTTP try-on provider.
