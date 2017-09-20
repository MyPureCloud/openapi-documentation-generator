

function getDefaultValue(type){

    switch (type) {
        case 'integer':
        return 0;
        break;
        case 'array':
        return '[]';
        break;
        case 'boolean':
        return 'true';
        break;
        case 'string':
        return '""';
        break;
        default:
        return "{}";

    }
}

function getModelExampleFromModelName(isResponse, swagger, modelName, depth){
    var refDefinition = findRefDefinition(modelName, swagger);
    return getModelExample(isResponse, swagger, refDefinition, depth + 1);
}

function getModelDescription(isResponse, swagger, definitions, modelName, depth){
    try{
        if(modelName === null || definitions[modelName] || depth >2){
            return definitions;
        }

        modelName = modelName.replace(/#\/definitions\//,'');

        if(swagger["definitions"][modelName] == null){
            return definitions;
        }

        var model = swagger["definitions"][modelName];
        var properties = model["properties"];

        if(properties === null){
            return definitions;
        }

        var propertyDescriptions = [];

        var keys = Object.keys(properties);
        for(var x=0; x< keys.length; x++){
            var key = keys[x];
            var property = properties[key];
            if(isResponse || property.readOnly !== true){
                propertyDescriptions.push(processPropertyDescription(isResponse,swagger, definitions, model,depth, key,property));
            }
        }

        definitions[modelName] = propertyDescriptions
    }catch(ex){
        console.warn(ex);
    }


    return definitions;
}
function processPropertyDescription(isResponse, swagger, definitions, model, depth,  name, property){
    var readonlyString = property["readOnly"] == true ? ", read only" : "";
    var isRequired = model["required"] !=null &&  model["required"].indexOf(name) > -1;
    var required = isRequired ? ", required" : ", optional";
    var description = property['description'] || "";
    var type = property["type"];

    if(property["$ref"] != null){
        type= property["$ref"]
        getModelDescription(isResponse, swagger, definitions, property["$ref"], depth + 1);
    }
    else if(property["items"] && property["items"]["$ref"]){

        type= "array:" + property["items"]["$ref"]
        getModelDescription(isResponse, swagger, definitions, property["items"]["$ref"], depth + 1);
    }
/*
    }else if(property["items"] && property["items"]["properties"]){
        type= "array"
        get_inline_model_description(isResponse, swagger, definitions, property["items"], name, depth + 1);
    }else if (property["type"] == "object")
        get_inline_model_description(isResponse, swagger, definitions, property, name, depth + 1);
        */
    else if (property["items"] && property["items"]["enum"]){
        description = description + " Valid Values: " + property["items"]["enum"].join(", ")
    }
    else if ( property["enum"]){
        description = description + " Valid Values: " + property["enum"].join(", ")
    }

    var propertyDefinition = {
        name : name,
        type: type,
        required: required,
        readonlyString: readonlyString,
        description: description
    };

    return propertyDefinition;
}

function getModelExample(isResponse, swagger, modelDefinition, depth){

    if(depth >1){
        return "{}";
    }

    var definition = [];

    var properties = modelDefinition.properties;

    for(var name in properties){
        var defaultValue = '""';
        if(properties[name]["$ref"]){
            var refDefinition = findRefDefinition(properties[name]["$ref"], swagger);
            defaultValue = getModelExample(isResponse, swagger, refDefinition, depth + 1);
        }else{
            defaultValue = getDefaultValue(properties[name].type);
        }

        if(isResponse === true || properties[name].readOnly !== true){
            definition.push('"' + name + '" : ' + defaultValue );
        }
    }

    return JSON.stringify(JSON.parse("{" + definition.join(',') + "}"), null, "   ");
}

function findRefDefinition(refModelName, swagger){
    if(typeof(refModelName) === "undefined"){
        return {};
    }
    var modelName = refModelName.replace('#/definitions/','');
    var properties = swagger.definitions[modelName];
    return properties;
}

function convertDefinitions(definitions){

    var arr = [];

    if(typeof definitions === 'undefined'){
        return arr;
    }

    for(var x=0; x < definitions.length; x++ ){
        var definition = definitions[x];
        //definition.name = keys[x];
        arr.push(definition);
    }
    return arr;
}

var app = {};
app.getModelExample = function(modelName, swagger, isResponse){
    var definition = findRefDefinition(modelName, swagger);
    return getModelExample(isResponse, swagger, definition ,0);
};


app.getModelDescription = function(modelName, swagger, isResponse){
    var descriptionHash = getModelDescription(isResponse, swagger, {}, modelName ,0);
    var descriptionArray = [];



    var keys = Object.keys(descriptionHash);

    modelName = modelName.replace(/#\/definitions\//,'');

    //make sure the parent object is first
    descriptionArray.push({
        name: modelName,
        definitions: convertDefinitions(descriptionHash[modelName])
    });

    var index = keys.indexOf(modelName);
    if (index > -1) {
        keys.splice(index, 1);
    }

    for(var x=0; x < keys.length; x++ ){

        var model = descriptionHash[keys[x]];

        descriptionArray.push({
            name: keys[x],
            definitions: convertDefinitions(descriptionHash[keys[x]])
        });
    }

    return descriptionArray;
};

app.findRefDefinition = findRefDefinition;
app.getDefaultValue = getDefaultValue;
module.exports = app;
