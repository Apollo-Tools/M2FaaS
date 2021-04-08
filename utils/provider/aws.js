/**
 * External dependencies.
 */
const awsSDK = require('aws-sdk');
const fs = require('fs');
const prettier = require('prettier')

/**
 * Shared AWS credentials.
 */
const credentialsAmazon = new awsSDK.SharedIniFileCredentials({profile: 'default'});

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
     * @param deployment of the cloud function
     */
    deploy: function(deployment) {

        new awsSDK.IAM().createRole()


        // Deploy new aws lambda function
        new awsSDK
            .Lambda({
                accessKeyId: credentialsAmazon.accessKeyId,
                secretAccessKey: credentialsAmazon.secretAccessKey,
                region: deployment.region !== undefined ? deployment.region : 'us-east-1'
            })
            .createFunction(
                {
                    Code: {
                        ZipFile: fs.readFileSync('./out/aws/aws.zip')
                    },
                    FunctionName: deployment.name,
                    Handler: 'index.handler',
                    MemorySize: deployment.memorySize !== undefined ? deployment.memorySize : 128,
                    Runtime: deployment.runtime !== undefined ? deployment.runtime : 'nodejs14.x',
                    Timeout: deployment.timeout !== undefined ? deployment.timeout : 60,
                    Role: deployment.role
                }
            )
            .promise().then(p => p.Payload).catch(function error(){ module.exports.update(deployment) } );
    },
    /**
     * Update cloud function
     *
     * @param deployment of the cloud function
     */
    update: function(deployment) {

        // Reconfigure lambda function
        new awsSDK
            .Lambda({
                accessKeyId: credentialsAmazon.accessKeyId,
                secretAccessKey: credentialsAmazon.secretAccessKey,
                region: deployment.region !== undefined ? deployment.region : 'us-east-1'
            })
            .updateFunctionConfiguration(
                {
                    FunctionName: deployment.name,
                    Handler: deployment.name + '.handler',
                    MemorySize: deployment.memorySize !== undefined ? deployment.memorySize : 128,
                    Runtime: deployment.runtime !== undefined ? deployment.runtime : 'nodejs14.x',
                    Timeout: deployment.timeout !== undefined ? deployment.timeout : 60,
                    Role: deployment.role,
                }
            )
            .promise().then(p => p.Payload).catch(function error(err){console.log("Could not update configuration of lambda function: " + err)});

        // Update function code
        new awsSDK
            .Lambda({
                accessKeyId: credentialsAmazon.accessKeyId,
                secretAccessKey: credentialsAmazon.secretAccessKey,
                region: deployment.region !== undefined ? deployment.region : 'us-east-1'
            })
            .updateFunctionCode(
                {
                    FunctionName: deployment.name,
                    ZipFile: fs.readFileSync('./out/aws/aws.zip'),
                }
            )
            .promise().then(p => p.Payload).catch(function error(err){console.log("Could not update function code of lambda function: " + err)});
    }
}
