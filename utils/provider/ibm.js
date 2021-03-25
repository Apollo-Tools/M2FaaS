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
     * @param functionName of the cloud function
     * @param region where to deploy
     */
    deploy: function(functionName, region) {

        // Deploy new ibm cloud action
        var child_process = require('child_process');
        child_process.execSync('ibmcloud target -r '+region);

        try {
            child_process.execSync('ibmcloud fn action create ' + functionName + ' out\\ibm\\ibm.zip --kind nodejs:12');
        } catch (e) {
            module.exports.update(functionName, region);
        }
    },
    /**
     * Update cloud function
     *
     * @param functionName of the cloud function
     * @param region where to deploy
     */
    update: function(functionName, region) {

        // Reconfigure ibm cloud action
        var child_process = require('child_process');
        child_process.execSync('ibmcloud fn action update ' + functionName + ' out\\ibm\\ibm.zip --kind nodejs:12');
    }
}
