const newAccount = `{"username": "Alice"}`;

export const verifier = {
    steps: [
        {
            alias: 'issuer_keygen',
            id: 'issuer_key',
            zencode: `Scenario credential
        Given I am 'The Authority'
        when I create the issuer key
        Then print my 'keys'`,
            data: newAccount,
        },
        {
            alias: 'issuer_public_key',
            id: 'issuer_public_key',
            zencode: `Scenario credential: publish verifier
        Given that I am known as 'The Authority'
        and I have my 'keys'
        When I create the issuer public key
        Then print my 'issuer public key'`,
            data: newAccount,
            keysFromStep: 'issuer_key',
        },
    ]
}