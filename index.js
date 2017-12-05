#!/usr/bin/env node
const fs = require('fs');
const request = require('request');
const handlebars = require('./lib/handlebars');
const getModelName = require('./lib/getModelName');
const lib = require('./lib');
const args = require('args');

args
  .option('swaggerurl', 'The url to download swagger from')
  .option('showexamples', 'true to show code examples')
  .option('templatedir', 'The absolute path the template directory (omit if using default templates)')
  .option('category', 'Category to process (omit processes all)')
  .option('output', 'Directory if processing all files or file location if processing a single category')

const flags = args.parse(process.argv);

var swagger = null;

var templateDirectory = __dirname + "/templates";
if(flags.templatedir){
    templateDirectory = flags.templatedir;
}


// var swaggerfile = fs.readFileSync(process.argv[2], 'utf8');
// var swagger = JSON.parse(swaggerfile);

request.get({
    url: flags.swaggerurl,
    json: true
}, (err, res, data) => {
    swagger = data;

    if(flags.showexamples){
        console.log("Show examples ?" + flags.showexamples);
        lib.setShowExamples(flags.showexamples);
    }

    var categories = lib.setup(swagger, templateDirectory);

    if(flags.category){
        var tag = flags.category;
        fs.writeFileSync(flags.output, lib.getBody(categories[tag]));

    }else{
        for(var x=0; x< Object.keys(categories).length; x++){

            var tag = Object.keys(categories)[x];
            var category = categories[tag];

            if(category.operations.length > 0){
                fs.writeFileSync(flags.output + '/_'+ tag.toLowerCase().replace(/ /g, "") +'.html.erb', lib.getBody(categories[tag]));
            }
        }

    }
});
