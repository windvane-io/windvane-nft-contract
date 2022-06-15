README

# Contract

## Ethereum

|contract|address|owner|
|---|---|---|
|WindvaneRooster|0xafB3FBAcc5877fc96E953DDC1CCC4C2114238273|0x73b9AdE376684Df8a30B1efD1eFb0b616E591c11|
|NFTFactory|0xE287cC8A32e89d387144a793b1420d9DF63B7f40|0x73b9AdE376684Df8a30B1efD1eFb0b616E591c11|
|MerkleDistributor|0x0ED4dB8190e0Ee4bA12a7729AD2b45EaE7473E57|0x0F53311515ff148cae5D2e45DBAE2577B6d40d97|

> owner: 0x0F53311515ff148cae5D2e45DBAE2577B6d40d97

## Rinkeby

|contract|address|
|---|---|
|WindvaneRooster|0xD2A54a9F35E410dc4449a249701eD7f5f38D7E29|
|NFTFactory|0xCE1CeA22c25a139f4a69F17938D1e6c9cab3F25f|
|MerkleDistributor|0xA72bc1633274e346A6f130aA1ab4d10CF96Bb23c|

# Role

|contract|role|permissions|
|---|---|---|
|WindvaneRooster|owner| highest|
|WindvaneRooster|pauser| pause or unpause transfer|
|WindvaneRooster|minter| mint nft|
|NFTFactory|owner| highest|
|NFTFactory|operator| pool configure / mintNFT |
|NFTFactory|treasury| withdraw eth|
|MerkleDistributor|owner| withdraw eth / set merkle root|


# test
> truffle test
