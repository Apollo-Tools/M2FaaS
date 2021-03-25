const fs = require('fs')

module.exports = {

    /**
     * Generator for the package.json file.
     *
     * @param name for the package file
     * @param dependencies for the cloud function
     */
    packageGen: function(name, dependencies) {

        /// Write package.json file
        return JSON.stringify({
                "name": name,
                "version": "0.0.1",
                "description": "automatically FaaSified by M2FaaS",
                "main": "index.js",
                "author": "M2FaaS",
                "dependencies": dependencies
        });
    }
}
