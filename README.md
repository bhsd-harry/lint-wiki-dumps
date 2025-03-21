[![npm version](https://badge.fury.io/js/lint-wiki-dumps.svg)](https://www.npmjs.com/package/lint-wiki-dumps)
[![CodeQL](https://github.com/bhsd-harry/lint-wiki-dumps/actions/workflows/codeql.yml/badge.svg)](https://github.com/bhsd-harry/lint-wiki-dumps/actions/workflows/codeql.yml)
[![Codacy Badge](https://app.codacy.com/project/badge/Grade/12aacc9d0f3e4629ae96114f7c40cf31)](https://app.codacy.com/gh/bhsd-harry/lint-wiki-dumps/dashboard)

# Lint-Wiki-Dumps

This is a tool for linting Wikitext articles from Wikipedia with the help of [WikiLint](https://www.npmjs.com/package/wikilint). It will download the latest dump of a specified Wikipedia language edition and then lint the articles in the dump.

## Usage

```sh
npx lint-wiki-dumps <language> <path to download>
# For example:
npx lint-wiki-dumps zh-yue ~/Downloads/dumps
```
