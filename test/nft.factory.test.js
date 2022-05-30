/*
* Node Version: V12.3+
* File Name: nft.factory.test.js
* Author: neo
* Date Created: 2022-05-18
*/

const {
          accounts,
          contract,
      }            = require("@openzeppelin/test-environment");
const Ethers       = require("ethers");
const {MerkleTree} = require("merkletreejs");
const {
          BN,
          balance,
          expectRevert,
          expectEvent,
          time,
      }            = require("@openzeppelin/test-helpers");
const {expect}     = require("chai");
const NFT          = contract.fromArtifact("WindvaneRooster");
const NFTFactory   = contract.fromArtifact("NFTFactory");

describe("NFTFactory", function () {
    const ADMIN_ROLE    = Ethers.constants.HashZero;
    const OPERATOR_ROLE = Ethers.utils.keccak256(Ethers.utils.toUtf8Bytes("OPERATOR_ROLE"));
    const TREASURY_ROLE = Ethers.utils.keccak256(Ethers.utils.toUtf8Bytes("TREASURY_ROLE"));

    const [deployer, admin, operator, treasury, other1, other2, other3, other4, airdrop1, airdrop2] = accounts;

    const MerkleTree0 = new MerkleTree([Ethers.constants.AddressZero, other1].map(address => Ethers.utils.keccak256(address)), Ethers.utils.keccak256, {sortPairs: true});
    const MerkleTree1 = new MerkleTree([other1, other2, other3].map(address => Ethers.utils.keccak256(address)), Ethers.utils.keccak256, {sortPairs: true});
    const MerkleTree2 = new MerkleTree([other1, other2, other3, other4].map(address => Ethers.utils.keccak256(address)), Ethers.utils.keccak256, {sortPairs: true});
    const MerkleTree3 = new MerkleTree([other1, other2, other3, other4, airdrop1, airdrop2].map(address => Ethers.utils.keccak256(address)), Ethers.utils.keccak256, {sortPairs: true});

    const Pool0 = {
        pid:             0,
        maxNum:          2,
        paused:          true,
        price:           0,
        limitPerAccount: 1,
    };
    const Pool1 = {
        pid:             1,
        maxNum:          5,
        paused:          false,
        price:           1,
        limitPerAccount: 2,
    };

    const Pool2 = {
        pid:             2,
        maxNum:          2,
        paused:          false,
        price:           0,
        limitPerAccount: 1,
    };

    before(async function () {
        this.nft     = await NFT.new("ERC721", "ERC721", {from: deployer});
        this.factory = await NFTFactory.new(this.nft.address, {from: deployer});
    });

    it("Transfer admin", async function () {
        await this.factory.grantRole(ADMIN_ROLE, admin, {from: deployer});

        await this.factory.grantRole(OPERATOR_ROLE, operator, {from: admin});
        await this.factory.grantRole(TREASURY_ROLE, treasury, {from: admin});

        await this.factory.renounceRole(OPERATOR_ROLE, deployer, {from: deployer});
        await this.factory.renounceRole(TREASURY_ROLE, deployer, {from: deployer});
        await this.factory.renounceRole(ADMIN_ROLE, deployer, {from: deployer});
    });

    it("Add pool(not operator)", async function () {
        await expectRevert(
            this.factory.addPool(
                Pool0.maxNum,
                Pool0.paused,
                Pool0.price,
                Pool0.limitPerAccount,
                `0x${MerkleTree0.getRoot().toString("hex")}`,
                {from: deployer},
            ), "NFTFactory::caller is not operator");
    });

    it("Add Pool(_limitPerAccount > 0)", async function () {
        await expectRevert(
            this.factory.addPool(
                Pool0.maxNum,
                Pool0.paused,
                Pool0.price,
                0,
                `0x${MerkleTree0.getRoot().toString("hex")}`,
                {from: operator},
            ),
            "NFTFactory::addPool: Limit per account must great than zero",
        );
    });

    it("Add Pool(_maxNum > 0)", async function () {
        await expectRevert(
            this.factory.addPool(
                0,
                Pool0.paused,
                Pool0.price,
                Pool0.limitPerAccount,
                `0x${MerkleTree0.getRoot().toString("hex")}`,
                {from: operator},
            ),
            "NFTFactory::addPool: Max num must be higher than zero",
        );
    });

    it("Add Pool 0", async function () {
        const root = `0x${MerkleTree0.getRoot().toString("hex")}`;
        expectEvent(
            await this.factory.addPool(Pool0.maxNum, Pool0.paused, Pool0.price, Pool0.limitPerAccount, root, {from: operator}),
            "NewPool",
            {
                pid:             new BN(Pool0.pid),
                maxNum:          new BN(Pool0.maxNum),
                paused:          Pool0.paused,
                price:           new BN(Pool0.price),
                limitPerAccount: new BN(Pool0.limitPerAccount),
                root,
            },
        );
    });

    it("Add Pool 1", async function () {
        const root = `0x${MerkleTree2.getRoot().toString("hex")}`;
        expectEvent(
            await this.factory.addPool(Pool1.maxNum, Pool1.paused, Pool1.price, Pool1.limitPerAccount, root, {from: operator}),
            "NewPool",
            {
                pid:             new BN(Pool1.pid),
                maxNum:          new BN(Pool1.maxNum),
                paused:          Pool1.paused,
                price:           new BN(Pool1.price),
                limitPerAccount: new BN(Pool1.limitPerAccount),
                root,
            },
        );
    });

    it("Add Pool 2", async function () {
        const root = `0x${MerkleTree3.getRoot().toString("hex")}`;
        expectEvent(
            await this.factory.addPool(Pool2.maxNum, Pool2.paused, Pool2.price, Pool2.limitPerAccount, root, {from: operator}),
            "NewPool",
            {
                pid:             new BN(Pool2.pid),
                maxNum:          new BN(Pool2.maxNum),
                paused:          Pool2.paused,
                price:           new BN(Pool2.price),
                limitPerAccount: new BN(Pool2.limitPerAccount),
            },
        );
    });

    it("Pool length", async function () {
        expect(await this.factory.poolLength()).to.be.bignumber.equal(new BN(3));
    });

    it("Pool0 info", async function () {
        const info = await this.factory.poolInfo(Pool0.pid);
        expect(info.maxNum).to.be.bignumber.equal(new BN(Pool0.maxNum));
        expect(info.supply).to.be.bignumber.equal(new BN(0));
        expect(info.paused).to.be.equal(Pool0.paused);
        expect(info.limitPerAccount).to.be.bignumber.equal(new BN(Pool0.limitPerAccount));
        expect(info.root).to.equal(`0x${MerkleTree0.getRoot().toString("hex")}`);
    });

    it("Pool1 info", async function () {
        const info = await this.factory.poolInfo(Pool1.pid);
        expect(info.maxNum).to.be.bignumber.equal(new BN(Pool1.maxNum));
        expect(info.supply).to.be.bignumber.equal(new BN(0));
        expect(info.paused).to.be.equal(Pool1.paused);
        expect(info.limitPerAccount).to.be.bignumber.equal(new BN(Pool1.limitPerAccount));
        expect(info.root).to.equal(`0x${MerkleTree2.getRoot().toString("hex")}`);
    });

    it("Pool2 info", async function () {
        const info = await this.factory.poolInfo(Pool2.pid);
        expect(info.maxNum).to.be.bignumber.equal(new BN(Pool2.maxNum));
        expect(info.supply).to.be.bignumber.equal(new BN(0));
        expect(info.paused).to.be.equal(Pool2.paused);
        expect(info.limitPerAccount).to.be.bignumber.equal(new BN(Pool2.limitPerAccount));
        expect(info.root).to.equal(`0x${MerkleTree3.getRoot().toString("hex")}`);
    });

    it("setPoolMaxNumAndLimit(pool.paused)", async function () {
        await expectRevert(
            this.factory.setPoolMaxNumAndLimit(Pool1.pid, Pool1.maxNum, Pool1.price, Pool1.limitPerAccount, {from: operator}),
            "NFTFactory::setPoolMaxNumAndLimit: Has started",
        );
    });

    it("setPoolMaxNumAndLimit(not operator)", async function () {
        await expectRevert(
            this.factory.setPoolMaxNumAndLimit(Pool0.pid, Pool0.maxNum, Pool0.price, Pool0.limitPerAccount, {from: other1}),
            "NFTFactory::caller is not operator",
        );
    });

    it("setPoolMaxNumAndLimit(_limitPerAccount > 0)", async function () {
        await expectRevert(
            this.factory.setPoolMaxNumAndLimit(Pool0.pid, Pool0.maxNum, Pool0.price, 0, {from: operator}),
            "NFTFactory::setPoolMaxNumAndLimit: Limit must great than zero",
        );
    });

    it("setPoolMaxNumAndLimit(_maxNum > 0)", async function () {
        await expectRevert(
            this.factory.setPoolMaxNumAndLimit(Pool0.pid, 0, Pool0.price, Pool0.limitPerAccount, {from: operator}),
            "NFTFactory::setPoolMaxNumAndLimit: Max num must be higher than zero",
        );
    });

    it("totalMaxNum()", async function () {
        const expected = new BN(Pool0.maxNum).add(new BN(Pool1.maxNum)).add(new BN(Pool2.maxNum));
        expect(await this.factory.totalMaxNum()).to.be.bignumber.equal(expected);
    });

    it("pause(not operator)", async function () {
        await expectRevert(
            this.factory.pause(Pool0.pid, {from: other2}),
            "NFTFactory::caller is not operator",
        );
    });

    it("unpause(not operator)", async function () {
        await expectRevert(
            this.factory.pause(Pool0.pid, {from: other2}),
            "NFTFactory::caller is not operator",
        );
    });

    it("pause(!pools[_pid].paused)", async function () {
        await expectRevert(
            this.factory.pause(Pool0.pid, {from: operator}),
            "NFTFactory::pause: Has paused",
        );
    });

    it("unpause(pools[_pid].paused)", async function () {
        await expectRevert(
            this.factory.unpause(Pool1.pid, {from: operator}),
            "NFTFactory::pause: Has started",
        );
    });

    it("setPoolMaxNumAndLimit()", async function () {
        Pool0.maxNum = Pool0.maxNum + 10;
        expectEvent(
            await this.factory.setPoolMaxNumAndLimit(Pool0.pid, Pool0.maxNum, Pool0.price, Pool0.limitPerAccount, {from: operator}),
            "ChangePoolMaxAndLimit",
            {
                pid:             new BN(Pool0.pid),
                maxNum:          new BN(Pool0.maxNum),
                price:           new BN(Pool0.price),
                limitPerAccount: new BN(Pool0.limitPerAccount),
            },
        );
    });

    it("setPoolRoot(not operator)", async function () {
        await expectRevert(
            this.factory.setPoolRoot(Pool0.pid, `0x${MerkleTree1.getRoot().toString("hex")}`, {from: deployer}),
            "NFTFactory::caller is not operator",
        );
    });

    it("setPoolRoot(not paused)", async function () {
        await expectRevert(
            this.factory.setPoolRoot(Pool1.pid, `0x${MerkleTree1.getRoot().toString("hex")}`, {from: operator}),
            "NFTFactory::setPoolRoot: Has started",
        );
    });

    it("mintNFT(paused)", async function () {
        await expectRevert(
            this.factory.mintNFT(Pool0.pid, 1, MerkleTree1.getHexProof(Ethers.utils.keccak256(other1)), {from: other1}),
            "NFTFactory::mintNFT: Has paused",
        );
    });

    it("setPoolRoot()", async function () {
        await expectEvent(
            await this.factory.setPoolRoot(Pool0.pid, `0x${MerkleTree1.getRoot().toString("hex")}`, {from: operator}),
            "SetPoolRoot",
            {
                pid:  new BN(Pool0.pid),
                root: `0x${MerkleTree1.getRoot().toString("hex")}`,
            },
        );
    });

    it("unpause()", async function () {
        await expectEvent(
            await this.factory.unpause(Pool0.pid, {from: operator}),
            "Unpaused",
            {pid: new BN(Pool0.pid)},
        );
    });

    it("mintAirdrop(not operator)", async function () {
        await expectRevert(
            this.factory.mintAirdrop(Pool2.pid, [other1], {from: treasury}),
            "NFTFactory::caller is not operator",
        );
    });

    it("mintAirdrop(_accounts.length > 0)", async function () {
        await expectRevert(
            this.factory.mintAirdrop(Pool2.pid, [], {from: operator}),
            "NFTFactory::mintAirdrop: Accounts is empty",
        );
    });

    it("mintAirdrop(poolInfo.supply.add(_accounts.length) <= poolInfo.maxNum)", async function () {
        await expectRevert(
            this.factory.mintAirdrop(Pool2.pid, [other1, other2, other3], {from: operator}),
            "NFTFactory:mintAirdrop: Pool cap exceeded",
        );
    });

    it("mintNFT(num > 0)", async function () {
        await expectRevert(
            this.factory.mintNFT(Pool0.pid, 0, MerkleTree1.getHexProof(Ethers.utils.keccak256(other1)), {from: other1}),
            "NFTFactory:mintNFT: num must be great than zero",
        );
    });

    it("mintNFT(poolInfo.supply.add(num) <= poolInfo.maxNum)", async function () {
        await expectRevert(
            this.factory.mintNFT(Pool0.pid, Pool0.maxNum + 1, MerkleTree1.getHexProof(Ethers.utils.keccak256(other1)), {from: other1}),
            "NFTFactory:mintNFT: Pool cap exceeded",
        );
    });

    it("mintNFT(not in whitelist)", async function () {
        await expectRevert(
            this.factory.mintNFT(Pool0.pid, 1, MerkleTree2.getHexProof(Ethers.utils.keccak256(other2)), {from: other2}),
            "NFTFactory::mintNFT: Not in whitelist",
        );
    });

    it("mintNFT(userinfo.claimedNum.add(num) <= pools[_pid].limitPerAccount)", async function () {
        await expectRevert(
            this.factory.mintNFT(Pool0.pid, 2, MerkleTree1.getHexProof(Ethers.utils.keccak256(other1)), {from: other1}),
            "NFTFactory::mintNFT: Claim num exceeded",
        );
    });

    it("mintNFT(price=0, userinfo.offerPrice.mul(num) == msg.value)", async function () {
        await expectRevert(
            this.factory.mintNFT(Pool0.pid, 1, MerkleTree1.getHexProof(Ethers.utils.keccak256(other1)), {
                from:  other1,
                value: 1,
            }),
            "NFTFactory::mintNFT: Pay amount error",
        );
    });

    it("mintNFT(not minter)", async function () {
        await expectRevert(
            this.factory.mintNFT(Pool0.pid, 1, MerkleTree1.getHexProof(Ethers.utils.keccak256(other1)), {
                from:  other1,
                value: 0,
            }),
            "WindvaneRooster::safeMint: caller is not minter",
        );
    });

    it("NFT grant minter", async function () {
        await this.nft.grantRole(await this.nft.MINTER_ROLE(), this.factory.address, {from: deployer});
    });

    it("Pool0::mintNFT(price=0, userinfo.offerPrice.mul(num) == msg.value)", async function () {
        await expectRevert(
            this.factory.mintNFT(Pool0.pid, 1, MerkleTree1.getHexProof(Ethers.utils.keccak256(other1)), {
                from:  other1,
                value: 1,
            }),
            "NFTFactory::mintNFT: Pay amount error",
        );
    });

    it("Pool0::mintNFT() -> other1 mint", async function () {
        const tracker          = await balance.tracker(other1, "wei");
        const nftBalanceBefore = await this.nft.balanceOf(other1);

        const receipt = await this.factory.mintNFT(Pool0.pid, 1, MerkleTree1.getHexProof(Ethers.utils.keccak256(other1)), {
            from:  other1,
            value: 0,
        });

        const {
                  delta,
                  fees,
              }               = await tracker.deltaWithFees();
        const nftBalanceAfter = await this.nft.balanceOf(other1);

        await expectEvent(
            receipt,
            "MintNFT",
            {
                pid:       new BN(Pool0.pid),
                account:   other1,
                payAmount: new BN(0),
            },
        );

        expect(delta.abs()).to.be.bignumber.equal(new BN(0).add(fees));
        expect(nftBalanceAfter.sub(nftBalanceBefore)).to.be.bignumber.equal(new BN(1));

        const tokenId = receipt.logs[0].args.tokenId;
        expect(tokenId).to.be.bignumber.equal(new BN(1));
        expect(await this.nft.ownerOf(tokenId.toString())).to.be.equal(other1);
    });

    it("Pool0::mintNFT() -> other2 mint", async function () {
        const tracker          = await balance.tracker(other2, "wei");
        const nftBalanceBefore = await this.nft.balanceOf(other2);

        const receipt = await this.factory.mintNFT(Pool0.pid, 1, MerkleTree1.getHexProof(Ethers.utils.keccak256(other2)), {
            from:  other2,
            value: 0,
        });

        const {
                  delta,
                  fees,
              }               = await tracker.deltaWithFees();
        const nftBalanceAfter = await this.nft.balanceOf(other2);

        await expectEvent(
            receipt,
            "MintNFT",
            {
                pid:       new BN(Pool0.pid),
                account:   other2,
                payAmount: new BN(0),
            },
        );

        expect(delta.abs()).to.be.bignumber.equal(new BN(0).add(fees));
        expect(nftBalanceAfter.sub(nftBalanceBefore)).to.be.bignumber.equal(new BN(1));

        const tokenId = receipt.logs[0].args.tokenId;
        expect(tokenId).to.be.bignumber.equal(new BN(2));
        expect(await this.nft.ownerOf(tokenId.toString())).to.be.equal(other2);
    });

    it("Pool0::mintNFT() -> other1 mint again(userinfo.claimedNum.add(num) <= pools[_pid].limitPerAccount)", async function () {
        await expectRevert(
            this.factory.mintNFT(Pool0.pid, 1, MerkleTree1.getHexProof(Ethers.utils.keccak256(other1)), {
                from:  other1,
                value: 0,
            }),
            "NFTFactory::mintNFT: Claim num exceeded",
        );
    });

    it("Pool0::mintNFT() -> other2 user info", async function () {
        const info = await this.factory.userInfo(Pool0.pid, other2);
        expect(info.claimedNum).to.be.bignumber.equal(new BN(1));
    });

    it("Pool0::supply", async function () {
        const poolInfo = await this.factory.poolInfo(Pool0.pid);
        expect(poolInfo.supply).to.be.bignumber.equal(new BN(2));
    });

    it("Pool1::mintNFT(price=1, userinfo.offerPrice.mul(num) == msg.value)", async function () {
        await expectRevert(
            this.factory.mintNFT(Pool1.pid, 1, MerkleTree2.getHexProof(Ethers.utils.keccak256(other3)), {
                from:  other3,
                value: 2,
            }),
            "NFTFactory::mintNFT: Pay amount error",
        );
    });

    it("Pool1::mintNFT() -> other1 mint 1 nft once", async function () {
        const tracker          = await balance.tracker(other1, "wei");
        const nftBalanceBefore = await this.nft.balanceOf(other1);

        const receipt = await this.factory.mintNFT(Pool1.pid, 1, MerkleTree2.getHexProof(Ethers.utils.keccak256(other1)), {
            from:  other1,
            value: 1,
        });

        const {
                  delta,
                  fees,
              }               = await tracker.deltaWithFees();
        const nftBalanceAfter = await this.nft.balanceOf(other1);

        await expectEvent(
            receipt,
            "MintNFT",
            {
                pid:       new BN(Pool1.pid),
                account:   other1,
                payAmount: new BN(1),
            },
        );

        expect(delta.abs()).to.be.bignumber.equal(new BN(1).add(fees));
        expect(nftBalanceAfter.sub(nftBalanceBefore)).to.be.bignumber.equal(new BN(1));

        const tokenId = receipt.logs[0].args.tokenId;
        expect(tokenId).to.be.bignumber.equal(new BN(3));
        expect(await this.nft.ownerOf(tokenId.toString())).to.be.equal(other1);
    });

    it("Pool1::mintNFT() -> other1 mint 1 nft once again", async function () {
        const tracker          = await balance.tracker(other1, "wei");
        const nftBalanceBefore = await this.nft.balanceOf(other1);

        const receipt = await this.factory.mintNFT(Pool1.pid, 1, MerkleTree2.getHexProof(Ethers.utils.keccak256(other1)), {
            from:  other1,
            value: 1,
        });

        const {
                  delta,
                  fees,
              }               = await tracker.deltaWithFees();
        const nftBalanceAfter = await this.nft.balanceOf(other1);

        await expectEvent(
            receipt,
            "MintNFT",
            {
                pid:       new BN(Pool1.pid),
                account:   other1,
                payAmount: new BN(1),
            },
        );

        expect(delta.abs()).to.be.bignumber.equal(new BN(1).add(fees));
        expect(nftBalanceAfter.sub(nftBalanceBefore)).to.be.bignumber.equal(new BN(1));

        const tokenId = receipt.logs[0].args.tokenId;
        expect(tokenId).to.be.bignumber.equal(new BN(4));
        expect(await this.nft.ownerOf(tokenId.toString())).to.be.equal(other1);
    });

    it("Pool1::mintNFT() -> other2 mint 2 nft once", async function () {
        const tracker          = await balance.tracker(other2, "wei");
        const nftBalanceBefore = await this.nft.balanceOf(other2);

        const receipt = await this.factory.mintNFT(Pool1.pid, 2, MerkleTree2.getHexProof(Ethers.utils.keccak256(other2)), {
            from:  other2,
            value: new BN(2),
        });

        const {
                  delta,
                  fees,
              }               = await tracker.deltaWithFees();
        const nftBalanceAfter = await this.nft.balanceOf(other2);

        await expectEvent(
            receipt,
            "MintNFT",
            {
                pid:       new BN(Pool1.pid),
                account:   other2,
                payAmount: new BN(1),
            },
        );

        expect(delta.abs()).to.be.bignumber.equal(new BN(2).add(fees));
        expect(nftBalanceAfter.sub(nftBalanceBefore)).to.be.bignumber.equal(new BN(2));

        let tokenId = receipt.logs[0].args.tokenId;
        expect(tokenId).to.be.bignumber.equal(new BN(5));
        expect(await this.nft.ownerOf(tokenId.toString())).to.be.equal(other2);

        tokenId = receipt.logs[1].args.tokenId;
        expect(tokenId).to.be.bignumber.equal(new BN(6));
        expect(await this.nft.ownerOf(tokenId.toString())).to.be.equal(other2);
    });

    it("Pool1::mintNFT() -> supply", async function () {
        const poolInfo = await this.factory.poolInfo(Pool1.pid);
        expect(poolInfo.supply).to.be.bignumber.equal(new BN(4));
    });

    it("Pool1::mintNFT() -> other2 mint again(userinfo.claimedNum.add(num) <= pools[_pid].limitPerAccount)", async function () {
        await expectRevert(
            this.factory.mintNFT(Pool1.pid, 1, MerkleTree2.getHexProof(Ethers.utils.keccak256(other2)), {
                from:  other2,
                value: 1,
            }),
            "NFTFactory::mintNFT: Claim num exceeded",
        );
    });

    it("Pool1::mintNFT() -> other2 user info", async function () {
        const info = await this.factory.userInfo(Pool1.pid, other2);
        expect(info.claimedNum).to.be.bignumber.equal(new BN(2));
    });

    it("Pool1::supply", async function () {
        const poolInfo = await this.factory.poolInfo(Pool1.pid);
        expect(poolInfo.supply).to.be.bignumber.equal(new BN(4));
    });

    it("Pool2::mintAirdrop() -> airdrop1 mint", async function () {
        const nftBalanceBefore = await this.nft.balanceOf(airdrop1);

        const receipt = await this.factory.mintAirdrop(Pool2.pid, [airdrop1], {
            from: operator,
        });

        const nftBalanceAfter = await this.nft.balanceOf(airdrop1);

        await expectEvent(
            receipt,
            "MintNFT",
            {
                pid:       new BN(Pool2.pid),
                account:   airdrop1,
                payAmount: new BN(0),
            },
        );

        expect(nftBalanceAfter.sub(nftBalanceBefore)).to.be.bignumber.equal(new BN(1));

        const tokenId = receipt.logs[0].args.tokenId;
        expect(tokenId).to.be.bignumber.equal(new BN(7));
        expect(await this.nft.ownerOf(tokenId.toString())).to.be.equal(airdrop1);
    });

    it("Pool2::mintAirdrop() -> airdrop2 mint", async function () {
        const nftBalanceBefore = await this.nft.balanceOf(airdrop2);

        const receipt = await this.factory.mintAirdrop(Pool2.pid, [airdrop2], {
            from: operator,
        });

        const nftBalanceAfter = await this.nft.balanceOf(airdrop2);

        await expectEvent(
            receipt,
            "MintNFT",
            {
                pid:       new BN(Pool2.pid),
                account:   airdrop2,
                payAmount: new BN(0),
            },
        );

        expect(nftBalanceAfter.sub(nftBalanceBefore)).to.be.bignumber.equal(new BN(1));

        const tokenId = receipt.logs[0].args.tokenId;
        expect(tokenId).to.be.bignumber.equal(new BN(8));
        expect(await this.nft.ownerOf(tokenId.toString())).to.be.equal(airdrop2);
    });

    it("Pool2::mintAirdrop(poolInfo.supply.add(_accounts.length) <= poolInfo.maxNum) -> airdrop1 mint again", async function () {
        await expectRevert(
            this.factory.mintAirdrop(Pool2.pid, [other1], {
                from: operator,
            }),
            "NFTFactory:mintAirdrop: Pool cap exceeded",
        );
    });

    it("Pool2::mintAirdrop() -> airdrop1 user info", async function () {
        const info = await this.factory.userInfo(Pool2.pid, airdrop1);
        expect(info.claimedNum).to.be.bignumber.equal(new BN(1));
    });

    it("Pool2::supply", async function () {
        const poolInfo = await this.factory.poolInfo(Pool2.pid);
        expect(poolInfo.supply).to.be.bignumber.equal(new BN(2));
    });

    it("totalSupply()", async function () {
        expect(await this.factory.totalSupply()).to.be.bignumber.equal(new BN(8));
    });

    it("pause(Poo0)", async function () {
        await expectEvent(
            await this.factory.pause(Pool0.pid, {from: operator}),
            "Paused",
            {pid: new BN(Pool0.pid)},
        );
    });

    it("Pool0::mintNFT(!pool.paused)", async function () {
        await expectRevert(
            this.factory.mintNFT(Pool0.pid, 1, MerkleTree1.getHexProof(Ethers.utils.keccak256(other3)), {
                from:  other3,
                value: 0,
            }),
            "NFTFactory::mintNFT: Has paused",
        );
    });

    it("withdrawETH(not treasury)", async function () {
        await expectRevert(
            this.factory.withdrawETH({from: operator}),
            "NFTFactory::caller is not treasury",
        );
    });

    it("withdrawETH", async function () {
        const ethBalance = await balance.current(this.factory.address, "wei");
        const tracker    = await balance.tracker(treasury, "wei");
        const receipt    = await this.factory.withdrawETH({from: treasury});
        const {
                  delta,
                  fees,
              }          = await tracker.deltaWithFees();
        await expectEvent(
            receipt,
            "Withdraw",
            {
                account: treasury,
                amount:  new BN(4),
            },
        );

        expect(await balance.current(this.factory.address, "wei")).to.be.bignumber.equal(new BN(0));
        expect(delta).to.be.bignumber.equal(ethBalance.sub(fees));
    });
});