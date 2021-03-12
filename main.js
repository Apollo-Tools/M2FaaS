

async function main(project) {

    // Read project file(s)
    var fs = require('fs');
    fs.readFile(project, 'utf8', function(err, data) {
        if (err) throw err;

        // Parse source file
        var esprima = require('esprima');
        var ast = esprima.parseScript(data, { comment: true, loc: true, tolerant: true })

        // Detect code block
        var detector = require('./utils/detector')
        var codeBlockStartEnd = detector.detectCodeBlock(ast.comments)

        // Check if code block is found
        if(codeBlockStartEnd[0] !== -1 && codeBlockStartEnd[1] !== -1 ){
            var codeBlock = data.split('\n').splice(codeBlockStartEnd[0], codeBlockStartEnd[1]-codeBlockStartEnd[0]+1)

            var optionsDetector = require('./utils/options')
            var options = optionsDetector.readCodeBlock(codeBlock[0]);

            console.log(options)

            var generator = require('./utils/generator')

            var requires = "";
            options.require.forEach(function(value) {
                var req = value.split(' as ')
                requires += "const " + req[1] + " = require(\"" + req[0] + "\")\n"

                // file dependencies
                if (/^\w+$/.test(req[0]) === false) {
                    var webpackmanager = require('./utils/webpackmanager')
                    var wpack = webpackmanager.bundle("./example/foo.js", req[0].match('[a-zA-Z]*.js')[0])
                }
            });

            var inputs = "";
            options.vars.forEach(function(value) {
                inputs += "let " + value + " = event." + value + "\n"
            });

            var returnJsonString = "{ ";
            options.assign.forEach(function(value) {
                returnJsonString += value + ": " + value + ", "
            });
            returnJsonString =  returnJsonString.slice(0,-1) + " }";

            var installs = {};
            options.install.forEach(function(value) {
                installs[value] = "latest"
            });
            var pckgGenerator = require('./utils/packageGenerator')
            pckgGenerator.packageGen(options.name, installs)

            // create index.js
            if (!fs.existsSync("out")){
                fs.mkdirSync("out");
            }
            fs.writeFileSync(
                "out/aws/index.js",
                generator.indexAWS(
                    requires,
                    inputs,
                    codeBlock.splice(1, codeBlockStartEnd[1]-codeBlockStartEnd[0]-1).join('\n'),
                    returnJsonString
                )
              )

        } else {
            console.log('Skipping file ' + project + ". Could not find annotation start or end")
        }

    });
}

main("example/simpleFunction.js")
