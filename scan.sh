#!/usr/local/bin/bash
if (( $# < 2 ))
then
	echo 'Usage: npx lint-wiki-dumps <language> <path to download> [path to HTML output]'
	echo 'Example: npx lint-wiki-dumps zh-yue ~/Downloads/dumps'
	exit 1
fi
target="${1//-/_}wiki" # example: zh_yuewiki
npx getParserConfig "${1}wiki" "https://$1.wikipedia.org/w/"
bash download.sh "$target" "$2"
if (( $? == 1 ))
then
	echo 'Switching to single-threaded mode'
	node parser.js "$1" "$2/$target-latest-pages-articles.xml.bz2"
else
	node parser-parallel.js "$1" "$2" "$4"
fi
if (( $? == 0))
then
	echo 'Starting report generation'
	node report.js "$1" "$3"
fi
