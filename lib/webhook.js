var crypto = require("crypto");
var dotty = require("dotty");
var _ = require("underscore");

var Webhook = function(config){

    var webhook = {};

    webhook.hmac = function(body){
        var string = function(){
            if(typeof(body) == "undefined") return "";
            if(typeof(body) == "object") return JSON.stringify(body);
            if(typeof(body) == "string") return body;
            return body.toString();
        }();
        var secret = config.secret;
        var hmac = crypto.createHmac('SHA256', secret).update(string).digest('base64');
        return hmac;
    }

    return webhook;

}

module.exports = Webhook;