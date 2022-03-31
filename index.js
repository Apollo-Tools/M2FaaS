#!/usr/bin/env node

const fs = require('fs');
const readline = require('readline');
const optionsDetector = require('./utils/options');
const aws = require('./utils/provider/aws');
const ibm = require('./utils/provider/ibm');
const webpackManager = require('./utils/webpackmanager');
const m2FaaSInvoker = require('./utils/invokerGenerator');
const packageGenerator = require('./utils/packageGenerator');

var NODE_MODULES = 'node_modules'
var OUTPUT_DIRECTORY = 'out'
var PATH_SEPARATOR = '/'
var LINE_SEPARATOR = '\n'
var REQUIRE_SEPARATOR = ' as '
var ENCODING = 'utf8'
var ANNOTATION_END = 'cfunend'
var ANNOTATION_START = 'cfun'
var PROVIDER_AWS = 'aws'
var PROVIDER_IBM = 'ibm'

/**
 * Get all files from a specific directory.
 *
 * @param directory the current directory to check.
 * @param files found in the directory.
 * @returns {Promise<void>}
 */
const getFilesInDirectory = function(directory, files) {
    files = files || [];

    // Read current path and iterate over all files
    fs.readdirSync(directory).forEach(function(element) {
        let current = directory + PATH_SEPARATOR + element;

        // Check if the current element is a file
        if (fs.statSync(current).isFile()) {
            files.push(current);
        } else if (!directory.includes(NODE_MODULES)){
            files = getFilesInDirectory(current, files);
        }
    })
    return files;
}

/**
 * Starting point of M2FaaS.
 *
 * @param project root directory
 * @returns {Promise<void>}
 */
async function main(project) {

    project = project.startsWith("." + PATH_SEPARATOR) ? project : '.' + PATH_SEPARATOR + project;

    // Read all files in project root
    let files = getFilesInDirectory(project, []);

    // Create output directory if it does not exists
    fs.mkdirSync(OUTPUT_DIRECTORY, { recursive: true });

    // Iterate over all files
    for (let file of files) {

        // Read file
        await fs.readFile(file, ENCODING, async function (err, data) {

            // Convert file to string[]
            const fileContent = data.split(LINE_SEPARATOR);

            // Initialize variables
            let codeBlock = '', startLineContent = '';
            let inCodeBlock = false;
            let startLine = -1;

            // Iterate over lines
            for (var lineNumber = 0; lineNumber < fileContent.length; lineNumber++) {
                let line = fileContent[lineNumber]

                // Detect code block
                if (line.includes(ANNOTATION_END)) {
                    inCodeBlock = false;

                    // Detect M2FaaS options
                    const options = optionsDetector.getOptions(startLineContent);

                    let requires = '';
                    // Iterate over all require elements
                    for (const value of options.require) {

                        // Parse option
                        let requireElement = value.split(REQUIRE_SEPARATOR);

                        // Add dependency definition
                        requires += "const " + requireElement[1].replace(' ','') + " = require(\"" + requireElement[0].replace(' ','') + "\")\n"

                        // Handle file dependencies for local dependencies
                        if (/^.\//.test(requireElement[0]) === true) {
                            let jsFile = requireElement[0].replace('./','');

                            // Bundle dependency
                            let fContent = await webpackManager.bundle(project + PATH_SEPARATOR + jsFile, jsFile);

                            // Handle dependency per provider
                            options.deploy.forEach(element => {

                                // Specify directory
                                let directory = OUTPUT_DIRECTORY + PATH_SEPARATOR + element.provider + PATH_SEPARATOR + element.name + PATH_SEPARATOR;

                                // Create directory and file for provider
                                fs.mkdirSync(directory, { recursive: true });
                                fs.writeFileSync(directory + jsFile, fContent);
                            });
                        }
                    }

                    // Handle vars option
                    let jsonInput = "{ ";
                    let inputs = '';
                    options.vars.forEach(function (value) {

                        // Add element to input json object
                        jsonInput += value + ": " + value + ", "

                        // Remember access to the variable for the serverless function
                        inputs += "let " + value + " = event." + value + "; \n"
                    });
                    jsonInput += " }";

                    // Handle install option
                    const installs = {};
                    options.install.forEach(function (value) {

                        // Remember packages to be installed
                        installs[value] = "latest"
                    });

                    // Handle assign option
                    let returnJsonString = "{ ";
                    options.assign.forEach(function (value) {

                        // Prepare return value of serverless function
                        returnJsonString += value + ": " + value + ", "
                    });
                    returnJsonString += " }";

                    const toInvoke = [];
                    let functionName = '';

                    // Iterate over specified deployments
                    options.deploy.forEach(element => {

                        // Get provider
                        let provider = element.provider;

                        // Get function name
                        functionName = element.name;

                        // Remember the location of the function to invoke
                        toInvoke.push({ 'name': functionName, 'provider': provider, 'region': element.region })

                        // Generate entry of serverless function
                        let indexFile = '';
                        if(provider === PROVIDER_AWS){
                            indexFile = aws.index(requires, inputs, codeBlock, returnJsonString);
                        }else if (provider === PROVIDER_IBM){
                            indexFile = ibm.index(requires, inputs, codeBlock, returnJsonString);
                        }
                        let directoryFunction = OUTPUT_DIRECTORY + PATH_SEPARATOR + provider + PATH_SEPARATOR + functionName;
                        fs.mkdirSync(directoryFunction, { recursive: true });

                        // Write index.js file for the cloud function
                        fs.writeFileSync(directoryFunction + "/index.js", indexFile);

                        // Create m2faaSInvoker.js file to invoke functions fault tolerant
                        fs.writeFileSync(OUTPUT_DIRECTORY + PATH_SEPARATOR + "m2faaSInvoker.js", m2FaaSInvoker.invokerGenerator());

                        // Generate and write package.json
                        let packageContent = packageGenerator.packageGen(functionName, installs);
                        fs.writeFileSync(directoryFunction + "/package.json", packageContent);

                        // Generate node modules
                        const childProcess = require('child_process');
                        childProcess.execSync('npm install .' + PATH_SEPARATOR + directoryFunction + PATH_SEPARATOR + ' --prefix .' + PATH_SEPARATOR + directoryFunction + PATH_SEPARATOR);

                        // Create deployment for serverless function
                        const admZip = require('adm-zip');
                        const zip = new admZip();
                        zip.addLocalFolder('./' + directoryFunction + '/')
                        zip.writeZip('./' + directoryFunction +  '/' + provider + '.zip');

                        console.log("Porting cloud function " + functionName + " from \"" + file + "\" ...");

                        if(provider === PROVIDER_AWS){
                            aws.deploy(element, provider + "/" + functionName + PATH_SEPARATOR + PROVIDER_AWS + '.zip');
                        }else if (provider === PROVIDER_IBM){
                            //ibm.deploy(element, OUTPUT_DIRECTORY + "\\" + provider + "\\" + functionName + "\\" + PROVIDER_IBM + ".zip")
                        }
                    });

                    let funcReturn = '';
                    options.assign.forEach(function (value) {

                        // Prepare access to variable in the monolith
                        funcReturn += value + " = " + functionName + "Result." + value + "\n"
                    });

                    // Adapt initial source code and comment it
                    fileContent[startLine] = "/* " + fileContent[startLine];
                    fileContent[lineNumber - 1] += " */";

                    // Add serverless function call to the monolith
                    fileContent[lineNumber] +=  "\ntry {\n " + functionName + "Result = await require('./m2faaSInvoker').invoke(" + jsonInput + ", " +
                        JSON.stringify(toInvoke) + "); \n} catch (e) {\n " + functionName + "Result = await async function() { " + codeBlock + " return " + returnJsonString + " }(); \n} \n" + funcReturn

                    funcReturn = ''

                    // Reset variables
                    codeBlock = '';
                    fs.writeFileSync('./' + OUTPUT_DIRECTORY + file.replace(project,''), fileContent.join("\n"));

                } else if (line.includes(ANNOTATION_START)) {
                  // Found start of code block
                  startLine = lineNumber;
                  startLineContent = line;
                  inCodeBlock = true
                }

                // Save code block
                if (inCodeBlock) {
                    codeBlock += line + "\n";
                }
            }

            // Write file to output storage
            let actualFile = file.match(/[A-Za-z]+\.[A-Za-z]+/g)
            let path = '.' + PATH_SEPARATOR + OUTPUT_DIRECTORY + file.replace(actualFile, '').replace(project,'');
            fs.mkdirSync(path, { recursive: true });
            fs.writeFileSync(path + actualFile, fileContent.join("\n"));
        });
    }
}

//main("./example")
if(process.argv.length < 3) {
    console.log("Please specify a directory, e.g. \"example/\"");
} else {
    main(process.argv.slice(2)[0])
}
