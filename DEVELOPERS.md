## DB Migrations

- Whenever there are changes to existing sql schema files (`.sql.ts`) or new schema files are created, you must run `npm run db:generate`.
- This will generate migration files for drizzle to run during app initialization

## Fly.io managed postgres

- connect with psql `fly mpg connect`

## deployment

- `fly launch` (create/configure/deploy new app)
- `fly deploy` (deploy app/redeploy after changes)
- `fly logs --app annos`
- `fly secrets set SUPER_SECRET_KEY=password1234`
- make sure that new environment vars are added as secrets with the above command

## local development with mocked backend

- `npm install`
- in one terminal: `npm run dev:mock`
- another terminal: `npm run webapp:dev`
- ui is available on `localhost:4000`
