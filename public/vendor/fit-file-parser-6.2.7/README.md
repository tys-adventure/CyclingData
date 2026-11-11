# Browser FIT parser

Vendored bundle of `fit-file-parser` 6.2.7 (MIT), with `buffer` 6.0.3, `base64-js` 1.5.1 and `ieee754` 1.2.1. Their license texts accompany this file. Source: https://github.com/jimmykane/fit-parser and the corresponding pinned npm tarballs. This browser bundle is loaded only when importing FIT files; no ride file is uploaded to a parsing service.

Rebuild using esbuild 0.28.2, an entry containing `export {default} from 'fit-file-parser';`, and the exact package versions above:

```
esbuild entry.js --bundle --format=esm --platform=browser --minify --legal-comments=eof --outfile=parser.js
```

The FIT regression fixture was created with Garmin's reference encoder using synthetic data. The Garmin SDK is not distributed with this application.
