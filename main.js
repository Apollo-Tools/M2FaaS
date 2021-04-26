/**
 * External project dependencies.
 */
const fs = require('fs');
const readline = require('readline');

/**
 * Internal project dependencies.
 */
const optionsDetector = require('./utils/options');
const aws = require('./utils/provider/aws');
const ibm = require('./utils/provider/ibm');
const webpackManager = require('./utils/webpackmanager');
const m2FaaSInvoker = require('./utils/invokerGenerator');

const getAllFiles = function(dirPath, arrayOfFiles, project) {
    arrayOfFiles = arrayOfFiles || [];
    fs.readdirSync(dirPath).forEach(function(file) {
        if (fs.statSync(dirPath + "/" + file).isDirectory()) {
            if(!dirPath.includes('node_modules')){
                arrayOfFiles = getAllFiles(dirPath + "/" + file, arrayOfFiles, project);
            }
        } else {
            arrayOfFiles.push(dirPath.replace(project  + '','') + '/' + file);
        }
    })
    return arrayOfFiles;
}

/**
 * Starting point of M2FaaS.
 *
 * @param project root directory
 * @returns {Promise<void>}
 */
async function main(project) {

    // Read all files in project root
    let files = getAllFiles(project, [], project);

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
            const fileContent = data.split("\n");

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
                    const options = optionsDetector.getOptions(startLineContent);

                    console.log(options)

                    // Handle require option
                    if (options.require !== null) {
                        for (const value of options.require) {
                            let requireElement = value.split(' as ')
                            requires += "const " + requireElement[1] + " = require(\"" + requireElement[0] + "\")\n"

                            // Handle file dependencies for local dependencies
                            if (/^\w+$/.test(requireElement[0]) === false) {
                                let jsFile = requireElement[0].match('[a-zA-Z]*.js')[0];
                                let fContent = await webpackManager.bundle(project + "/" + jsFile, jsFile);

                                options.deploy.forEach(element => {
                                    let provider = element.provider;
                                    // Create directory for provider
                                    if (!fs.existsSync("out/" + provider)) {
                                        fs.mkdirSync("out/" + provider);
                                    }
                                    fs.writeFileSync(
                                        "out/" + provider + "/" + jsFile,
                                        fContent
                                    );
                                });
                            }
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
                    const installs = {};
                    if(options.install !== null){
                        options.install.forEach(function (value) {
                            installs[value] = "latest"
                        });
                    }

                    const depIn = [];
                    options.deploy.forEach(element => {

                        depIn.push({
                            'name': element.name,
                            'provider': element.provider,
                            'region': element.region
                        })

                        let provider = element.provider;

                        // Set function name
                        functionName = element.name;

                        console.log("Porting cloud function " + functionName + " from \"" + absolutePath + "\" ...");

                        // Handle assign option
                        returnJsonString = "{ ";
                        options.assign.forEach(function (value) {
                            returnJsonString += value + ": " + value + ", "
                        });
                        returnJsonString = returnJsonString.slice(0, -1) + " }";

                        let indexFile = '';
                        if(provider === 'aws'){
                            indexFile = aws.index(requires, inputs, codeBlock, returnJsonString);
                        }else if (provider === 'ibm'){
                            indexFile = ibm.index(requires, inputs, codeBlock, returnJsonString);
                        }

                        if (!fs.existsSync("out/" + provider + "/" + element.name)) {
                            fs.mkdirSync("out/" + provider + "/" + element.name);
                        }

                        // Create index.js file for the cloud function
                        fs.writeFileSync(
                            "out/" + provider + "/" + element.name + "/index.js",
                            indexFile
                        );

                        // Create m2faaSInvoker.js
                        fs.writeFileSync(
                            "out/m2faaSInvoker.js",
                            m2FaaSInvoker.invokerGenerator()
                        );

                        // Generate package.json
                        const pckgGenerator = require('./utils/packageGenerator');
                        let packageContent = pckgGenerator.packageGen(functionName, installs);
                        fs.writeFileSync(
                            "out/"+provider+ "/" + element.name + "/package.json",
                            packageContent
                        );

                        // Generate node modules
                        const child_process = require('child_process');
                        child_process.execSync('cd out/' + provider + "/" + element.name +  ' && npm install && cd ../..');

                        // Deploy function
                        const AdmZip = require('adm-zip');
                        const zip = new AdmZip();
                        zip.addLocalFolder('./out/' + provider + "/" + element.name +  '/')
                        zip.writeZip('./out/' + provider + "/" + element.name +  '/' + provider + '.zip');

                        if(provider === 'aws'){
                            aws.deploy(element, provider + "/" + element.name +  '/aws.zip');
                        }else if (provider === 'ibm'){
                            region = 'eu-gb'
                            ibm.deploy(element, "out\\"+provider+"\\"+element.name+"\\ibm.zip")
                        }
                    });

                    // Handle assign option
                    options.assign.forEach(function (value) {
                        funcReturn += value + " = " + functionName + "Solution." + value + "\n"
                    });

                    // Adapt initial source code and read file
                    fileContent[startLine] = "/*\n" + fileContent[startLine];
                    fileContent[endLine - 1] = fileContent[endLine - 1] + " */ ";

                    // Add serverless function call to the monolith

                    fileContent[endLine] +=  "\nlet " + functionName + "Solution = await require('./m2faaSInvoker').invoke(" + jsonInput + ",  " +
                        JSON.stringify(depIn) + ");\n" + funcReturn

                    funcReturn = ''

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

main("./example_eval_n2f")
