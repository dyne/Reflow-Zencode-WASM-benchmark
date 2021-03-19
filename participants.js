export const participants = {
    steps: [
        {
            //  tee ${out}/keypair_PARTICIPANTX.json
            alias: 'keygen_participant',
            id: `keypair_PARTICIPANTX`,
            zencode: `Scenario multidarkroom
            Scenario credential
            Given I am 'PARTICIPANTX'
            When I create the BLS key
            and I create the credential key
            Then print my 'keys'`
        },
        {
            // -k ${out}/keypair_${1}.json  | jq . | tee ${out}/public_key_${1}.json
            alias: 'pubkey_participant',
            id: `public_key_PARTICIPANTX`,
            zencode: `Scenario multidarkroom
            Given I am 'PARTICIPANTX'
            and I have my 'keys'
            When I create the BLS public key
            Then print my 'bls public key'`,
            keysFromStep: `keypair_PARTICIPANTX`,
        },
        {
            // -k ${out}/keypair_PARTICIPANTX.json  | jq . | tee ${out}/request_PARTICIPANTX.json
            alias: 'request_participant',
            id: `request_PARTICIPANTX`,
            zencode: `Scenario credential
            Given I am 'PARTICIPANTX'
            and I have my 'keys'
            When I create the credential request
            Then print my 'credential request'`,
            keysFromStep: `keypair_PARTICIPANTX`,
        },
        {
            // -k ${out}/issuer_key.json -a ${out}/request_PARTICIPANTX.json  | jq . | tee ${out}/issuer_signature_PARTICIPANTX.json
            alias: 'issuer_sign',
            id: `issuer_signature_PARTICIPANTX`,
            zencode: `Scenario credential
            Given I am 'The Authority'
            and I have my 'keys'
            and I have a 'credential request' inside 'PARTICIPANTX'
            when I create the credential signature
            and I create the issuer public key
            Then print the 'credential signature'
            and print the 'issuer public key'`,
            dataFromStep: `request_PARTICIPANTX`,
            keysFromStep: `issuer_key`,

        },
        {
            // -k ${out}/keypair_${1}.json -a ${out}/issuer_signature_${1}.json  | jq . | tee ${out}/verified_credential_${1}.json
            alias: 'aggregate_credential_participant',
            id: `verified_credential_PARTICIPANTX`,
            zencode: `Scenario credential
            Given I am 'PARTICIPANTX'
            and I have my 'keys'
            and I have a 'credential signature'
            when I create the credentials
            then print my 'credentials'
            and print my 'keys'`,
            keysFromStep: `keypair_PARTICIPANTX`,
            dataFromStep: `issuer_signature_PARTICIPANTX`
        }
    ]

}

export const participantSigns = {
    steps: [
        {
            // -a ${out}/credential_to_sign.json -k ${out}/verified_credential_$name.json  | jq . | tee ${out}/signature_$name.json
            alias: 'credential_to_sign',
            id: 'signature_PARTICIPANTX',
            zencode: `Scenario multidarkroom
        Scenario credential
        Given I am 'PARTICIPANTX'
        and I have my 'credentials'
        and I have my 'keys'
        and I have a 'multidarkroom session'
        and I have a 'issuer public key' from 'The Authority'
        When I create the multidarkroom signature
        Then print the 'multidarkroom signature'`,
            dataFromStep: `credential_to_sign`,
            keysFromStep: `verified_credential_PARTICIPANTX`,
        }
    ]
}

export const participantMultisignature = {
    steps: [
        {
            // cp -v ${out}/multisignature.json $tmp_msig
            // json_join ${out}/issuer_public_key.json ${out}/signature_$name.json > $tmp_sig
            // -a $tmp_msig -k $tmp_sig  | jq . | tee ${out}/multisignature.json
            name: 'Participants sign the multisig',
            alias: 'collect_sign',
            id: 'multisignature',
            zencode: `Scenario multidarkroom
        Scenario credential
        Given I have a 'multidarkroom session'
        and I have a 'issuer public key' in 'The Authority'
        and I have a 'multidarkroom signature'
        When I aggregate all the issuer public keys
        and I verify the multidarkroom signature credential
        and I check the multidarkroom signature fingerprint is new
        and I add the multidarkroom fingerprint to the multidarkroom session
        and I add the multidarkroom signature to the multidarkroom session
        Then print the 'multidarkroom session'`,
            dataFromStep: `multisignature`,
            keysFromStep: [`issuer_public_key`, `signature_PARTICIPANTX`],
        }
    ]
}




