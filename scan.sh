#!/usr/local/bin/bash
if (( $# < 2 ))
then
	echo 'Usage: npx lint-wiki-dumps <language> <path to download>'
	echo 'Example: npx lint-wiki-dumps zh-yue ~/Downloads/dumps'
	exit 1
fi
site="${1}wiki" # example: zh-yuewiki
target="${1//-/_}wiki" # example: zh_yuewiki
file="${target}-latest-pages-articles.xml.bz2"
if (( $# < 3 ))
then
	curl --output-dir "$2" -O "https://dumps.wikimedia.org/$target/latest/$file"
	npx getParserConfig "$site" "https://$1.wikipedia.org/w/"
fi
node parser.js "$site" "$2/$file" "$3" "$4"
