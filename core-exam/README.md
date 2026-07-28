# Core Exam foundation contracts

This directory contains public-safe metadata and validation contracts only.
It must never contain the canonical study prose, extracted lectures, PDFs, or
other private source assets.

## Validate manifests

```sh
npm run core-exam:validate
```

## Verify the private local corpus

The ignored file `.local-archive/core-exam/source-map.json` maps each public
source key to its private absolute path.

```sh
npm run core-exam:verify-sources
```

Verification checks file presence, byte count, and SHA-256 checksum. It reads
the source files but never copies or modifies them.
