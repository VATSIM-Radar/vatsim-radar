import { join } from 'path';
import { existsSync, readFileSync, mkdirSync, rmSync, unlinkSync, writeFileSync } from 'fs';

const data = join(process.cwd(), 'app/data/custom');

if (!existsSync(data)) mkdirSync(data, { recursive: true });

export function getLocalText(filename: string) {
    const path = join(data, filename);
    if (existsSync(path)) return readFileSync(path, 'utf-8');
    return null;
}

export function getLocalFile(filename: string) {
    const path = join(data, filename);
    if (existsSync(path)) return readFileSync(path);
    return null;
}

export function hasLocalFile(filename: string) {
    const path = join(data, filename);
    return existsSync(path);
}

export function saveLocalFile(obj: Buffer | string, filename: string) {
    const path = join(data, filename);
    writeFileSync(path, obj, 'utf-8');
}

export function removeLocalFile(filename: string) {
    const path = join(data, filename);
    if (existsSync(path)) unlinkSync(path);
}


export function removeLocalFolder() {
    rmSync(data, { force: true, recursive: true });
    mkdirSync(data);
}

export function isDebug() {
    return process.env.VR_DEBUG === '1' || import.meta.dev || process.env.NODE_ENV === 'development';
}
