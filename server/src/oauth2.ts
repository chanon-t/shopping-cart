import * as mongodb from 'mongodb';
import * as express from 'express';
import * as oauth2 from 'oauth2-server';
import * as crypto from 'crypto';

import { Long } from 'mongodb';

import { Translation as t } from './translate/translation';
import { Config } from './config';

import { ClientModel } from './models/client.model';
import { TokenModel } from './models/token.model';
import { ErrorModel } from './models/error.model';
import { UserModel } from './models/user.model';
import { ErrorCode } from './constants';

export class OAuth2 {
    oauth2server: oauth2;

    tokenExpire: number = Config.ExpiresIn; // 1 hours
    refreshTokenExpire: number = Config.ExpiresIn * 24 * 60; // 60 days

    tokenModel: mongodb.Collection;
    clientModel: mongodb.Collection;
    userModel: mongodb.Collection;

    oauth2Model: oauth2.RefreshTokenModel | oauth2.PasswordModel = {
        getClient: async (
            clientId: string,
            clientSecret: string,
        ): Promise<oauth2.Client | oauth2.Falsey> => {
            let client: ClientModel = await this.clientModel.findOne({
                id: clientId,
                scr: clientSecret
            });

            if (!client) {
                throw new oauth2.OAuthError('client_not_found');
            }

            return {
                "grants" : client.grts,
                "id" : clientId
            };
        },
        saveToken: async (
            token: oauth2.Token,
            client: oauth2.Client,
            user: oauth2.User,
        ): Promise<oauth2.Token> => {      
            token.user = {};
            token.client = {
                id: client.id,
                grants: client.grants
            };

            let tokenData: TokenModel = {
                at: token.accessToken,
                ate: token.accessTokenExpiresAt,
                rt: token.refreshToken,
                rte: token.refreshTokenExpiresAt,
                cln: token.client,
                uid: Long.fromNumber(user.id)
            };
            let result: mongodb.InsertOneWriteOpResult<any> = await this.tokenModel.insertOne(tokenData);
            if (result.insertedCount == 0) {
                throw new oauth2.OAuthError('token_not_saved');
            }

            return token;
        },
        getAccessToken: async (accessToken: string): Promise<oauth2.Token> => {
            let token: TokenModel = await this.tokenModel.findOne({
                at: accessToken
            });

            if (!token) {
                throw new oauth2.OAuthError('unauthorized', {
                    statusCode: 401
                });
            }

            let user: UserModel = await this.userModel.findOne({
                id: token.uid,
                atv: true
            });

            if (!user) {
                throw new oauth2.OAuthError('invalid_user');
            }

            return {
                accessToken: accessToken,
                accessTokenExpiresAt: token.ate,
                refreshToken: token.rt,
                refreshTokenExpiresAt: token.rte,
                client: token.cln,
                user: {
                    id: user.id,
                    em: user.em,
                    nam: user.nam
                }
            };
        },
        getRefreshToken: async (refreshToken: string): Promise<oauth2.RefreshToken> => {
            let token: TokenModel = await this.tokenModel.findOne({
                rt: refreshToken
            });

            if (!token) {
                throw new oauth2.OAuthError('unauthorized', {
                    statusCode: 401
                });
            }

            let user: UserModel = await this.userModel.findOne({
                id: token.uid,
                atv: true
            });

            if (!user) {
                throw new oauth2.OAuthError('invalid_user');
            }

            return {
                refreshToken: token.rt,
                refreshTokenExpiresAt: token.rte,
                client: token.cln,
                user: {
                    id: user.id
                }
            };
        },
        revokeToken: async (token: oauth2.Token | oauth2.RefreshToken): Promise<boolean> => {
            let result: mongodb.DeleteWriteOpResultObject = await this.tokenModel.deleteOne({
                rt: token.refreshToken
            });

            return result.deletedCount > 0;
        },
        verifyScope: async (
            token: oauth2.Token,
            scope: string,
        ): Promise<boolean> => {
            return true;
        },
        getUser: async (username: string, password: string): Promise<oauth2.User> => {
            let user: UserModel = await this.userModel.findOne({
                em: username
            });

            if (!user) {
                throw new oauth2.OAuthError('invalid_username_or_password');
            }

            if (user.atv != true) {
                throw new oauth2.OAuthError('user_not_verified');
            }

            if (password.startsWith('hash:')) {
                let hashPassword: string = password.replace(/^hash:/, '');
                if (user.pwd != hashPassword) {
                    throw new oauth2.OAuthError('invalid_username_or_password');
                }
            }            
            else if (user.pwd !== this.hashPassword(password, user.pwd)) {
                throw new oauth2.OAuthError('invalid_username_or_password');
            }

            return user;
        }
    }

    constructor(router: express.Router, db: mongodb.Db) {
        this.oauth2server = new oauth2({
            model: this.oauth2Model,
            accessTokenLifetime: this.tokenExpire,
            refreshTokenLifetime: this.refreshTokenExpire
        });

        this.tokenModel = db.collection('tokens');
        this.clientModel = db.collection('clients');
        this.userModel = db.collection('users');

        router.post('/oauth/token', async (req: express.Request, res: express.Response) => {
            var request = new oauth2.Request(req);
            var response = new oauth2.Response(res);

            try {
                let token: oauth2.Token = await this.oauth2server.token(request, response);
            
                res.json({
                    access_token: token.accessToken,
                    refresh_token: token.refreshToken,
                    expires_in: this.tokenExpire
                });
            } catch (err) {
                res.status(err.code || 500).json(err);
            };
        });
    }

    hashPassword = (password: string, passwordHash: string): string => {
        let hashBuff = Buffer.from(passwordHash, 'base64');
        let version = Buffer.alloc(1) // 1 zero-filled byte
        let salt = Buffer.from(new Uint8Array(hashBuff.slice(1, 17))); //crypto.randomBytes(16)
        let hash = crypto.pbkdf2Sync(password, salt, 1000, 32, 'sha1')
        return Buffer.concat([version, salt, hash]).toString('base64');
    }

    authenticate = async (req: express.Request & {user: UserModel}, res: express.Response, next: express.NextFunction) => {
        const request = new oauth2.Request(req);
        const response = new oauth2.Response(res);

        try {
            const token: oauth2.Token = await this.oauth2server.authenticate(request, response);
            req.user = token.user;
            next();
        } catch (err) {
            let errorModel: ErrorModel = new ErrorModel(t.translate(err.message, req.query.lang as string), ErrorCode.UNAUTHORIZED);
            if (err.name == 'unauthorized_request') {
                errorModel = new ErrorModel(t.translate('unauthorized', req.query.lang as string), ErrorCode.UNAUTHORIZED);
            }
            else if (err.name == 'invalid_token') {
                errorModel = new ErrorModel(t.translate('token_expired', req.query.lang as string), ErrorCode.TOKEN_EXPIRED);
            }
            else if (err.name == 'server_error') {
                errorModel = new ErrorModel(t.translate('server_error'), ErrorCode.SERVER_ERROR);
            }
            res.status(err.statusCode).json(errorModel);
        }
    }
}