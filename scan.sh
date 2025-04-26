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
res="$?"
if (( res == 20 ))
then
	echo 'Switching to single-threaded mode'
	node parser.js "$1" "$2/$target-latest-pages-articles.xml.bz2" "$4"
elif (( res == 0 ))
then
	node parser-parallel.js "$1" "$2" "$4"
else
	echo "Exit $res: Failed to download the file(s)"
	exit 1
fi
if (( $? == 0))
then
	echo 'Starting report generation'
	node report.js "$1" "$3"
fi
