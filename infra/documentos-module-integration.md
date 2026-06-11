# Documentos module integration

Register `DocumentosModule` in the API root module.

Dependencies:

```bash
npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner sharp
```

Required environment for S3 or Cloudflare R2:

```env
DOCUMENT_STORAGE_BUCKET=private-documents
DOCUMENT_STORAGE_REGION=auto
DOCUMENT_STORAGE_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com
DOCUMENT_STORAGE_FORCE_PATH_STYLE=true
DOCUMENT_STORAGE_ACCESS_KEY_ID=...
DOCUMENT_STORAGE_SECRET_ACCESS_KEY=...
```

Flow:

1. `POST /documentos/presign-upload` validates MIME/type/size/quota and returns a presigned PUT URL.
2. Client uploads directly to S3/R2. The file never goes through the API server during upload.
3. `POST /documentos/:id/confirmar-upload` finalizes metadata and creates a thumbnail for JPG/PNG using `sharp`.
4. `GET /documentos/:id/access-url` returns a temporary signed GET URL that expires in 15 minutes.
5. `PATCH /documentos/:id/excluir` performs soft delete only; objects are never physically deleted.

Limits:

- Allowed MIME types: PDF, JPG, PNG, DICOM.
- Max file size: 50MB.
- Max active storage per patient: 500MB.
