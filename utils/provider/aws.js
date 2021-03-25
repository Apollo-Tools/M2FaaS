const awsSDK = require('aws-sdk');
const fs = require('fs');
const prettier = require('prettier')

// Shared aws credentials
var credentialsAmazon = new awsSDK.SharedIniFileCredentials({profile: 'default'});

module.exports = {

    /**
     * Generate the stating base for an AWS lambda function.
     *
     * @param requires dependencies
     * @param inputs global variables
     * @param codeBlock for the cloud function
     * @param returnJson return of the cloud function
     *
     * @returns {*} file content
     */
    index: function(requires, inputs, codeBlock, returnJson) {
        return prettier.format(`
                ${requires}

                exports.handler = async (event) => {
                    ${inputs}
                    ${codeBlock}
                    return response = {
                        statusCode: 200,
                        body: ${returnJson},
                    };
                };
             `, { semi: false, parser: 'babel' }
        )
    },
    /**
     * Deploy new aws lambda function.
     *
     * @param functionName of the cloud function
     * @param region where to deploy
     */
    deploy: function(functionName, region) {

        // Deploy new aws lambda function
        new awsSDK
            .Lambda({
                accessKeyId: credentialsAmazon.accessKeyId,
                secretAccessKey: credentialsAmazon.secretAccessKey,
                region: region
            })
            .createFunction(
                {
                    Code: {
                        ZipFile: fs.readFileSync('./out/aws/aws.zip')
                    },
                    FunctionName: functionName,
                    Handler: 'index.handler',
                    MemorySize: 128,
                    Runtime: 'nodejs14.x',
                    Timeout: 60,
                    Role: 'arn:aws:iam::170392512081:role/service-role/getFlight-role-n1g2o34s'
                }
            )
            .promise().then(p => p.Payload).catch(function error(){ module.exports.update(functionName, region) } );
    },
    /**
     * Update cloud function
     *
     * @param functionName of the cloud function
     * @param region where to deploy
     */
    update: function(functionName, region) {

        // Reconfigure lambda function
        new awsSDK
            .Lambda({
                accessKeyId: credentialsAmazon.accessKeyId,
                secretAccessKey: credentialsAmazon.secretAccessKey,
                region: region
            })
            .updateFunctionConfiguration(
                {
                    FunctionName: functionName,
                    Handler: functionName + '.handler',
                    MemorySize: 128,
                    Role: 'arn:aws:iam::170392512081:role/service-role/getFlight-role-n1g2o34s',
                    Runtime: "nodejs14.x",
                    Timeout: 60,
                }
            )
            .promise().then(p => p.Payload).catch(function error(err){console.log("Could not update configuration of lambda function: " + err)});

        // Update function code
        new awsSDK
            .Lambda({
                accessKeyId: credentialsAmazon.accessKeyId,
                secretAccessKey: credentialsAmazon.secretAccessKey,
                region: region
            })
            .updateFunctionCode(
                {
                    FunctionName: functionName,
                    ZipFile: fs.readFileSync('./out/aws/aws.zip'),
                }
            )
            .promise().then(p => p.Payload).catch(function error(err){console.log("Could not update function code of lambda function: " + err)});
    }
}
