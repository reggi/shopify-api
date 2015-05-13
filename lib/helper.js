var _ = require("underscore");
var dotty = require("dotty");
var request = require("request");
var crypto = require("crypto");
var Runner = require("runner");

var helper = {};

helper.mapper = function(){
    return {
        "key": ["api-key","key"],
        "secret": ["shared-secret","secret"],
        "token": ["password", "access-token", "token"],
        "shop": ["shop","host-name","shop-name","myshopify"],
        "format": ["url-format","format"],
        "version": ["version"],
        "encode": ["encode"],
        "scope": ["scope"],
        "charge": ["charge"]
    }
}();

helper.manditory = function(object, manditory){
    var vals = [];
    _.each(manditory, function(value){
        vals.push(dotty.exists(object,value));
    });
    var success = (_.without(vals, true).length == 0);
    return success;
}

helper.request = function(config, options, callback){
    
    if(helper.manditory(config,["shop","key","token","secret"])){

        options = function(){
            var opt = new Runner(options)
                .morph("path")
                .clean()
                .defaults({
                    "method":"get",
                    "json":true
                })
                .prepend("path", "https://"+config.shop+"/" , "url")
                .finish();
            if(config.version == 2){
                opt.headers = {
                    "X-Shopify-Access-Token": config.token
                }
            }
            return opt;
        }();

        request(options, function(err, response, body){
            if(err) return callback(err);
            if(dotty.exists(body, "errors")) return callback(new Error("Shopify : "+options.path+" / "+JSON.stringify(body.errors)));
            if(dotty.exists(body, "error")) return callback(new Error("Shopify : "+options.path+" / "+JSON.stringif(body.error)));
            return callback(null, response, body, options);
        });

    }else{
        
        return callback("config variables aren't available", false, options);
    
    }
}

helper.base = function(pass){
    var url = pass.format;
    url = url.replace("apikey",pass.key);
    url = url.replace("password",pass.token);
    url = url.replace("hostname",pass.shop);
    return url;
};

helper.encrypt = function(pass){
    return crypto.createHash('md5').update(pass.secret + pass.token).digest("hex");
}

helper.config = function(pass){
    var arg = new Runner(pass)
        .values()
        .flatten()
        .ensure("objects")
        .extend()
        .map(helper.mapper)
        .defaults({
            "format": 'https://apikey:password@hostname',
            "version": 2,
            "encode": false,
        }, true)
        .finish();
    arg = helper.pile(pass,arg);
    return arg;
};

helper.append = function(pass){
    var arg = new Runner(pass)
        .ensure("objects")
        .extend()
        .map(helper.mapper)
        .finish();
    arg = helper.pile(pass,arg);
    return arg;
};

helper.pile = function(pass,arg){
    if(arg.encode){
        arg.tokenraw = arg.token;
        arg.token = helper.encrypt(arg);
    }
    if(helper.manditory(pass,["key","token","shop"]) && arg.version == 1){
        arg.base = helper.base(arg);
    }else if(dotty.exists(arg,"shop") && arg.version == 2){
        arg.base = "https://"+arg.shop;
    }
    return arg;
}

helper.add_config = function(config, item){
    _.extend(config, item);
    return helper.config({0:config});
}

module.exports = helper;