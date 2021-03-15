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
    indexAWS: function(requires, inputs, codeBlock, returnJson) {
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
    }
}
