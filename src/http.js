//implements crowdin.HttpClient
const httpClient = {
    get: function (url, config) {
        return request(url, 'GET', config);
    },
    delete: function (url, config) {
        return request(url, 'DELETE', config);
    },
    head: function (url, config) {
        return request(url, 'HEAD', config);
    },
    post: function (url, data, config) {
        return request(url, 'POST', config, data);
    },
    put: function (url, data, config) {
        return request(url, 'PUT', config, data);
    },
    patch: function (url, data, config) {
        return request(url, 'PATCH', config, data);
    }
};

async function request(url, method, config, data) {
    let body = undefined;
    if (!!data) {
        if (typeof data === 'object') {
            body = JSON.stringify(data);
        } else {
            body = data;
        }
    }
    const resp = await fetch(url, {
        method: method,
        headers: !!config ? config.headers : {},
        body: body
    });
    return await resp.json();
}

export default httpClient;