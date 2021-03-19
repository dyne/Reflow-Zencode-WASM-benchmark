import chain from '@dyne/zencode-chain';
import { zencode_exec } from 'zenroom';
import fs from 'fs';

import { participants, participantSigns, participantMultisignature } from './participants.js';
import { verifier } from './verifier.js';
import { multiSignature, verifyMultidarkroom } from './darkroom.js';

const participantKeyword = 'PARTICIPANTX';
const numberOfParticipants = 5;
const iterations = 3;
const averageTimeAliases = ['collect_sign'];
const toIterateAliases = ['session_start', 'collect_sign', 'verify_sign']
const recursionResults = { session_start: [], collect_sign: [], verify_sign: [] };

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

const executeSingleChain = (results, steps) => {
    return new Promise(async (resolve, reject) => {
        for (let i = 0; i < steps.length; i++) {
            try {
                const options = {
                    data: steps[i].data || valueFromOtherStep(steps[i].dataFromStep, results),
                    keys: steps[i].keys || valueFromOtherStep(steps[i].keysFromStep, results)
                }

                const toIterate = toIterateAliases.includes(steps[i].alias);
                const loops = toIterate ? iterations : 1;
                const tmpArray = [];

                let zenResult, startTime, endTimetime, totaltime;
                for (let j = 1; j <= loops; j++) {
                    startTime = Date.now();
                    zenResult = await zencode_exec(steps[i].zencode, options);
                    endTimetime = Date.now();
                    totaltime = endTimetime - startTime

                    tmpArray.push(totaltime)
                }

                if (toIterate && averageTimeAliases.includes(steps[i].alias)) {
                    const calcAverage = arr => arr.reduce((p, c) => p + c, 0) / arr.length;
                    const average = tmpArray.length ? calcAverage(tmpArray) : 0;
                    recursionResults[steps[i].alias].push(Math.round(average));
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
                await executeSingleChain(results, args[i])
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

const run = async () => {
    const verifierArray = prepareSteps(verifier);
    const participantsArray = prepareSteps(participants);
    const participantsSignArray = prepareSteps(participantSigns);
    const participantMultisignatureArray = prepareSteps(participantMultisignature);

    try {
        const results = {}
        await executeSeveralChains(results, ...verifierArray, ...participantsArray);

        mergeSeveralResults('public_key_', 'public_keys', results);
        mergeToday(results);

        await executeSingleChain(results, multiSignature.steps);

        mergeTwoResults('issuer_public_key', 'multisignature', 'credential_to_sign', results);

        await executeSeveralChains(results, ...participantsSignArray);

        await executeSeveralChains(results, ...participantMultisignatureArray);

        await executeSingleChain(results, verifyMultidarkroom.steps);

        console.log('Done.');
        for (const [key, value] of Object.entries(recursionResults)) {
            if (Array.isArray(value)) {
                console.log(key);
                console.log(value);
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

// executeChains(results, ...verifierArray, ...participantsArray)
//     .then(() => {

//         console.log('Done.');
//         mergeSeveralResults('public_key_', 'public_keys', results);
//         mergeToday(results);

//         executeSingleChain(multiSignature.steps, results)
//             .then(() => {
//                 // console.log('Successfully executed darkroom:');


//                 // console.log('merging issuer_public_key and multisignature');
//                 mergeTwoResults('issuer_public_key', 'multisignature', 'credential_to_sign', results);
//                 // console.log(results);
//                 console.log('Executing...');
//                 executeChains(results, ...participantsSignArray)
//                     .then(() => {
//                         console.log('Finished executing last chain');
//                         console.log(results);
//                     })
//                     .catch((error) => {
//                         console.log('Something went wrong with last chain..');
//                         console.log(e);
//                     })
//             })
//             .catch((e) => {
//                 console.log('Something went wrong..');
//                 console.log(e);
//             })

//     })
//     .catch((e) => {
//         console.log(e);
//     })


// zencode_exec(test, {data: null, keys: null})
//     .then((result) => {
//         console.log( result );
//     })
//     .catch((error) => {
//         console.log('Error.');
//         // throw new Error(error);
//     });

// chain.execute(participantSteps).then((r) => console.log(r)).catch((e)=> {console.log('Error occurred.'); console.log(e)});
// console.log('Verifier results before');
// console.log(verifier.results);
// chain.execute(verifier.verifierSteps).then((r) => console.log(r)).catch((e)=> {console.log('Error occurred.'); console.log(e)});
// console.log('Verifier results after');
// console.log(verifier.results);








// const steps_definition = {
//     verbosity: false,
//     steps: [
//       {
//         id: 'step0',
//         zencode: `Scenario ecdh: create the keypair at user creation
//   Given that my name is in a 'string' named 'username'
//   When I create the keypair
//   Then print my 'keypair'`,
//         data: newAccount,
//       },
//       {
//         id: 'step2',
//         zencode: `Scenario 'ecdh': Publish the public key
//   Given that my name is in a 'string' named 'username'
//   and I have my 'keypair'
//   Then print my 'public key' from 'keypair'
//   Then print 'hello'`,
//         data: newAccount,
//         keysFromStep: 'step0',
//       },
//     ],
//   };


// function generate_participant(count) {
//     // local name=$1
//     // ## PARTICIPANT
//     // cat <<EOF | zexe ${out}/keygen_${1}.zen  | jq . | tee ${out}/keypair_${1}.json
// const keypair_ = `Scenario multidarkroom
// Scenario credential
// Given I am '${1}'
// When I create the BLS key
// and I create the credential key
// Then print my 'keys'`

//     // cat <<EOF | zexe ${out}/pubkey_${1}.zen -k ${out}/keypair_${1}.json  | jq . | tee ${out}/verifier_${1}.json
// const verifier_ = `Scenario multidarkroom
// Given I am '${1}'
// and I have my 'keys'
// When I create the BLS public key
// Then print my 'bls public key'`



//     // cat <<EOF | zexe ${out}/request_${1}.zen -k ${out}/keypair_${1}.json  | jq . | tee ${out}/request_${1}.json
// const request_Scenario = `credential
// Given I am '${1}'
// and I have my 'keys'
// When I create the credential request
// Then print my 'credential request'`

//     // ## ISSUER SIGNS
//     // cat <<EOF | zexe ${out}/issuer_sign_${1}.zen -k ${out}/issuer_key.json -a ${out}/request_${1}.json  | jq . | tee ${out}/issuer_signature_${1}.json
// const issuer_signature_ = `Scenario credential
// Given I am 'The Authority'
// and I have my 'keys'
// and I have a 'credential request' inside '${1}'
// when I create the credential signature
// and I create the issuer public key
// Then print the 'credential signature'
// and print the 'issuer public key'`


//     // ## PARTICIPANT AGGREGATES SIGNED CREDENTIAL
//     // cat <<EOF | zexe ${out}/aggr_cred_${1}.zen -k ${out}/keypair_${1}.json -a ${out}/issuer_signature_${1}.json  | jq . | tee ${out}/verified_credential_${1}.json
// const issuer_signature_ = `Scenario credential
// Given I am '${1}'
// and I have my 'keys'
// and I have a 'credential signature'
// when I create the credentials
// then print my 'credentials'
// and print my 'keys'`

// }

