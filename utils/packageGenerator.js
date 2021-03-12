const fs = require('fs')
const prettier = require('prettier')

module.exports = {
    packageGen: function(name, dependencies) {

        var fcontent = {
            "name": name,
            "version": "0.0.1",
            "description": "",
            "main": "index.js",
            "author": "",
            "dependencies": dependencies
        }

        fs.writeFileSync(
            "out/aws/package.json",
            JSON.stringify(fcontent)
        )
    }
}
