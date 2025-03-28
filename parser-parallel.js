"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const cluster_1 = __importDefault(require("cluster"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const os_1 = __importDefault(require("os"));
const chalk_1 = __importDefault(require("chalk"));
const common_1 = require("@bhsd/common");
const util_1 = require("./util");
const [, , site, dir] = process.argv, target = `${site}wiki`;
if (cluster_1.default.isPrimary) {
    (0, util_1.init)();
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
        const stream = (0, util_1.getXmlStream)(file), results = fs_1.default.createWriteStream(path_1.default.join(util_1.resultDir, `${site}-${j}.json`)), processor = new util_1.Processor(site, results);
        let i = 0;
        results.write('{');
        results.on('close', () => {
            process.send(i);
        });
        const stop = () => {
            processor.stop(`parse ${file}`, `Parsed ${i} pages from ${file}`);
        };
        console.time(`parse ${file}`);
        stream.on('endElement: page', ({ title, ns, revision: { model, timestamp, text: { $text } } }) => {
            if (model === 'wikitext' && $text && ns !== '10') {
                (0, common_1.refreshStdout)(`${i++} ${title}`);
                processor.lint($text, ns, title, new Date(timestamp));
            }
        });
        stream.on('end', stop);
    });
}
