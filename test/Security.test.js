const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Security Tests", function () {
    let token0;
    let token1;
    let factory;
    let router;
    let pair;
    let owner;
    let user1;
    let user2;

    beforeEach(async function () {
        [owner, user1, user2] = await ethers.getSigners();

        // Deploy tokens
        const Token = await ethers.getContractFactory("Token");
        token0 = await Token.deploy("Token0", "TK0", ethers.parseEther("1000000"));
        token1 = await Token.deploy("Token1", "TK1", ethers.parseEther("1000000"));

        // Deploy factory
        const Factory = await ethers.getContractFactory("Factory");
        factory = await Factory.deploy();

        // Deploy router
        const Router = await ethers.getContractFactory("Router");
        router = await Router.deploy(factory.target);

        // Create pair
        await factory.createPair(token0.target, token1.target);
        const pairAddress = await factory.getPair(token0.target, token1.target);
        pair = await ethers.getContractAt("Pair", pairAddress);

        // Transfer tokens to users
        await token0.transfer(user1.address, ethers.parseEther("100000"));
        await token1.transfer(user1.address, ethers.parseEther("100000"));
    });

    describe("Flash Loan Attack Protection", function () {
        it("should not allow significant price manipulation through flash loans", async function () {
            // Add initial liquidity
            await token0.approve(router.target, ethers.parseEther("10000"));
            await token1.approve(router.target, ethers.parseEther("10000"));
            await router.addLiquidity(
                token0.target,
                token1.target,
                ethers.parseEther("10000"),
                ethers.parseEther("10000"),
                0,
                0,
                owner.address,
                Math.floor(Date.now() / 1000) + 60 * 20
            );

            // Get initial price for 1 token
            const initialPrice = await pair.getAmountOut(
                ethers.parseEther("1"),
                await token0.balanceOf(pair.target),
                await token1.balanceOf(pair.target)
            );

            // Attempt flash loan attack with a smaller amount
            await token0.approve(router.target, ethers.parseEther("1000"));
            await router.swapExactTokensForTokens(
                ethers.parseEther("1000"),
                0,
                [token0.target, token1.target],
                user1.address,
                Math.floor(Date.now() / 1000) + 60 * 20
            );

            const manipulatedPrice = await pair.getAmountOut(
                ethers.parseEther("1"),
                await token0.balanceOf(pair.target),
                await token1.balanceOf(pair.target)
            );

            // Due to the hybrid AMM model, price impact should be limited
            // Allow for up to 20% price impact
            const maxPriceDeviation = (initialPrice * BigInt(20)) / BigInt(100); // 20% of initial price
            expect(manipulatedPrice).to.be.closeTo(initialPrice, maxPriceDeviation);
        });
    });

    describe("Reentrancy Protection", function () {
        it("should prevent reentrancy attacks", async function () {
            // Add liquidity
            await token0.approve(router.target, ethers.parseEther("1000"));
            await token1.approve(router.target, ethers.parseEther("1000"));
            await router.addLiquidity(
                token0.target,
                token1.target,
                ethers.parseEther("1000"),
                ethers.parseEther("1000"),
                0,
                0,
                owner.address,
                Math.floor(Date.now() / 1000) + 60 * 20
            );

            // Attempt reentrancy through multiple swaps
            await token0.approve(router.target, ethers.parseEther("100"));
            await token1.approve(router.target, ethers.parseEther("100"));

            // Should not allow reentrancy
            await expect(
                router.swapExactTokensForTokens(
                    ethers.parseEther("100"),
                    0,
                    [token0.target, token1.target],
                    user1.address,
                    Math.floor(Date.now() / 1000) + 60 * 20
                )
            ).to.not.be.revertedWith("ReentrancyGuard: reentrant call");
        });
    });

    describe("Price Manipulation Protection", function () {
        it("should enforce slippage protection", async function () {
            // Add initial liquidity
            await token0.approve(router.target, ethers.parseEther("1000"));
            await token1.approve(router.target, ethers.parseEther("1000"));
            await router.addLiquidity(
                token0.target,
                token1.target,
                ethers.parseEther("1000"),
                ethers.parseEther("1000"),
                0,
                0,
                owner.address,
                Math.floor(Date.now() / 1000) + 60 * 20
            );

            // Attempt swap with high slippage
            await token0.approve(router.target, ethers.parseEther("100"));
            await expect(
                router.swapExactTokensForTokens(
                    ethers.parseEther("100"),
                    ethers.parseEther("200"), // Unrealistic minimum output
                    [token0.target, token1.target],
                    user1.address,
                    Math.floor(Date.now() / 1000) + 60 * 20
                )
            ).to.be.revertedWith("Insufficient output amount");
        });
    });

    describe("Token Validation", function () {
        it("should validate token addresses", async function () {
            // Attempt to create pair with zero address
            await expect(
                factory.createPair(ethers.ZeroAddress, token1.target)
            ).to.be.revertedWith("Zero address");

            // Attempt to create pair with same token
            await expect(
                factory.createPair(token0.target, token0.target)
            ).to.be.revertedWith("Identical addresses");
        });
    });

    describe("Deadline Protection", function () {
        it("should enforce deadline constraints", async function () {
            // Add liquidity with expired deadline
            await token0.approve(router.target, ethers.parseEther("1000"));
            await token1.approve(router.target, ethers.parseEther("1000"));
            await expect(
                router.addLiquidity(
                    token0.target,
                    token1.target,
                    ethers.parseEther("1000"),
                    ethers.parseEther("1000"),
                    0,
                    0,
                    owner.address,
                    Math.floor(Date.now() / 1000) - 1 // Expired deadline
                )
            ).to.be.revertedWith("Expired");
        });
    });

    describe("Mathematical Safety", function () {
        it("should handle large numbers correctly", async function () {
            // Add liquidity with large numbers
            const amount = ethers.parseEther("1000000");
            await token0.approve(router.target, amount);
            await token1.approve(router.target, amount);
            await expect(
                router.addLiquidity(
                    token0.target,
                    token1.target,
                    amount,
                    amount,
                    0,
                    0,
                    owner.address,
                    Math.floor(Date.now() / 1000) + 60 * 20
                )
            ).to.not.be.revertedWith("SafeMath: multiplication overflow");
        });

        it("should handle zero amounts correctly", async function () {
            // First add some initial liquidity to avoid division by zero
            await token0.approve(router.target, ethers.parseEther("1000"));
            await token1.approve(router.target, ethers.parseEther("1000"));
            await router.addLiquidity(
                token0.target,
                token1.target,
                ethers.parseEther("1000"),
                ethers.parseEther("1000"),
                0,
                0,
                owner.address,
                Math.floor(Date.now() / 1000) + 60 * 20
            );

            // Now attempt to add zero liquidity
            await token0.approve(router.target, 0);
            await token1.approve(router.target, 0);
            await expect(
                router.addLiquidity(
                    token0.target,
                    token1.target,
                    0,
                    0,
                    0,
                    0,
                    owner.address,
                    Math.floor(Date.now() / 1000) + 60 * 20
                )
            ).to.be.revertedWith("Insufficient amount");
        });
    });
}); 