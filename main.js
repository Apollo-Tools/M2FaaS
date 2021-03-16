/**
 * External project dependencies.
 */
const fs = require('fs');
const readline = require('readline');
const prettier = require('prettier');

/**
 * Internal project dependencies.
 */
const optionsDetector = require('./utils/options');
const aws = require('./utils/provider/aws');
const webpackmanager = require('./utils/webpackmanager')

/**
 * Starting point of M2FaaS.
 *
 * @param project root directory
 * @returns {Promise<void>}
 */
async function main(project) {

    // Read all files in project root
    let files = fs.readdirSync(project, {withFileTypes: true})
        .filter(item => !item.isDirectory())
        .map(item => item.name);

    // Create output directory if it does not exists
    if (!fs.existsSync("out")) {
        fs.mkdirSync("out");
    }

    // Iterate over all files
    for (let file of files) {

        let absolutePath = project + "/" + file;

        console.log("Checking file \"" + absolutePath + "\" ...");

        fs.readFile(absolutePath, 'utf8', function (err, data) {
            // Convert file to string[]
            var fileContent = data.split("\n")

            // Creat read interface to read line by line
            const readInterface = readline.createInterface({
                input: fs.createReadStream(absolutePath)
            });

            // Initialize variables
            let requires = '', inputs = '', codeBlock = '', returnJsonString = '', jsonInput = '', funcReturn = '',
                functionName = '';
            let provider = 'aws';
            let inCodeBlock = false, firstLine = false;
            let startLine = -1, endLine = -1, lines = 0;
            var cFunctionFiles = [];

            // Read line by line
            readInterface.on('line', async function (line) {

                // Increase total number of lines
                lines++;

                // Detect code block
                if (line.includes('cfunend')) {

                    console.log("Porting cloud function " + functionName + " from \"" + absolutePath + "\" ...");

                    // End of code block
                    endLine = lines - 1;

                    // Create directory for aws
                    if (!fs.existsSync("out/" + provider)) {
                        fs.mkdirSync("out/" + provider);
                    }

                    // Create index.js file for the cloud function
                    fs.writeFileSync(
                        "out/" + provider + "/" + functionName + ".js",
                        aws.index(requires, inputs, codeBlock, /*returnJsonString*/"{}")
                    );
                    cFunctionFiles.push(functionName + ".js");

                    // Reset variables
                    codeBlock = '';
                    inCodeBlock = false;

                    // Adapt initial source code and read file
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
                        `, {parser: "babel"});

                    // Generate package.json
                    var pckgGenerator = require('./utils/packageGenerator');
                    pckgGenerator.packageGen(functionName, installs);
                    cFunctionFiles.push("package.json");

                    // Deploy function
                    const AdmZip = require('adm-zip');
                    var zip = new AdmZip();
                    for (const f of cFunctionFiles) {
                        zip.addLocalFile('./out/' + provider + '/' + f);
                    }
                    zip.writeZip('./out/' + provider + '/' + provider + '.zip');

                    //aws.deploy(functionName, region);

                } else if (line.includes('cfun')) {

                    // Found start of code block
                    startLine = lines;

                    // Detect M2FaaS options
                    var options = optionsDetector.getOptions(line);

                    // TODO remove this line
                    console.log(options);

                    // Set function name
                    functionName = options.name;

                    // Handle require option
                    for (const value of options.require) {
                        let requireElement = value.split(' as ')
                        requires += "const " + requireElement[1] + " = require(\"" + requireElement[0] + "\")\n"

                        // Handle file dependencies for local dependencies
                        if (/^\w+$/.test(requireElement[0]) === false) {
                            let jsFile = requireElement[0].match('[a-zA-Z]*.js')[0];
                            await webpackmanager.bundle(project + "/" + jsFile, jsFile);
                            cFunctionFiles.push(jsFile);
                        }
                    }

                    // Handle "vars" option
                    jsonInput = "{ ";
                    options.vars.forEach(function (value) {
                        inputs += "let " + value + " = event." + value + "\n"
                        jsonInput += value + ": " + value + ", "
                    });
                    jsonInput = jsonInput.slice(0, -1) + " }";

                    // Handle assign option
                    returnJsonString = "{ ";
                    options.assign.forEach(function (value) {
                        funcReturn += value + " = " + functionName + "Solution.body." + value + "\n"
                        returnJsonString += value + ": " + value + ", "
                    });
                    returnJsonString = returnJsonString.slice(0, -1) + " }";

                    // Handle install option
                    var installs = {};
                    options.install.forEach(function (value) {
                        installs[value] = "latest"
                    });
                }

                // Save code block
                inCodeBlock = true;
                firstLine = true;
                if (inCodeBlock) {
                    firstLine ? firstLine = false : codeBlock += line + "\n";
                }
            });

            // Write file to output storage
            fs.writeFileSync('./out/'+file, fileContent.join("\n"));
        });
    }
}

main("./example")
