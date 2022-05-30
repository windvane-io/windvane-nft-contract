/*
* Node Version: V12.3+
* File Name: nft.erc721.test.js
* Author: neo
* Date Created: 2022-05-18
*/

const {
          accounts,
          contract,
      }        = require("@openzeppelin/test-environment");
const {
          BN,
          expectRevert,
          expectEvent,
      }        = require("@openzeppelin/test-helpers");
const {expect} = require("chai");
const Ethers   = require("ethers");
const NFT      = contract.fromArtifact("WindvaneRooster");

describe("NFT", function () {
    const [deployer, minter, pauser, other1, other2] = accounts;
    before(async function () {
        this.nft = await NFT.new("ERC721", "ERC721", {from: deployer});
        await this.nft.grantRole(await this.nft.PAUSER_ROLE(), pauser, {from: deployer});
        await this.nft.grantRole(await this.nft.MINTER_ROLE(), minter, {from: deployer});
    });

    it("setBaseURI", async function () {
        await this.nft.setBaseURI("ipfs://", {from: deployer});
        expect(await this.nft.baseURI()).to.be.equal("ipfs://");
    });

    it("Not paused", async function () {
        expect(await this.nft.paused({from: deployer})).to.be.equal(false);
    });

    it("Mint(not paused)", async function () {
        await expectEvent(
            await this.nft.safeMint(other1, 1, {from: minter}),
            "Transfer",
            {
                from:    Ethers.constants.AddressZero,
                to:      other1,
                tokenId: new BN(1),
            },
        );

        expect(await this.nft.ownerOf(1)).to.be.equal(other1);
    });

    it("safeTransferFrom(not paused)", async function () {
        await this.nft.safeTransferFrom(other1, other2, 1, {from: other1});
        expect(await this.nft.ownerOf(1)).to.be.equal(other2);
    });

    it("Pause", async function () {
        await this.nft.pause({from: pauser});
        expect(await this.nft.paused({from: deployer})).to.be.equal(true);
    });

    it("Mint(paused)", async function () {
        await expectEvent(
            await this.nft.safeMint(other1, 2, {from: minter}),
            "Transfer",
            {
                from:    Ethers.constants.AddressZero,
                to:      other1,
                tokenId: new BN(2),
            },
        );

        expect(await this.nft.ownerOf(2)).to.be.equal(other1);
    });

    it("safeTransferFrom(ERC721Pausable: token transfer while paused)", async function () {
        await expectRevert(
            this.nft.safeTransferFrom(other1, other2, 2, {from: other1}),
            "ERC721Pausable: token transfer while paused");
    });
});