const utils = require("./utils")
const AWS = require('aws-sdk');

async function getPassengers(params){
    const flightId = params.flightID;

    // Connect to Cloudant and select database
    const Cloudant = require('@cloudant/cloudant');
    const cloudant = new Cloudant({
        url: 'https://d74fd924-41ec-4c4f-bd37-41d352264457-bluemix.cloudantnosqldb.appdomain.cloud/',
        plugins: {iamauth: {iamApiKey: '9u_dAgheD93UZZK6FUF_o3Jr1Dzy_ogHZa7QBYPvUA2u'}}
    });
    const db = cloudant.db.use('passenger');

    // Get all documents from the DB
    let allDocs = null;
    await db.list({include_docs:true}).then(function(data) {
        allDocs = data;
    }).catch(function(err) {
        console.log('something went wrong', err);
    });

    // Define variables for output
    let passengerIDs = []

    // Iterate over the data
    for (let i = 0; i < allDocs.rows.length; i++) {
        if(allDocs.rows[i].doc.atAirport && allDocs.rows[i].doc.flightId === flightId){
            passengerIDs.push(allDocs.rows[i].id);
        }
    }
    return {
        passengerIDs: passengerIDs,
        passengersAtAirport: passengerIDs.length
    };
}

async function secCheckTime(args){
    /*const bucket = 'gcaimages' // the bucketname without s3://
    const securityGPS = args.security;
    const client = new AWS.Rekognition();
    const params = {
        Image: {
            S3Object: {
                Bucket: bucket,
                Name: "security_"+securityGPS+".jpg"
            },
        },
        MaxLabels: 10
    }
    var finished= false;
    var array = [];
    var result = await client.detectLabels(params, function(err, response) {
        if (err) {
            console.log(err, err.stack); // an error occurred
        } else {
            response.Labels.forEach(label => {
            }) // for response.labels
        } // if
    }).promise().then(data => {
        array.push(data.Labels);
    }).catch(error => {
        console.log(error);
        return error;
    });
    var persons = 0;
    var delay=0;
    try {
        array[0].forEach(function (el){
            if (el.Name === "Person"){
                persons = el.Instances.length;
            }
        });
        //each person takes 2 mins
        delay = persons * 2;
    }catch (e) {
        //ignored
    }
    //the delay in minutes
    return {securityDelay: delay};*/
    return {securityDelay: 12};
}

async function getGateGPS(params){
    const gate = params.newGate;

    // Connect to Cloudant and select database
    const Cloudant = require('@cloudant/cloudant');
    const cloudant = new Cloudant({
        url: 'https://d74fd924-41ec-4c4f-bd37-41d352264457-bluemix.cloudantnosqldb.appdomain.cloud/',
        plugins: {iamauth: {iamApiKey: '9u_dAgheD93UZZK6FUF_o3Jr1Dzy_ogHZa7QBYPvUA2u'}}
    });
    const db = cloudant.db.use('gate');

    // Get all documents from the DB
    let allDocs = null;
    await db.list({include_docs:true}).then(function(data) {
        allDocs = data;
    }).catch(function(err) {
        console.log('something went wrong', err);
    });

    // Prepare inputs
    let gateGPS = "";
    let secGPS = "";

    // Iterate over the data
    for (let i = 0; i < allDocs.rows.length; i++) {
        if(allDocs.rows[i].doc.gateName === gate){
            gateGPS = allDocs.rows[i].doc.gateGPS;
            secGPS = allDocs.rows[i].doc.secGPS;
        }
    }

    return {
        newGateGPS: gateGPS,
        securityGPS: secGPS
    };
}

async function distanceGPS(params){
    const gps1 = params.gps1;
    const gps2 = params.gps2;
    const newGateGPS = params.newGateGPS;
    const securityGPS = params.securityGPS;

    const distanceInM = utils.distanceInMBetweenEarthCoordinates(
        Number(gps1.split(", ")[0]),
        Number(gps1.split(", ")[1]),
        Number(gps2.split(", ")[0]),
        Number(gps2.split(", ")[1]));

    const delayInSec = distanceInM / 1.38889;
    const delayInMin = delayInSec / 60;

    return {
        newGateGPSOut: newGateGPS,
        securityGPSOut: securityGPS,
        delay: delayInMin,
        delayArea: "{\n\"area\":" + params.area + ",\n\"delay\":" + delayInMin + ",\n}"
    };
}

async function readGPS(params){
    const passengerId = params.passengerID;

    // Connect to Cloudant and select database
    const Cloudant = require('@cloudant/cloudant');
    const cloudant = new Cloudant({
        url: 'https://d74fd924-41ec-4c4f-bd37-41d352264457-bluemix.cloudantnosqldb.appdomain.cloud/',
        plugins: {iamauth: {iamApiKey: '9u_dAgheD93UZZK6FUF_o3Jr1Dzy_ogHZa7QBYPvUA2u'}}
    });
    const db = cloudant.db.use('passenger');

    // Get doc by id
    const passenger = await db.get(passengerId);
    const passengerGPS = [];
    passengerGPS.push(Number(passenger.gpsLocation.split(", ")[0]));
    passengerGPS.push(Number(passenger.gpsLocation.split(", ")[1]));

    // Check if passenger inside security check
    const afterSecCheck = utils.inside(
        passengerGPS,
        [
            [47.25756215011163, 11.350859214052116],
            [47.25783976426809, 11.350793499933715],
            [47.25793624622426, 11.351679969979884],
            [47.25766682447269, 11.351745684098283]
        ]
    );

    let area = 1;
    if(afterSecCheck){
        area = 0;
    }

    return {
        passengerIDsOut: params.passengerID,
        /*gpsGateOut: params.gpsGate,
        secGateDelayOut: params.secGateDelay,
        securityDelayOut: params.securityDelay,
        securityGPSOut: params.securityGPS,*/
        passengerGPS: passenger.gpsLocation,
        area: area
    };
}

async function sumUp(params){
    const delay = Number(params.passSecDelay) + Number(params.securityDelay) + Number(params.securityGateDelay);
    return {
        delayArea: "{\n\"area\":" + params.area + ",\n\"delay\":"+ delay + ",\n}"
    };
}

async function averageTime(params){
    const jsonStringArray = params.delay;
    let avgTimePublic = 0;
    let avgTimeRestricted = 0;
    let totalPublic = 0;
    let totalRestricted = 0;
    for (let i = 0; i < jsonStringArray.length; i++) {
        const area = Number(jsonStringArray[i].split("area\":")[1].split(",")[0]);
        const delay = Number(jsonStringArray[i].split("delay\":")[1].split(",")[0]);
        if(area === 0){
            avgTimeRestricted += delay;
            totalRestricted++;
        }else if (area === 1){
            avgTimePublic += delay;
            totalPublic++;
        }
    }
    console.log("in")
    return {
        avgTimePublic: avgTimePublic/totalPublic,
        avgTimeRestricted: avgTimeRestricted/totalRestricted
    };
}

async function main(input){

    /* Parallel */
    const promGetPassengers = getPassengers(input);
    const promSecCheckTime = secCheckTime(); // TODO
    const promGetGateGPS = getGateGPS(input);
    const resGetGateGPS = await promGetGateGPS;
    const promDistanceGPS = distanceGPS({
        "gps1": resGetGateGPS.newGateGPS,
        "gps2": resGetGateGPS.securityGPS,
        "newGateGPS": resGetGateGPS.newGateGPS,
        "securityGPS": resGetGateGPS.securityGPS
    });
    const resGetPassengers = await promGetPassengers;
    const resSecCheckTime = await promSecCheckTime;
    const resDistanceGPS = await promDistanceGPS;

    /* ParallelFor */
    let avg = await Promise.all(resGetPassengers.passengerIDs.map(function (node) {
        return new Promise(async function (resolve, reject) {
            const resReadGPS = await readGPS({"passengerID": node});
            if(resReadGPS.area === 1){
                const resDistanceGPS = await distanceGPS({
                        "gps1": resGetGateGPS.securityGPS,
                        "gps2": resReadGPS.passengerGPS,
                        "area": resReadGPS.area
                    });
                const resSumUp = await sumUp({
                    "passSecDelay": 12,
                    "securityGateDelay": 122
                });
                resolve(resSumUp)
            }else{
                const resDistanceGPS = await  distanceGPS({
                    "gps1": resGetGateGPS.securityGPS,
                    "gps2": resReadGPS.passengerGPS,
                    "area": resReadGPS.area
                })
                resolve(resDistanceGPS);
            }
        })
    })).then(function (results) {
        console.log("res"  + JSON.stringify(results))
        return averageTime(results);
    }).catch(function (error) {
        // handle error
    })

    console.log(avg + "-----------------------------------")
}

main({
    "flightID": "F121",
    "newGate": "G1",
    "security": "47.25762807043091, 11.351422424940244"
})