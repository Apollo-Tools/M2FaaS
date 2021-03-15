const fs = require('fs');
const readline = require('readline');
const prettier = require('prettier')
const generator = require('./utils/generator')
const optionsDetector = require('./utils/options')
var AWS = require('aws-sdk');


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
    var startLine = -1;
    var endLine = -1;
    var lines = 0;
    var jsonInput = "";
    var funcReturn = "";
    var functionName = "m2faasTest"

    // Read line by line
    readInterface.on('line', function(line) {

        // Total number of lines
        lines++;

        // Detect code block
        if(line.includes('cfunend')){

            endLine = lines - 1;

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

            fs.readFile(project, 'utf8', function(err, data) {
                var monolithLines = data.split("\n")

                // Comment out lines
                for (var i = startLine; i < endLine; i++) {
                    monolithLines[i] = "// " + monolithLines[i];
                }

                // Serverless call
                var region = 'us-east-1'
                var creds = new AWS.SharedIniFileCredentials({profile: 'default'});

                var functionInput =

                console.log(creds.secretAccessKey)
                monolithLines[endLine] += "\n" + prettier.format(`
                    var awsSDK = require('aws-sdk');
                    var credentialsAmazon = new awsSDK.SharedIniFileCredentials({profile: 'default'});
                    let ${functionName}Solution = JSON.parse(await (new (require('aws-sdk'))
                        .Lambda({ accessKeyId: credentialsAmazon.accessKeyId, secretAccessKey: credentialsAmazon.secretAccessKey, region: '${region}' }))
                        .invoke({
                            FunctionName: "${functionName}",
                            Payload: JSON.stringify(${jsonInput})
                        })
                        .promise().then(p => p.Payload));
                    ${funcReturn}
                    `, { parser: "babel"})

                //console.log(monolithLines.join("\n"))

                fs.writeFileSync('./out/simpleFunction.js', monolithLines.join("\n"));
            });

        } else if(line.includes('cfun')){

            startLine = lines;

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

            jsonInput = "{ ";
            options.vars.forEach(function(value) {
                jsonInput += value + ": " + value + ", "
            });
            jsonInput =  jsonInput.slice(0,-1) + " }";

            returnJsonString = "{ ";
            options.assign.forEach(function(value) {
                returnJsonString += value + ": " + value + ", "
            });
            returnJsonString =  returnJsonString.slice(0,-1) + " }";

            options.assign.forEach(function(value) {
                funcReturn += value + " = " + functionName +  "Solution.body." + value + "\n"
            });

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
