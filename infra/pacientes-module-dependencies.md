# Pacientes module integration

Required API dependencies in addition to the Auth module:

```bash
npm install @nestjs/mapped-types
```

Required environment variables:

```env
# 32 bytes in base64, hex, or raw UTF-8. Prefer base64 from a KMS/secret manager.
PATIENT_DATA_ENCRYPTION_KEY=base64-32-byte-key

# Optional separate HMAC key for CPF lookup hashes.
PATIENT_DATA_HASH_KEY=base64-32-byte-key
```

MongoDB Atlas Search index for phonetic/fuzzy name search:

```json
{
  "name": "pacientes_nome_fonetico",
  "mappings": {
    "dynamic": false,
    "fields": {
      "nome": {
        "type": "string",
        "analyzer": "lucene.portuguese"
      }
    }
  }
}
```

For true phonetic behavior, create a custom Atlas Search analyzer with a phonetic token filter and keep the same index name used by the repository.
