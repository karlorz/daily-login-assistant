## [1.6.2](https://github.com/karlorz/daily-login-assistant/compare/v1.6.1...v1.6.2) (2025-10-12)


### Bug Fixes

* improve SSH authentication in launcher script to prefer key-based auth ([8a3a50b](https://github.com/karlorz/daily-login-assistant/commit/8a3a50b4d80c937ca39d60d11385cb3ea8e52291))

## [1.6.1](https://github.com/karlorz/daily-login-assistant/compare/v1.6.0...v1.6.1) (2025-10-12)


### Bug Fixes

* restore full launcher.sh template with SSH tunnel functionality ([cab44ba](https://github.com/karlorz/daily-login-assistant/commit/cab44ba3a42fee63872b8b54ec5d617fd68b85f3))

# [1.6.0](https://github.com/karlorz/daily-login-assistant/compare/v1.5.1...v1.6.0) (2025-10-12)


### Features

* improve startup logging and disable legacy auth by default ([69788dc](https://github.com/karlorz/daily-login-assistant/commit/69788dc63898426e8372710f6098389443aa6130))

## [1.5.1](https://github.com/karlorz/daily-login-assistant/compare/v1.5.0...v1.5.1) (2025-10-12)


### Bug Fixes

* Default SSH port to 22 and update environment docs ([9377615](https://github.com/karlorz/daily-login-assistant/commit/93776150aac38f283e6a61fd7e9a3932bc58156b))

# [1.5.0](https://github.com/karlorz/daily-login-assistant/compare/v1.4.0...v1.5.0) (2025-10-12)


### Features

* auto-configure anyrouter endpoint based on deployment hostname ([a87e614](https://github.com/karlorz/daily-login-assistant/commit/a87e614f867917b04cf151fccc526a662d643129))

# [1.4.0](https://github.com/karlorz/daily-login-assistant/compare/v1.3.0...v1.4.0) (2025-10-12)


### Bug Fixes

* install and use Bun runtime for production deployment ([cd390b9](https://github.com/karlorz/daily-login-assistant/commit/cd390b97e6bf16cb5f05e6f78a4e39354c966cfb))
* resolve TypeScript Server generic type compatibility issue for npm/tsc ([ea8e9f3](https://github.com/karlorz/daily-login-assistant/commit/ea8e9f3b0778e7e9fc8a286af079c3b42e5e0493))
* use PWA_PORT environment variable for web API port configuration ([d2ccc64](https://github.com/karlorz/daily-login-assistant/commit/d2ccc6400a85112e59d7d2b28e996de99a6241f8))


### Features

* add non-interactive deployment support with INSTALL_BRANCH and INSTALL_PORT env vars ([88a9615](https://github.com/karlorz/daily-login-assistant/commit/88a9615fd8b90b52eedcf21988c7428b78025dca))

# [1.3.0](https://github.com/karlorz/daily-login-assistant/compare/v1.2.8...v1.3.0) (2025-10-12)


### Features

* Implement Playwright Browser Automation ([#3](https://github.com/karlorz/daily-login-assistant/issues/3)) ([37bbd8f](https://github.com/karlorz/daily-login-assistant/commit/37bbd8f35d27ad153142ce3a52eb46c30fc416ab)), closes [#2](https://github.com/karlorz/daily-login-assistant/issues/2) [#4](https://github.com/karlorz/daily-login-assistant/issues/4)

## [1.2.8](https://github.com/karlorz/daily-login-assistant/compare/v1.2.7...v1.2.8) (2025-09-28)


### Bug Fixes

* ci ([406f75e](https://github.com/karlorz/daily-login-assistant/commit/406f75ebdf216f78b45df0a2413416d0c267eec4))

## [1.2.7](https://github.com/karlorz/daily-login-assistant/compare/v1.2.6...v1.2.7) (2025-09-28)


### Bug Fixes

* ci ([fba8a06](https://github.com/karlorz/daily-login-assistant/commit/fba8a066d384ec5e2806e99eefde4509f4ff711a))

## [1.2.6](https://github.com/karlorz/daily-login-assistant/compare/v1.2.5...v1.2.6) (2025-09-28)


### Bug Fixes

* add workflow-level permissions for release events ([98f0e14](https://github.com/karlorz/daily-login-assistant/commit/98f0e14d827f7877347025bec553bf8513d10f4b))

## [1.2.5](https://github.com/karlorz/daily-login-assistant/compare/v1.2.4...v1.2.5) (2025-09-28)


### Bug Fixes

* add multiple release event types to Docker workflow ([c05af46](https://github.com/karlorz/daily-login-assistant/commit/c05af46c592c231fdae928c258d7a37069edad01))

## [1.2.4](https://github.com/karlorz/daily-login-assistant/compare/v1.2.3...v1.2.4) (2025-09-28)


### Bug Fixes

* add tag trigger to Docker publish workflow ([a516d52](https://github.com/karlorz/daily-login-assistant/commit/a516d528f6534f7fbfdc320b00d758692fdfb143))

## [1.2.3](https://github.com/karlorz/daily-login-assistant/compare/v1.2.2...v1.2.3) (2025-09-28)


### Bug Fixes

* simplify Docker publish workflow triggers ([a1369c6](https://github.com/karlorz/daily-login-assistant/commit/a1369c62a44c21953dca7942d3e7d24e6bcebbe3))

## [1.2.2](https://github.com/karlorz/daily-login-assistant/compare/v1.2.1...v1.2.2) (2025-09-28)


### Bug Fixes

* docker ([f999649](https://github.com/karlorz/daily-login-assistant/commit/f999649fd80e0c365e99d6705dfed7b0ae7813d1))
* Squashed commits from ci-1 ([1aa034a](https://github.com/karlorz/daily-login-assistant/commit/1aa034aa5e9deda80411be2822bec38f4aa2b347))

## [1.2.1](https://github.com/karlorz/daily-login-assistant/compare/v1.2.0...v1.2.1) (2025-09-28)


### Bug Fixes

* resolve Playwright timeout issues in GitHub Actions CI environment ([42a251b](https://github.com/karlorz/daily-login-assistant/commit/42a251bcb01cd11c5021534db1fe3e53ed645bcc))
* resolve Playwright timeout issues in GitHub Actions CI environment ([22c8d3c](https://github.com/karlorz/daily-login-assistant/commit/22c8d3cf4f1ae076c6036dfa13aa9d4046111805))

# [1.2.0](https://github.com/karlorz/daily-login-assistant/compare/v1.1.0...v1.2.0) (2025-09-28)


### Bug Fixes

* **ci:** ensure dependencies always install for type checking ([bc3dfba](https://github.com/karlorz/daily-login-assistant/commit/bc3dfba78a634be2025f47416d91c1123956f0c4))
* **ci:** ensure dependencies install in release job and update actions ([130e6ea](https://github.com/karlorz/daily-login-assistant/commit/130e6ea0fe19a5dc9fc3803d0a79988e1faa5507))
* **ci:** remove unsupported bun cache from setup-node ([8ee5c6a](https://github.com/karlorz/daily-login-assistant/commit/8ee5c6a5e416ea0d5b2af686eea06f7764a4bdbb))


### Features

* **ci:** implement state-of-the-art GitHub Actions workflow ([c6ffbc1](https://github.com/karlorz/daily-login-assistant/commit/c6ffbc1a7ad1c09c525b400e6d768b8666d5fcb4))

# [1.1.0](https://github.com/karlorz/daily-login-assistant/compare/v1.0.0...v1.1.0) (2025-09-27)


### Features

* implement simplified architecture with Bun optimization ([7747b7d](https://github.com/karlorz/daily-login-assistant/commit/7747b7df0a18e1c93227c2dd8afa92876dde6859))

# 1.0.0 (2025-09-27)


### Bug Fixes

* Add pull_request trigger to CI workflow ([11c268a](https://github.com/karlorz/daily-login-assistant/commit/11c268a6389ac8584b77feb2df9d0a8d219fc2f6))
* ci ([7295bb1](https://github.com/karlorz/daily-login-assistant/commit/7295bb1d170b6e16b790cdfa813070cca299bd36))
* ci ([73d2bb2](https://github.com/karlorz/daily-login-assistant/commit/73d2bb2a59bbf6cdb3ad18e49a0423060e7b9d2e))
* Exclude generated TypeScript files from linting and git ([b17b880](https://github.com/karlorz/daily-login-assistant/commit/b17b8803aed4f62671e87943de77d9a15852b4bc))
* Remove unsupported bun cache from Node.js setup ([07b6284](https://github.com/karlorz/daily-login-assistant/commit/07b62846702e898a90b49bca4427c6e8f8ba132f))
* Replace npm with bun in CI workflow for package manager consistency ([8d79f5c](https://github.com/karlorz/daily-login-assistant/commit/8d79f5cc675b8b24387c84b141ea98bac2349961))


### Features

* Add minimal project structure and fix CI configuration ([0f3f9bc](https://github.com/karlorz/daily-login-assistant/commit/0f3f9bc0a810497aa39d3ac3c27718780d0c39a5))
* Update CI workflow to use semantic-release recommended configuration ([a026d24](https://github.com/karlorz/daily-login-assistant/commit/a026d240e0505d2e5a628f91a2e2b5b34bd29c59))
