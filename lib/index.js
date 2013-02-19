var helper = require("./helper.js");
var _ = require("underscore");
var webhook = require("./webhook.js");
var onboard = require("./onboard.js");

var Shopify = function(){
    
    var shopify = {};
    
    shopify.arguments = arguments;
    
    shopify.config = helper.config(shopify.arguments);

    shopify.add = function(item){        
        if(typeof item !== "undefined"){
            _.extend(shopify.config, helper.append({0:item}));
        }
        return shopify.config;
    }

    shopify.request = function(options, callback){
        return helper.request(shopify.config, options, callback);
    }

    shopify.webhook = webhook(shopify.config);

    shopify.onboard = onboard(shopify.config);

    return shopify;
};

module.exports = Shopify;
//try{shopify.order = require("shopify-order");}catch(e){}