var Shopify = require("./index.js");
var shopify = new Shopify();

shopify.add({
    "shop" : "reggi.myshopify.com"
});

shopify.add({
    "Api Key" : "142115942a81dd529bb5b8d4aa09d9e6"
});

shopify.add({
    "Password" : "4d027ca743fe96101b4d53432778e1d2"
});

shopify.add({
    "Shared Secret" : "bcfaca3130268467d75887110af41f6a"
});

/*
shopify.request("shop", function(err, body){
    if(err) return console.log(err);
    console.log(body);
});
*/

shopify.webhook.ex("hello");