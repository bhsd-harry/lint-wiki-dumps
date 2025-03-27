"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getErrors = exports.getTimestamp = exports.MAX = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
exports.MAX = 100;
const files = new Map(), resultDir = path_1.default.join(__dirname, 'results');
const getFile = (site) => {
    if (files.has(site)) {
        return files.get(site);
    }
    const filePath = path_1.default.join(resultDir, `${site}.json`);
    if (!fs_1.default.existsSync(filePath)) {
        files.set(site, undefined);
        return undefined;
    }
    const file = fs_1.default.readFileSync(filePath, 'utf8');
    files.set(site, file);
    return file;
};
const getTimestamp = (site) => {
    const file = getFile(site);
    if (!file) {
        return undefined;
    }
    const i = file.indexOf('"#timestamp": "') + 15;
    return file.slice(i, file.indexOf('"', i));
};
exports.getTimestamp = getTimestamp;
const getErrors = (site, page) => {
    const file = getFile(site);
    if (!file) {
        return undefined;
    }
    const str = JSON.stringify(page), i = file.indexOf(`${str}: [`);
    if (i === -1) {
        return undefined;
    }
    const j = i + str.length + 2;
    return JSON.parse(file.slice(j, file.indexOf('\n]', j) + 2));
};
exports.getErrors = getErrors;
