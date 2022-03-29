module.exports = {

    /**
     * Generate the code to run the cloud functions with M2FaaS.
     */
    invokerGenerator: function() {
        return "module.exports = {\n" +
            "    stringifyWithCircularRefs: function(obj, space) {\n" +
            "        const refs = new Map();\n" +
            "        const parents = [];\n" +
            "        const path = [\"this\"];\n" +
            "        try {\n" +
            "            parents.push(obj);\n" +
            "            return JSON.stringify(obj, checkCircular, space);\n" +
            "        } finally {\n" +
            "            clear();\n" +
            "        }\n" +
            "        function clear() {\n" +
            "            refs.clear();\n" +
            "            parents.length = 0;\n" +
            "            path.length = 1;\n" +
            "        }\n" +
            "        function updateParents(key, value) {\n" +
            "            var idx = parents.length - 1;\n" +
            "            var prev = parents[idx];\n" +
            "            if (prev[key] === value || idx === 0) {\n" +
            "                path.push(key);\n" +
            "                parents.push(value);\n" +
            "            } else {\n" +
            "                while (idx-- >= 0) {\n" +
            "                    prev = parents[idx];\n" +
            "                    if (prev[key] === value) {\n" +
            "                        idx += 2;\n" +
            "                        parents.length = idx;\n" +
            "                        path.length = idx;\n" +
            "                        --idx;\n" +
            "                        parents[idx] = value;\n" +
            "                        path[idx] = key;\n" +
            "                        break;\n" +
            "                    }\n" +
            "                }\n" +
            "            }\n" +
            "        }\n" +
            "        function checkCircular(key, value) {\n" +
            "            if (value != null) {\n" +
            "                if (typeof value === \"object\") {\n" +
            "                    if (key) { updateParents(key, value); }\n" +
            "                    let other = refs.get(value);\n" +
            "                    if (other) {\n" +
            "                        return '[Circular Reference]' + other;\n" +
            "                    } else {\n" +
            "                        refs.set(value, path.join('.'));\n" +
            "                    }\n" +
            "                }\n" +
            "            }\n" +
            "            return value;\n" +
            "        }\n" +
            "    },\n" +
            "    invoke: async function(input, deploy) {\n" +
            "        let solution = {};\n" +
            "        for(var i = 0; i < deploy.length; i++) {\n" +
            "            let element = deploy[i];\n" +
            "            try{if(element.provider === 'aws'){\n" +
            "                var awsSDK = require('aws-sdk');\n" +
            "                var credentialsAmazon = new awsSDK.SharedIniFileCredentials({profile: 'default'});\n" +
            "                const start = Date.now();\n" +
            "                var AWS = require('aws-sdk');\n" +
            "                AWS.config.update({ httpOptions: { agent: new (require('https')).Agent({ maxSockets: 100 }) } });\n" +
            "                solution = JSON.parse(await (new (AWS)\n" +
            "                    .Lambda({ accessKeyId: credentialsAmazon.accessKeyId, secretAccessKey: credentialsAmazon.secretAccessKey, region: element.region }))\n" +
            "                    .invoke({ FunctionName: element.name, Payload: JSON.stringify(JSON.parse(module.exports.stringifyWithCircularRefs(input)))})\n" +
            "                    .promise().then(p => p.Payload));\n" +
            "            }else if(element.provider === 'ibm'){\n" +
            "                solution = await new Promise(async (resolve, reject) => {\n" +
            "                    try {\n" +
            "                        const credentials = require('./credentials');\n" +
            "                        resolve(JSON.parse(require('child_process').execSync('curl -u ' + credentials.api_key + ' -X POST ' + credentials.api + '' + element.name + '?blocking=true -H \"Content-Type: application/json\" -d \\'' + JSON.stringify(JSON.parse(module.exports.stringifyWithCircularRefs(input))) + '\\'')))\n" +
            "                    } catch(error) {resolve('error')}\n" +
            "                });\n" +
            "                solution = solution.response.result;\n" +
            "            }}catch (e){solution.error = e;}\n" +
            "            if(!solution.hasOwnProperty('errorMessage') && !solution.hasOwnProperty('error') && solution != 'error'){\n" +
            "                if(element.provider === 'aws' && solution.hasOwnProperty('body')){\n" +
            "                    return solution.body;\n" +
            "                }\n" +
            "                return solution;\n" +
            "            }\n" +
            "        }\n" +
            "        throw new Error('Could not invoke serverless functions');\n" +
            "    }\n" +
            "}";
    }
}
