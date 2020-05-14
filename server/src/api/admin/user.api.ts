import * as mongodb from 'mongodb';
import * as express from 'express';

import { Translation as t } from '../../translate/translation';

import { ErrorModel } from '../../models/error.model';

export class UserApi {
    private users: mongodb.Collection;

    constructor(router: express.Router, db: mongodb.Db) {
        this.users = db.collection('users');

        router.put('/admin/users/activate', (req: express.Request, res: express.Response) => {
            this.activateUser(req, res);
        });
    }

    async activateUser(req: express.Request, res: express.Response) {    
        let user: any = await this.users.findOne({ em: req.query.email });
        if (user == null) {
            res.json(new ErrorModel(t.translate('invalid_activate_key', req.query.lang as string)));
        }
        else if (user.atv == true) {
            res.json(new ErrorModel(t.translate('this_user_already_activate', req.query.lang as string)));
        }
        else {
            await this.users.updateOne({ _id: user._id }, { $set: { atv: true, edt: new Date() } });
            res.json({ success: true });
        }
    }
}