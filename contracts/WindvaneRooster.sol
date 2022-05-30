// SPDX-License-Identifier: MIT
pragma solidity ^0.6.0;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

abstract contract ERC721Pausable is ERC721, Pausable {
    /**
     * @dev See {ERC721-_beforeTokenTransfer}.
     *
     * Requirements:
     *
     * - the contract must not be paused.
     */
    function _beforeTokenTransfer(address from, address to, uint256 tokenId) internal virtual override {
        super._beforeTokenTransfer(from, to, tokenId);

        require(!paused() || from == address(0), "ERC721Pausable: token transfer while paused");
    }
}

contract WindvaneRooster is AccessControl, ERC721Pausable {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
    uint256 public constant MAXIMUM = 4500;

    constructor (string memory _name, string memory _symbol) public ERC721(_name, _symbol) {
        _setupRole(DEFAULT_ADMIN_ROLE, _msgSender());

        _setupRole(MINTER_ROLE, _msgSender());
        _setupRole(PAUSER_ROLE, _msgSender());

        _setBaseURI("https://assets.windvane.io/nft-source/genesis-mint/");
    }

    function setBaseURI(string memory _baseURI) public virtual {
        require(hasRole(DEFAULT_ADMIN_ROLE, _msgSender()), "WindvaneRooster::setBaseURI: caller is not admin");
        _setBaseURI(_baseURI);
    }

    function pause() public virtual {
        require(hasRole(PAUSER_ROLE, _msgSender()), "WindvaneRooster::pause: caller is not pauser");
        _pause();
    }

    function unpause() public virtual {
        require(hasRole(PAUSER_ROLE, _msgSender()), "WindvaneRooster::unpause: caller is not pauser");
        _unpause();
    }

    function safeMint(address to, uint256 tokenId) public virtual {
        require(hasRole(MINTER_ROLE, _msgSender()), "WindvaneRooster::safeMint: caller is not minter");
        require(totalSupply() < MAXIMUM, "WindvaneRooster::safeMint: cap exceeded");

        _safeMint(to, tokenId);
    }

    function burn(uint256 tokenId) public virtual {
        require(hasRole(MINTER_ROLE, _msgSender()), "WindvaneRooster::burn: caller is not minter");
        require(_isApprovedOrOwner(_msgSender(), tokenId), "WindvaneRooster::burn: caller is not owner nor approved");

        _burn(tokenId);
    }
}