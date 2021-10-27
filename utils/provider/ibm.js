const prettier = require('prettier')

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

                async function main(event) {
                    ${inputs}
                    ${codeBlock}
                    
                    return ${returnJson};
                }
                exports.main = main
             `, { semi: false, parser: 'babel' }
        )
    },
    /**
     * Deploy new aws lambda function.
     *
     * @param deployment of the cloud function
     */
    deploy: function(deployment, zip) {

        // Deploy new ibm cloud action
        var child_process = require('child_process');
        child_process.execSync('ibmcloud target -r ' + (deployment.region !== undefined ? deployment.region : deployment.region));

        try {
            child_process.execSync('ibmcloud fn action create ' + deployment.name + ' out\\ibm\\' + deployment.name +  '\\ibm.zip --kind ' + (deployment.runtime !== undefined ? deployment.runtime : 'nodejs:12') + " --memory " + (deployment.memorySize !== undefined ? deployment.memorySize : 128) + " --timeout " + ((deployment.timeout !== undefined ? deployment.timeout : 60) * 1000));
        } catch (e) {
            module.exports.update(deployment);
        }
    },
    /**
     * Update cloud function
     *
     * @param deployment of the cloud function
     */
    update: function(deployment) {

        // Reconfigure ibm cloud action
        var child_process = require('child_process');
        child_process.execSync('ibmcloud fn action update ' + deployment.name + ' out\\ibm\\' + deployment.name +  '\\ibm.zip --kind ' + (deployment.runtime !== undefined ? deployment.runtime : 'nodejs:12') + " --memory " + (deployment.memorySize !== undefined ? deployment.memorySize : 128) + " --timeout " + ((deployment.timeout !== undefined ? deployment.timeout : 60) * 1000));
    }
}
