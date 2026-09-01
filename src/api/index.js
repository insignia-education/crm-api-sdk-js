import Crm from '../index.js';

export default class CrmApi extends Crm {
    constructor(baseUrl = null) {
        let url = CrmApi._resolve(baseUrl);
        super(url);
    }

    static _resolve(baseUrl) {
        baseUrl = Crm._resolve(baseUrl);
        baseUrl += !/\/api(\/|$)/.test(baseUrl) ? '/api' : '';
        return baseUrl;
    }
}
