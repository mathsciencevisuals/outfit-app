# GCP Deployment

This repo is now wired for a GCP deployment shape built around:

- Cloud Run for `apps/api`
- Cloud Run for `apps/admin-web`
- Cloud SQL for PostgreSQL
- Memorystore for Redis
- Secret Manager for sensitive runtime configuration
- Artifact Registry for container images
- Cloud Build for image build and Cloud Run deployment
- Expo EAS for `apps/mobile`, pointed at the Cloud Run API URL

## Recommended GCP Resources

- Project: one dedicated project for the app stack
- Region: keep everything in one region, for example `europe-west4`
- Artifact Registry repository: `outfit-app`
- Cloud SQL PostgreSQL instance: one instance for the API
- Memorystore Redis instance: one instance for BullMQ / Redis
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
- VPC Access / Compute Engine networking APIs as needed for your VPC setup

## Secrets

Create these Secret Manager secrets:

- `fitme-database-url`
- `fitme-jwt-secret`
- `fitme-cloudinary-cloud-name`
- `fitme-cloudinary-api-key`
- `fitme-cloudinary-api-secret`

Suggested `fitme-database-url` format for Cloud SQL via Unix socket:

```text
postgresql://USER:PASSWORD@localhost:5432/DATABASE?host=/cloudsql/PROJECT:REGION:INSTANCE
```

Cloud Run can mount the Cloud SQL connection when deployed with `--add-cloudsql-instances`, which is the intended path for this repo. Google documents Cloud Run + Cloud SQL configuration here:

- https://docs.cloud.google.com/sql/docs/postgres/connect-run

Cloud Run + Memorystore guidance:

- https://cloud.google.com/memorystore/docs/redis/connect-redis-instance-cloud-run

Cloud Build + Cloud Run deployment guidance:

- https://docs.cloud.google.com/build/docs/deploying-builds/deploy-cloud-run

Cloud Run secrets:

- https://docs.cloud.google.com/run/docs/configuring/services/secrets

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

Current runtime assumptions in the build config:

- `STORAGE_PROVIDER=cloudinary`
- `TRYON_PROVIDER=mock`

Run:

```bash
gcloud builds submit \
  --config cloudbuild.api.yaml \
  --substitutions=_REGION=europe-west4,_AR_REPOSITORY=outfit-app,_SERVICE_NAME=fitme-api,_SERVICE_ACCOUNT=fitme-api-runner@PROJECT_ID.iam.gserviceaccount.com,_CLOUDSQL_INSTANCE=PROJECT_ID:europe-west4:fitme-pg,_VPC_NETWORK=default,_VPC_SUBNET=default,_REDIS_URL=redis://REDIS_INTERNAL_IP:6379
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

1. Replace the Railway URL in [apps/mobile/eas.json](/home/pc/projects/outfit-app/apps/mobile/eas.json)
2. Set `EXPO_PUBLIC_API_URL` to the Cloud Run API URL or your custom domain
3. Build a new APK / app bundle with EAS

## Notes

- The API and admin-web are now containerized for GCP.
- The repo still supports local development through Docker Compose and Expo.
- Try-on is still configured to use `mock` by default until you provide a real HTTP try-on provider.
