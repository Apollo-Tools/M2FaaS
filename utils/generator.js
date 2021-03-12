const prettier = require('prettier')


module.exports = {
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
