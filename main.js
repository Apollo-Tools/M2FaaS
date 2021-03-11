

async function main(project) {

    // Read project file(s)
    var fs = require('fs');
    fs.readFile(project, 'utf8', function(err, data) {
        if (err) throw err;

        // Parse source file
        var esprima = require('esprima');
        var ast = esprima.parseScript(data, { comment: true, loc: true })

        // Detect code block
        var detector = require('./utils/detector')
        var codeBlockStartEnd = detector.detectCodeBlock(ast.comments)

        // Check if code block is found
        if(codeBlockStartEnd[0] != -1 && codeBlockStartEnd[1] != -1 ){
            var codeBlock = data.split('\n').splice(codeBlockStartEnd[0], codeBlockStartEnd[1])

            var optionsDetector = require('./utils/options')
            var options = optionsDetector.readCodeBlock(codeBlock[0]);

            console.log(options)

            var generator = require('./utils/generator')

            // create index.js
            if (!fs.existsSync("out")){
                fs.mkdirSync("out");
            }
            fs.writeFileSync(
                "out/index.js",
                generator.indexAWS()
              )

            // Dependencies
            var webpackmanager = require('./utils/webpackmanager')
            var wpack = await webpackmanager.bundle()
            console.log(wpack)
            fs.writeFileSync(
              "out/bundle.js",
            )

        } else {
            console.log('Skipping file ' + project + ". Could not find annotation start or end")
        }

    });
}

main("example/simpleFunction.js")
