export const participants = {
    steps: [
        {
            //  tee ${out}/keypair_PARTICIPANTX.json
            alias: 'keygen_participant',
            id: `keypair_PARTICIPANTX`,
            zencode: `Scenario reflow
            Scenario credential
            Given I am 'PARTICIPANTX'
            When I create the reflow key
            and I create the credential key
            Then print my 'keyring'`
        },
        {
            // -k ${out}/keypair_${1}.json  | jq . | tee ${out}/public_key_${1}.json
            alias: 'pubkey_participant',
            id: `public_key_PARTICIPANTX`,
            zencode: `Scenario reflow
            Given I am 'PARTICIPANTX'
            and I have my 'keyring'
            When I create the reflow public key
            Then print my 'reflow public key'`,
            keysFromStep: `keypair_PARTICIPANTX`,
        },
        {
            // -k ${out}/keypair_PARTICIPANTX.json  | jq . | tee ${out}/request_PARTICIPANTX.json
            alias: 'request_participant',
            id: `request_PARTICIPANTX`,
            zencode: `Scenario credential
            Given I am 'PARTICIPANTX'
            and I have my 'keyring'
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
            and I have my 'keyring'
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
            and I have my 'keyring'
            and I have a 'credential signature'
            when I create the credentials
            then print my 'credentials'
            and print my 'keyring'`,
            keysFromStep: `keypair_PARTICIPANTX`,
            dataFromStep: `issuer_signature_PARTICIPANTX`
        }
    ]

}

export const participantSigns = {
    steps: [
        {
            // -a ${out}/credential_to_sign.json -k ${out}/verified_credential_$name.json  | jq . | tee ${out}/signature_$name.json
            alias: 'sign_session',
            id: 'signature_PARTICIPANTX',
            zencode: `Scenario reflow
        Scenario credential
        Given I am 'PARTICIPANTX'
        and I have my 'credentials'
        and I have my 'keyring'
        and I have a 'reflow seal'
        and I have a 'issuer public key' from 'The Authority'
        When I create the reflow signature
        Then print the 'reflow signature'`,
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
            zencode: `Scenario 'reflow': add the signature to the seal
					Given I have a 'reflow seal'
					Given I have a 'issuer public key' in 'The Authority'
					Given I have a 'reflow signature'

					When I aggregate all the issuer public keys
					When I verify the reflow signature credential

					When I check the reflow signature fingerprint is new
					When I add the reflow fingerprint to the reflow seal
					When I add the reflow signature to the reflow seal
					Then print the 'reflow seal'`,
            dataFromStep: `multisignature`,
            keysFromStep: [`issuer_public_key`, `signature_PARTICIPANTX`],
        }
    ]
}




