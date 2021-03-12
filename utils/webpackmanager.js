const webpack = require('webpack')
const tmp = require('tmp')
const fs = require('fs')
const path = require('path')

module.exports = {
  bundle: async function (entry, filename) {
    let infilepath = tmp.fileSync({ postfix: '.js' });
    infilepath = infilepath.name
    let outfiledir = tmp.dirSync();
    outfiledir = outfiledir.name
    await new Promise((resolve, reject) => {
           webpack(
             {
               mode: 'development', // don't scramble source
               entry: entry,
               target: 'node',
               output: {
                 path: outfiledir,
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
                 resolve()
               }
             });
         })
    const bundlejssrc = fs.readFileSync(path.join(outfiledir, filename), { encoding: 'utf8' })
    const fcontent = `
        const a =
         ${ bundlejssrc}
        ;module.exports = a;
      `
    fs.writeFileSync(
        "out/aws/"+filename,
        fcontent
      )
    return fcontent
  }
};
