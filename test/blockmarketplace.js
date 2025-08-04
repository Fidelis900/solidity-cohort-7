const {
  loadFixture,
} = require("@nomicfoundation/hardhat-toolbox/network-helpers");
// const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");
const { expect, assert } = require("chai");
const { ethers } = require("hardhat");
const { bigint } = require("hardhat/internal/core/params/argumentTypes");

// util functon
const deployBlockMarketPlace = async () => {
  // target the BlockMarketPlace contract within our contract folder
  const [owner_, addr1, addr2, addr3] = await ethers.getSigners();
  const BlockMarketPlaceContract = await ethers.getContractFactory(
    "BlockMarketPlace"
  ); // target BlockMarketPlace.sol
  const BlockNftContract = await ethers.getContractFactory("BlockNft");
  const BlockTokenContract = await ethers.getContractFactory("BlockToken");
  let name_ = "BlockToken";
  let symbol_ = "BCT";
  const BlockToken = await BlockTokenContract.deploy(
    name_,
    symbol_,
    owner_.address
  ); // deploy the BlockToken contract
  const blocknft = await BlockNftContract.deploy();
  const marketplace = await BlockMarketPlaceContract.connect(owner_).deploy();
  // deploy the BlockMarketPlace contract
  return { marketplace, blocknft, BlockToken, owner_, addr1, addr2 }; // return the deployed instance of our BlockMarketPlace contract
};

describe("BlockMarketPlace Test Suite", () => {
  describe("Deployment", () => {
    it("Should return set values upon deployment", async () => {
      const { marketplace, owner_ } = await loadFixture(deployBlockMarketPlace);
      expect(await marketplace.marketOwner()).to.eq(owner_);
    });
  });

  describe("Listing", () => {
    it("Should list Nft accordingly", async () => {
      const { marketplace, addr1, BlockToken, blocknft } = await loadFixture(
        deployBlockMarketPlace
      );
      let tokenId = 1;
      await blocknft.connect(addr1).mint(addr1);
      let token = await ethers.getContractAt("IERC20", BlockToken);
      await blocknft
        .connect(addr1)
        .setApprovalForAll(marketplace.getAddress(), true);
      await marketplace.connect(addr1).listNft({
        owner: addr1,
        tokenId: tokenId,
        paymentToken: token,
        NftToken: blocknft.getAddress(),
        isNative: false,
        price: 100000,
        sold: false,
        minOffer: 10,
      });

      expect(await blocknft.ownerOf(tokenId)).to.eq(
        await marketplace.getAddress()
      );
    });

    it("Should revert upon setting unaccepted values", async () => {
      const { marketplace, addr1, BlockToken, blocknft } = await loadFixture(
        deployBlockMarketPlace
      );
      let tokenId = 1;
      await blocknft.connect(addr1).mint(addr1);
      let token = await ethers.getContractAt("IERC20", BlockToken);
      await blocknft
        .connect(addr1)
        .setApprovalForAll(marketplace.getAddress(), true);
      let tx1 = marketplace.connect(addr1).listNft({
        owner: addr1,
        tokenId: tokenId,
        paymentToken: token,
        NftToken: blocknft.getAddress(),
        isNative: false,
        price: 0,
        sold: false,
        minOffer: 10,
      });

      await expect(tx1).to.be.revertedWith("Invalid price");
      //   tx2
      let tx2 = marketplace.connect(addr1).listNft({
        owner: addr1,
        tokenId: tokenId,
        paymentToken: token,
        NftToken: blocknft.getAddress(),
        isNative: false,
        price: 10000,
        sold: false,
        minOffer: 0,
      });

      await expect(tx2).to.be.revertedWith("Invalid min offer");

      //   tx3
      let tx3 = marketplace.connect(addr1).listNft({
        owner: addr1,
        tokenId: tokenId,
        paymentToken: token,
        NftToken: blocknft.getAddress(),
        isNative: true,
        price: 10000,
        sold: false,
        minOffer: 10,
      });

      await expect(tx3).to.be.revertedWith("ERC20 Payment is not supported");

      let ZeroAddress = "0x0000000000000000000000000000000000000000";
      marketplace.connect(addr1).listNft({
        owner: addr1,
        tokenId: tokenId,
        paymentToken: ZeroAddress,
        NftToken: blocknft.getAddress(),
        isNative: true,
        price: 10000,
        sold: false,
        minOffer: 10,
      });

      let [, , paymentToken, , ,] = await marketplace.getListing(1);

      expect(await paymentToken).to.eq(ZeroAddress);
    });
  });

  describe("Buying", () => {
    it("Should buy Nft accordingly with payment token", async () => {
      const { marketplace, owner_, addr1, addr2, BlockToken, blocknft } =
        await loadFixture(deployBlockMarketPlace);
      let tokenId = 1;
      let listId = 0;
      await blocknft.connect(addr1).mint(addr1);
      let token = await ethers.getContractAt("IERC20", BlockToken);
      // await token.connect(owner_).mint(2000, addr2);
      await blocknft
        .connect(addr1)
        .setApprovalForAll(marketplace.getAddress(), true);
      await marketplace.connect(addr1).listNft({
        owner: addr1,
        tokenId: tokenId,
        paymentToken: token,
        NftToken: blocknft.getAddress(),
        isNative: false,
        price: 1000,
        sold: false,
        minOffer: 500
      });

      await BlockToken.connect(owner_).mint(2000, addr2);
      
      await BlockToken.connect(addr2).approve(marketplace.getAddress(), 2000);

      // buy the listed nft
      await marketplace.connect(addr2).buyNft(listId);

      expect(await blocknft.ownerOf(tokenId)).to.eq(addr2.address);

      // expect(await BlockToken.balanceOf(addr1)).to.eq(970);
      // expect(await BlockToken.balanceOf(addr2)).to.eq(1000);
      // expect(await BlockToken.balanceOf(owner_)).to.eq(30);
    });

    it("Should buy Nft accordingly with native token", async () => {
      const { marketplace, owner_, addr1, addr2, BlockToken, blocknft } =
        await loadFixture(deployBlockMarketPlace);
      let tokenId = 1;
      let listId = 0;
      let ZeroAddress = "0x0000000000000000000000000000000000000000";
      await blocknft.connect(addr1).mint(addr1);
      await blocknft
        .connect(addr1)
        .setApprovalForAll(marketplace.getAddress(), true);
      await marketplace.connect(addr1).listNft({
        owner: addr1,
        tokenId: tokenId,
        paymentToken: ZeroAddress,
        NftToken: blocknft.getAddress(),
        isNative: true,
        price: 100,
        sold: false,
        minOffer: 50
      });
      await marketplace.connect(addr2).buyNft(listId, {value: 100});

      expect(await blocknft.ownerOf(tokenId)).to.eq(addr2.address);
      // console.log( await ethers.balanceOf(marketplace.getAddress()));
    });

    it("Should revert for insufficientBalance", async () => {
      const { marketplace, owner_, addr1, addr2, BlockToken, blocknft } =
        await loadFixture(deployBlockMarketPlace);
      let tokenId = 1;
      let listId = 0;
      await blocknft.connect(addr1).mint(addr1);
      let token = await ethers.getContractAt("IERC20", BlockToken);
      await blocknft
        .connect(addr1)
        .setApprovalForAll(marketplace.getAddress(), true);
      await marketplace.connect(addr1).listNft({
        owner: addr1,
        tokenId: tokenId,
        paymentToken: token,
        NftToken: blocknft.getAddress(),
        isNative: false,
        price: 1000,
        sold: false,
        minOffer: 500
      });

      await BlockToken.connect(owner_).mint(200, addr2);
      await BlockToken.connect(addr2).approve(marketplace.getAddress(), 1000);
      // buy the listed nft
      let tx1 = marketplace.connect(addr2).buyNft(listId);

      await expect( tx1 ).to.be.revertedWithCustomError(BlockToken, "ERC20InsufficientBalance");
    });

    it("Should revert for nft already sold", async () => {

      const { marketplace, owner_, addr1, addr2, addr3, BlockToken, blocknft } =
        await loadFixture(deployBlockMarketPlace);
      let tokenId = 1;
      let listId = 0;
      console.log(owner_.address,addr1.address,addr2.address);
      await blocknft.connect(addr1).mint(addr1);
      let token = await ethers.getContractAt("IERC20", BlockToken);
      // await token.connect(owner_).mint(2000, addr2);
      await blocknft
        .connect(addr1)
        .setApprovalForAll(marketplace.getAddress(), true);
      await marketplace.connect(addr1).listNft({
        owner: addr1,
        tokenId: tokenId,
        paymentToken: token,
        NftToken: blocknft.getAddress(),
        isNative: false,
        price: 1000,
        sold: false,
        minOffer: 500
      });

      await BlockToken.connect(owner_).mint(2000, addr2);
      await BlockToken.connect(addr2).approve(marketplace.getAddress(), 1000);
      // buy the listed nft
      await marketplace.connect(addr2).buyNft(listId);

      expect(await blocknft.ownerOf(tokenId)).to.eq(addr2.address);

      await expect( marketplace.connect(addr2).buyNft(listId)).to.be.revertedWith("ALready Sold");
    });

    it("Should revert for incoorrect price", async () => {

      const { marketplace, owner_, addr1, addr2, BlockToken, blocknft } = await loadFixture(deployBlockMarketPlace);
      let tokenId = 1;
      let listId = 0;
      let ZeroAddress = "0x0000000000000000000000000000000000000000";
      await blocknft.connect(addr1).mint(addr1);
      await blocknft
        .connect(addr1)
        .setApprovalForAll(marketplace.getAddress(), true);
      await marketplace.connect(addr1).listNft({
        owner: addr1,
        tokenId: tokenId,
        paymentToken: ZeroAddress,
        NftToken: blocknft.getAddress(),
        isNative: true,
        price: 100,
        sold: false,
        minOffer: 50
      });
      await expect( marketplace.connect(addr2).buyNft(listId, {value: 50})).to.be.revertedWith("Incorrect price");
    });
  
  });

  describe("Cancelling Listing", () => {
    it("Should cancel listing accordingly", async () => {
      const { marketplace, addr1, BlockToken, blocknft } = await loadFixture(
        deployBlockMarketPlace
      );
      let tokenId = 1;
      let listId = 0;
      await blocknft.connect(addr1).mint(addr1);
      let token = await ethers.getContractAt("IERC20", BlockToken);
      await blocknft
        .connect(addr1)
        .setApprovalForAll(marketplace.getAddress(), true);
      await marketplace.connect(addr1).listNft({
        owner: addr1,
        tokenId: tokenId,
        paymentToken: token,
        NftToken: blocknft.getAddress(),
        isNative: false,
        price: 100000,
        sold: false,
        minOffer: 10,
      });

      await marketplace.connect(addr1).cancelListing(listId);

      expect(await blocknft.ownerOf(tokenId)).to.eq(
        addr1
      );
    });

    it("Should revert when called my unauthorised user", async () => {
      const { marketplace, addr1,addr2, BlockToken, blocknft } = await loadFixture(
        deployBlockMarketPlace
      );
      let tokenId = 1;
      let listId = 0;
      await blocknft.connect(addr1).mint(addr1);
      let token = await ethers.getContractAt("IERC20", BlockToken);
      await blocknft
        .connect(addr1)
        .setApprovalForAll(marketplace.getAddress(), true);
      await marketplace.connect(addr1).listNft({
        owner: addr1,
        tokenId: tokenId,
        paymentToken: token,
        NftToken: blocknft.getAddress(),
        isNative: false,
        price: 100000,
        sold: false,
        minOffer: 10,
      });

      await expect(marketplace.connect(addr2).cancelListing(listId)).to.be.revertedWith("Unauthorized user");
    });

    it("Should revert when you cancel listing of already sold listing", async () => {
      const { marketplace, owner_, addr1, addr2, BlockToken, blocknft } =
        await loadFixture(deployBlockMarketPlace);
      let tokenId = 1;
      let listId = 0;
      await blocknft.connect(addr1).mint(addr1);
      let token = await ethers.getContractAt("IERC20", BlockToken);
      // await token.connect(owner_).mint(2000, addr2);
      await blocknft
        .connect(addr1)
        .setApprovalForAll(marketplace.getAddress(), true);
      await marketplace.connect(addr1).listNft({
        owner: addr1,
        tokenId: tokenId,
        paymentToken: token,
        NftToken: blocknft.getAddress(),
        isNative: false,
        price: 1000,
        sold: false,
        minOffer: 500
        });

      await BlockToken.connect(owner_).mint(2000, addr2);

      await BlockToken.connect(addr2).approve(marketplace.getAddress(), 2000);
       
      // buy the listed nft
      await marketplace.connect(addr2).buyNft(listId);

      await expect(marketplace.connect(addr1).cancelListing(listId)).to.be.revertedWith("Already sold");
    });

  });

  describe("Making Offer", async () => {

      it("Should revert when owner make offer", async () => {
        const { marketplace, addr1, addr2, owner_, BlockToken, blocknft } = await loadFixture(
        deployBlockMarketPlace
      );
      let tokenId = 1;
      let listId = 0;

      await blocknft.connect(addr1).mint(addr1);
      let token = await ethers.getContractAt("IERC20", BlockToken);
      await blocknft
        .connect(addr1)
        .setApprovalForAll(marketplace.getAddress(), true);
      await marketplace.connect(addr1).listNft({
        owner: addr1,
        tokenId: tokenId,
        paymentToken: token,
        NftToken: blocknft.getAddress(),
        isNative: false,
        price: 10000,
        sold: false,
        minOffer: 5000,
      });

      await BlockToken.connect(owner_).mint(20000, addr1);
      // // buy the listed nft
      await BlockToken.connect(addr1).approve(marketplace.getAddress(),7000);
      

      // buy the listed nft
     //await marketplace.connect(addr1).buyNft(listId);

      await expect( marketplace.connect(addr1).offer(listId, 7000)).to.be.revertedWith("Owner cannot offer");

      

    });

    it("Should make an offer for listing accordingly", async () => {
      const { marketplace, addr1, addr2, owner_, BlockToken, blocknft } = await loadFixture(
        deployBlockMarketPlace
      );
      let tokenId = 1;
      let listId = 0;

      await blocknft.connect(addr1).mint(addr1);
      let token = await ethers.getContractAt("IERC20", BlockToken);
      await blocknft
        .connect(addr1)
        .setApprovalForAll(marketplace.getAddress(), true);
      await marketplace.connect(addr1).listNft({
        owner: addr1,
        tokenId: tokenId,
        paymentToken: token,
        NftToken: blocknft.getAddress(),
        isNative: false,
        price: 10000,
        sold: false,
        minOffer: 5000,
      });

      await BlockToken.connect(owner_).mint(20000, addr2);
      // // buy the listed nft
      await BlockToken.connect(addr2).approve(marketplace.getAddress(),20000);


      await marketplace.connect(addr2).offer(listId, 7000);

      expect(await BlockToken.balanceOf(marketplace.getAddress())).to.eq(7000);
    });




    it("Should revert when listing already sold", async () => {
      const { marketplace, addr1, addr2, owner_, BlockToken, blocknft } = await loadFixture(
        deployBlockMarketPlace
      );
      let tokenId = 1;
      let listId = 0;

      await blocknft.connect(addr1).mint(addr1);
      let token = await ethers.getContractAt("IERC20", BlockToken);
      await blocknft
        .connect(addr1)
        .setApprovalForAll(marketplace.getAddress(), true);
      await marketplace.connect(addr1).listNft({
        owner: addr1,
        tokenId: tokenId,
        paymentToken: token,
        NftToken: blocknft.getAddress(),
        isNative: false,
        price: 10000,
        sold: false,
        minOffer: 5000,
      });

      await BlockToken.connect(owner_).mint(20000, addr2);
      // // buy the listed nft
      await BlockToken.connect(addr2).approve(marketplace.getAddress(),20000);
      

      // buy the listed nft
      await marketplace.connect(addr2).buyNft(listId);

      await expect( marketplace.connect(addr2).offer(listId, 7000)).to.be.revertedWith("Already sold");

    });

    it("Should revert when offer amount less than minimum offer", async () => {
      const { marketplace, addr1, addr2, owner_, BlockToken, blocknft } = await loadFixture(
        deployBlockMarketPlace
      );
      let tokenId = 1;
      let listId = 0;

      await blocknft.connect(addr1).mint(addr1);
      let token = await ethers.getContractAt("IERC20", BlockToken);
      await blocknft
        .connect(addr1)
        .setApprovalForAll(marketplace.getAddress(), true);
      await marketplace.connect(addr1).listNft({
        owner: addr1,
        tokenId: tokenId,
        paymentToken: token,
        NftToken: blocknft.getAddress(),
        isNative: false,
        price: 10000,
        sold: false,
        minOffer: 5000,
      });

      await BlockToken.connect(owner_).mint(20000, addr2);

      await BlockToken.connect(addr2).approve(marketplace.getAddress(),20000);


      await expect( marketplace.connect(addr2).offer(listId, 4000)).to.be.revertedWith("Invalid offer");

    });


    it("Should revert when listing receives native but offer amount is not zero", async () => {
      const { marketplace, addr1, addr2, owner_, BlockToken, blocknft } = await loadFixture(
        deployBlockMarketPlace
      );
      let tokenId = 1;
      let listId = 0;
      let ZeroAddress = "0x0000000000000000000000000000000000000000";

      await blocknft.connect(addr1).mint(addr1);
      let token = await ethers.getContractAt("IERC20", BlockToken);
      await blocknft
        .connect(addr1)
        .setApprovalForAll(marketplace.getAddress(), true);
      await marketplace.connect(addr1).listNft({
        owner: addr1,
        tokenId: tokenId,
        paymentToken: ZeroAddress,
        NftToken: blocknft.getAddress(),
        isNative: true,
        price: 1000,
        sold: false,
        minOffer: 500,
      });
      await expect( marketplace.connect(addr2).offer(listId, 4000, {value : 1500})).to.be.revertedWith("Cannot offer erc20");

    });

    it("Should revert when native offer amount less than minimum offer", async () => {
      const { marketplace, addr1, addr2, owner_, BlockToken, blocknft } = await loadFixture(
        deployBlockMarketPlace
      );
      let tokenId = 1;
      let listId = 0;
      let ZeroAddress = "0x0000000000000000000000000000000000000000";

      await blocknft.connect(addr1).mint(addr1);
      let token = await ethers.getContractAt("IERC20", BlockToken);
      await blocknft
        .connect(addr1)
        .setApprovalForAll(marketplace.getAddress(), true);
      await marketplace.connect(addr1).listNft({
        owner: addr1,
        tokenId: tokenId,
        paymentToken: ZeroAddress,
        NftToken: blocknft.getAddress(),
        isNative: true,
        price: 1000,
        sold: false,
        minOffer: 500,
      });
      await expect( marketplace.connect(addr2).offer(listId, 0, {value : 300})).to.be.revertedWith("Invalid offer");

    });
  });

  describe("Getting Offer", async() =>{
    it("Should retun offer details properly", async () => {
      const { marketplace, addr1, addr2, owner_, BlockToken, blocknft } = await loadFixture(
        deployBlockMarketPlace
      );
      let tokenId = 1;
      let listId = 0;

      await blocknft.connect(addr1).mint(addr1);
      let token = await ethers.getContractAt("IERC20", BlockToken);
      await blocknft
        .connect(addr1)
        .setApprovalForAll(marketplace.getAddress(), true);
      await marketplace.connect(addr1).listNft({
        owner: addr1,
        tokenId: tokenId,
        paymentToken: token,
        NftToken: blocknft.getAddress(),
        isNative: false,
        price: 10000,
        sold: false,
        minOffer: 5000,
      });

      await BlockToken.connect(owner_).mint(20000, addr2);

      await BlockToken.connect(addr2).approve(marketplace.getAddress(),20000);
      

      await marketplace.connect(addr2).offer(listId, 7000);

      let {offerrer} = await marketplace.getOffer(0);

      expect(offerrer).to.eq(addr2);

    });
  });

  describe("Accepting Offer", async() =>{
    it("Should accept an offer in payment token accordingly", async () => {
      const { marketplace, addr1, addr2, owner_, BlockToken, blocknft } = await loadFixture(
        deployBlockMarketPlace
      );
      let tokenId = 1;
      let listId = 0;
      let offerId = 0;

      await blocknft.connect(addr1).mint(addr1);
      let token = await ethers.getContractAt("IERC20", BlockToken);
      await blocknft
        .connect(addr1)
        .setApprovalForAll(marketplace.getAddress(), true);
      await marketplace.connect(addr1).listNft({
        owner: addr1,
        tokenId: tokenId,
        paymentToken: token,
        NftToken: blocknft.getAddress(),
        isNative: false,
        price: 12000,
        sold: false,
        minOffer: 5000,
      });

      await BlockToken.connect(owner_).mint(20000, addr2);
      // // buy the listed nft
      await BlockToken.connect(addr2).approve(marketplace.getAddress(),20000);


      await marketplace.connect(addr2).offer(listId, 10000);

      await marketplace.connect(addr1).acceptOffer(offerId);

      expect(await blocknft.ownerOf(tokenId)).to.eq(addr2);
      expect(await BlockToken.balanceOf(addr1)).to.eq(9700);
      expect(await BlockToken.balanceOf(owner_)).to.eq(300);
    });


    it("Should accept an offer in native accordingly", async () => {
      const { marketplace, addr1, addr2, owner_, BlockToken, blocknft } = await loadFixture(
        deployBlockMarketPlace
      );
      let tokenId = 1;
      let listId = 0;
      let offerId = 0;
      let ZeroAddress = "0x0000000000000000000000000000000000000000";

      await blocknft.connect(addr1).mint(addr1);
      let token = await ethers.getContractAt("IERC20", BlockToken);
      await blocknft
        .connect(addr1)
        .setApprovalForAll(marketplace.getAddress(), true);
      await marketplace.connect(addr1).listNft({
        owner: addr1,
        tokenId: tokenId,
        paymentToken: ZeroAddress,
        NftToken: blocknft.getAddress(),
        isNative: true,
        price: 9000,
        sold: false,
        minOffer: 5000,
      });

      await marketplace.connect(addr2).offer(listId, 0, {value: 10000});

      await marketplace.connect(addr1).acceptOffer(offerId);

      expect(await blocknft.ownerOf(tokenId)).to.eq(addr2);
    });

    it("Should revert properly when an not owner of listing is trying to accept offer", async () => {
      const { marketplace, addr1, addr2, owner_, BlockToken, blocknft } = await loadFixture(
        deployBlockMarketPlace
      );
      let tokenId = 1;
      let listId = 0;
      let offerId = 0;

      await blocknft.connect(addr1).mint(addr1);
      let token = await ethers.getContractAt("IERC20", BlockToken);
      await blocknft
        .connect(addr1)
        .setApprovalForAll(marketplace.getAddress(), true);
      await marketplace.connect(addr1).listNft({
        owner: addr1,
        tokenId: tokenId,
        paymentToken: token,
        NftToken: blocknft.getAddress(),
        isNative: false,
        price: 12000,
        sold: false,
        minOffer: 5000,
      });

      await BlockToken.connect(owner_).mint(20000, addr2);
      // // buy the listed nft
      await BlockToken.connect(addr2).approve(marketplace.getAddress(),20000);


      await marketplace.connect(addr2).offer(listId, 10000);

      await expect( marketplace.connect(addr2).acceptOffer(offerId)).to.be.revertedWith("Unauthorized seller");

    });

    it("Should revert properly when listing already sold ", async () => {
      const { marketplace, addr1, addr2, owner_, BlockToken, blocknft } = await loadFixture(
        deployBlockMarketPlace
      );
      let tokenId = 1;
      let listId = 0;
      let offerId = 0;

      await blocknft.connect(addr1).mint(addr1);
      let token = await ethers.getContractAt("IERC20", BlockToken);
      await blocknft
        .connect(addr1)
        .setApprovalForAll(marketplace.getAddress(), true);
      await marketplace.connect(addr1).listNft({
        owner: addr1,
        tokenId: tokenId,
        paymentToken: token,
        NftToken: blocknft.getAddress(),
        isNative: false,
        price: 12000,
        sold: false,
        minOffer: 5000,
      });

      await BlockToken.connect(owner_).mint(20000, addr2);
      // // buy the listed nft
      await BlockToken.connect(addr2).approve(marketplace.getAddress(),20000);


      await marketplace.connect(addr2).offer(listId, 10000);

      await marketplace.connect(addr1).acceptOffer(offerId);

      await expect( marketplace.connect(addr1).acceptOffer(offerId)).to.be.revertedWith("Already Sold");

    });



  });

  describe("Cancelling Offer", async() =>{
    it("Should cancel offer accordingly", async () => {
      const { marketplace, addr1, addr2, owner_, BlockToken, blocknft } = await loadFixture(
        deployBlockMarketPlace
      );
      let tokenId = 1;
      let listId = 0;
      let offerId = 0;

      await blocknft.connect(addr1).mint(addr1);
      let token = await ethers.getContractAt("IERC20", BlockToken);
      await blocknft
        .connect(addr1)
        .setApprovalForAll(marketplace.getAddress(), true);
      await marketplace.connect(addr1).listNft({
        owner: addr1,
        tokenId: tokenId,
        paymentToken: token,
        NftToken: blocknft.getAddress(),
        isNative: false,
        price: 12000,
        sold: false,
        minOffer: 5000,
      });

      await BlockToken.connect(owner_).mint(20000, addr2);
      // // buy the listed nft
      await BlockToken.connect(addr2).approve(marketplace.getAddress(),20000);


      await marketplace.connect(addr2).offer(listId, 10000);
      await marketplace.connect(addr2).cancelOffer(offerId);

      expect(await BlockToken.balanceOf(addr2)).to.eq(20000);
    });

    it("Should cancel offer in natives accordingly", async () => {
      const { marketplace, addr1, addr2, owner_, BlockToken, blocknft } = await loadFixture(
        deployBlockMarketPlace
      );
      let tokenId = 1;
      let listId = 0;
      let offerId = 0;
      let ZeroAddress = "0x0000000000000000000000000000000000000000";

      await blocknft.connect(addr1).mint(addr1);
      let token = await ethers.getContractAt("IERC20", BlockToken);
      await blocknft
        .connect(addr1)
        .setApprovalForAll(marketplace.getAddress(), true);
      await marketplace.connect(addr1).listNft({
        owner: addr1,
        tokenId: tokenId,
        paymentToken: ZeroAddress,
        NftToken: blocknft.getAddress(),
        isNative: true,
        price: 12000,
        sold: false,
        minOffer: 5000,
      });

      await BlockToken.connect(owner_).mint(20000, addr2);
      // // buy the listed nft

      await marketplace.connect(addr2).offer(listId, 0,{value: 8000});
      await marketplace.connect(addr2).cancelOffer(offerId);

      // expect(await BlockToken.balanceOf(addr2)).to.eq(20000);
    });

    it("Should revert when try to cancel by who didnt make the offer", async () => {
      const { marketplace, addr1, addr2, owner_, BlockToken, blocknft } = await loadFixture(
        deployBlockMarketPlace
      );
      let tokenId = 1;
      let listId = 0;
      let offerId = 0;

      await blocknft.connect(addr1).mint(addr1);
      let token = await ethers.getContractAt("IERC20", BlockToken);
      await blocknft
        .connect(addr1)
        .setApprovalForAll(marketplace.getAddress(), true);
      await marketplace.connect(addr1).listNft({
        owner: addr1,
        tokenId: tokenId,
        paymentToken: token,
        NftToken: blocknft.getAddress(),
        isNative: false,
        price: 12000,
        sold: false,
        minOffer: 5000,
      });

      await BlockToken.connect(owner_).mint(20000, addr2);
      // // buy the listed nft
      await BlockToken.connect(addr2).approve(marketplace.getAddress(),20000);


      await marketplace.connect(addr2).offer(listId, 10000);

      await expect( marketplace.connect(addr1).cancelOffer(offerId)).to.be.revertedWith("Unauthorized offerrer");

    });

    it("Should revert when try to cancel by who didnt make the offer", async () => {
      const { marketplace, addr1, addr2, owner_, BlockToken, blocknft } = await loadFixture(
        deployBlockMarketPlace
      );
      let tokenId = 1;
      let listId = 0;
      let offerId = 0;

      await blocknft.connect(addr1).mint(addr1);
      let token = await ethers.getContractAt("IERC20", BlockToken);
      await blocknft
        .connect(addr1)
        .setApprovalForAll(marketplace.getAddress(), true);
      await marketplace.connect(addr1).listNft({
        owner: addr1,
        tokenId: tokenId,
        paymentToken: token,
        NftToken: blocknft.getAddress(),
        isNative: false,
        price: 12000,
        sold: false,
        minOffer: 5000,
      });

      await BlockToken.connect(owner_).mint(20000, addr2);
      // // buy the listed nft
      await BlockToken.connect(addr2).approve(marketplace.getAddress(),20000);


      await marketplace.connect(addr2).offer(listId, 10000);

      await marketplace.connect(addr1).acceptOffer(offerId);

      await expect( marketplace.connect(addr2).cancelOffer(offerId)).to.be.revertedWith("Offer already accepted");

    });
  });
});