"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const cluster_1 = __importDefault(require("cluster"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const os_1 = __importDefault(require("os"));
const perf_hooks_1 = require("perf_hooks");
const chalk_1 = __importDefault(require("chalk"));
const unbzip2_stream_1 = __importDefault(require("unbzip2-stream"));
const xml_stream_1 = __importDefault(require("xml-stream"));
const wikilint_1 = __importDefault(require("wikilint"));
const common_1 = require("@bhsd/common");
const util_1 = require("./util");
const [, , site, dir] = process.argv, target = `${site}wiki`, resultDir = path_1.default.join(__dirname, 'results');
wikilint_1.default.config = target;
if (cluster_1.default.isPrimary) {
    if (!fs_1.default.existsSync(resultDir)) {
        fs_1.default.mkdirSync(resultDir);
    }
    const dumpDir = dir.replace(/^~/u, os_1.default.homedir()), files = fs_1.default.readdirSync(dumpDir)
        .filter(file => file.startsWith(target.replaceAll('-', '_')))
        .map(file => {
        const filePath = path_1.default.join(dumpDir, file);
        return [filePath, fs_1.default.statSync(filePath).size];
    })
        .sort(([, a], [, b]) => b - a), 
    // eslint-disable-next-line n/no-unsupported-features/node-builtins
    workers = new Array(Math.min(os_1.default.availableParallelism(), files.length)).fill(undefined)
        .map(() => cluster_1.default.fork());
    let i = 0, j = 0, n = 0;
    console.time('parse');
    for (; i < workers.length; i++) {
        const worker = workers[i];
        worker.on('message', count => {
            n += count;
            if (i < files.length) {
                worker.send([files[i], i]);
                i++;
            }
            else {
                worker.disconnect();
                j++;
                if (j === workers.length) {
                    console.timeEnd('parse');
                    console.log(chalk_1.default.green(`Parsed ${n} pages in total`));
                    process.exit(); // eslint-disable-line n/no-process-exit
                }
            }
        }).send([files[i], i]);
    }
}
else {
    process.on('message', ([[file], j]) => {
        const stream = new xml_stream_1.default(fs_1.default.createReadStream(file).pipe((0, unbzip2_stream_1.default)())), results = fs_1.default.createWriteStream(path_1.default.join(resultDir, `${site}-${j}.json`)), ignore = new Set(['no-arg', 'url-encoding', 'h1', 'var-anchor']);
        let i = 0, failed = 0, comma = '', worst;
        stream.preserve('text', true);
        results.write('{');
        results.on('close', () => {
            process.send(i);
        });
        const stop = () => {
            console.log();
            console.timeEnd(`parse ${file}`);
            console.log(chalk_1.default.green(`Parsed ${i} pages from ${file}`));
            if (failed) {
                console.error(chalk_1.default.red(`${failed} pages failed to parse`));
            }
            if (worst) {
                console.info(chalk_1.default.yellow(`Worst page: ${worst.title} (${worst.duration.toFixed(3)} ms)`));
            }
            results.write('\n}');
            results.end();
        };
        const newEntry = (title, errors) => {
            results.write(`${comma}\n${JSON.stringify(title)}: ${JSON.stringify(errors, null, '\t')}`);
            comma ||= ',';
        };
        console.time(`parse ${file}`);
        stream.on('endElement: page', ({ title, ns, revision: { model, text: { $text } } }) => {
            if (model === 'wikitext' && $text && ns !== '10') {
                (0, common_1.refreshStdout)(`${i++} ${title}`);
                try {
                    const start = perf_hooks_1.performance.now(), errors = wikilint_1.default.parse($text, ns === '828').lint()
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
                            excerpt: $text.slice(e.startIndex, e.endIndex).slice(0, util_1.MAX),
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
        });
        stream.on('end', stop);
    });
}
