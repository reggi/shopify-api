var crypto = require("crypto");

var Webhook = function(config){

    var webhook = {};

    webhook.hmac = function(order){
        var string = (function(){
            if(typeof(order) == "undefined"){
                return "";
            }else if(typeof(order) == "object"){
                return JSON.stringify(order);
            }else if(typeof(order) == "string"){
                return order;
            }else{
                return order.toString();
            }
        }());
        var secret = config.shared_secret;
        return crypto.createHmac('SHA256', secret).update(string).digest('base64');
    }

    webhook.verify_hmac = function(req){
        return  webhook.hmac(req.order) == req.headers['x-shopify-hmac-sha256'];
    }

    webhook.verify_headers = function(req, options){
        var v = [
            dotty.exists(req,"body"),
            dotty.exists(req,"headers.user-agent"),
            dotty.exists(req,"headers.x-shopify-topic"),
            dotty.exists(req,"headers.x-shopify-shop-domain"),
            dotty.exists(req,"headers.x-shopify-hmac-sha256"),
            (req.headers["user-agent"] == "Ruby"),
            shopify.verify_webhook_hmac(req)
        ];
        if(dotty.exists(options,"topic")) v.push(dotty.exists(options,"topic"));
        if(dotty.exists(options,"header")) v.push(dotty.exists(req,"headers."+options.header));
        var bool = _.without(v,true).length == 0;
        return bool;
    }

    return webhook;

}

module.exports = Webhook;