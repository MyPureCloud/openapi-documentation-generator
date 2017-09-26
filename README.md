This project is a node app which will generate doc output for the resources.  Why not use [swagger-codegen](https://github.com/swagger-api/swagger-codegen)?  Well I had a need to use this both as a CLI tool and also to import into node based web servers.

Used to generate the documentation at https://developer.mypurecloud.com/api/rest/v2/users/index.html

# Usage

Run
```openapi-documentation-generator -h```
for the available options.

## Example

~~~openapi-documentation-generator  --swaggerurl=https://s3.dualstack.us-east-1.amazonaws.com/inin-prod-api/us-east-1/public-api-v2/swagger-schema/publicapi-v2-latest.json --output=/Data/bitbucket/developer-center/source/partials/generated/api/rest/v2 --templatedir=/Data/bitbucket/developer-center/templates --showexamples=true~~~
