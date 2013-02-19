var dotty = require("dotty");
var request = require("request");
var crypto = require("crypto");
var path = require("path");
var _ = require("underscore");

/*
  url_format: 'https://apikey:password@hostname',
  apikey: '542876110fe4dae3e9a4fa47f40fd514',
  password: '1e0b4b24be73169c9b658b9d0f379387',
  shared_secret: 'f80687ff069622a2bfa8f91d658cabc6',
  hostname: 'reggi.myshopify.com',
  baseurl: 'https://542876110fe4dae3e9a4fa47f40fd514:1e0b4b24be73169c9b658b9d0f379387@reggi.myshopify.com'
*/

var Shopify = function(config,creds){

    var shopify = {};
    /*
    shopify.config = (function(config){
        config = (function(config){
            if(typeof creds !== "undefined"){
                return _.extend(config,creds);
            }else{
                return config;
            }
        })(config);
        
        config.password = (function(config){
            return crypto.createHash('md5').update(config.shared_secret + config.password).digest("hex");
        })(config);
        
        config.baseurl = (function(config){
            var url = config.url_format;
            url = url.replace("apikey",config.apikey);
            url = url.replace("password",config.password);
            url = url.replace("hostname",config.hostname);
            return url;
        })(config);

        return config;
    })(config);
    */

    /*
    shopify.options = function(options){
        if(typeof(options) === "string"){
            var url = options;
            options = {};
            options.url = url;
        }
        
        options.original = options.url;

        if(typeof(options.url) !== "undefined"){
            options.url = (options.url.match(/^\//)) ? options.url.substring(1,options.url.length) : options.url;
            options.url = (options.url.match(/^admin/)) ? options.url : "admin/" + options.url;
            options.url = (options.url.match(".json")) ? options.url : (path.extname(options.url) == ".json") ? options.url : options.url + ".json";
            options.url = shopify.config.baseurl + "/" + options.url;
        }else{
            options.url = shopify.config.baseurl;
        }

        options = _.defaults(options,{
          "method":"get",
          "json":true
        });

        return options;
    }
    */
    
    /*
    shopify.request = function(options,callback){
        // to-do: break up options into api 1 & 2
        options = shopify.options(options);
        request(options, function(error,response,body){
            if(error){
                callback(error,body);
            }else if(response && response.statusCode == 404){
                var message = "Shopify request failed : "+options.original;
                callback(message,body);
            }else{
                callback(error,body);
            }
        });
    }
    */
    /*
    shopify.webhook_hmac = function(order){
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
        var secret = shopify.config.shared_secret;
        return crypto.createHmac('SHA256', secret).update(string).digest('base64');
    }

    shopify.verify_webhook_hmac = function(req){
        var c = shopify.webhook_hmac(req.order);
        var h = req.headers['x-shopify-hmac-sha256']
        console.log(c);
        console.log(h);
        //console.log(JSON.stringify(req.order));
        return  c == h;
    }

    shopify.verify_webhook_headers = function(req,options){
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
        console.log(v);
        return bool;
    }
    */
    return shopify;

}

module.exports = Shopify;