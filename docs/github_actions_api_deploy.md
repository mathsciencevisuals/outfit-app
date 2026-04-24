# GitHub Actions API Deploy

This repo now includes a GitHub Actions workflow at `.github/workflows/deploy-api.yml` that:

- builds `apps/api/Dockerfile`
- pushes the image to Artifact Registry
- deploys the image to an existing Cloud Run service

The workflow is intentionally image-only. It does not redefine Cloud Run runtime configuration such as VPC, Cloud SQL, Redis, or Secret Manager bindings. Those should stay on the existing Cloud Run service and are preserved when a new image revision is deployed.

## GitHub Repository Settings

Add these GitHub Actions repository variables:

- `GCP_PROJECT_ID`
- `GCP_REGION`
- `GAR_REPOSITORY`
- `GAR_IMAGE`
- `CLOUD_RUN_API_SERVICE`

Recommended values for this deployment:

- `GCP_PROJECT_ID=project-76d5128b-ead2-466c-b88`
- `GCP_REGION=asia-south1`
- `GAR_REPOSITORY=outfit-api-repo`
- `GAR_IMAGE=api-service`
- `CLOUD_RUN_API_SERVICE=fitme-api`

Add these GitHub Actions repository secrets:

- `GCP_WORKLOAD_IDENTITY_PROVIDER`
- `GCP_DEPLOY_SERVICE_ACCOUNT`

## One-Time GCP Setup

Replace these placeholders before running the commands:

- `PROJECT_ID=project-76d5128b-ead2-466c-b88`
- `PROJECT_NUMBER=237152691367`
- `GITHUB_OWNER=mathsciencevisuals`
- `GITHUB_REPO=outfit-app`
- `POOL_ID=github-pool`
- `PROVIDER_ID=github-provider`
- `DEPLOY_SA_NAME=github-deployer`
- `RUNTIME_SA_EMAIL=237152691367-compute@developer.gserviceaccount.com`

Current production Cloud Run service:

- `fitme-api`

Current runtime service account:

- `237152691367-compute@developer.gserviceaccount.com`

Create a deployer service account:

```bash
gcloud iam service-accounts create github-deployer \
  --project project-76d5128b-ead2-466c-b88
```

Create a workload identity pool:

```bash
gcloud iam workload-identity-pools create github-pool \
  --project project-76d5128b-ead2-466c-b88 \
  --location global \
  --display-name "GitHub Actions"
```

Create a GitHub OIDC provider:

```bash
gcloud iam workload-identity-pools providers create-oidc github-provider \
  --project project-76d5128b-ead2-466c-b88 \
  --location global \
  --workload-identity-pool github-pool \
  --display-name "GitHub" \
  --issuer-uri "https://token.actions.githubusercontent.com" \
  --attribute-mapping "google.subject=assertion.sub,attribute.actor=assertion.actor,attribute.repository=assertion.repository,attribute.repository_owner=assertion.repository_owner,attribute.ref=assertion.ref"
```

Allow this GitHub repo to impersonate the deployer service account:

```bash
gcloud iam service-accounts add-iam-policy-binding \
  github-deployer@project-76d5128b-ead2-466c-b88.iam.gserviceaccount.com \
  --project project-76d5128b-ead2-466c-b88 \
  --role roles/iam.workloadIdentityUser \
  --member "principalSet://iam.googleapis.com/projects/237152691367/locations/global/workloadIdentityPools/github-pool/attribute.repository/mathsciencevisuals/outfit-app"
```

Grant the deployer service account the minimum project roles needed for image push and Cloud Run deploy:

```bash
gcloud projects add-iam-policy-binding project-76d5128b-ead2-466c-b88 \
  --member "serviceAccount:github-deployer@project-76d5128b-ead2-466c-b88.iam.gserviceaccount.com" \
  --role roles/artifactregistry.writer

gcloud projects add-iam-policy-binding project-76d5128b-ead2-466c-b88 \
  --member "serviceAccount:github-deployer@project-76d5128b-ead2-466c-b88.iam.gserviceaccount.com" \
  --role roles/run.admin
```

Allow the deployer account to deploy revisions that use the current runtime service account:

```bash
gcloud iam service-accounts add-iam-policy-binding 237152691367-compute@developer.gserviceaccount.com \
  --project project-76d5128b-ead2-466c-b88 \
  --member "serviceAccount:github-deployer@project-76d5128b-ead2-466c-b88.iam.gserviceaccount.com" \
  --role roles/iam.serviceAccountUser
```

Set GitHub secrets using these values:

- `GCP_WORKLOAD_IDENTITY_PROVIDER=projects/237152691367/locations/global/workloadIdentityPools/github-pool/providers/github-provider`
- `GCP_DEPLOY_SERVICE_ACCOUNT=github-deployer@project-76d5128b-ead2-466c-b88.iam.gserviceaccount.com`

Set GitHub repository variables using these values:

- `GCP_PROJECT_ID=project-76d5128b-ead2-466c-b88`
- `GCP_REGION=asia-south1`
- `GAR_REPOSITORY=outfit-api-repo`
- `GAR_IMAGE=api-service`
- `CLOUD_RUN_API_SERVICE=fitme-api`

## Artifact Registry Cleanup Policy

This repo also includes `infra/gcp/artifact-registry-cleanup-policy.json`.

The policy keeps the most recent `3` versions of the `api-service` image and deletes older versions after `3` days. That is usually a better free-tier tradeoff than deleting the immediately previous image on every deploy.

Test the policy in dry-run mode first:

```bash
gcloud artifacts repositories set-cleanup-policies outfit-api-repo \
  --project project-76d5128b-ead2-466c-b88 \
  --location asia-south1 \
  --policy infra/gcp/artifact-registry-cleanup-policy.json \
  --dry-run
```

Apply it after checking the result:

```bash
gcloud artifacts repositories set-cleanup-policies outfit-api-repo \
  --project project-76d5128b-ead2-466c-b88 \
  --location asia-south1 \
  --policy infra/gcp/artifact-registry-cleanup-policy.json
```

List active cleanup policies:

```bash
gcloud artifacts repositories list-cleanup-policies outfit-api-repo \
  --project project-76d5128b-ead2-466c-b88 \
  --location asia-south1
```

## Workflow Trigger

The workflow runs on:

- pushes to `main`
- changes affecting `apps/api` or its shared packages
- manual `workflow_dispatch`

## Notes

- Artifact Registry cleanup jobs run periodically, not immediately.
- The workflow tags images with the full Git commit SHA.
- This setup assumes the Cloud Run service already exists and already has its runtime configuration.
