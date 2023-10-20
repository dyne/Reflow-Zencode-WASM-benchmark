export const multiSignature = {
    steps: [
        {
            // ${out}/session_start.zen -k ${out}/uid.json -a ${out}/public_key_array.json | tee  ${out}/multisignature.json
            name: 'Issuer creates the multisig',
            alias: 'session_start',
            id: 'multisignature',
            zencode: `Scenario reflow
        Given I have a 'reflow public key array' named 'public keys'
        and I have a 'string' named 'today'
        When I aggregate the reflow public key from array 'public keys'
		When I create the reflow identity of 'today'
		When I create the reflow seal with identity 'reflow identity'
        Then print the 'reflow seal'`,
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
            zencode: `Scenario reflow
            Given I have a 'reflow seal'
            When I verify the reflow seal is valid
            Then print the string 'SUCCESS'
            and print the 'reflow seal'`,
            dataFromStep: `multisignature`,
        },
    ]
}