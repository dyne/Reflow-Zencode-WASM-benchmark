import { zencode_exec } from 'zenroom';
import fs from 'fs';

import { participants, participantSigns, participantMultisignature } from './participants.js';
import { verifier } from './verifier.js';
import { multiSignature, verifyMultidarkroom } from './darkroom.js';

const participantKeyword = 'PARTICIPANTX';


const numberOfParticipants = 2;
const iterations = 10
const printArrays = true;
const printAverages = true;
const configuration = 'debug=0';


const averageTimeAliases = ['collect_sign'];
const toIterateAliases = ['session_start', 'collect_sign', 'verify_sign',]
const recursionResults = { session_start: [], collect_sign: [], verify_sign: [], };


const calcAverage = arr => arr.reduce((p, c) => p + c, 0) / arr.length;


const standardDeviation = (values) => {
    var avg = calcAverage(values);

    var squareDiffs = values.map(function (value) {
        var diff = value - avg;
        var sqrDiff = diff * diff;
        return sqrDiff;
    });

    var avgSquareDiff = calcAverage(squareDiffs);

    var stdDev = Math.sqrt(avgSquareDiff);
    return stdDev;
}


const replaceParticipantKeyword = (wholeWord, newKeyword, participantKeyword) => {
    const searchRegExp = new RegExp(participantKeyword, 'g');
    const result = wholeWord.replace(searchRegExp, newKeyword);
    return result;
}

const zencodeContainsParticipantKeyword = (steps) => {
    for (let i = 0; i < steps.length; i++) {
        for (const [key, value] of Object.entries(steps[i])) {
            if (Array.isArray(value))
                for (let j = 0; j < value.length; j++)
                    if (value.includes(value[j]))
                        return true;
            if (value.includes(participantKeyword))
                return true;

        }
    };
    return false;
}
const prepareSteps = (chainObj) => {
    const allSteps = [];
    const loops = zencodeContainsParticipantKeyword(chainObj.steps) ? numberOfParticipants : 1;
    for (let i = 1; i <= loops; i++) {
        const tmpArray = [];
        for (let j = 0; j < chainObj.steps.length; j++) {
            const element = {};
            for (const [key, value] of Object.entries(chainObj.steps[j])) {
                if (Array.isArray(value)) {
                    const valueArray = [];
                    for (let h = 0; h < value.length; h++) {
                        const el = replaceParticipantKeyword(value[h], `Participant_${i}`, participantKeyword);
                        valueArray.push(el);
                    }
                    element[key] = valueArray;
                } else if (typeof value === 'string') {
                    element[key] = replaceParticipantKeyword(value, `Participant_${i}`, participantKeyword); //value.replace(searchRegExp, participiant)
                } else {
                    element[key] = value;
                }
            }
            tmpArray.push(element);
        }
        allSteps.push(tmpArray);
    }
    return allSteps;
}

const valueFromOtherStep = (props, results) => {
    let returnValue = {};
    let propsArray = Array.isArray(props) ? props : [props];
    propsArray.forEach(prop => {
        if (prop in results) {
            const value = results[prop];
            if (value.result) {
                returnValue = { ...returnValue, ...JSON.parse(value.result) }
            } else {
                returnValue = { ...returnValue, ...value }
            }
        }
    });
    return Object.keys(returnValue).length > 0 ? JSON.stringify(returnValue) : null;
}

const printme = (toPrint) => {
    console.log(toPrint);
}

let checkarray;
const executeSingleChain = (results, steps, firstStep, lastStep) => {
    return new Promise(async (resolve, reject) => {
        for (let i = 0; i < steps.length; i++) {
            try {
                const conf = configuration ? JSON.parse(JSON.stringify(configuration)) : null;
                const options = {
                    data: steps[i].data || valueFromOtherStep(steps[i].dataFromStep, results),
                    keys: steps[i].keys || valueFromOtherStep(steps[i].keysFromStep, results),
                    conf
                }

                const toIterate = (toIterateAliases.includes(steps[i].alias) && steps[i].alias !== 'collect_sign') || (steps[i].alias === 'collect_sign' && (firstStep || lastStep));
                const loops = toIterate ? iterations : 1;
                const tmpArray = [];

                let zenResult, startTime, endTimetime, totaltime;
                for (let j = 1; j <= loops; j++) {
                    console.log('-------------------------------------------------------------------');
                    console.log(`Step with id ${steps[i].id} and alias ${steps[i].alias}. ${toIterate ? 'Iteration: ' + j : 'No iteration'}`);
                    startTime = Date.now();
                    zenResult = await zencode_exec(steps[i].zencode, options);
                    endTimetime = Date.now();
                    totaltime = endTimetime - startTime;
                    console.log(`Done. Execution time ${totaltime}. Ouput:`);
                    console.log(zenResult);
                    console.log('-------------------------------------------------------------------');

                    tmpArray.push(totaltime)
                }

                if (toIterate && averageTimeAliases.includes(steps[i].alias) && (firstStep || lastStep)) {
                    const name = firstStep ? `${steps[i].alias}_First` : lastStep ? `${steps[i].alias}_Last` : steps[i].alias
                    recursionResults[name] = [];
                    recursionResults[name].push(...tmpArray);
                    checkarray = tmpArray;
                } else if (toIterate) {
                    recursionResults[steps[i].alias].push(...tmpArray);
                } else {
                    if (steps[i].alias in recursionResults && Array.isArray(recursionResults[steps[i].alias])) {
                        recursionResults[steps[i].alias].push(...tmpArray);
                    } else {
                        recursionResults[steps[i].alias] = [];
                        recursionResults[steps[i].alias].push(...tmpArray);
                    }
                }

                results[steps[i].id] = {
                    result: zenResult.result,
                    time: totaltime
                }

            } catch (e) {
                console.log('something went wrong.');
                console.log(e);
                reject(e)
            }
        }
        resolve(results);
    });
}


const executeSeveralChains = async (results, ...args) => {
    return new Promise(async (resolve, reject) => {
        try {
            for (let i = 0; i < args.length; i++) {
                console.log(`************************ Executing chain ${i} / ${args.length} ****`);
                await executeSingleChain(results, args[i], i === 0, i === (args.length - 1))
                console.log('*******************************************************************');
            }
            resolve(results);
        } catch (e) {
            console.log('Big error');
            reject(e);
        }
    });
}

const mergeSeveralResults = (prop, newPropName, results) => {
    let newObj = {};
    for (const [key, value] of Object.entries(results)) {
        if (key.includes(prop)) {
            const tmpObj = JSON.parse(results[key].result)
            newObj = { ...newObj, ...tmpObj };
        }
    }
    results[newPropName] = { result: JSON.stringify({ [newPropName]: newObj }) };
}

const mergeTwoResults = (prop1, prop2, newPropName, results) => {
    const tmpObj1 = JSON.parse(results[prop1].result);
    const tmpObj2 = JSON.parse(results[prop2].result);
    return results[newPropName] = { result: JSON.stringify({ ...tmpObj1, ...tmpObj2 }) };
}

const mergeToday = (resultObj) => {
    resultObj['today'] = { result: JSON.stringify({ today: Date.now() }) };
}

const prettify = (obj) => {
    const newObj = obj;
    for (const [key, value] of Object.entries(newObj)) {
        if (typeof value === 'object' && value !== null) {
            newObj[key] = prettify(value);
        } else {
            if (key === 'result') {
                newObj[key] = JSON.parse(value);
            }
        }

    }
    return newObj;
}

const displayTitle = (title) => {
    console.log('*******************************************************************');
    console.log('^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^')
    console.log('^')
    console.log('^')
    console.log('------------- ' + title)
    console.log('^')
    console.log('^')
    console.log('^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^')
    console.log('*******************************************************************');
}

const run = async () => {
    const verifierArray = prepareSteps(verifier);
    const participantsArray = prepareSteps(participants);
    const participantsSignArray = prepareSteps(participantSigns);
    const participantMultisignatureArray = prepareSteps(participantMultisignature);

    try {
        const results = {}
        displayTitle('perifierArray and participantsArray Several Chains');
        await executeSeveralChains(results, ...verifierArray, ...participantsArray);

        mergeSeveralResults('public_key_', 'public_keys', results);
        mergeToday(results);

        displayTitle('multiSignature.steps single Chain');
        await executeSingleChain(results, multiSignature.steps);

        mergeTwoResults('issuer_public_key', 'multisignature', 'credential_to_sign', results);

        displayTitle('participantsSignArray several Chain');
        await executeSeveralChains(results, ...participantsSignArray);

        displayTitle('participantMultisignatureArray several Chain');
        await executeSeveralChains(results, ...participantMultisignatureArray);

        displayTitle('verifyMultidarkroom.stepsseveral Chain');
        await executeSingleChain(results, verifyMultidarkroom.steps);

        console.log(' \n All done, now generating the avg and stdev. \n \n ==================================================== \n \n  ');
        for (const [key, value] of Object.entries(recursionResults)) {
            if (Array.isArray(value)) {
                console.log(key);
                const tmpArray = value.map((el) => +(el * 0.001).toFixed(6));

                const average = tmpArray.length ? calcAverage(tmpArray) : 0;
                printArrays && console.log(tmpArray);
				console.log("\n " );
                printAverages && console.log('Average: ' + average.toFixed(4))
                const stDev = standardDeviation(tmpArray);
                console.log("Standard deviation:" + stDev.toFixed(6));
				console.log("\n ==================== \n" );


            }

        }

        results.recursionResults = recursionResults;

        const prettyResults = prettify(results);
        const output = JSON.stringify(prettyResults);
        // const arrayresults = resultsToArray(results);

        fs.writeFile("output.json", output, 'utf8', function (err) {
            if (err) {
                console.log("An error occured while writing JSON Object to File.");
                return console.log(err);
            }

            console.log("output.json file has been saved.");
        });


    } catch (e) {
        console.log('something went wrong:');
        console.log(e);
    }

}

run();
