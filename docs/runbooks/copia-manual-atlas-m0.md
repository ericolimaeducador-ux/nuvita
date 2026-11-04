# Runbook: manual copy of the Atlas M0 collections and restore proof (Erico executes)

> The production cluster is Atlas M0 and has **no backup** (accepted risk, `docs/PROGRESS_BETA_PRELAUNCH.md`). This copy is a **mitigation, not a backup**. Never record it as "backup confirmed".

## Rules
- Collections: `inscricoes_teste`, `users`, `clinicas`.
- Routine: before the second cleanup, after the accounts are created, and once a week during the beta.
- Where: an encrypted folder OUTSIDE the repository.
- **Never paste the connection URI in a chat, in a script file or in a versioned command.** Put it in an environment variable of your own terminal only (the examples use `$ATLAS_URI`, set by you, never typed in a shared place).
- Nothing below touches production beyond reading (export). Importing goes ONLY to the local Mongo on port 27018.

## 1. Export (reading Atlas)
With `mongodump` (Database Tools installed on your machine):

```
mongodump --uri="$ATLAS_URI" --db=<atlas_database_name> --collection=inscricoes_teste --out=<encrypted_folder>/dump-<date>
mongodump --uri="$ATLAS_URI" --db=<atlas_database_name> --collection=users --out=<encrypted_folder>/dump-<date>
mongodump --uri="$ATLAS_URI" --db=<atlas_database_name> --collection=clinicas --out=<encrypted_folder>/dump-<date>
```

(Or Compass → collection → Export Collection → JSON, one file per collection.)

## 2. Check the export (mandatory before any deletion)
Compare with Atlas, per collection: the **document count** and the **file size**. Each `.bson` (or `.json`) file must exist and be non-empty. Write the numbers in `docs/seguranca/EXCECAO-LIMPEZA-CLINICA-TESTE.md`. If anything differs, stop.

## 3. Prove it restores: import into the LOCAL Mongo (port 27018), into a separate database
The local container is `nuvita-psi-mongo-27018` (`docker start nuvita-psi-mongo-27018` if it is stopped). The target database name `restore_teste` keeps the copy apart from the local demo data.

From a `mongodump` copy:

```
mongorestore --uri="mongodb://127.0.0.1:27018" --nsFrom="<atlas_database_name>.*" --nsTo="restore_teste.*" <encrypted_folder>/dump-<date>/<atlas_database_name>
```

From a Compass JSON export (a JSON array, one file per collection):

```
mongoimport --uri="mongodb://127.0.0.1:27018/restore_teste" --collection=users --file=<encrypted_folder>/users.json --jsonArray
mongoimport --uri="mongodb://127.0.0.1:27018/restore_teste" --collection=clinicas --file=<encrypted_folder>/clinicas.json --jsonArray
mongoimport --uri="mongodb://127.0.0.1:27018/restore_teste" --collection=inscricoes_teste --file=<encrypted_folder>/inscricoes_teste.json --jsonArray
```

Then count and compare with step 2:

```
mongosh "mongodb://127.0.0.1:27018/restore_teste" --quiet --eval "['inscricoes_teste','users','clinicas'].forEach(c => print(c, db[c].countDocuments()))"
```

The restore is proven only when the three counts equal the Atlas counts. Record the date and the counts. **Status today: NOT done yet.**

## Limits (say them honestly)
- The copy contains the encrypted patient fields as they are in the database; keep the folder encrypted and out of the repository.
- `users` carries 2FA secrets and password hashes: treat the copy as a secret.
- A copy taken once a week still loses up to a week of data. It does not replace a Flex or M10 backup, an encrypted external copy to R2 and a documented restore test (the gate for real data).
