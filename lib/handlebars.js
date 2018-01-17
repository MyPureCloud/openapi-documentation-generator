const handlebars = require('handlebars');
const getModelName = require('./getModelName');
const fs = require('fs');
const path = require('path');
const model_example = require('openapi-model-example');

_swagger = null;
_showExamples = false;

handlebars.registerHelper('default_value', (property)=>{
    if(property.default){
        if(property.type === "string"){
            return new handlebars.SafeString(`"${property.default}"`);
        }

        return new handlebars.SafeString(property.default);
    }
    return new handlebars.SafeString(model_example.getDefaultValue(property.type));
} );


handlebars.registerHelper('example_json', (property, isResponse)=>{
    var modelname = getModelName(property);

    if(modelname){
        if(property.schema && property.schema.type === "array"){
            return new handlebars.SafeString("[\n"+ model_example.getModelExample(modelname, _swagger, isResponse) +"\n]");
        }else{
            return new handlebars.SafeString(model_example.getModelExample(modelname, _swagger, isResponse));
        }
    }
    return false;

} );

handlebars.registerHelper('valid_values', (property)=>{
    try{
        var values = null;
        if(property.items && property.items.enum){
            values = property.items.enum;
        }else if(property.enum){
            values = property.enum;
        }

        if(values){
            values.sort();
            return new handlebars.SafeString("<i>Valid Values:</i> " + values.join(", "));
        }
    }catch(ex){
        return "";
    }

} );

handlebars.registerHelper('ref', (property)=>{
    return getModelName(property);
} );

handlebars.registerHelper('is_required', (model, propertyName)=>{
    if(model.required && model.required.indexOf(propertyName) > -1){
        return ", required"
    }
} );

handlebars.registerHelper('required_properties', (model, options)=>{
    var schemaName = getModelName(model);
    var schema = _swagger.definitions[schemaName];

    var ret = "";
    if(schema.required){
        schema.required.forEach((requiredParam)=>{
            schema.properties[requiredParam].name = requiredParam;
            ret = ret + options.fn(schema.properties[requiredParam]);
        });
    }

    return ret;
} );

handlebars.registerHelper('has_ref', (property)=>{
    return getModelName(property) != null;
} );

handlebars.registerHelper('underscore', (value)=>{
    if(!value){
        return "";
    }

    return value.replace(/(?!^.?\/|^)([A-Z])/g, function ($1) {
        return "_" + $1;
    }).toLowerCase();
} );

handlebars.registerHelper('capitalizedmethod', (operation)=>{
    if(operation['x-purecloud-method-name']){
        return operation['x-purecloud-method-name'][0].toUpperCase() + operation['x-purecloud-method-name'].substring(1);
    }else if(operation['operationId']){
        return operation['operationId'][0].toUpperCase() + operation['operationId'].substring(1);
    }

    return "";

} );

handlebars.registerHelper('property_type', (property)=>{
    var modelName = getModelName(property);

    if(modelName != null){
        return modelName;
    }

    return  property.type ;
} );


handlebars.registerHelper('property_type_display', (property)=>{
    var modelName = getModelName(property);

    if(modelName != null){
        if(property.type){
            if(property.additionalProperties && property.additionalProperties['$ref']){
                return "map string, " + modelName
            }

            return property.type + " " + modelName;
        }
        return modelName;
    }
    return  property.type ;
} );

handlebars.registerHelper('show_examples', (options)=>{
    if(_showExamples) {
        return options.fn(this);
      }
} );

handlebars.registerHelper('with_model', (context, options)=>{
    let modelname = getModelName(context);
    let definition = _swagger.definitions[modelname];

    return options.fn(definition)
});

handlebars.registerHelper('get_model', (parentModel, property)=>{
    if (parentModel == null){
        parentModel = {};
    }
    var currentModelName = parentModel.modelname;

    var modelname = getModelName(property);

    if(modelname !== currentModelName && modelname != null){
        return _swagger.definitions[modelname];
    }

    return null;
} );

//We get into tough scenarios where sometimes a user has a manager which is a user, which has a manager, etc and we hit a call stack limit
//other cases we could have a user with a status and the status refers back to the user.
//in both cases we need some special logic to handle it.  This method could break pretty easily, sorry.  ¯\_(ツ)_/¯
handlebars.registerHelper('nested_model', (parentModel, property)=>{
    var currentModelName = parentModel.modelname;

    var modelname = getModelName(property);

    if(modelname !== currentModelName && modelname != null){

        var model = _swagger.definitions[modelname];

        for(var x=0; x< Object.keys(model.properties).length; x++){
            var propKey = Object.keys(model.properties)[x];

            var subModelname = getModelName(model.properties[propKey]);

            if((propKey === "manager" && modelname === "User") ||
            (propKey === "errors" && modelname === "ErrorBody") ||
            (propKey === "terms" && modelname === "ResourceConditionNode") ||
            (propKey === "user" && modelname === "OutOfOffice") ||
            (propKey === "terms" && modelname === "DomainResourceConditionNode") ||
            (propKey === "site" && modelname === "Edge" && currentModelName !== "EdgeEntityListing")||
            (propKey === "edge" && modelname === "Site") ||
            (propKey === "conversation" && modelname === "Evaluation") ||
            (propKey === "route" && modelname === "QueueEmailAddress") ||
            (propKey === "publishedVersions" && modelname === "EvaluationForm"))
            {
                return `Model is an instance of ${subModelname}` ;
            }
            //Id you hit a stack limit, uncomment this and it will help you determine where the recursion is.
            // if((subModelname === currentModelName || subModelname === modelname )){
            //         console.log(`subModelname ${currentModelName} -  ${modelname} - ${subModelname} - ${propKey} `);
            // }

        }

        return modelTemplate(model);
    }

    return  "Model is another instance of " + modelname;
});


var handlebarfile = null;
var template = null;

var modelfile = null;
var modelTemplate = null;


module.exports = {
    setShowExamples(showExamples){
        _showExamples = showExamples;
    },
    setup(templateDirectory, swagger){
        handlebars.registerHelper('show_examples', (options)=>{
            if(_showExamples === true || _showExamples === "true") {
               return options.fn(this);
            }
        } );

        _swagger = swagger;
        console.log(`using template directory ${templateDirectory}`);

        fs.readdirSync(templateDirectory).forEach(filename => {
            var matches = /^([^.]+).hbs$/.exec(filename);
            if (!matches) {
                return;
            }
            var name = matches[1];
            var template = fs.readFileSync(templateDirectory + '/' + filename, 'utf8');
            handlebars.registerPartial(name, template);
        });

        handlebarfile = fs.readFileSync(templateDirectory + '/category.hbs' , 'utf8');
        template = handlebars.compile(handlebarfile);

        modelfile = fs.readFileSync(templateDirectory  + "/model.hbs", 'utf8');
        modelTemplate = handlebars.compile(modelfile);

        return handlebars;
    },
    execute(category){
        return template(category);
    }
}
