# AWS architecture (not implemented)

This is a **possible** later mapping. Nothing below is provisioned in this repository.

```text
Internet
  -> ALB
      -> ECS Fargate service: api
      -> ECS Fargate service: web (or CloudFront + S3 for the SPA)
  -> ECS Fargate service: worker (no public listener except optional health)

Data:
  RDS PostgreSQL (Multi-AZ in production)
  ElastiCache Redis (BullMQ + rate limits)

Ops:
  CloudWatch logs from ECS
  SES for invitation email (replace DevLoggerEmailSender)
  Secrets Manager for JWT_ACCESS_SECRET, JWT_REFRESH_SECRET, and API_KEY_PEPPER
  optional S3 for future file uploads
```

Local Docker Compose remains the supported runtime. Do not treat this document as evidence that AWS resources exist.
