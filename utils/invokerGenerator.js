module.exports = {

    /**
     * Generate the code to run the cloud functions with M2FaaS.
     */
    invokerGenerator: function() {
        return "module.exports = {\n" +
            "    invoke: async function(input, deploy) {\n" +
            "        let solution = {};\n" +
            "        for(var i = 0; i < deploy.length; i++) {\n" +
            "            let element = deploy[i];\n" +
            "            try{if(element.provider === 'aws'){\n" +
            "                var awsSDK = require('aws-sdk');\n" +
            "                var credentialsAmazon = new awsSDK.SharedIniFileCredentials({profile: 'default'});\n" +
            "                solution = JSON.parse(await (new (require('aws-sdk'))\n" +
            "                    .Lambda({ accessKeyId: credentialsAmazon.accessKeyId, secretAccessKey: credentialsAmazon.secretAccessKey, region: element.region }))\n" +
            "                    .invoke({ FunctionName: element.name, Payload: JSON.stringify(input)})\n" +
            "                    .promise().then(p => p.Payload));\n" +
            "            }else if(element.provider === 'ibm'){\n" +
            "                solution = await new Promise(async (resolve, reject) => {\n" +
            "                    try {\n" +
            "                        resolve(JSON.parse(require('child_process').execSync('ibmcloud fn action invoke -r ' + element.name + ' -p \\'' + JSON.stringify(input).replace(':',': ') + '\\'').toString()))\n" +
            "                    } catch(error) {}\n" +
            "                });\n" +
            "            }}catch (e){solution.error = e;}\n" +
            "\n" +
            "            if(!solution.hasOwnProperty('errorMessage') && !solution.hasOwnProperty('error')){\n" +
            "                if(element.provider === 'aws' && solution.hasOwnProperty('body')){\n" +
            "                    return solution.body;\n" +
            "                }\n" +
            "                return solution;\n" +
            "            }\n" +
            "        }\n" +
            "        return null;\n" +
            "    }\n" +
            "}";
    }
}