"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const os_1 = __importDefault(require("os"));
const perf_hooks_1 = require("perf_hooks");
const chalk_1 = __importDefault(require("chalk"));
const unbzip2_stream_1 = __importDefault(require("unbzip2-stream"));
const xml_stream_1 = __importDefault(require("xml-stream"));
const wikilint_1 = __importDefault(require("wikilint"));
const common_1 = require("@bhsd/common");
const n = Number(process.argv[4]) || Infinity, [, , site, file, , restart] = process.argv;
wikilint_1.default.config = `${site}wiki`;
if (!fs_1.default.existsSync('results')) {
    fs_1.default.mkdirSync('results');
}
const stream = new xml_stream_1.default(fs_1.default.createReadStream(file.replace(/^~/u, os_1.default.homedir())).pipe((0, unbzip2_stream_1.default)())), output = path_1.default.join('results', `${site}.json`);
let old;
try {
    old = require(`./${output}`); // eslint-disable-line @typescript-eslint/no-require-imports
}
catch { }
const time = old?.['#timestamp'], last = time && new Date(time), results = fs_1.default.createWriteStream(output, { flags: restart ? 'a' : 'w' }), ignore = new Set(['no-arg', 'url-encoding', 'h1', 'var-anchor']);
let i = 0, latest = last, failed = 0, comma = restart ? ',' : '', stopping = false, restarted = !restart, worst;
stream.preserve('text', true);
if (!restart) {
    results.write('{');
}
results.on('close', () => {
    process.exit(); // eslint-disable-line n/no-process-exit
});
const stop = () => {
    stopping = true;
    console.log();
    console.timeEnd('parse');
    console.log(chalk_1.default.green(`Parsed ${i} pages`));
    if (failed) {
        console.error(chalk_1.default.red(`${failed} pages failed to parse`));
    }
    if (worst) {
        console.info(chalk_1.default.yellow(`Worst page: ${worst.title} (${worst.duration.toFixed(3)} ms)`));
    }
    results.write(`${comma}\n"#timestamp": ${JSON.stringify(latest)}\n}`);
    results.close();
};
const newEntry = (title, errors) => {
    results.write(`${comma}\n${JSON.stringify(title)}: ${JSON.stringify(errors, null, '\t')}`);
    comma ||= ',';
};
console.time('parse');
stream.on('endElement: page', ({ title, ns, revision: { model, timestamp, text: { $text } } }) => {
    if (i === n) {
        if (!stopping) {
            stop();
        }
    }
    else if (restarted && model === 'wikitext' && $text) {
        (0, common_1.refreshStdout)(`${i++} ${title}`);
        const date = new Date(timestamp);
        if (last && date <= last) {
            const previous = old[title];
            if (previous) {
                newEntry(title, previous);
            }
        }
        else {
            latest = !latest || date > latest ? date : latest;
            try {
                const start = perf_hooks_1.performance.now(), errors = wikilint_1.default.parse($text, ns === '10').lint()
                    .filter(({ severity, rule }) => severity === 'error' && !ignore.has(rule)), duration = perf_hooks_1.performance.now() - start;
                if (errors.length > 0) {
                    newEntry(title, errors.map(({ severity, suggestions, fix, ...e }) => ({
                        ...e,
                        ...suggestions && {
                            suggestions: suggestions.map(action => ({
                                ...action,
                                original: $text.slice(...action.range),
                            })),
                        },
                        ...fix && { fix: { ...fix, original: $text.slice(...fix.range) } },
                        excerpt: $text.slice(e.startIndex, e.endIndex),
                    })));
                }
                if (!worst || duration > worst.duration) {
                    worst = { title, duration };
                }
            }
            catch (e) {
                console.error(chalk_1.default.red(`Error parsing ${title}`), e);
                failed++;
            }
        }
    }
    else if (title === restart) {
        restarted = true;
    }
});
stream.on('end', stop);
