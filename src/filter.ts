const files = process.argv.slice(2)
	.map(file => [
		file,
		.../\.xml-p(\d+)p(\d+)\.bz2$/u.exec(file)!.slice(1).map(Number),
	] as [string, number, number])
	.sort(([, a1, a2], [, b1, b2]) => a1 - b1 || a2 - b2)
	.filter(([, a], i, arr) => a !== arr[i + 1]?.[1])
	.map(([file]) => file)
	.join(' ');
console.log(files);
