var handlebars = require('./lib/handlebars');
const getModelName = require('./lib/getModelName');
var categories = {};

const DEFAULT_CATEGORY = 'default';

function processSwagger(){

    if(!swagger.tags || swagger.tags.length === 0){
        swagger.tags = [
            {
                name: DEFAULT_CATEGORY,
                description: ""
            }
        ]
    }

    for(var x=0; x< swagger.tags.length; x++){
        categories[swagger.tags[x].name] = {
            name: swagger.tags[x].name,
            description: swagger.tags[x]["description"],
            operations: [],
            models:{}
        };
    }

    function addToSchemaMap(map, category, schemaName, level){
        if(level > 4){ //only go so deep so that incase a model has a ref to itself it doesn't get stuck in an infinate loop
            return;
        }
        swagger.definitions[schemaName].modelname = schemaName;

        map[schemaName] = swagger.definitions[schemaName];

        if(swagger.definitions[schemaName].properties){
            var propertyNames = Object.keys(swagger.definitions[schemaName].properties);
            propertyNames.forEach((propertyName) =>{
                var property = swagger.definitions[schemaName].properties[propertyName];

                var modelName = getModelName(property);

                if(modelName){
                    addToSchemaMap(map, category, modelName, level + 1);
                }
            });
        }

    }

    for(var p=0; p < Object.keys(swagger.paths).length; p++){
        var path = Object.keys(swagger.paths)[p];
        var pathData = swagger.paths[path];

        for(var d=0;d< Object.keys(pathData).length; d++){
            var pathOperation = Object.keys(pathData)[d];
            var pathOperationData = pathData[pathOperation];

            if(!pathOperationData.operationId){
                pathOperationData.operationId = path.replace(/\//g, "");
            }

            pathOperationData.method = pathOperation.toUpperCase();
            pathOperationData.uri = path;

            if(pathOperationData.responses['200']){
                var returnType = getModelName(pathOperationData.responses['200']);

                if(returnType){
                    pathOperationData.returnType = returnType;
                }
            }

            if(!pathOperationData.tags || pathOperationData.tags.length === 0){
                pathOperationData.tags = [DEFAULT_CATEGORY];
            }

            for(var t=0; t < pathOperationData.tags.length; t++){
                if(typeof categories[pathOperationData.tags[t]] === "undefined"){
                    continue;
                }
                
                categories[pathOperationData.tags[t]].operations.push(pathOperationData);

                if(pathOperationData.parameters){
                    for(var x=0; x<pathOperationData.parameters.length; x++){
                        var param = pathOperationData.parameters[x];


                        var schemaName = getModelName(param);

                        if(schemaName){
                            addToSchemaMap(categories[pathOperationData.tags[t]].models, pathOperationData.tags[t], schemaName, 0);
                        }
                    }

                    pathOperationData.parameters.sort(function(a,b){
                        if(a.in !== b.in){
                            if(a.in === 'body'){
                                return 1
                            }else if(b.in === 'body'){
                                return -1
                            }

                            return a.in.localeCompare(b.in);
                        }

                        return a.name.localeCompare(b.name);
                    });
                }
                
                for(var x=0; x< Object.keys(pathOperationData.responses).length; x++){
                    var key = Object.keys(pathOperationData.responses)[x];
                    var response = pathOperationData.responses[key];

                    var schemaName = getModelName(response);

                    if(schemaName){
                        addToSchemaMap(categories[pathOperationData.tags[t]].models,pathOperationData.tags[t], schemaName, 0);
                    }
                }
            }
        }
    }

    for(var x=0; x< swagger.tags.length; x++){
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

module.exports = {
    setShowExamples(show){
        handlebars.setShowExamples(show);
    },
    setup(swaggerJson, templateDir){

        if(!templateDir){
            templateDir = __dirname + '/templates';
        }

        handlebars.setup(templateDir, swaggerJson);

        swagger = swaggerJson;
        processSwagger();

        return categories;

    },
    getBody(category){
        return handlebars.execute(category);
    }
}
