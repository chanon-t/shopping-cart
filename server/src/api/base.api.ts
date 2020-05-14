import * as mongodb from 'mongodb';
import * as fileUpload from 'express-fileupload';
import * as nodemailer from 'nodemailer';
import * as fs from 'fs';
import * as jade from 'jade';

import { Config } from '../config';
import { EmailModel } from '../models/email.model';

export function randomString(length: number): string {
    var text = "";
    var possible = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

    for (var i = 0; i < length; i++)
        text += possible.charAt(Math.floor(Math.random() * possible.length));

    return text;
}

export function pageRange(page: number, size: number): any {
    let limit: number = Math.min(100, (size > 0) ? size : 10);
    let start: number = Math.max(0, ((page || 1) - 1) * limit);
    return {
        start: start,
        limit: limit
    }
}

export function generateFileName(fileName: string): string {
    return new Date().getTime() + '_' + this.randomString(8) + '-' + fileName;
}

export async function getNextSeq(db: mongodb.Db, cname: string): Promise<number> {
    let opts: mongodb.FindOneAndReplaceOption = {
        upsert: true,
        returnOriginal: false
    };
    let coll: mongodb.Collection = db.collection('counters');
    let data: mongodb.FindAndModifyWriteOpResultObject<any> = await coll.findOneAndUpdate({ _id: cname }, { $inc: { seq: mongodb.Long.fromNumber(1) } }, opts)
    return +data.value.seq;
}

export async function getRunningKey(db: mongodb.Db, collName: string, ref: string): Promise<string> {
    let runningKey: string = null;
    let counters: mongodb.Collection = db.collection('counters');

    let getRunningKey = async () => {
        let result: mongodb.FindAndModifyWriteOpResultObject<any> = await counters.findOneAndUpdate({
            _id: collName
        }, [{ 
            $set: { 
                ref: ref,
                seq: {
                    $cond: { 
                        if: { 
                            $eq: ["$ref", ref] 
                        }, 
                        then: {
                            $add: ["$seq", 1]
                        }, 
                        else: 1 
                    }
                }
            }
        }], {
            upsert: true,
            returnOriginal: false
        });

        runningKey = ref + ("000000" + result.value.seq).slice(-6);
    };
    await getRunningKey();

    return runningKey;
}

export async function checkDuplicate(coll: mongodb.Collection, field: string, value: any, params: any = null): Promise<any> {
    let filter = {};
    filter[field] = { $regex: "^" + value + "$", $options: "i" };
    if (typeof params == 'object') {
        Object.assign(filter, params);
    }
    const count = await coll.countDocuments(filter);
    return count > 0;
}

export function getFiles(files: (fileUpload.UploadedFile | fileUpload.UploadedFile[])): fileUpload.UploadedFile[] {
    let f: fileUpload.UploadedFile[] = [];
    if (files.constructor === Array) {
        f = (<fileUpload.UploadedFile[]>files);
    }
    else {
        f.push((<fileUpload.UploadedFile>files));
    }
    return f;
}

export function upload(files: fileUpload.UploadedFile[], dir: string): Promise<any> {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir);
    }

    let names: string[] = [];
    return new Promise((resolve, reject) => {
        let upload = (index: number) => {
            let i: fileUpload.UploadedFile = files[index];
            if (files[index]) {
                let fileName = this.generateFileName(i.name);
                i.mv(dir + '/' + fileName, (err) => {
                    if (err) {
                        reject(err);
                    }
                    names.push('/' + fileName);
                    upload(index + 1);
                });
            }
            else {
                resolve(names);
            }
        }
        upload(0);
    });
}

export function sendEmail(options: EmailModel): Promise<any> {
    let html: string;
    if (typeof options.message == 'string') {
        html = options.message;
    }
    else {
        let data: string = fs.readFileSync(Config.DataDir + options.message.path, "utf8");
        let fn = jade.compile(data);
        html = fn(options.message.data);
    }

    let transport = nodemailer.createTransport({
        host: Config.SmtpHost,
        port: Config.SmtpPort,
        auth: {
            user: Config.AuthUser,
            pass: Config.AuthPassword
        }
    });

    let emailData: any = {
        from: Config.SenderAddress,
        to: options.to,
        subject: options.title, 
        html: html
    };

    return new Promise<any>((resolve, reject) => {
        transport.sendMail(emailData, function (err, info) {
            if (err) {
                reject(err);
            } else {
                resolve(info);
            }
        });
    });
}