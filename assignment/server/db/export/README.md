# Database export

Extended JSON arrays exported from the local `bookstore` database, one file per collection. Files hold paths and links only, not covers or PDFs.

`users.json` contains email addresses and password hashes, so keep this repository private.

Restore each collection with MongoDB Database Tools, then run `npm run db:init` in `server/` to recreate the indexes:

```powershell
mongoimport --db bookstore --collection books --jsonArray --file books.json
```

Shipping addresses in `orders.json` are replaced with sample values.
