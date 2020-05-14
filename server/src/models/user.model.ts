import * as mongodb from 'mongodb';

class Login {
    pv: string;
    id: string;

    static getObject?(data: Login): any {
        let o: any = {};

        if (data.pv != null) o.provider = data.pv;
        if (data.id != null) o.id = data.id;
        
        return o;
    }
}

export class UserModel {
    id?: number | mongodb.Long; // id
    em?: string; // email
    pwd?: string; // password
    nam?: string; // name
    lgs?: Login[]; // logins
    cdt?: Date; // create_date
    udt?: Date; // update_date
    atk?: string; // activate_token
    atv?: boolean; // activated

    static getObject?(data: UserModel): any {
        let o: any = {};

        if (data.id != null) o.id = data.id;
        if (data.em != null) o.email = data.em;
        if (data.nam != null) o.name = data.nam;
        if (data.cdt != null) o.create_date = data.cdt;
        if (data.udt != null) o.update_date = data.udt;
        if (data.atk != null) o.activate_token = data.atk;
        if (data.atv != null) o.activated = data.atv;

        if (data.lgs != null) o.logins = data.lgs.map(x => Login.getObject(x));
        
        return o;
    }
}