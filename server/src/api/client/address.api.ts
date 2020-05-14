import * as mongodb from 'mongodb';
import * as express from 'express';

import { OAuth2 } from '../../oauth2';
import { Config } from '../../config';

import { Translation as t } from '../../translate/translation';

import { UserModel } from '../../models/user.model';
import { ProvinceModel, DistrictModel, AddressModel, PostcodeModel } from '../../models/address.model';
import { PageModel } from '../../models/page.model';

import * as baseApi from '../base.api';
import { ErrorModel } from '../../models/error.model';

export class AddressApi {
    private provinces: mongodb.Collection;
    private districts: mongodb.Collection;
    private postcodes: mongodb.Collection;
    private addresses: mongodb.Collection;
    private db: mongodb.Db;

    constructor(oauth2: OAuth2, router: express.Router, db: mongodb.Db) {
        this.db = db;

        this.provinces = db.collection('provinces');
        this.districts = db.collection('districts');
        this.postcodes = db.collection('postcodes');
        this.addresses = db.collection('addresses');

        router.get('/provinces', (req: express.Request, res: express.Response) => {
            this.getProvinces(req, res);
        });

        router.get('/provinces/:province_id/districts', (req: express.Request, res: express.Response) => {
            this.getDistrictsByProvinceId(req, res);
        });

        router.get('/postcodes', (req: express.Request, res: express.Response) => {
            this.getPostcodes(req, res);
        });

        router.get('/addresses', oauth2.authenticate, (req: express.Request & { user: UserModel }, res: express.Response) => {
            this.getAddresses(req, res);
        });

        router.get('/addresses/default', oauth2.authenticate, (req: express.Request & { user: UserModel }, res: express.Response) => {
            this.getDefaultAddress(req, res);
        });

        router.get('/addresses/:id', oauth2.authenticate, (req: express.Request & { user: UserModel }, res: express.Response) => {
            this.getAddressById(req, res);
        });

        router.post('/addresses', oauth2.authenticate, (req: express.Request & { user: UserModel }, res: express.Response) => {
            this.createAddress(req, res);
        });

        router.put('/addresses/:id', oauth2.authenticate, (req: express.Request & { user: UserModel }, res: express.Response) => {
            this.updateAddress(req, res);
        });

        router.delete('/addresses/:id', oauth2.authenticate, (req: express.Request & { user: UserModel }, res: express.Response) => {
            this.deleteAddress(req, res);
        });

        router.put('/addresses/:id/default', oauth2.authenticate, (req: express.Request & { user: UserModel }, res: express.Response) => {
            this.maskAsDefault(req, res);
        });
    }

    async getProvinces(req: express.Request, res: express.Response) {
        let data: ProvinceModel[] = await this.provinces.find({ iatv: { $ne: true } })
            .project({ _id: 0, id: 1, nam: 1 })
            .sort({ "nam._srt": 1 })
            .toArray();
        
        res.json(data.map(o => {
            return ProvinceModel.getObject(o, req.query.lang as string);
        }));
    }

    async getDistrictsByProvinceId(req: express.Request, res: express.Response) {
        let data: DistrictModel[] = await this.districts.find({ "pv.id": +req.params.province_id, iatv: { $ne: true } })
            .project({ _id: 0, id: 1, nam: 1 })
            .sort({ "nam._srt": 1 })
            .toArray();

        res.json(data.map(o => {
            return DistrictModel.getObject(o);
        }));
    }

    async getPostcodes(req: express.Request, res: express.Response) {
        let filter: any = {};
        if (req.query.q && (req.query.q as string).trim().length > 0) {
            let q: string = (req.query.q as string).trim();
            filter.pco = {
                $regex: ".*" + q + ".*"
            };
        }

        let data: PostcodeModel[] = await this.postcodes.find(filter)
            .project({ _id: 0 })
            .sort({ "pco": 1 })
            .toArray();
        
        res.json(data.map(o => {
            return PostcodeModel.getObject(o);
        }));
    }

    async getAddresses(req: express.Request & { user: UserModel }, res: express.Response) {
        let page: number = +req.query.page || 1;
        let size: number = Math.min(+req.query.size || Config.PageSize, 100);
        let start: number = (page - 1) * size;        
        let sort: any = { def: -1, cdt: -1 };
        let filter: any = { uid: +req.user.id, iatv: { $ne: true } };

        let count: number = await this.addresses.countDocuments(filter, {});
        let data: AddressModel[] = await this.addresses.find(filter)
            .sort(sort)
            .skip(start)
            .limit(size)
            .toArray();
        
        let pageData: PageModel = {
            data: data.map(o => {
                return AddressModel.getObject(o);
            }),
            total: count
        }
        res.json(pageData);
    }

    async getAddressById(req: express.Request & { user: UserModel }, res: express.Response) {
        let filter: any = { id: +req.params.id, uid: +req.user.id };
        let data: AddressModel[] = await this.addresses.find(filter).toArray();
        if (data.length > 0) {
            res.json(AddressModel.getObject(data[0]));
        }
        else {
            res.json(new ErrorModel(t.translate('address_not_found', req.query.lang as string)));
        }
    }

    async getDefaultAddress(req: express.Request & { user: UserModel }, res: express.Response) {
        let filter: any = { uid: +req.user.id, def: true };
        let data: AddressModel[] = await this.addresses.find(filter).toArray();
        if (data.length > 0) {
            res.json(AddressModel.getObject(data[0]));
        }
        else {
            res.json(new ErrorModel(t.translate('address_not_found', req.query.lang as string)));
        }
    }

    async createAddress(req: express.Request & { user: UserModel }, res: express.Response) {
        let bd: any = req.body;
        let now: Date = new Date();

        let getAddressData = async (d: any): Promise<AddressModel> => {
            let data: AddressModel = {
                "id" : null,
                "nam" : {
                    "th" : d.name,
                    "_srt" : d.name.replace(/[เแไโใไ]/, '')
                },
                "adr": d.address,
                "pco" : d.postcode,
                "uid" : req.user.id,
                "cdt" : now
            };
            if (d.telephone) {
                data.tel = d.telephone;
            }
            if (d.district) {
                data.dis = {
                    "id" : d.district.id,
                    "nam" : d.district.name
                };
            }
            if (d.province) {
                data.pv = {
                    "id" : d.province.id,
                    "nam" : d.province.name
                };
            }
            if (d.sdis) {
                data.sdis = d.sub_district;
            }
            data.id = await baseApi.getNextSeq(this.db, this.addresses.collectionName);
            d.id = data.id;
            return data;
        };

        if (bd instanceof Array) {
            let datas: AddressModel[] = [];
            for (let d of bd) {
                datas.push(await getAddressData(d));
            }
            let result: mongodb.InsertWriteOpResult<any> = await this.addresses.insertMany(datas);
            res.json({
                success: result.insertedCount == datas.length,
                data: bd
            });
        }
        else {
            let data: AddressModel = await getAddressData(bd);    

            if ((await this.addresses.countDocuments({ uid: req.user.id, iatv: { $ne: true } })) == 0) {
                data.def = true;
            }
            else if (bd.default == true) {
                await this.addresses.updateMany({ uid: req.user.id }, { $unset: { def: 1 } });
                data.def = true;
            }
            let result: mongodb.InsertOneWriteOpResult<any> = await this.addresses.insertOne(data);
            res.json({
                success: result.insertedCount > 0,
                id: data.id
            });
        }
    }

    async updateAddress(req: express.Request & { user: UserModel }, res: express.Response) {
        let bd: any = req.body;
        let now: Date = new Date();

        let data: AddressModel = {
            "nam" : {
                "th" : bd.name,
                "_srt" : bd.name.replace(/[เแไโใไ]/, '')
            },
            "adr": bd.address,
            "pco" : bd.postcode,
            "tel" : bd.telephone,
            "dis" : {
                "id" : bd.district.id,
                "nam" : bd.district.name
            },
            "pv" : {
                "id" : bd.province.id,
                "nam" : bd.province.name
            },
            "sdis": bd.sub_district,
            "udt" : now
        }
 
        if (bd.default == true) {
            await this.addresses.updateMany({ uid: req.user.id }, { $unset: { def: 1 } });
            data.def = true;
        }
        let result: mongodb.UpdateWriteOpResult = await this.addresses.updateOne({ id: +req.params.id, uid: req.user.id }, {
            $set: data
        });
        res.json({
            success: result.matchedCount > 0
        });
    }

    async updateDefaultAddress(req: express.Request & { user: UserModel }, res: express.Response) {
        let now: Date = new Date();

        let result: mongodb.UpdateWriteOpResult = await this.addresses.updateOne({ id: +req.params.id, uid: req.user.id }, {
            $set: {
                def: true,
                udt: now
            }
        });
        res.json({
            success: result.matchedCount > 0
        });
    }

    async maskAsDefault(req: express.Request & { user: UserModel }, res: express.Response) {
        let result: mongodb.UpdateWriteOpResult = await this.addresses.updateOne({ id: +req.params.id, uid: req.user.id }, {
            $set: { iatv: true }
        });
        res.json({
            success: result.matchedCount > 0
        });
    }
    
    async deleteAddress(req: express.Request & { user: UserModel }, res: express.Response) {
        let result: mongodb.UpdateWriteOpResult = await this.addresses.updateOne({ id: +req.params.id, uid: req.user.id }, {
            $set: { iatv: true }
        });
        res.json({
            success: result.matchedCount > 0
        });
    }
}