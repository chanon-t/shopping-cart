import { Config } from './config';

import * as winston from 'winston';
const DailyRotateFile = require('winston-daily-rotate-file');

export class Logger {
    public static info(text: string): void {
        winston.createLogger({
            transports: [
                new (winston.transports.Console)()
            ]
        }).info(text);
    };

    public static log(data: any): void {
        winston.createLogger({
            transports: [
                new DailyRotateFile({
                    filename: '%DATE%.log',
                    datePattern: 'YYYYMMDD',
                    dirname: Config.LogDir
                })
            ]
        }).info(data);
    };

    public static debug(text: string): void {
        winston.createLogger({
            transports: [
                new DailyRotateFile({
                    filename: 'debug-%DATE%.log',
                    datePattern: 'YYYYMMDD',
                    dirname: Config.LogDir
                })
            ]
        }).info(text);
    };

    public static error(text: string): void {
        winston.createLogger({
            transports: [
                new DailyRotateFile({
                    filename: 'error-%DATE%.log',
                    datePattern: 'YYYYMMDD',
                    dirname: Config.LogDir
                })
            ]
        }).error(text);
    };
}