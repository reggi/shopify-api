var example = function(config){
    var example = {};

    example.spit_text = function(string){
        console.log(config);
        return string;
    }

    return example;
};

module.exports = example;