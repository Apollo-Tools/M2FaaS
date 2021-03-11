function parseByOption(line, option) {

    var result =  line.match(option + '[ \t]*\\([^\\)]+\\)')
    if(result != null) {
        result = result[0].split('(').pop().split(')')
        if(result != null) {
           result = result[0].split(',')
        }
    }
    return result
}

module.exports = {
    readCodeBlock: function(optionsString) {
        var options = {
            require: parseByOption(optionsString, "require"),
            install: parseByOption(optionsString, "install"),
            vars: parseByOption(optionsString, "vars"),
            return: parseByOption(optionsString, "return"),
        }

        return options
    }
}
