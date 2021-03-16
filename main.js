/**
 * External project dependencies.
 */
const fs = require('fs');
const readline = require('readline');
const prettier = require('prettier');

/**
 * Internal project dependencies.
 */
const generator = require('./utils/generator');
const optionsDetector = require('./utils/options');
const aws = require('./utils/provider/aws');

/**
 * Starting point of M2FaaS.
 *
 * @param project root directory
 * @returns {Promise<void>}
 */
async function main(project) {

    // Creat read interface to read line by line
    const readInterface = readline.createInterface({
        input: fs.createReadStream(project)
    });

    // Initialize variables
    let requires = '', inputs = '', codeBlock = '', returnJsonString = '', jsonInput = '', funcReturn = '', functionName = '';
    let inCodeBlock = false, firstLine = false;
    let startLine = -1, endLine = -1, lines = 0;

    // Read line by line
    readInterface.on('line', function(line) {

        // Increase total number of lines
        lines++;

        // Detect code block
        if(line.includes('cfunend')) {

            // End of code block
            endLine = lines - 1;

            // Create output directory if it does not exists
            if (!fs.existsSync("out")){
                fs.mkdirSync("out");
            }

            // Create index.js file for the cloud function
            fs.writeFileSync(
                "out/aws/index.js",
                generator.indexAWS(requires, inputs, codeBlock, returnJsonString)
            );

            // Reset variables
            codeBlock = '';
            inCodeBlock = false;

            // Adapt initial source code and read file
            fs.readFile(project, 'utf8', function(err, data) {

                // Convert file to string[]
                var fileContent = data.split("\n")

                // Comment code block
                fileContent[startLine] = "/*\n" + fileContent[startLine];
                fileContent[endLine - 1] = fileContent[endLine - 1] + " */ ";

                // Add serverless function call to the monolith
                var region = 'us-east-1';
                fileContent[endLine] += "\n" + prettier.format(`
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
                    `, { parser: "babel"});

                // Write file back to storage
                fs.writeFileSync('./out/simpleFunction.js', fileContent.join("\n"));

                // Generate package.json
                var pckgGenerator = require('./utils/packageGenerator');
                pckgGenerator.packageGen(functionName, installs);

                // Deploy function
                const AdmZip = require('adm-zip');
                var zip = new AdmZip();
                zip.addLocalFile('./out/aws/foo.js');
                zip.addLocalFile('./out/aws/index.js');
                zip.addLocalFile('./out/aws/package.json');
                zip.writeZip('./out/aws/aws.zip');

                aws.deploy(functionName, region);
            });

        } else if(line.includes('cfun')){

            // Found start of code block
            startLine = lines;

            // Detect M2FaaS options
            var options = optionsDetector.getOptions(line);

            // TODO remove this line
            console.log(options);

            // Set function name
            functionName = options.name;

            // Handle require option
            options.require.forEach(function(value) {
                let requireElement = value.split(' as ')
                requires += "const " + requireElement[1] + " = require(\"" + requireElement[0] + "\")\n"

                // Handle file dependencies for local dependencies
                if (/^\w+$/.test(requireElement[0]) === false) {
                    var webpackmanager = require('./utils/webpackmanager')
                    webpackmanager.bundle("./example/foo.js", requireElement[0].match('[a-zA-Z]*.js')[0])
                }
            });

            // Handle "vars" option
            jsonInput = "{ ";
            options.vars.forEach(function(value) {
                inputs += "let " + value + " = event." + value + "\n"
                jsonInput += value + ": " + value + ", "
            });
            jsonInput =  jsonInput.slice(0,-1) + " }";

            // Handle assign option
            returnJsonString = "{ ";
            options.assign.forEach(function(value) {
                funcReturn += value + " = " + functionName +  "Solution.body." + value + "\n"
                returnJsonString += value + ": " + value + ", "
            });
            returnJsonString =  returnJsonString.slice(0,-1) + " }";

            // Handle install option
            var installs = {};
            options.install.forEach(function(value) {
                installs[value] = "latest"
            });
        }

        // Save code block
        inCodeBlock = true;
        firstLine = true;
        if(inCodeBlock){
            firstLine ? firstLine = false : codeBlock += line + "\n";
        }
    });
}

main("example/simpleFunction.js")
