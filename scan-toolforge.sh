#!/usr/local/bin/bash
if (( $# < 1 ))
then
	echo 'Usage: npm run toolforge <language>'
	echo 'Example: npm run toolforge zh-yue'
	exit 1
fi
if ! [ -f "config/${1}wiki.json" ]
then
	echo "Fetching parser configuration for ${1}wiki"
	npx getParserConfig "${1}wiki" "https://$1.wikipedia.org/w/"
fi
target="${1//-/_}wiki" # example: zh_yuewiki
path="/public/dumps/public/$target/latest"
node parser.js "$1" "$path/$target-latest-pages-articles.xml.bz2"
if (( $? == 0))
then
	echo 'Starting report generation'
	node report.js "$1"
fi
