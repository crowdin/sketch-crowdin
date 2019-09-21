//implements crowdin.HttpClient

let maxConcurrentRequests = 15;
let requestIntervalMs = 10;
let pendingRequests = 0;

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
    await waitInQueue();
    return fetch(url, {
        method: method,
        headers: !!config ? config.headers : {},
        body: body
    })
        .then(async resp => {
            let json = resp.json();
            if (resp.status >= 200 && resp.status < 300) {
                return json;
            } else {
                const err = await json;
                throw err;
            }
        })
        .finally(() => pendingRequests = Math.max(0, pendingRequests - 1));
}

function waitInQueue() {
    return new Promise((resolve, _reject) => {
        let interval = setInterval(() => {
            if (pendingRequests < maxConcurrentRequests) {
                pendingRequests++;
                clearInterval(interval);
                resolve();
            }
        }, requestIntervalMs);
    });
}

export default httpClient;