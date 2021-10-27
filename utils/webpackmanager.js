const webpack = require('webpack')
const tmp = require('tmp')
const fs = require('fs')
const path = require('path')

module.exports = {

    /**
     * Create WebPack function.
     *
     * @param entry point for webPack
     * @param filename to be stored
     *
     * @returns {Promise<string>} file content
     */
    bundle: async function (entry, filename) {
        let outPutFileDirectory = tmp.dirSync();
        outPutFileDirectory = outPutFileDirectory.name;

        return new Promise((resolve, reject) => {
           webpack(
             {
               mode: 'development', // don't scramble source
               entry: entry,
               target: 'node',
               output: {
                 path: outPutFileDirectory,
                 filename: filename
               },
             }
             , (err, stats) => {
               if (err || stats.hasErrors()) {
                 console.error(`${EOL}ERROR: Bundling functions or dependencies failed. Check that the files you specified in require(...) all exist and export something:${EOL}`)
                 try {
                   console.log(stats.compilation.errors)
                 } catch(e) {
                   console.log(stats)
                 }
                 // Report to sentry
                 report(new Error(stats.compilation.errors.toString()))

                 reject(err, stats)
               } else {
                   const bundlejssrc = fs.readFileSync(path.join(outPutFileDirectory, filename), { encoding: 'utf8' })
                   const fcontent = `
                    const a =
                     ${ bundlejssrc}
                    ;module.exports = a;
                  `;

                 resolve(fcontent)
               }
             });
        });
    }
};
