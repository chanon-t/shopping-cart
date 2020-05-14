import * as chai from 'chai';
import { MongoClient, Collection, Db, MongoClientOptions } from 'mongodb';

import * as baseApi from '../../api/base.api';
import { ConfigTest } from '../../config';

let db: Db;
let counters: Collection;

describe('Base API', function () {
    before(async () => {
        let mongo: MongoClient = await MongoClient.connect(ConfigTest.MongoUri, ConfigTest.MongoConfig as MongoClientOptions);
        db = mongo.db(ConfigTest.MongoDatabase);

        counters = db.collection('counters');
    });

    beforeEach(function () {
        counters.deleteMany({});
    });

    describe('randomString()', () => {
        it('should return valid length', () => {
            const result = baseApi.randomString(10);
            chai.expect(result).to.have.lengthOf(10);
        });
        it('should return valid characters', () => {
            const result = baseApi.randomString(10);
            chai.expect(result).to.match(/[a-zA-Z0-9]{10}/);
        });
    });

    describe('getNextSeq()', () => {
        it('should return first sequence', async () => {
            const result = await baseApi.getNextSeq(db, 'users');            
            const counter = await counters.findOne({ _id: 'users' });

            chai.expect(result).to.equal(1);
            chai.expect(counter).to.have.property('_id', 'users');
            chai.expect(counter).to.have.property('seq', 1);
        });
        it('should return next sequence', async () => {
            await baseApi.getNextSeq(db, 'users');            
            const result = await baseApi.getNextSeq(db, 'users');            
            const counter = await counters.findOne({ _id: 'users' });

            chai.expect(result).to.equal(2);
            chai.expect(counter).to.have.property('_id', 'users');
            chai.expect(counter).to.have.property('seq', 2);
        });
        it('should return next sequence', async () => {
            await baseApi.getNextSeq(db, 'users');            
            const result = await baseApi.getNextSeq(db, 'users');            
            const counter = await counters.findOne({ _id: 'users' });

            chai.expect(result).to.equal(2);
            chai.expect(counter).to.have.property('_id', 'users');
            chai.expect(counter).to.have.property('seq', 2);
        });
        it('should not return duplicate sequences when function called in the same time', async () => {
            const result = await Promise.all([
                baseApi.getNextSeq(db, 'users'),
                baseApi.getNextSeq(db, 'users'),
                baseApi.getNextSeq(db, 'users')
            ]);   
            const counter = await counters.findOne({ _id: 'users' });

            chai.expect(result).to.include(1);
            chai.expect(result).to.include(2);
            chai.expect(result).to.include(3);
            chai.expect(counter).to.have.property('_id', 'users');
            chai.expect(counter).to.have.property('seq', 3);
        });
    });
});