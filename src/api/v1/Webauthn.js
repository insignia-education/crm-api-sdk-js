/** Security key / passkey enrollment and management — not a login method. */
export default class Webauthn {
    #client;
    constructor(client) { this.#client = client; }

    registerOptions()                  { return this.#client.post('/webauthn/register/options'); }
    register(credential, name = null)  { return this.#client.post('/webauthn/register', { credential, name }); }
    credentials()                      { return this.#client.get('/webauthn/credentials'); }
    deleteCredential(id)               { return this.#client.del(`/webauthn/credentials/${id}`); }
}
