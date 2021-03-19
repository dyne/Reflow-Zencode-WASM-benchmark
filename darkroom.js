export const multiSignature = {
    steps: [
        {
            // ${out}/session_start.zen -k ${out}/uid.json -a ${out}/public_key_array.json | tee  ${out}/multisignature.json
            name: 'Issuer creates the multisig',
            alias: 'session_start',
            id: 'multisignature',
            zencode: `Scenario multidarkroom
        Given I have a 'bls public key array' named 'public keys'
        and I have a 'string' named 'today'
        When I aggregate the bls public key from array 'public keys'
        and I rename the 'bls public key' to 'multidarkroom public key'
        and I create the multidarkroom session with uid 'today'
        Then print the 'multidarkroom session'`,
            dataFromStep: `public_keys`,
            keysFromStep: `today`,
        }
    ]
}

export const verifyMultidarkroom = {
    steps: [
        {
            // -a ${out}/multisignature.json | jq .
            name: 'Issuer verifies the signed multisig',
            alias: 'verify_sign',
            id: 'verifySignature',
            zencode: `Scenario multidarkroom
            Given I have a 'multidarkroom session'
            When I verify the multidarkroom session is valid
            Then print 'SUCCESS'
            and print the 'multidarkroom session'`,
            dataFromStep: `multisignature`,
        },
    ]
}