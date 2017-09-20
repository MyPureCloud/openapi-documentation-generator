#!/usr/bin/env node

const fs = require('fs');
const request = require('request');
const handlebars = require('./lib/handlebars');
const getModelName = require('./lib/getModelName');

const args = require('args');

args
  .option('swaggerurl', 'The url to download swagger from')
  .option('showexamples', 'true to show code examples', false)
  .option('templatedir', 'The absolute path the template directory (omit if using default templates)')
  .option('category', 'Category to process (omit processes all)')
  .option('output', 'Directory if processing all files or file location if processing a single category')


const DEFAULT_CATEGORY = 'default';
const flags = args.parse(process.argv)

let swagger = null;
var categories = {};

let templateDirectory = __dirname + "/templates";
if(flags.templatedir){
    templateDirectory = flags.templatedir;
}

function processSwagger(){

    if(!swagger.tags || swagger.tags.length === 0){
        swagger.tags = [
            {
                name: DEFAULT_CATEGORY,
                description: ""
            }
        ]
    }

    for(let x=0; x< swagger.tags.length; x++){
        categories[swagger.tags[x].name] = {
            name: swagger.tags[x].name,
            description: swagger.tags[x]["description"],
            operations: [],
            models:{}
        };
    }

    function addToSchemaMap(map, category, schemaName, level){
        if(level > 3){
            return;
        }
        swagger.definitions[schemaName].modelname = schemaName;

        map[schemaName] = swagger.definitions[schemaName];

        if(swagger.definitions[schemaName].properties){
            let propertyNames = Object.keys(swagger.definitions[schemaName].properties);
            propertyNames.forEach((propertyName) =>{
                let property = swagger.definitions[schemaName].properties[propertyName];

                let modelName = getModelName(property);

                if(modelName){
                    addToSchemaMap(map, category, modelName, level + 1);
                }
            });
        }

    }

    for(let p=0; p < Object.keys(swagger.paths).length; p++){
        let path = Object.keys(swagger.paths)[p];
        let pathData = swagger.paths[path];

        for(let d=0;d< Object.keys(pathData).length; d++){
            let pathOperation = Object.keys(pathData)[d];
            let pathOperationData = pathData[pathOperation];

            if(!pathOperationData.operationId){
                pathOperationData.operationId = path.replace(/\//g, "");
            }

            pathOperationData.method = pathOperation.toUpperCase();
            pathOperationData.uri = path;

            if(pathOperationData.responses['200']){
                let returnType = getModelName(pathOperationData.responses['200']);

                if(returnType){
                    pathOperationData.returnType = returnType;
                }
            }

            if(!pathOperationData.tags || pathOperationData.tags.length === 0){
                pathOperationData.tags = [DEFAULT_CATEGORY];
            }

            for(let t=0; t < pathOperationData.tags.length; t++){
                categories[pathOperationData.tags[t]].operations.push(pathOperationData);

                for(let x=0; x<pathOperationData.parameters.length; x++){
                    let param = pathOperationData.parameters[x];


                    let schemaName = getModelName(param);

                    if(schemaName){
                        addToSchemaMap(categories[pathOperationData.tags[t]].models, pathOperationData.tags[t], schemaName, 0);
                    }
                }


                for(let x=0; x< Object.keys(pathOperationData.responses).length; x++){
                    let key = Object.keys(pathOperationData.responses)[x];
                    let response = pathOperationData.responses[key];

                    let schemaName = getModelName(response);

                    if(schemaName){
                        addToSchemaMap(categories[pathOperationData.tags[t]].models,pathOperationData.tags[t], schemaName, 0);
                    }
                }
            }
        }
    }

    for(let x=0; x< swagger.tags.length; x++){
        categories[swagger.tags[x].name].operations.sort((a,b)=>{
            if(a.uri == b.uri){
                return a.method.localeCompare(b.method);
            }

            return a.uri.localeCompare(b.uri);
        });
    }

    function generateCategory(categoryName){
        return template(categories[categoryName]);
    }

}
// var swaggerfile = fs.readFileSync(process.argv[2], 'utf8');
// var swagger = JSON.parse(swaggerfile);

request.get({
    url: flags.swaggerurl,
    json: true
}, (err, res, data) => {
    swagger = data;

    if(flags.showexamples){
        handlebars.setShowExamples(flags.showexamples);
    }
    handlebars.setup(templateDirectory, swagger);
    processSwagger(swagger);

    if(flags.category){
        let tag = flags.category;
        fs.writeFileSync(flags.output, handlebars.execute(categories[tag]));

    }else{
        for(let x=0; x< Object.keys(categories).length; x++){

            let tag = Object.keys(categories)[x];
            let category = categories[tag];

            if(category.operations.length > 0){
                fs.writeFileSync(flags.output + '/_'+ tag.toLowerCase().replace(/ /g, "") +'.html.erb', handlebars.execute(categories[tag]));
            }


        }

    }
});
