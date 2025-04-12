#!/usr/local/bin/bash
if (( $# < 2 ))
then
	echo 'Usage: npx lint-wiki-dumps <language> <path to download> [path to HTML output]'
	echo 'Example: npx lint-wiki-dumps zh-yue ~/Downloads/dumps'
	exit 1
fi
site="${1}wiki" # example: zh-yuewiki
target="${1//-/_}wiki" # example: zh_yuewiki
files=$( \
	curl -s "https://dumps.wikimedia.org/$target/latest/" \
	| grep -o "href=\"$target-latest-pages-articles[0-9].*\.bz2\">" \
	| gsed "s|href=\"|https://dumps.wikimedia.org/$target/latest/|;s|\">||" \
)
if (( ${#files} < 2 ))
then
	echo 'Switching to single-threaded mode'
	bash scan.sh "$1" "$2" "$3"
else
	curl --output-dir "$2" --remote-name-all $files
	npx getParserConfig "$site" "https://$1.wikipedia.org/w/"
	node parser-parallel.js "$1" "$2" "$4" && node report.js "$1" "$3"
fi
