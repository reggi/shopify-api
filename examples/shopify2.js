var train = require("./train.js");
var config = require("./config.js")(train);
var crypto = require("crypto");
var scheme = require("scheme");
var request = require("request");
var dotty = require("dotty");
var _ = require("underscore");

var Shopify = function(req,res){

    var shopify = {
        "request":{
            "product":{},
            "charge":{}
        },
        "redirect":{},
        "render":{},
        "parse":{},
        "delegate":{}
    };

    shopify.paths = {
        "enter":(dotty.exists(req,"params.enter")) ? config.api.shopify.paths.enter.replace("enter",req.params.enter) : config.api.shopify.paths.enter,
        "exit":(dotty.exists(req,"params.exit")) ? config.api.shopify.paths.exit.replace("exit",req.params.exit) : config.api.shopify.paths.exit
    };

    // ACCESS TOKEN

    var tru = function(array){
        var falsy = _.without(array,true);
        return (falsy == 0);
    }

    shopify.delegate.query = function(callbacks){
        var q, v, cb;
        q = new train.query(req.query,['shop','error','code','timestamp','signature','charge_id']);
        v = {
            'enter':q.precise([]),
            'shop': q.precise(['shop']),
            'authorize_cancled': (q.precise(['error','shop','timestamp','signature']) && req.query.error == "access_denied"),
            'authorize_installed': q.precise(['code','shop','timestamp','signature']),
            'charge': q.precise(['charge_id']),
            'invalid_scope': (q.precise(['error','shop','timestamp','signature']) && req.query.error == "invalid_scope")
        };
        cb = _.keys(v)[_.indexOf(_.values(v), true)];
        return callbacks[cb]();
    }

    shopify.render.enter = function(){
        var friendly = train.friendly(config.params.enter,req.params.enter);
        res.render("enter.jade",{
            "title":"Shopify - " + friendly + " | " + config.name,
            "friendly":friendly,
            "message":(dotty.exists(req,"session.enter_message")) ? req.session.enter_message : undefined,
        });
    }

    shopify.shop = function(string){
        // Returns myshopify domain based on string trims the string at the first "."
        return string.split(".")[0] + ".myshopify.com";
    }

    shopify.delegate.shop = function(callbacks){
        request('http://'+req.session.shop,function (error, response, body) {
            var callback = (!error && response.statusCode < 400) ? "success" : "error";
            return callbacks[callback]();
        });
    }

    shopify.redirect.authorize = function(){
        // redirect user to authorize app install
        return res.redirect(scheme.build({
            "scheme": "https",
            "domain": req.session.shop,
            "path": "/admin/oauth/authorize",
            "query": {
                "client_id": config.api.shopify.keys.api_key,
                "redirect_uri": scheme.build({
                    "scheme": "http://",
                    "domain": config.domain,
                    "path": shopify.paths.enter,
                }),
                "scope": config.api.shopify.scope
            }
        }));
    }

    shopify.redirect.enter = function(options){
        // redirect the user to the form with message
        req.session.enter_message = options.message;
        return res.redirect(shopify.paths.enter);
    }

    shopify.signature = function(query,shared_secret){
        // returns bool based on query equals signature
        var array = [];
        var signature = query['signature'];
        delete query['signature'];
        _.each(query,function(value,key){
            array.push(key+"="+value);
        });
        var unhashed = shared_secret + array.sort().join('');
        var hashed = crypto.createHash('md5').update(unhashed).digest("hex");
        return  hashed == signature;
    }

    shopify.timestamp = function(timestamp){
        // Returns bool based on string is 10 minutes old
        var time = Math.round(new Date().getTime() / 1000);
        return (time - parseInt(timestamp) < 600);
    }

    shopify.delegate.oauth = function(callbacks){
        var query = _.clone(req.query);
        var shared_secret = config.api.shopify.keys.shared_secret;
        var signature = shopify.signature(query, shared_secret);
        var timestamp = shopify.timestamp(query.timestamp);
        var cb = (signature && timestamp) ? "success" : "error";
        return callbacks[cb]();
    }

    shopify.request.connect = function(callbacks){
        request({
            "method": "get",
            "json": true,
            "uri": scheme.build({
                "scheme": "https://",
                "domain": req.session.shop,
                "path": "/admin/shop.json",
            }),
            "headers": {
                "X-Shopify-Access-Token": req.session.access_token,
            }
        }, function (error, response, data) {
            var cb = (!error && response.statusCode < 400) ? "success" : "error";
            return callbacks[cb]();
        });
    }

    shopify.request.access_token = function(callbacks){
        request({
            "method": "post",
            "json": true,
            "form": {
                "client_id": config.api.shopify.keys.api_key,
                "client_secret": config.api.shopify.keys.shared_secret,
                "code": req.query.code
            },
            "uri": scheme.build({
                "scheme": "https://",
                "domain": req.session.shop,
                "path": "/admin/oauth/access_token",
            }),
        },function(error,response,data){
            if (!error && response.statusCode < 400){
                callbacks.success(data.access_token);
            }else{
                callbacks.error(error);
            }
        });
    }

    // CHARGE

    shopify.delegate.security = function(callbacks){
        if(dotty.exists(req,"session.charge_id") && req.query.charge_id == req.session.charge_id){
            callbacks.success();
        }else{
            callbacks.error();
        }
    }

    shopify.request.retrieve_charges = function(callbacks){
        //Retrieve all recurring application charges
        request({
            "method": "get",
            "json": true,
            "uri": scheme.build({
                "scheme": "https://",
                "domain": req.session.shop,
                "path": "/admin/recurring_application_charges.json",
            }),
            "headers": {
                "X-Shopify-Access-Token": req.session.access_token,
            }
        }, function (error, response, data) {
            var callback = (!error && response.statusCode < 400) ? "success" : "error";
            var ret = (typeof data == "undefined") ? error : data;
            return callbacks[callback](ret);
        });
    }

    shopify.parse.charges = function(data){
        var array = (typeof data.recurring_application_charge == "undefined") ? data.recurring_application_charges : data.recurring_application_charge;
        var s = {
            "pending":false,
            "active":false,
            "declined":false,
            "accepted":false,
            "cancelled":false,
        };
        for(var key in array){
          var charge = data.recurring_application_charges[key];
          if(typeof s[charge.status] == "undefined" || !s[charge.status]){
            s[charge.status] = charge;
          }
        }
        return s;
    }

    shopify.delegate.accepted_charge = function(data,callbacks){
        var id = shopify.parse.charges(data).accepted.id;
        var value = (typeof id == "undefined") ? false : id;
        if(value){
            callbacks.success(value);
        }else{
            callbacks.error();
        }
    }

    shopify.request.activate_charge = function(id,callbacks){
        request({
            "method": "post",
            "json": true,
            "uri": utility.urlConstruct({
                "scheme": "https://",
                "domain": req.session.shop,
                "path": "/admin/recurring_application_charges/"+id+"/activate.json",
            }),
            "headers": {
                "X-Shopify-Access-Token": req.session.access_token,
            }
        }, function (error, response, data) {
            var callback = (!error && response.statusCode < 400) ? "success" : "error";
            var ret = (typeof data == "undefined") ? error : data;
            return callbacks[callback](ret);
        });
    }

    // PRODUCTS

    shopify.request.retrieve_products = function(count,callbacks){

        var pages = Math.ceil(count / 250);

        var singleton = function singleton(page,callbacks){
        
            request({
                "method": "get",
                "json": true,
                "uri": scheme.build({
                    "scheme": "https://",
                    "domain": req.session.shop,
                    "path": "/admin/products.json",
                    "query":{
                        "page":page,
                        "limit":250,
                        "published_status":"published",
                        "fields":"variants,id"
                    }
                }),
                "headers": {
                    "X-Shopify-Access-Token": req.session.access_token,
                }
            }, function (error, response, data) {
                if(!error && response.statusCode < 400){
                    callbacks.success(data.products,count);
                    if(pages !== page){
                        singleton(page++,callbacks);
                    }
                }else{
                    callbacks.error(error);
                }
            });

        };

        return singleton(1,callbacks);
    }

    shopify.request.count_product = function(callbacks){
        request({
            "method": "get",
            "json": true,
            "uri": scheme.build({
                "scheme": "https://",
                "domain": req.session.shop,
                "path": "/admin/products/count.json",
                "query":{
                    "published_status":"published"
                }
            }),
            "headers": {
                "X-Shopify-Access-Token": req.session.access_token,
            }
        }, function (error, response, data) {
            if(!error && response.statusCode < 400){
                callbacks.success(data.count);
            }else{
                callbacks.error(error);
            }
        });
    }

    shopify.parse.products = function(products){
        if(!_.isArray(products)){
            var products = [products];
        }
        var insert = [];
        _.each(products,function(product){
            _.each(product.variants,function(variant){
                var set = {
                    "product_id":product.id,
                    "variant_id":variant.id,
                    "sku":variant.sku
                };
                insert.push(set);
            });
        });
        return insert;
    }

    // WEBHOOK

    shopify.request.create_webhook = function(webhook,callbacks){
       request({
            "method": "post",
            "json": true,
            "body":{
                "webhook":webhook
            },
            "uri": scheme.build({
                "scheme": "https://",
                "domain": req.session.shop,
                "path": "/admin/webhooks.json",
            }),
            "headers": {
                "X-Shopify-Access-Token": req.session.access_token,
            }
        }, function (error, response, data) {
            if(error){
                callbacks.error(error);
            }else if(response.statusCode >= 400){
                callbacks.error(data);
            }else{
                callbacks.success(data);
            }
        });
    }

    shopify.request.create_webhooks = function(webhooks,callbacks){

        var count = 0;
        var now = {
            "webhooks":[],
            "errors":[]
        };

        var final = function(now){
            if(now.webhooks.length == webhooks.length){
                callbacks.success(now.webhooks);
            }else{
                callbacks.error(now.errors);
            }
        };

        if (webhooks.length){
            run();
        }else{
            final(now);
        }

        function run() {
            shopify.request.create_webhook(webhooks[count], {
                success:function(data){
                    now.webhooks.push(data.webhook);
                    count++;
                    if (count === webhooks.length)
                        final(now);
                    else
                        run();
                },
                error:function(error){
                    now.errors.push(error);
                    count++;
                    if (count === webhooks.length)
                        final(now);
                    else
                        run();
                }
            });
        }
    }

    shopify.request.retrieve_webhooks = function(callbacks){
       request({
            "method": "GET",
            "json": true,
            "uri": scheme.build({
                "scheme": "https://",
                "domain": req.session.shop,
                "path": "/admin/webhooks.json",
            }),
            "headers": {
                "X-Shopify-Access-Token": req.session.access_token,
            }
        }, function (error, response, data) {
            if(error){
                callbacks.error(error);
            }else if(response.statusCode >= 400){
                callbacks.error(data);
            }else{
                callbacks.success(data);
            }
        });
    }

    shopify.parse.webhook_ids = function(data){
        var ids = [];
        _.each(data.webhooks,function(webhook){
            ids.push(webhook.id);
        });
        return ids;
    }

    shopify.request.delete_webhook = function(id,callbacks){
       request({
            "method": "DELETE",
            "json": true,
            "uri": scheme.build({
                "scheme": "https://",
                "domain": req.session.shop,
                "path": "/admin/webhooks/"+id+".json",
            }),
            "headers": {
                "X-Shopify-Access-Token": req.session.access_token,
            }
        }, function (error, response, data) {
            if(error){
                callbacks.error(error);
            }else if(response.statusCode >= 400){
                callbacks.error(data);
            }else{
                callbacks.success(data);
            }
        });
    }

    shopify.request.delete_webhooks_plural = function(ids,callbacks){

        var count = 0;
        var now = {
            "ids":[],
            "errors":[]
        };

        var final = function(now){
            if(now.ids.length == ids.length){
                callbacks.success(now.ids);
            }else{
                callbacks.error(now.errors);
            }
        };

        if (ids.length){
            run();
        }else{
            final(now);
        }

        function run() {
            shopify.request.delete_webhook(ids[count], {
                success:function(data){
                    now.ids.push(data.webhook);
                    count++;
                    if (count === ids.length)
                        final(now);
                    else
                        run();
                },
                error:function(error){
                    now.errors.push(error);
                    count++;
                    if (count === ids.length)
                        final(now);
                    else
                        run();
                }
            });
        }
    }

    shopify.request.delete_webhooks = function(callbacks){
        var now = {
            "webhooks":[],
            "errors":[]
        };
        shopify.request.retrieve_webhooks({
            success:function(data){
                var ids = shopify.parse.webhook_ids(data);
                shopify.request.delete_webhooks_plural(ids,{
                    success:function(responses){
                        now.webhooks = _.union(now.webhooks,responses);
                        callbacks.success(now.webhooks);
                    },
                    error:function(errors){
                        now.errors = _.union(now.errors,errors);
                        callbacks.error(now.errors);
                    },
                });
            },
            error:function(error){
                now.error.push(error);
                callbacks.error(now.error);
            }
        });
    }

    shopify.webhook = function(){
        var body = req.body;
        var shared_secret = config.api.shopify.keys.shared_secret;
        var hmac_header = req.headers['x-shopify-hmac-sha256'];
        body = JSON.stringify(body);
        var hmac_calculated = crypto.createHmac('SHA256', shared_secret).update(body).digest('base64')
        return hmac_header == hmac_calculated;
    }

    shopify.webhook_clean = function(webhook){
        var clone = (dotty.exists(webhook,"webhooks")) ? _.clone(webhook.webhooks) : _.clone(webhook);
        _.each(clone,function(webhook){
            delete webhook.created_at;
            delete webhook.updated_at;
            delete webhook.id;     
        });
        _.sortBy(clone,'topic');
        return clone;
    };

    shopify.webhook_match = function(webhooks1,webhooks2){
        webhooks3 = shopify.webhook_clean(webhooks1);
        webhooks4 = shopify.webhook_clean(webhooks2);
        return _.isEqual(webhooks3, webhooks4);;
    };

    shopify.webhooks_establish = function(){
        var address = "http://mrkt.io/webhook/shopify";
        var create = [{
            "topic": "products/create",
            "address": address,
            "format": "json"
        },{
            "topic": "products/update",
            "address": address,
            "format": "json"
        },{
            "topic": "products/delete",
            "address": address,
            "format": "json"
        }];
        return create;
    };

    return shopify;

}

module.exports = Shopify;