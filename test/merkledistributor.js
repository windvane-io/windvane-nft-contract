/*
* Node Version: V12.3+
* File Name: merkledistributor
* Author: neo
* Date Created: 2022-05-25
*/

const {
          accounts,
          contract,
      }                 = require("@openzeppelin/test-environment");
const {
          BN,
          balance,
          expectRevert,
          expectEvent,
          send,
      }                 = require("@openzeppelin/test-helpers");
const {expect}          = require("chai");
const Ethers            = require("ethers");
const {parseBalanceMap} = require("./merkle/parse-balance-map");
const MerkleDistributor = contract.fromArtifact("MerkleDistributor");

describe("MerkleDistributor", function () {
    const [deployer, owner, user1, user2, user3] = accounts;
    const data                                   = [{
        address:  user1,
        earnings: `0x${new BN(100).toString(16)}`,
        index:    0,
        reasons:  "",
    }, {
        address:  user2,
        earnings: `0x${new BN(200).toString(16)}`,
        index:    1,
        reasons:  "",
    }, {
        address:  user3,
        earnings: `0x${new BN(800).toString(16)}`,
        reasons:  "",
        index:    2,
    }];

    const balanceMerkleMap = parseBalanceMap(data);

    before(async function () {
        this.contract = await MerkleDistributor.new(Ethers.constants.HashZero, {from: deployer});
    });

    it("Transfer Ownership", async function () {
        expectEvent(
            await this.contract.transferOwnership(owner, {from: deployer}),
            "OwnershipTransferred",
            {
                previousOwner: deployer,
                newOwner:      owner,
            },
        );
    });

    it("Transfer 1000 wei", async function () {
        await send.ether(owner, this.contract.address, 1000, {from: owner});
        expect(await balance.current(this.contract.address, "wei")).to.be.bignumber.equal(new BN(1000));
    });

    it("setMerkleRoot(not owner)", async function () {
        await expectRevert(
            this.contract.setMerkleRoot(balanceMerkleMap.merkleRoot, {from: deployer}),
            "Ownable: caller is not the owner",
        );
    });

    it("setMerkleRoot", async function () {
        await this.contract.setMerkleRoot(balanceMerkleMap.merkleRoot, {from: owner});
        expect(await this.contract.merkleRoot()).to.be.equal(balanceMerkleMap.merkleRoot);
    });

    it("isClaimed( false )", async function () {
        expect(await this.contract.isClaimed(balanceMerkleMap.claims[user1].index, {from: user1})).to.be.equal(false);
    });

    it("Claim(Invalid proof -> account)", async function () {
        const merkle = balanceMerkleMap.claims[user1];
        await expectRevert(
            this.contract.claim(merkle.index, user2, merkle.amount, merkle.proof, {from: user1}),
            "MerkleDistributor: Invalid proof.",
        );
    });

    it("Claim(Invalid proof -> index)", async function () {
        const merkle = balanceMerkleMap.claims[user1];
        await expectRevert(
            this.contract.claim(merkle.index + 1, user1, merkle.amount, merkle.proof, {from: user1}),
            "MerkleDistributor: Invalid proof.",
        );
    });

    it("Claim(Invalid proof -> amount)", async function () {
        const merkle = balanceMerkleMap.claims[user1];
        await expectRevert(
            this.contract.claim(merkle.index, user1, new BN(merkle.amount.substr(2), 16).add(new BN(1)), merkle.proof, {from: user1}),
            "MerkleDistributor: Invalid proof.",
        );
    });

    it("Claim(Invalid proof -> proof)", async function () {
        const merkle     = balanceMerkleMap.claims[user1];
        const wrongProof = balanceMerkleMap.claims[user2].proof;
        await expectRevert(
            this.contract.claim(merkle.index, user1, merkle.amount, wrongProof, {from: user1}),
            "MerkleDistributor: Invalid proof.",
        );
    });

    it("Claim( self )", async function () {
        const merkle  = balanceMerkleMap.claims[user1];
        const tracker = await balance.tracker(user1, "wei");

        await expectEvent(
            await this.contract.claim(merkle.index, user1, merkle.amount, merkle.proof, {from: user1}),
            "Claimed",
            {
                index:   new BN(merkle.index),
                account: user1,
                amount:  new BN(merkle.amount.substr(2), 16),
            },
        );

        const {
                  delta,
                  fees,
              } = await tracker.deltaWithFees();
        expect(delta).to.be.bignumber.equal(new BN(merkle.amount.substr(2), 16).sub(fees));
    });

    it("isClaimed( true )", async function () {
        expect(await this.contract.isClaimed(balanceMerkleMap.claims[user1].index, {from: user1})).to.be.equal(true);
    });

    it("Claim (for user2 account)", async function () {
        const merkle = balanceMerkleMap.claims[user2];

        const balanceBefore = await balance.current(user2, "wei");
        await expectEvent(
            await this.contract.claim(merkle.index, user2, merkle.amount, merkle.proof, {from: user1}),
            "Claimed",
            {
                index:   new BN(merkle.index),
                account: user2,
                amount:  new BN(merkle.amount.substr(2), 16),
            },
        );

        const balanceAfter = await balance.current(user2, "wei");
        expect(balanceAfter.sub(balanceBefore)).to.be.bignumber.equal(new BN(merkle.amount.substr(2), 16));
    });

    it("Claim(Transfer fail)", async function () {
        const merkle = balanceMerkleMap.claims[user3];
        await expectRevert(
            this.contract.claim(merkle.index, user3, merkle.amount, merkle.proof, {from: user3}),
            "Address: insufficient balance",
        );
    });

    it("Transfer 500 wei", async function () {
        await send.ether(deployer, this.contract.address, 500, {from: deployer});
        expect(await balance.current(this.contract.address, "wei")).to.be.bignumber.equal(new BN(1200));
    });

    it("Claim( user3 )", async function () {
        const merkle = balanceMerkleMap.claims[user3];

        const tracker = await balance.tracker(user3, "wei");
        await expectEvent(
            await this.contract.claim(merkle.index, user3, merkle.amount, merkle.proof, {from: user3}),
            "Claimed",
            {
                index:   new BN(merkle.index),
                account: user3,
                amount:  new BN(merkle.amount.substr(2), 16),
            },
        );

        const {
                  delta,
                  fees,
              } = await tracker.deltaWithFees();
        expect(delta).to.be.bignumber.equal(new BN(merkle.amount.substr(2), 16).sub(fees));
    });

    it("withdrawEmergency(not owner)", async function () {
        await expectRevert(
            this.contract.withdrawEmergency({from: deployer}),
            "Ownable: caller is not the owner",
        );
    });

    it("withdrawEmergency()", async function () {
        const tracker = await balance.tracker(owner, "wei");
        await expectEvent(
            await this.contract.withdrawEmergency({from: owner}),
            "Withdraw",
            {
                account: owner,
                amount:  new BN(400),
            },
        );

        const {
                  delta,
                  fees,
              } = await tracker.deltaWithFees();
        expect(delta).to.be.bignumber.equal(new BN(400).sub(fees));
        expect(await balance.current(this.contract.address, "wei")).to.be.bignumber.equal(new BN(0));
    });
});
