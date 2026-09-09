export default class Users {
    #client;
    constructor(client) { this.#client = client; }

    /** username also accepts "me" for the authenticated user. */
    get(username)         { return this.#client.get(`/users/${username}`); }
    edit(username, data)  { return this.#client.patch(`/users/${username}`, data); }
    /** Sellers-and-above only. */
    organizations(username) { return this.#client.get(`/users/${username}/organizations`); }
}
