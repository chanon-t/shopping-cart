import * as mongodb from 'mongodb';
import { LangModel } from "./lang.model";

export class ProvinceModel {
    id?: number; // id
    nam?: LangModel | string; // name
    iatv?: boolean; // inactive
    
    static getObject?(data: ProvinceModel, lang: string = 'th'): any {
        let o: any = {};

        if (data.id != null) o.id = data.id;
        if (data.nam != null) o.name = data.nam[lang] || data.nam;
        
        return o;
    }
}

export class DistrictModel {
    id?: number; // id
    nam?: LangModel | string; // name
    pv?: ProvinceModel; // province
    iatv?: boolean; // inactive
    
    static getObject?(data: DistrictModel, lang: string = 'th'): any {
        let o: any = {};

        if (data.id != null) o.id = data.id;
        if (data.nam != null) o.name = data.nam[lang] || data.nam;
        if (data.pv != null) o.province = ProvinceModel.getObject(data.pv);
        
        return o;
    }
}
export class AddressModel {
    id?: number | mongodb.Long; // id
    nam?: LangModel | string; // name
    adr?: string; // address
    pco?: string; // postcode
    oco?: string; // outlet_code
    pv?: ProvinceModel; // province
    dis?: DistrictModel; // district
    sdis?: string; // sub_district
    tel?: string; // telephone
    def?: boolean; // default
    uid?: number | mongodb.Long; // user_id
    iatv?: boolean; // inactive    
    cdt?: Date; // create_date
    udt?: Date; // update_date

    static getFullAddress(address: string, province: string, district: string, subDistrict: string, postcode: string, isCapital: boolean = false): string {
        let fullAddress: string = address;
        if (subDistrict) {
            address += " " + ((!isCapital)? 'ตำบล': 'แขวง') + subDistrict;
        }
        if (district) {
            address += " " + ((!isCapital)? 'อำเภอ': 'เขต') + district;
        }
        if (province) {
            address += " " + ((!isCapital)? 'จังหวัด': '') + province;
        }
        if (postcode) {
            address += " " + postcode;
        }
        return fullAddress;
    }

    static getObject?(data: AddressModel, lang: string = 'th'): any {
        let o: any = {};

        if (data.id != null) o.id = data.id;
        if (data.nam != null) o.name = data.nam[lang] || data.nam;
        if (data.adr != null) o.address = data.adr;
        if (data.pco != null) o.postcode = data.pco;
        if (data.oco != null) o.outlet_code = data.oco;
        if (data.pv != null) o.province = ProvinceModel.getObject(data.pv);
        if (data.dis != null) o.district = DistrictModel.getObject(data.dis);
        if (data.sdis != null) o.sub_district = data.sdis;
        if (data.tel != null) o.telephone = data.tel;
        if (data.def != null) o.default = data.def;
        if (data.uid != null) o.user_id = data.uid;
        if (data.cdt != null) o.create_date = data.cdt;
        
        return o;
    }
}

export class PostcodeModel {
    pco?: string; // postcode
    pv?: ProvinceModel; // province
    dis?: DistrictModel; // district
    sdis?: string; // sub_district
    
    static getObject?(data: PostcodeModel): any {
        let o: any = {};

        if (data.pco != null) o.postcode = data.pco;
        if (data.pv != null) o.province = ProvinceModel.getObject(data.pv);
        if (data.dis != null) o.district = DistrictModel.getObject(data.dis);
        if (data.sdis != null) o.sub_district = data.sdis;
        
        return o;
    }
}