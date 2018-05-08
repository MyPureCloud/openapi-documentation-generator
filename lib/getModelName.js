const DEFINITION_REPLACEMENT = "#/definitions/";

module.exports = (property)=>{
    if(!property){
      return null;   
    }

    if(property.schema && property.schema["$ref"]){
        return property.schema["$ref"].replace(DEFINITION_REPLACEMENT, "");
    }
    else if(property.schema && property.schema.items && property.schema.items["$ref"]){
        return property.schema.items["$ref"].replace(DEFINITION_REPLACEMENT, "");
    }
    else if(property.items && property.items['$ref']){
        return property.items["$ref"].replace(DEFINITION_REPLACEMENT, "");
    }
    else if(property['$ref']){
        return property["$ref"].replace(DEFINITION_REPLACEMENT, "");
    }
    else if(property.additionalProperties && property.additionalProperties['$ref']){
        return property.additionalProperties["$ref"].replace(DEFINITION_REPLACEMENT, "");
    }

    return null;
};
