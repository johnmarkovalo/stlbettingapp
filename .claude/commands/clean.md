---
description: Clean build cache and reinstall dependencies
allowed-tools: Bash(npm:*), Bash(./gradlew:*), Bash(rm:*)
---

Clean build cache and reinstall dependencies.

Steps:
1. Clean React Native cache: `npm start -- --reset-cache`
2. Clean Android build: `cd android && ./gradlew clean`
3. Reinstall node_modules: `rm -rf node_modules && npm install`

For a full clean:
```bash
rm -rf node_modules
cd android && ./gradlew clean && cd ..
npm install
npm start -- --reset-cache
```
