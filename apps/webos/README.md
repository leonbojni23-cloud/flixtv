# LG webOS application

- `application/`: web UI, app manifest, styles, features, assets and bundled app-side service scripts.
- `service/`: standalone webOS system service and startup scripts.
- `package/`: webOS package metadata.

The source was moved from the former `usr/palm` layout without changing its internal relative paths. Keep app-side assets together because the webOS runtime loads them relative to `index.html`.
