# LG webOS application

- `application/`: app manifest, HTML/CSS/JS, features, assets and the bundled `service/` scripts.
- `package/`: webOS package metadata.

The `application/service/` directory is the authoritative source for service scripts. It stays beside the app because the existing webOS packaging workflow includes it from the app directory. Do not maintain a second copy elsewhere.
