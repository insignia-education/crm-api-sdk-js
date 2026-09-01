import CrmApi from '../index.js';
import Auth from './Auth.js';

export default class CrmApiV1 extends CrmApi {

    static _resolve(baseUrl) {
        baseUrl = CrmApi._resolve(baseUrl);
        baseUrl += !/\/v1(\/|$)/.test(baseUrl) ? '/v1' : '';
        return baseUrl;
    }

    constructor(baseUrl = null) {
        let url = CrmApiV1._resolve(baseUrl);
        super(url);

        this.auth = new Auth(this);
    }
}
