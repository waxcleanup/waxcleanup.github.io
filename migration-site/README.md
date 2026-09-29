# GitHub Pages migration landing page — local preview

Standalone static replacement for the old GitHub Pages deployment. Not deployed.

Preview: serve this directory with Python on localhost port 4174. The main homepage stays visible. Launch, Market, Exchange, Guide, and community links use the real destinations. No wallet SDK or login is included.

If approved, publish only the contents of this directory (excluding this README and test files) to the GitHub Pages publishing branch. Do not publish the mainnet app build here. The 404 page handles existing bookmarks and redirects them on waxcleanup.github.io, preserving search/hash and mapping shop, marketplace and recipes to the new Market sections. Unknown paths lead to the new home. Redirects are disabled on localhost for review.

The preview does not change the new site's indexing, canonical URLs, or release configuration. Those remain separate promotion tasks.
Publication note: preserve .github/workflows/request-pages-build.yml when publishing. It uses only Pages write permission to request a build of the already configured gh-pages root; it does not change Pages settings. This handles deploy-key pushes that otherwise may not start a Pages build.
