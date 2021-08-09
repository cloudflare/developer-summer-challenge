# Cloudflare Summer Challenge

> https://challenge.developers.cloudflare.com/

## Setup

```sh
$ npm install
# or
$ pnpm install
# or
$ yarn install
```

## Development

The application is split into two separate components, (currently) requiring two separate development workflows:

***Client***

Ideal for HTML/CSS/JS development. Spawns a live-reload development server:

```sh
$ npm run html dev
```

This will watch the `/src` directory for any file changes, automatically reloading the `localhost:8080` server.

***Worker***

You should already have `wranger` installed. Start a development server via:

```sh
$ wrangler dev
```

This will watch the `/worker` directory for any file changes, automatically reloading the `localhost:8787` server. **Note:** Any changes to `/src` contents will not be reflected until `/worker` contents change.

## Deployment

Wrangler is already configured to build the HTML/client files before building the Worker itself. By default, everything will be built before uploading any assets to Cloudflare:

```sh
$ wrangler publish
```
