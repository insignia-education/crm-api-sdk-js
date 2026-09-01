import CrmClient from './Client.js';

export default class Crm extends CrmClient {

    constructor(baseUrl = null) {
        super(Crm._resolve(baseUrl));
    }
}
