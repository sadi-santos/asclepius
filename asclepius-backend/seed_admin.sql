INSERT INTO "users" ("id","email","passwordHash","role","isActive","createdAt","updatedAt")
VALUES ('b8475202-39b1-48ff-a5cc-f0cee45bc76c','admin@vidaplus.com','/MwgIjhaLsgwucMTGpbciWUlm','ADMIN',true,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)
ON CONFLICT ("email") DO UPDATE
  SET "passwordHash" = EXCLUDED."passwordHash",
      "role"        = 'ADMIN',
      "isActive"    = true,
      "updatedAt"   = CURRENT_TIMESTAMP;