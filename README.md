[![npm version](https://badge.fury.io/js/lint-wiki-dumps.svg)](https://www.npmjs.com/package/lint-wiki-dumps)
[![CodeQL](https://github.com/bhsd-harry/lint-wiki-dumps/actions/workflows/codeql.yml/badge.svg)](https://github.com/bhsd-harry/lint-wiki-dumps/actions/workflows/codeql.yml)
[![Codacy Badge](https://app.codacy.com/project/badge/Grade/12aacc9d0f3e4629ae96114f7c40cf31)](https://app.codacy.com/gh/bhsd-harry/lint-wiki-dumps/dashboard)

# Lint-Wiki-Dumps

This is a tool for linting Wikitext articles from Wikipedia with the help of [WikiLint](https://www.npmjs.com/package/wikilint). It will download the latest dump of a specified Wikipedia language edition and then lint the articles in the dump.

## Installation

To run this tool, you need to have [curl](https://curl.se/) installed on your system. You can install this tool via npm:

```sh
npm i lint-wiki-dumps
```

You can also install its optional dependency [vscode-css-languageservice](https://npmjs.com/package/vscode-css-languageservice) to lint inline CSS in Wikitext:

```sh
npm i vscode-css-languageservice
```

## Usage

```sh
npx lint-wiki-dumps <language> <path to download> [path to HTML output]
# For example:
npx lint-wiki-dumps zh-yue ~/Downloads/dumps
```

or execute the Bash script `scan.sh` directly:

```sh
bash scan.sh <language> <path to download> [path to HTML output]
# For example:
bash scan.sh zh-yue ~/Downloads/dumps
```

## Advanced Usage

If you have already downloaded the dump, you can scan the dump directly and generate JSON reports:

```sh
node parser.js <language> <path to dump>
# For example:
node parser.js zh-yue ~/Downloads/dumps/zh-yuewiki-lastest-pages-articles.xml.bz2
```

To generate HTML reports, you can use the following command:

```sh
node report.js <language> [path to HTML output]
# For example:
node report.js zh-yue
```

## Report

The tool will generate reports in two formats: JSON and HTML. The JSON report will be saved in the `results` folder, while the HTML report will be available at `reports/index.html` or the specified path.
