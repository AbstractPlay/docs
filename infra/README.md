# AWS infrastructure for docs.abstractplay.com

One-time setup using CloudFormation (`infra/docs-site.yaml`).

## Prerequisites

- ACM certificates in **us-east-1** for:
  - `docs.dev.abstractplay.com`
  - `docs.abstractplay.com`
- AWS CLI profiles: `AbstractPlayDev`, `AbstractPlayProd`

## Deploy dev stack

```powershell
aws cloudformation deploy `
  --profile AbstractPlayDev `
  --region us-east-1 `
  --stack-name abstractplay-docs-dev `
  --template-file infra/docs-site.yaml `
  --parameter-overrides `
    Environment=dev `
    DomainName=docs.dev.abstractplay.com `
    AcmCertificateArn=[ARN]
```

ID: E3IGHKNY0916DU

## Deploy prod stack

```powershell
aws cloudformation deploy `
  --profile AbstractPlayProd `
  --region us-east-1 `
  --stack-name abstractplay-docs-prod `
  --template-file infra/docs-site.yaml `
  --parameter-overrides `
    Environment=prod `
    DomainName=docs.abstractplay.com `
    AcmCertificateArn=[ARN]
```

## After deploy

1. Note `DistributionId` from stack outputs
2. Add GitHub repository secrets on `AbstractPlay/docs`:
   - `DOCS_CF_DIST_DEV` — dev CloudFront distribution ID
   - `DOCS_CF_DIST_PROD` — prod CloudFront distribution ID
   - `AWS_KEY`, `AWS_SECRET` (if not already org-wide)
3. Create Route53 CNAME: domain → CloudFront domain name

The stack includes a CloudFront Function that rewrites `/renderer/` → `/renderer/index.html` (and similar directory URLs). Redeploy the stack after template changes so subpath docs work.

## Deploy site content

```bash
npm run deploy:dev   # develop branch / dev bucket
npm run deploy:prod  # main branch / prod bucket
```

serverless-finch syncs `./dist` to the bucket configured in `serverless.yml` (`manageResources: false` — bucket policy and CloudFront are managed by CloudFormation).
