# Bike Backlinks

Backlinks inspector extension for [Bike Outliner 2](https://www.hogbaysoftware.com/bike/).

The extension adds a **Backlinks** section to Bike's inspector and lists rows in
the current outline that link to the selected row. Click a backlink to reveal
and select its source row. Backlinks are sorted newest to oldest by modified
date, falling back to created date when needed.

## Development

Install dependencies:

```sh
npm install
```

Build the extension:

```sh
npm run build
```

Install the compiled extension into Bike:

```sh
npx bike-ext build backlinks --install
```

Run tests:

```sh
npx bike-ext test backlinks
```

Bike must be quit before running tests because the test runner launches a fresh
Bike instance.
