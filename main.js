/**
 * External project dependencies.
 */
const fs = require('fs');
const readline = require('readline');;
const path = require('path');;

/**
 * Internal project dependencies.
 */
const optionsDetector = require('./utils/options');
const aws = require('./utils/provider/aws');
const ibm = require('./utils/provider/ibm');
const webpackmanager = require('./utils/webpackmanager')

/**
 * Starting point of M2FaaS.
 *
 * @param project root directory
 * @returns {Promise<void>}
 */

const getAllFiles = function(dirPath, arrayOfFiles, project) {
    arrayOfFiles = arrayOfFiles || []
    fs.readdirSync(dirPath).forEach(function(file) {
        if (fs.statSync(dirPath + "/" + file).isDirectory()) {
            if(!dirPath.includes('node_modules')){
                arrayOfFiles = getAllFiles(dirPath + "/" + file, arrayOfFiles, project)
            }
        } else {
            arrayOfFiles.push(dirPath.replace(project  + '','') + '/' + file)
        }
    })
    return arrayOfFiles
}

async function main(project) {

    // Read all files in project root
    let files = getAllFiles(project, [], project)

    // Create output directory if it does not exists
    if (!fs.existsSync("out")) {
        fs.mkdirSync("out");
    }

    // Iterate over all files
    for (let file of files) {

        let absolutePath = project + file;

        console.log("Checking file \"" + absolutePath + "\" ...");

        await fs.readFile(absolutePath, 'utf8', async function (err, data) {
            // Convert file to string[]
            var fileContent = data.split("\n")

            // Create read interface to read line by line
            const readInterface = readline.createInterface({
                input: fs.createReadStream(absolutePath)
            });

            // Initialize variables
            let requires = '', inputs = '', codeBlock = '', returnJsonString = '', jsonInput = '', funcReturn = '',
                functionName = '', startLineContent = '';
            let inCodeBlock = false, firstLine = false;
            let startLine = -1, endLine = -1, lines = 0;

            // Read line by line
            await readInterface.on('line', async function (line) {

                // Increase total number of lines
                lines++;

                // Detect code block
                if (line.includes('cfunend')) {

                    inCodeBlock = false;

                    // End of code block
                    endLine = lines - 1;

                    // Detect M2FaaS options
                    var options = optionsDetector.getOptions(startLineContent);

                    console.log(options)

                    // Handle require option
                    for (const value of options.require) {
                        let requireElement = value.split(' as ')
                        requires += "const " + requireElement[1] + " = require(\"" + requireElement[0] + "\")\n"

                        // Handle file dependencies for local dependencies
                        if (/^\w+$/.test(requireElement[0]) === false) {
                            let jsFile = requireElement[0].match('[a-zA-Z]*.js')[0];
                            let fContent = await webpackmanager.bundle(project + "/" + jsFile, jsFile);

                            options.deploy.forEach(element => {
                                let provider = element.provider;
                                // Create directory for provider
                                if (!fs.existsSync("out/" + provider)) {
                                    fs.mkdirSync("out/" + provider);
                                }
                                fs.writeFileSync(
                                    "out/"+provider+"/"+jsFile,
                                    fContent
                                );
                            });

                        }
                    }

                    // Handle "vars" option
                    jsonInput = "{ ";
                    options.vars.forEach(function (value) {
                        inputs += "let " + value + " = event." + value + "\n"
                        jsonInput += value + ": " + value + ", "
                    });
                    jsonInput = jsonInput.slice(0, -1) + " }";

                    // Handle install option
                    var installs = {};
                    options.install.forEach(function (value) {
                        installs[value] = "latest"
                    });

                    options.deploy.forEach(element => {
                        let provider = element.provider;

                        // Set function name
                        functionName = element.name;

                        // Handle assign option
                        returnJsonString = "{ ";
                        options.assign.forEach(function (value) {
                            funcReturn += value + " = " + functionName + "Solution.body." + value + "\n"
                            returnJsonString += value + ": " + value + ", "
                        });
                        returnJsonString = returnJsonString.slice(0, -1) + " }";

                        console.log("Porting cloud function " + functionName + " from \"" + absolutePath + "\" ...");

                        let indexFile = '';
                        if(provider === 'aws'){
                            indexFile = aws.index(requires, inputs, codeBlock, returnJsonString);
                        }else if (provider === 'ibm'){
                            indexFile = ibm.index(requires, inputs, codeBlock, returnJsonString);
                        }

                        // Create index.js file for the cloud function
                        fs.writeFileSync(
                            "out/" + provider + "/index.js",
                            indexFile
                        );

                        // Adapt initial source code and read file
                        fileContent[startLine] = "/*\n" + fileContent[startLine];
                        fileContent[endLine - 1] = fileContent[endLine - 1] + " */ ";

                        // Add serverless function call to the monolith
                        var region = 'us-east-1';
                        fileContent[endLine] += "\nvar awsSDK = require('aws-sdk');\n" +
                            "var credentialsAmazon = new awsSDK.SharedIniFileCredentials({profile: 'default'});\n" +
                            "let " + functionName + "Solution = JSON.parse(await (new (require('aws-sdk'))\n" +
                            "\t.Lambda({ accessKeyId: credentialsAmazon.accessKeyId, secretAccessKey: credentialsAmazon.secretAccessKey, region: '" + region + "' }))\n" +
                            "\t.invoke({ FunctionName: \"" + functionName + "\", Payload: JSON.stringify("+jsonInput+")})\n" +
                            "\t.promise().then(p => p.Payload));\n" + funcReturn;

                        /*
                        let res= JSON.parse('{}');
                        child_process.execSync('ibmcloud fn action invoke m2FaaSExampleIBM -r',
                            function (error, stdout, stderr) {
                                res = JSON.parse(stdout)
                                console.log(stdout)
                            });
                        * */

                        // Generate package.json
                        var pckgGenerator = require('./utils/packageGenerator');
                        let packageContent = pckgGenerator.packageGen(functionName, installs);
                        fs.writeFileSync(
                            "out/"+provider+"/package.json",
                            packageContent
                        );

                        // Generate node modules
                        var child_process = require('child_process');
                        child_process.execSync('cd out/' + provider + ' && npm install && cd ../..');

                        // Deploy function
                        const AdmZip = require('adm-zip');
                        var zip = new AdmZip();
                        zip.addLocalFolder('./out/' + provider + '/')
                        zip.writeZip('./out/' + provider + '/' + provider + '.zip');

                        if(provider === 'aws'){
                            //aws.deploy(functionName, region);
                        }else if (provider === 'ibm'){
                            region = 'eu-gb'
                            ibm.deploy(functionName, region)
                        }
                    });

                    // Reset variables
                    codeBlock = '';
                    fs.writeFileSync('./out'+file, fileContent.join("\n"));

                } else if (line.includes('cfun')) {

                    // Found start of code block
                    startLine = lines;
                    startLineContent = line;

                    inCodeBlock = true
                }

                // Save code block
                if (inCodeBlock) {
                    codeBlock += line + "\n";
                }
            });

            // Write file to output storage
            fs.writeFileSync('./out'+file, fileContent.join("\n"));
        });
    }
}

main("./example")
