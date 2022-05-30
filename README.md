README

# Contract

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
|NFTFactory|owner| highest|
|NFTFactory|operator| pool configure / mintNFT |
|NFTFactory|treasury| withdraw eth|
|MerkleDistributor|owner| withdraw eth|


# test
> truffle test
