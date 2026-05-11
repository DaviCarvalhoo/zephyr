import util from 'node:util';

const isTTYout = Boolean(process.stdout.isTTY);
const isTTYerr = Boolean(process.stderr.isTTY);

const colors = {
    green: isTTYout ? '\x1b[32m' : '',
    yellow: isTTYout ? '\x1b[33m' : '',
    red: isTTYerr ? '\x1b[31m' : '',
    cyan: isTTYout ? '\x1b[36m' : '',
    reset: (isTTYout || isTTYerr) ? '\x1b[0m' : ''
};

function ts(): string {
    return new Date().toISOString();
}

// `data` is typed loosely (LoggerData) so call sites can pass either a
// structured payload (preferred — `{ userId, action }`) or a bare
// Error / unknown value caught by a try/catch. The formatter normalizes
// both into something readable.
type LoggerData =
    | Record<string, unknown>
    | Error
    | unknown;

function fmt(data?: LoggerData): string {
    if (data === undefined || data === null) {
        return '';
    }
    if (data instanceof Error) {
        return ' ' + util.inspect(
            { error: data.message, stack: data.stack },
            { depth: 4, colors: isTTYout }
        );
    }
    return ' ' + util.inspect(data, { depth: 4, colors: isTTYout });
}

const logger = {
    info(message: string, data?: LoggerData): void {
        console.log(
            `${ts()} ~ ${colors.green}{info}${colors.reset} `
            + `${message}${fmt(data)}`
        );
    },

    warn(message: string, data?: LoggerData): void {
        console.warn(
            `${ts()} ~ ${colors.yellow}{warn}${colors.reset} `
            + `${message}${fmt(data)}`
        );
    },

    error(message: string | Error, data?: LoggerData): void {
        if (message instanceof Error) {
            console.error(
                `${ts()} ~ ${colors.red}!error!${colors.reset} `
                + `${message.message}${fmt(data)}`
            );
            if (message.stack) {
                console.error(message.stack);
            }
            return;
        }
        console.error(
            `${ts()} ~ ${colors.red}!error!${colors.reset} `
            + `${message}${fmt(data)}`
        );
    },

    debug(message: string, data?: LoggerData): void {
        if (process.env.DEBUG) {
            console.debug(
                `${ts()} ~ ${colors.cyan}{debug}${colors.reset} `
                + `${message}${fmt(data)}`
            );
        }
    }
};

export default logger;
