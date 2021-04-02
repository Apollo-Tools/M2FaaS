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

                function main(event) {
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
    deploy: function(deployment) {

        // Deploy new ibm cloud action
        var child_process = require('child_process');
        child_process.execSync('ibmcloud target -r ' + deployment.region);

        try {
            child_process.execSync('ibmcloud fn action create ' + deployment.name + ' out\\ibm\\ibm.zip --kind ' + deployment.runtime);
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
        child_process.execSync('ibmcloud fn action update ' + deployment.name + ' out\\ibm\\ibm.zip --kind ' + deployment.runtime);
    }
}