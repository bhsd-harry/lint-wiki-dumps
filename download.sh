#!/usr/local/bin/bash
target="${1//-/_}wiki" # example: zh_yuewiki
path="https://dumps.wikimedia.org/$target/latest/"
files=$( \
	curl -s "$path" \
	| grep -o "href=\"$target-latest-pages-articles[0-9].*\.bz2\">" \
	| gsed "s|href=\"|$path|;s|\">||" \
)
filtered=$(node filter.js $files)
if (( ${#filtered} < 2 ))
then
	file="$path/$target-latest-pages-articles.xml.bz2"
	curl --progress-bar --output-dir "$2" -O "$file"
	exit 20
else
	curl --progress-bar --output-dir "$2" --remote-name-all $filtered
fi
