// SPDX-License-Identifier: MIT
pragma solidity ^0.6.0;
pragma experimental ABIEncoderV2;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/cryptography/MerkleProof.sol";
import "@openzeppelin/contracts/utils/Address.sol";

interface IERC721 {
    function safeMint(address to, uint256 tokenId) external;

    function totalSupply() external view returns (uint256);
}


contract NFTFactory is AccessControl, ReentrancyGuard {
    using SafeMath for uint256;

    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");
    bytes32 public constant TREASURY_ROLE = keccak256("TREASURY_ROLE");

    IERC721 public nft;

    struct UserInfo {
        uint256 claimedNum;
    }

    struct PoolInfo {
        uint256 maxNum;
        uint256 supply;
        bool paused;
        uint256 price;
        bytes32 root;
        uint256 limitPerAccount;
    }

    PoolInfo[] private pools;

    mapping(uint256 => mapping(address => UserInfo)) private users;

    event NewPool(uint256 indexed pid, uint256 maxNum, bool paused, uint256 price, bytes32 root, uint256 limitPerAccount);
    event ChangePoolMaxAndLimit(uint256 indexed pid, uint256 maxNum, uint256 price, uint256 limitPerAccount);
    event SetPoolRoot(uint256 indexed pid, bytes32 root);
    event MintNFT(uint256 indexed pid, address indexed account, uint256 tokenId, uint256 payAmount);
    event Withdraw(address indexed account, uint256 amount);
    event Paused(uint256 indexed pid);
    event Unpaused(uint256 indexed pid);

    constructor(IERC721 _nft) public {
        nft = _nft;

        _setupRole(DEFAULT_ADMIN_ROLE, _msgSender());

        _setupRole(OPERATOR_ROLE, _msgSender());
        _setupRole(TREASURY_ROLE, _msgSender());
    }

    modifier onlyOperator() {
        require(hasRole(OPERATOR_ROLE, _msgSender()), "NFTFactory::caller is not operator");
        _;
    }

    modifier onlyTreasury() {
        require(hasRole(TREASURY_ROLE, _msgSender()), "NFTFactory::caller is not treasury");
        _;
    }

    function addPool(uint256 _maxNum, bool _paused, uint256 _price, uint256 _limitPerAccount, bytes32 _root) external onlyOperator {
        require(_limitPerAccount > 0, "NFTFactory::addPool: Limit per account must great than zero");
        require(_maxNum > 0, "NFTFactory::addPool: Max num must be higher than zero");

        pools.push(PoolInfo({
        maxNum : _maxNum,
        supply : 0,
        paused : _paused,
        price : _price, // allow to zero
        root : _root,
        limitPerAccount : _limitPerAccount
        }));

        emit NewPool(pools.length.sub(1), _maxNum, _paused, _price, _root, _limitPerAccount);
    }

    function poolInfo(uint256 _pid) external view returns (PoolInfo memory) {
        return pools[_pid];
    }

    function userInfo(uint256 _pid, address account) external view returns (UserInfo memory) {
        return users[_pid][account];
    }

    function poolLength() external view returns (uint256) {
        return pools.length;
    }

    function mintNFT(uint256 _pid, uint256 _num, bytes32[] calldata _proof) external payable nonReentrant {
        address account = _msgSender();
        PoolInfo storage pool = pools[_pid];

        require(!pool.paused, "NFTFactory::mintNFT: Has paused");
        require(MerkleProof.verify(_proof, pool.root, keccak256(abi.encodePacked(account))), "NFTFactory::mintNFT: Not in whitelist");
        require(_num > 0, "NFTFactory:mintNFT: num must be great than zero");
        require(pool.supply.add(_num) <= pool.maxNum, "NFTFactory:mintNFT: Pool cap exceeded");
        require(pool.price.mul(_num) == msg.value, "NFTFactory::mintNFT: Pay amount error");

        UserInfo storage userinfo = users[_pid][account];
        require(userinfo.claimedNum.add(_num) <= pool.limitPerAccount, "NFTFactory::mintNFT: Claim num exceeded");

        for (uint256 i = 0; i < _num; i++) {
            uint256 tokenId = nft.totalSupply().add(1);

            pool.supply = pool.supply.add(1);
            userinfo.claimedNum = userinfo.claimedNum.add(1);
            nft.safeMint(account, tokenId);

            emit MintNFT(_pid, account, tokenId, pool.price);
        }
    }

    function mintAirdrop(uint256 _pid, address[] calldata _accounts) external onlyOperator {
        PoolInfo storage pool = pools[_pid];
        require(!pool.paused, "NFTFactory::mintAirdrop: Has paused");
        require(_accounts.length > 0, "NFTFactory::mintAirdrop: Accounts is empty");
        require(pool.supply.add(_accounts.length) <= pool.maxNum, "NFTFactory:mintAirdrop: Pool cap exceeded");
        // pool.limitPerAccount unused
        // pool.price unused

        for (uint256 i = 0; i < _accounts.length; i++) {
            address account = _accounts[i];
            uint256 tokenId = nft.totalSupply().add(1);

            UserInfo storage userinfo = users[_pid][account];
            pool.supply = pool.supply.add(1);
            userinfo.claimedNum = userinfo.claimedNum.add(1);
            nft.safeMint(account, tokenId);

            emit MintNFT(_pid, account, tokenId, 0);
        }
    }

    function setPoolMaxNumAndLimit(uint256 _pid, uint256 _maxNum, uint256 _price, uint256 _limitPerAccount) external onlyOperator {
        PoolInfo storage pool = pools[_pid];

        require(pool.paused, "NFTFactory::setPoolMaxNumAndLimit: Has started");
        require(_limitPerAccount > 0, "NFTFactory::setPoolMaxNumAndLimit: Limit must great than zero");
        require(_maxNum > 0, "NFTFactory::setPoolMaxNumAndLimit: Max num must be higher than zero");
        require(_maxNum >= pool.supply, "NFTFactory::setPoolMaxNumAndLimit: Max num cap exceeded");

        pool.maxNum = _maxNum;
        pool.price = _price;
        pool.limitPerAccount = _limitPerAccount;

        emit ChangePoolMaxAndLimit(_pid, _maxNum, _price, _limitPerAccount);
    }

    function setPoolRoot(uint256 _pid, bytes32 _root) external onlyOperator {
        require(pools[_pid].paused, "NFTFactory::setPoolRoot: Has started");

        pools[_pid].root = _root;
        emit SetPoolRoot(_pid, _root);
    }

    function pause(uint256 _pid) external onlyOperator {
        require(!pools[_pid].paused, "NFTFactory::pause: Has paused");

        pools[_pid].paused = true;
        emit Paused(_pid);
    }

    function unpause(uint256 _pid) external onlyOperator {
        require(pools[_pid].paused, "NFTFactory::pause: Has started");

        pools[_pid].paused = false;
        emit Unpaused(_pid);
    }

    function totalMaxNum() public view returns (uint256) {
        uint256 maxNum;
        for (uint256 i = 0; i < pools.length; i++) {
            maxNum = maxNum.add(pools[i].maxNum);
        }
        return maxNum;
    }

    function totalSupply() public view returns (uint256) {
        uint256 supply;
        for (uint256 i = 0; i < pools.length; i++) {
            supply = supply.add(pools[i].supply);
        }
        return supply;
    }

    function withdrawETH() public onlyTreasury {
        uint256 balance = address(this).balance;
        Address.sendValue(msg.sender, balance);

        emit Withdraw(msg.sender, balance);
    }
}
