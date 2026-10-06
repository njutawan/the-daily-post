# Archived SQLite migrations

These migrations describe the pre-release SQLite schema and are retained for
reference or an explicit local-data export. They are not part of the active
Prisma migration history. The production schema is PostgreSQL and starts from
the current-schema baseline in the sibling `../migrations/` directory.

Do not apply these migrations to the production PostgreSQL database. Existing
SQLite data must be exported/imported separately before switching providers.
