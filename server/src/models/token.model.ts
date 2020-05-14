import { Long } from 'mongodb';
import { Client } from 'oauth2-server';

export class TokenModel {
    at?: string; // access_token
    ate?: Date; // access_token_expires
    rt?: string; // refresh_token
    rte?: Date; // refresh_token_expires
    cln?: Client; // client
    uid?: Long; // user_id
}