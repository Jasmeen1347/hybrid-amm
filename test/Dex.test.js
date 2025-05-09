const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("DEX", function () {
    let Token;
    let token0;
    let token1;
    let Factory;
    let factory;
    let Router;
    let router;
    let owner;
    let addr1;
    let addr2;
    let addrs;

    beforeEach(async function () {
        [owner, addr1, addr2, ...addrs] = await ethers.getSigners();

        // Deploy Token contracts
        Token = await ethers.getContractFactory("Token");
        token0 = await Token.deploy("Test Token 0", "TEST0", ethers.parseEther("1000000"));
        token1 = await Token.deploy("Test Token 1", "TEST1", ethers.parseEther("1000000"));

        // Deploy Factory contract
        Factory = await ethers.getContractFactory("Factory");
        factory = await Factory.deploy();

        // Deploy Router contract
        Router = await ethers.getContractFactory("Router");
        router = await Router.deploy(factory.target);
    });

    describe("Token", function () {
        it("Should set the right owner", async function () {
            expect(await token0.owner()).to.equal(owner.address);
        });

        it("Should assign the total supply of tokens to the owner", async function () {
            const ownerBalance = await token0.balanceOf(owner.address);
            expect(await token0.totalSupply()).to.equal(ownerBalance);
        });
    });

    describe("Factory", function () {
        it("Should create a new pair", async function () {
            const tx = await factory.createPair(token0.target, token1.target);
            const receipt = await tx.wait();
            expect(receipt.status).to.equal(1);

            const pair = await factory.getPair(token0.target, token1.target);
            expect(pair).to.not.equal(ethers.ZeroAddress);
        });

        it("Should not create a pair with identical tokens", async function () {
            await expect(factory.createPair(token0.target, token0.target))
                .to.be.revertedWith("Identical addresses");
        });
    });

    describe("Router", function () {
        it("Should add liquidity", async function () {
            const amountA = ethers.parseEther("1000");
            const amountB = ethers.parseEther("1000");
            
            await token0.approve(router.target, amountA);
            await token1.approve(router.target, amountB);
            
            const tx = await router.addLiquidity(
                token0.target,
                token1.target,
                amountA,
                amountB,
                0,
                0,
                owner.address,
                Math.floor(Date.now() / 1000) + 60 * 20
            );

            const receipt = await tx.wait();
            expect(receipt.status).to.equal(1);
        });

        it("Should swap tokens", async function () {
            // First add liquidity
            const amountA = ethers.parseEther("100");
            const amountB = ethers.parseEther("100");
            
            await token0.approve(router.target, amountA);
            await token1.approve(router.target, amountB);
            
            await router.addLiquidity(
                token0.target,
                token1.target,
                amountA,
                amountB,
                0,
                0,
                owner.address,
                Math.floor(Date.now() / 1000) + 60 * 20
            );

            // Get pair address
            const pairAddress = await factory.getPair(token0.target, token1.target);
            console.log("Pair address:", pairAddress);

            // Check reserves
            const pair = await ethers.getContractAt("Pair", pairAddress);
            const [reserve0, reserve1] = await pair.getReserves();
            console.log("Reserve0:", reserve0);
            console.log("Reserve1:", reserve1);

            // Then perform swap
            const swapAmount = ethers.parseEther("1");
            console.log("Swap amount:", swapAmount);

            const initialToken1Balance = await token1.balanceOf(owner.address);
            console.log("Initial token1 balance:", initialToken1Balance);
            
            await token0.approve(router.target, swapAmount);
            
            // Calculate expected output
            const amounts = await router.getAmountsOut(swapAmount, [token0.target, token1.target]);
            console.log("Expected output amount:", amounts[1]);
            
            const tx = await router.swapExactTokensForTokens(
                swapAmount,
                0,
                [token0.target, token1.target],
                owner.address,
                Math.floor(Date.now() / 1000) + 60 * 20
            );

            await tx.wait();

            // Verify the swap was successful
            const finalToken1Balance = await token1.balanceOf(owner.address);
            console.log("Final token1 balance:", finalToken1Balance);
            expect(finalToken1Balance).to.be.gt(initialToken1Balance);
        });
    });
}); 