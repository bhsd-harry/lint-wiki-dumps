#!/usr/local/bin/bash
if (( $# < 2 ))
then
	echo 'Usage: npx lint-wiki-dumps <language> <path to download> [path to HTML output]'
	echo 'Example: npx lint-wiki-dumps zh-yue ~/Downloads/dumps'
	exit 1
fi
if ! [ -f "config/${1}wiki.json" ]
then
	echo "Fetching parser configuration for ${1}wiki"
	npx getParserConfig "${1}wiki" "https://$1.wikipedia.org/w/"
fi
bash download.sh "$1" "$2"
res="$?"
if (( res == 20 ))
then
	echo 'Switching to single-threaded mode'
	node parser.js "$1" "$2/${1//-/_}wiki-latest-pages-articles.xml.bz2" "$4" "$5"
elif (( res == 0 ))
then
	node parser-parallel.js "$1" "$2" "$4" "$5"
else
	echo "Exit $res: Failed to download the file(s)"
	exit 1
fi
if (( $? == 0))
then
	echo 'Starting report generation'
	node report.js "$1" "$3" "$4"
fi
