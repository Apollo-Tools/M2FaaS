const fs = require('fs');
const readline = require('readline');
const generator = require('./utils/generator')
const optionsDetector = require('./utils/options')

async function main(project) {

    // Creat read interface to read line by line
    const readInterface = readline.createInterface({
        input: fs.createReadStream(project),
    });

    // Declare variables
    var requires = "";
    var inputs = "";
    var codeBlock = "";
    var returnJsonString = "";
    var inCodeBlock = false;
    var firstLine = false;

    // Read line by line
    readInterface.on('line', function(line) {

        // Detect code block
        if(line.includes('cfunend')){

            // Create index.js
            if (!fs.existsSync("out")){
                fs.mkdirSync("out");
            }
            console.log(codeBlock)
            fs.writeFileSync(
                "out/aws/index.js",
                generator.indexAWS(
                    requires,
                    inputs,
                    codeBlock,
                    returnJsonString
                )
            )
            codeBlock = "";
            inCodeBlock = false;
        } else if(line.includes('cfun')){
            inCodeBlock = true
            firstLine = true
            var options = optionsDetector.readCodeBlock(line);

            console.log(options)

            options.require.forEach(function(value) {
                var req = value.split(' as ')
                requires += "const " + req[1] + " = require(\"" + req[0] + "\")\n"

                // file dependencies
                if (/^\w+$/.test(req[0]) === false) {
                    var webpackmanager = require('./utils/webpackmanager')
                    var wpack = webpackmanager.bundle("./example/foo.js", req[0].match('[a-zA-Z]*.js')[0])
                }
            });

            options.vars.forEach(function(value) {
                inputs += "let " + value + " = event." + value + "\n"
            });

            returnJsonString = "{ ";
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
        }

        if(inCodeBlock){
            if(firstLine){
                firstLine = false
            }else{
                codeBlock += line + "\n";
            }

        }
    });
}

main("example/simpleFunction.js")
