//I would like to extend one object in a class `alpha.helper` to be an instance of the `Helper` class, with the added difficulty of setting this everytime a `alpha.helper` function is called because I need to transfer the current value of `alpha.imperfect`.

var _ = require("underscore");

var Helper = function(imperfect){

    var helper = {};

    helper.use = function(item){
        console.log(item);
        console.log(imperfect);
        return false;
    }

    helper.bar = function(item){
        console.log(item);
        console.log(imperfect);
        return false;
    }

    return helper;

}

var Alpha = function(){
    
    var alpha = {};
    
    alpha.imperfect = {}    
    
    alpha.add = function(item){
        _.extend(alpha.imperfect, item);
    }

    alpha.helper = new Helper(alpha.imperfect);

    return alpha;

}

var alpha = new Alpha();

alpha.add({"name":"thomas"});

alpha.add({"something":"seven"});

alpha.add({"color":"red"});

alpha.helper.use("foo");

