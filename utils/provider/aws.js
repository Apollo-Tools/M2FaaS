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

        // Deploy new aws lambda function
        new awsSDK
            .Lambda({
                accessKeyId: credentialsAmazon.accessKeyId,
                secretAccessKey: credentialsAmazon.secretAccessKey,
                region: deployment.region
            })
            .createFunction(
                {
                    Code: {
                        ZipFile: fs.readFileSync('./out/aws/aws.zip')
                    },
                    FunctionName: deployment.name,
                    Handler: 'index.handler',
                    MemorySize: deployment.memorySize,
                    Runtime: deployment.runtime,
                    Timeout: deployment.timeout,
                    Role: 'arn:aws:iam::170392512081:role/service-role/getFlight-role-n1g2o34s'
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
                region: deployment.region
            })
            .updateFunctionConfiguration(
                {
                    FunctionName: deployment.name,
                    Handler: deployment.name + '.handler',
                    MemorySize: deployment.memorySize,
                    Runtime: deployment.runtime,
                    Timeout: deployment.timeout,
                    Role: 'arn:aws:iam::170392512081:role/service-role/getFlight-role-n1g2o34s',
                }
            )
            .promise().then(p => p.Payload).catch(function error(err){console.log("Could not update configuration of lambda function: " + err)});

        // Update function code
        new awsSDK
            .Lambda({
                accessKeyId: credentialsAmazon.accessKeyId,
                secretAccessKey: credentialsAmazon.secretAccessKey,
                region: deployment.region
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
