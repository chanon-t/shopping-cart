import * as mongodb from 'mongodb';
import * as express from 'express';
import * as request from 'request-promise';
import * as baseApi from '../base.api';
import * as crypto from 'crypto';

import { Translation as t } from '../../translate/translation';

import { UserModel } from '../../models/user.model';
import { ErrorModel } from '../../models/error.model';
import { OAuth2 } from '../../oauth2';
import { Config } from '../../config';
import { Logger } from '../../logger';
import { EmailModel } from '../../models/email.model';

export class UserApi {
    private users: mongodb.Collection;
    private db: mongodb.Db;

    constructor(oauth2: OAuth2, router: express.Router, db: mongodb.Db) {
        this.db = db;
        
        this.users = db.collection('users');

        router.get('/me', oauth2.authenticate, (req: express.Request & { user: UserModel }, res: express.Response) => {
            this.getUser(req, res);
        });

        router.post('/login', (req, res) => {
            this.logIn(req, res);
        });

        router.put('/users/activate', (req, res) => {
            this.activate(req, res);
        });

        router.post('/refresh-token', (req, res) => {
            this.refreshToken(req, res);
        });

        router.post('/signup', (req, res) => {
            this.signUp(req, res);
        });
    }

    createPassword(password: string): string {
        let version = Buffer.alloc(1) // 1 zero-filled byte
        let salt = crypto.randomBytes(16);
        let hash = crypto.pbkdf2Sync(password, salt, 1000, 32, 'sha1')
        return Buffer.concat([version, salt, hash]).toString('base64');
    }

    async getUser(req: express.Request & { user: UserModel }, res: express.Response) {
        res.json(UserModel.getObject(req.user));
    }

    async activate(req: express.Request, res: express.Response) {
        let bd: any = req.body;        
        let user: any = await this.users.findOne({ _id: new mongodb.ObjectId(bd.id), atk: bd.key });
        if (user == null) {
            res.json(new ErrorModel(t.translate('invalid_activate_key', req.query.lang as string)));
        }
        else if (user.atv == true) {
            res.json(new ErrorModel(t.translate('this_user_already_activate', req.query.lang as string)));
        }
        else {
            await this.users.updateOne({ _id: new mongodb.ObjectId(bd.id) }, { $set: { atv: true, edt: new Date() } });
            res.json({ success: true });
        }
    }

    editUser(req: express.Request, res: express.Response) {
        let bd: any = req.body;
        this.users.updateOne({ id: +req['user'].id }, { $set: { name: bd.name } })            
            .then(() => res.json({ success: true }));
    }

    async logIn(req: express.Request, res: express.Response) {
        let bd = req.body;

        try {
            let authenResult: request.RequestPromise = await request.post({
                url: (req.protocol + '://' + req.get('host')) + '/oauth/token',
                json: true,
                headers: {
                    'content-type': 'application/x-www-form-urlencoded'
                },
                form: {
                    "grant_type": "password",
                    "username": bd.email,
                    "password": bd.password,
                    "client_id": req.query.client_id,
                    "client_secret": req.query.client_secret
                }
            });

            res.json(authenResult);
        } catch (err) {
            if (err.error) {
                let error: any = new ErrorModel(t.translate(err.error.message, req.query.lang as string));
                res.status(err.statusCode).json(error);
            }
        }
    }

    async logInSocial(req: express.Request, res: express.Response) {
        let bd: any = req.body;

        let url: string;
        if (bd.provider == 'facebook') {
            url = 'https://graph.facebook.com/v4.0/me?fields=id,name,email&access_token=' + bd.token;
        }
        else if (bd.provider == 'google') {
            url = 'https://content.googleapis.com/oauth2/v2/userinfo?fields=id,name,email,picture&access_token=' + bd.token;
        }

        let authenData: any = {};
        request.get(url)
            .then(data => {
                data = JSON.parse(data);
                if (!data.error) {
                    if (bd.provider == 'facebook') {
                        data.picture = 'https://graph.facebook.com/' + data.id + '/picture?type=large';
                    }

                    authenData.provider = {
                        id: data.id,
                        email: data.email,
                        name: data.name,
                        picture: data.picture,
                        provider: bd.provider
                    };
                    return this.users.findOne({ em: authenData.provider.email, atv: true });
                }
                else {
                    res.json(data);
                }
            })
            .then(data => {
                if (data) {
                    authenData.user = data;
                    let updateData: any = {};
                    if (!authenData.user.lgs || (authenData.user.lgs && authenData.user.lgs.findIndex((o: any) => o.pv == bd.provider && o.id == authenData.provider.id) == -1)) {
                        updateData['$push'] = {
                            lgs: {
                                pv: bd.provider,
                                id: authenData.provider.id
                            }
                        };
                        return this.users.updateOne({ _id: authenData.user._id }, updateData);
                    }
                }
                else {
                    throw {
                        data: authenData.provider,
                        error: {
                            code: '001'
                        }
                    };
                }
            })
            .then(() => {
                req.body.email = authenData.user.em;
                req.body.password = "hash:" + authenData.user.pwd;
                this.logIn(req, res);
            })
            .catch((data: any) => {
                if (typeof data.error == 'string') {
                    res.json(JSON.parse(data.error));
                }
                else {
                    res.json(data);
                }
            });
    }

    async refreshToken(req: express.Request, res: express.Response) {
        let bd = req.body;

        try {
            let authenResult: request.RequestPromise = await request.post({
                url: (req.protocol + '://' + req.get('host')) + '/oauth/token',
                json: true,
                headers: {
                    'content-type': 'application/x-www-form-urlencoded'
                },
                form: {
                    "grant_type": "refresh_token",
                    "refresh_token": bd.refresh_token,
                    "client_id": req.query.client_id,
                    "client_secret": req.query.client_secret
                }
            });

            res.json(authenResult);
        } catch (err) {
            if (err.error) {
                let errorModel: ErrorModel = new ErrorModel(t.translate(err.error.message, req.query.lang as string));
                if (err.error.name == 'invalid_grant') {
                    errorModel = new ErrorModel(t.translate('token_expired', req.query.lang as string), 103);
                }
                res.status(err.statusCode).json(errorModel);
            }
        }
    }

    signUp(req: express.Request, res: express.Response) {
        let bd: any = req.body;

        let data: UserModel = {
            id: null,
            pwd: this.createPassword(bd.password),
            em: bd.email,
            nam: bd.name,
            cdt: new Date()
        };

        baseApi.checkDuplicate(this.users, 'em', req.body.email)
            .then(dup => {
                if (dup) {
                    throw new ErrorModel(
                        t.translate('this_email_already_used', req.query.lang as string)
                    );
                }
                else {
                    return baseApi.getNextSeq(this.db, this.users.collectionName);
                }
            })
            .then(id => {
                data.id = id;
                if (bd.authen_provider) {
                    data.atv = true;
                    data.lgs = [{
                        pv: bd.authen_provider.provider,
                        id: bd.authen_provider.id
                    }];
                }
                else {
                    data.atk = baseApi.randomString(48);
                }
                return this.users.insertOne(data);
            })
            .then((result: mongodb.InsertOneWriteOpResult<any>) => {                
                let emailData: EmailModel = new EmailModel(
                    data.em, 
                    t.translate('confirm_email_subject'),
                    {
                        path: '/template/confirm-email.jade',
                        data: {
                            success_message: t.translate('confirm_email_message'),
                            confirm_email: t.translate('confirm_email_button'),
                            confirm_url: Config.ClientWebUrl + '/confirm-email?id=' + result.insertedId.toString() + '&key=' + data.atk
                        }
                    }
                );
                baseApi.sendEmail(emailData)
                    .then(data => {
                        Logger.log({
                            success: true,
                            email: req.body.email,
                            result: data
                        });
                    })
                    .catch(data => {
                        Logger.log({
                            success: false,
                            email: req.body.email,
                            result: data
                        });
                    });
                res.json({ 
                    success: result.result.ok == 1 
                });
            })
            .catch(err => {
                res.json(err);
            });
    }
}