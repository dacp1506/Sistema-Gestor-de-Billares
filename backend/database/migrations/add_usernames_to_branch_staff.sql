BEGIN;

ALTER TABLE usuarios
  ALTER COLUMN email DROP NOT NULL;

ALTER TABLE usuarios
  ADD COLUMN IF NOT EXISTS username VARCHAR(60);

UPDATE usuarios
SET username = 'operador_' || id_usuario::TEXT
WHERE rol <> 'admin_general' AND username IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS usuarios_username_lower_uq
  ON usuarios (LOWER(username)) WHERE username IS NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'usuarios_login_identity_check'
      AND conrelid = 'usuarios'::regclass
  ) THEN
    ALTER TABLE usuarios
      ADD CONSTRAINT usuarios_login_identity_check CHECK (
        (rol = 'admin_general' AND email IS NOT NULL) OR
        (rol <> 'admin_general' AND username IS NOT NULL)
      );
  END IF;
END
$$;

COMMIT;
