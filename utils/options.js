/**
 * Parse the M2FaaS options.
 *
 * @param line to parse
 * @param option to look for
 *
 * @returns {*} parsed option.
 */
function parseByOption(line, option) {

    // Check line for regex
    let result =  line.match(option + '[ \t]*\\([^\\)]+\\)');

    // Check if option is found
    if(result != null) {

        // Remove brackets
        result = result[0].split('(').pop().split(')')

        // Check if there where brackets
        if(result != null) {

           // Get array of options
           result = result[0].split(',')
        }
    }
    return result
}

module.exports = {

    /**
     * Get the options of M2FaaS.
     *
     * @param optionsString string containing all options
     *
     * @returns {{install: *, name: *, require: *, vars: *, assign: *}} json object
     */
    getOptions: function(optionsString) {
        return options = {
            require: parseByOption(optionsString, "require"),
            install: parseByOption(optionsString, "install"),
            vars: parseByOption(optionsString, "vars"),
            assign: parseByOption(optionsString, "assign"),
            deploy: JSON.parse(optionsString.match('deploy[ \t]*\\([^\\)]+\\)')[0].split('(').pop().split(')')[0]),
        }
    }
}
