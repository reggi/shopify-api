var url = require("url");

var onboard = function(config){;

    var onboard = {};

    onboard.authorize_url = function(domain, path){
        return url.format({
            protocol: "https",
            host: config.shop,
            pathname: "/admin/oauth/authorize",
            query: {
                client_id: config.key,
                redirect_uri: url.format({
                    protocol: "http",
                    host: domain,
                    pathname: path
                }),
                scope: config.scope
            }
        });
    }
    
    return onboard;

}

modules.exports = onboard;