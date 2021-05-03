const AWS = require('aws-sdk');
const Cloudant = require('@cloudant/cloudant');
const Utils = require("./utils");
const Config = require("./config");

let securityGPS = "";

async function getPassengers(flightID){
    let allDocs = await new Cloudant(Config.ibm_config).db.use('passenger').list({ include_docs: true }).then(function(data) { return data; });
    let passengerIDs = [];
    for (let i = 0; i < allDocs.rows.length; i++) {
        if(allDocs.rows[i].doc.atAirport && allDocs.rows[i].doc.flightId === flightID){
            passengerIDs.push(allDocs.rows[i].id);
        }
    }
    return { passengerIDs: passengerIDs, passengersAtAirport: passengerIDs.length };
}

async function secCheckTime(){
    AWS.config = new AWS.Config(Config.aws_config);
    const array = [];
    await new AWS.Rekognition().detectLabels({ Image: { S3Object: { Bucket: 'gcacameraimages', Name: "security_" + securityGPS + ".jpg" }, }, MaxLabels: 100 },
        function (err, response) {
        if (err) { console.log(err, err.stack);
        } else { response.Labels.forEach(label => {}) }
    }).promise().then(data => {
        array.push(data.Labels);
    }).catch(error => {
        return error;
    });
    let persons = 0, delay = 0;
    try {
        array[0].forEach(function (el){
            if (el.Name === "Person"){
                persons = el.Instances.length;
            }
        });

        // Three minutes per person
        delay = persons * 3;
    }catch (e) {}

    return delay;
}

async function getGateGPS(gate){

    // Get all documents from the DB
    let allDocs = await new Cloudant(Config.ibm_config).db.use('gate').list({include_docs:true}).then(function(data) { return data; });

    // Prepare inputs
    let gateGPS = "", secGPS = "";

    // Iterate over the data
    for (let i = 0; i < allDocs.rows.length; i++) {
        if(allDocs.rows[i].doc.gateName === gate){
            gateGPS = allDocs.rows[i].doc.gateGPS;
            secGPS = allDocs.rows[i].doc.secGPS;
        }
    }

    securityGPS = secGPS;

    return gateGPS;
}

async function distanceGPS(params){
    const gps1 = params.gps1;
    const gps2 = params.gps2;

    const distanceInM = Utils.distanceInMBetweenEarthCoordinates(
        Number(gps1.split(", ")[0]),
        Number(gps1.split(", ")[1]),
        Number(gps2.split(", ")[0]),
        Number(gps2.split(", ")[1]));

    const delayInSec = distanceInM / 1.38889;
    const delayInMin = delayInSec / 60;

    return {
        "area": params.area,
        "delay": delayInMin
    };
}

async function averageTime(results){
    let avgTimePublic = 0, avgTimeRestricted = 0, totalPublic = 0, totalRestricted = 0;
    for (let i = 0; i < results.length; i++) {
        const area = Number(results[i].area);
        const delay = Number(results[i].delay);
        if(area === 0){
            avgTimeRestricted += delay;
            totalRestricted++;
        }else if (area === 1){
            avgTimePublic += delay;
            totalPublic++;
        }
    }

    return {
        avgTimePublic: avgTimePublic/totalPublic,
        avgTimeRestricted: avgTimeRestricted/totalRestricted
    };
}

async function main(input){

    securityGPS = input.securityGPS;

    /* Parallel */
    const promGetPassengers = getPassengers(input.flightID);
    const promSecCheckTime = secCheckTime(securityGPS); // TODO
    const promGetGateGPS = getGateGPS(input.gateID);
    const resGetGateGPS = await promGetGateGPS;
    const promDistanceGPS = distanceGPS({
        "gps1": resGetGateGPS,
        "gps2": securityGPS,
    });
    const resGetPassengers = await promGetPassengers;
    const resSecCheckTime = await promSecCheckTime;
    const resDistanceGPS = await promDistanceGPS;

    console.log("resGetGate: " + JSON.stringify(resGetGateGPS))
    console.log("resGetPassengers: " + JSON.stringify(resGetPassengers))
    console.log("resSecCheck: " + JSON.stringify(resSecCheckTime))
    console.log("resDisGPS: " + JSON.stringify(resDistanceGPS))

    /* ParallelFor */
    let avg = await Promise.all(resGetPassengers.passengerIDs.map(function (node) {
        return new Promise(async function (resolve, reject) {

            // cfun require(@cloudant/cloudant as Cloudant,./utils.js as Utils,./config.js as Config) assign(area,passenger) vars(node) install(@cloudant/cloudant) deploy([{"name": "readGPSAWS", "provider": "aws", "region": "us-east-1", "memorySize": 128, "runtime": "nodejs14.x", "timeout": 30, "role": "arn:aws:iam::170392512081:role/service-role/getFlight-role-n1g2o34s"}])
            const passenger = await new Cloudant(Config.ibm_config).db.use('passenger').get(node);
            const passengerGPS = [];
            passengerGPS.push(Number(passenger.gpsLocation.split(", ")[0]));
            passengerGPS.push(Number(passenger.gpsLocation.split(", ")[1]));
            const afterSecCheck = Utils.inside( passengerGPS, [[47.25756215011163, 11.350859214052116], [47.25783976426809, 11.350793499933715], [47.25793624622426, 11.351679969979884], [47.25766682447269, 11.351745684098283]]);
            let area = 1;
            if(afterSecCheck){ area = 0; }
            // cfunend

            if(area === 1){
                const resPassSec = await distanceGPS({
                        "gps1": securityGPS,
                        "gps2": passenger.gpsLocation,
                        "area": area
                    });
                resolve({ "area": area, "delay": (Number(resPassSec.delay) + Number(resSecCheckTime) + Number(resDistanceGPS.delay)) })
                console.log("resPassSec: " + JSON.stringify(resPassSec))
            }else{
                const resDistanceGPS = await  distanceGPS({
                    "gps1": securityGPS,
                    "gps2": passenger.gpsLocation,
                    "area": area
                })
                resolve(resDistanceGPS);
                console.log("resDistanceGPS: " + JSON.stringify(resDistanceGPS))
            }
        })
    })).then(function (results) {
        console.log("result: "  + JSON.stringify(results))
        return averageTime(results);
    }).catch(function (error) {
        // handle error
    })

    return avg;
}

main({
    "flightID": "F121",
    "gateID": "G1",
    "securityGPS": "47.25762807043091, 11.351422424940244"
}).then(r => console.log("Result: " + JSON.stringify(r)))