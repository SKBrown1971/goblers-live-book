# Goblers Knob 2026 Cloud Live Book setup

This is the live syncing Netlify version.

## Files in this project

- `index.html`: the mobile betting app
- `netlify/functions/book.mjs`: the cloud API
- `package.json`: installs `@netlify/blobs`
- `netlify.toml`: tells Netlify where to publish the app and functions

## Deploy through GitHub and Netlify

1. Create a private GitHub repository called `goblers-live-book`.
2. Upload the contents of this folder to the repository. Do not upload the zip itself. Upload `index.html`, `package.json`, `netlify.toml`, and the `netlify/functions/book.mjs` folder path.
3. In Netlify, choose Add new site > Import an existing project.
4. Choose GitHub and select the `goblers-live-book` repository.
5. Use these build settings:
   - Build command: `npm run build`
   - Publish directory: `.`
   - Functions directory: `netlify/functions`
6. Deploy the site.
7. Open the Netlify URL on your laptop and phone.
8. The admin code is `benson2026` unless you set a different `ADMIN_CODE` environment variable in Netlify.
9. Add a bet on one device, then press Refresh Now or wait about 5 seconds on the other device.

## Optional security improvement

In Netlify, go to Site configuration > Environment variables and add:

- Key: `ADMIN_CODE`
- Value: your private code

Then redeploy the site.

## Notes

- This version stores the book in Netlify Blobs through the Netlify Function.
- It is shared across devices.
- It is not just local browser storage.
- Do not use drag and drop deploy for this project unless Netlify successfully deploys the function and dependencies. GitHub deployment is the safer route.
