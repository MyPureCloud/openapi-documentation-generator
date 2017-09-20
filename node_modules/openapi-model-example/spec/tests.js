var chai = require('chai');
var expect = chai.expect; // we are using the "expect" style of Chai
var ModelExample = require('./../index');
var fs = require('fs');

var swagger = JSON.parse(fs.readFileSync("./spec/swagger.json", 'UTF-8'));
var purecloudswagger = JSON.parse(fs.readFileSync("./spec/purecloud_swagger.json", 'UTF-8'));

describe('Model Example', function() {
  it('Should Find the Pet Definition', function() {
    //var modelExample = new ModelExample();

    var definition = ModelExample.findRefDefinition("#/definitions/Pet", swagger);
    expect(definition).not.to.be.null;
  });

  it('Should parse the Pet Definition', function() {
      var example = ModelExample.getModelExample("#/definitions/Pet", swagger, true);
     // console.log(example);
  });
});


describe('Model Description', function() {

  it('Should parse the Pet Definition', function() {
      var example = ModelExample.getModelDescription("#/definitions/Pet", swagger, true);
      //console.log(example);
  });
/*
  it('Should parse the User Definition', function() {
      var example = ModelExample.getModelDescription("#/definitions/User", purecloudswagger, true);
     // console.log(example);
  });
  */
});
