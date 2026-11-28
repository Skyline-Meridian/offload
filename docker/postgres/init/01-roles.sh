#!/bin/bash
# Runs once, when the database volume is first created. Creates the four database roles
# (docs/implementation/01. general_implementation.md section 7.3) and the extensions.
# Table grants are in the Prisma migrations.
set -e

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
  CREATE ROLE offload_owner LOGIN CREATEDB PASSWORD '${DB_OWNER_PASSWORD}';
  CREATE ROLE offload_app LOGIN PASSWORD '${DB_APP_PASSWORD}';
  CREATE ROLE offload_realtime LOGIN PASSWORD '${DB_REALTIME_PASSWORD}';
  CREATE ROLE offload_retention LOGIN PASSWORD '${DB_RETENTION_PASSWORD}';

  ALTER DATABASE ${POSTGRES_DB} OWNER TO offload_owner;
  REVOKE ALL ON DATABASE ${POSTGRES_DB} FROM PUBLIC;
  GRANT CONNECT ON DATABASE ${POSTGRES_DB} TO offload_app, offload_realtime, offload_retention;

  ALTER SCHEMA public OWNER TO offload_owner;
  GRANT USAGE ON SCHEMA public TO offload_app, offload_realtime, offload_retention;

  CREATE EXTENSION IF NOT EXISTS pg_trgm;
  CREATE EXTENSION IF NOT EXISTS unaccent;
EOSQL
