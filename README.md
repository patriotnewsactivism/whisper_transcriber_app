# whisper_transcriber_app

## Netlify deployment

To deploy the client on Netlify use the following settings:

```
Build command: pip install -r server/requirements.txt && npm --prefix client ci && npm --prefix client run build
Publish directory: client/dist
```

Netlify will use `requirements.txt` to install the Python dependencies and
`package.json` to run the build script for the Vite based client.

