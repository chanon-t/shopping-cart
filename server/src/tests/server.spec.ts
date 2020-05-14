import * as chai from 'chai';
import * as express from "express";
import chaiHttp = require('chai-http');
import Server from "../server";

const app = express();
const router = express.Router();
const appServer = new Server(app, router);

chai.use(chaiHttp);

describe('Server', function () {

    // runs before all tests in this block
    before(async () => {
        await appServer.run();
    });

    // runs after all tests in this block
    after(function () {
    });

    // runs before each test in this block
    beforeEach(function () {
    });

    // runs after each test in this block
    afterEach(function () {
    });

    it('should return API version', async () => {
        let res = await chai.request(appServer.app).get('/version');
        chai.expect(res.status).to.equal(200);
        chai.expect(res.body).to.has.property('version');
    });
});