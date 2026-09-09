export default class TwoFactor {
    #client;
    constructor(client) { this.#client = client; }

    status()       { return this.#client.get('/2fa/status'); }
    setup()        { return this.#client.post('/2fa/setup'); }
    enable(data)   { return this.#client.post('/2fa/enable', data); }
    disable(data)  { return this.#client.post('/2fa/disable', data); }
}
