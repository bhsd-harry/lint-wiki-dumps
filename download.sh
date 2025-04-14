#!/usr/local/bin/bash
path="https://dumps.wikimedia.org/$1/latest/"
files=$( \
	curl -s "$path" \
	| grep -o "href=\"$1-latest-pages-articles[0-9].*\.bz2\">" \
	| gsed "s|href=\"|$path|;s|\">||" \
)
filtered=$(node filter.js $files)
if (( ${#filtered} < 2 ))
then
	file="$path/$1-latest-pages-articles.xml.bz2"
	curl --output-dir "$2" -O "$file"
	exit 1
else
	curl --output-dir "$2" --remote-name-all $filtered
fi
