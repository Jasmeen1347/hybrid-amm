const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Price Impact Analysis", function () {
    let Token, token0, token1, Factory, factory, Router, router;
    let owner, addr1, addr2;
    let pair;
    
    // Helper function to calculate price impact percentage
    const calculatePriceImpact = (spotPrice, executionPrice) => {
        return ((spotPrice - executionPrice) / spotPrice) * 100;
    };

    // Helper function to calculate spot price
    const calculateSpotPrice = async (pair) => {
        const [reserve0, reserve1] = await pair.getReserves();
        return Number(ethers.formatEther(reserve1)) / Number(ethers.formatEther(reserve0));
    };

    // Helper function to calculate execution price
    const calculateExecutionPrice = (amountIn, amountOut) => {
        return Number(ethers.formatEther(amountOut)) / Number(ethers.formatEther(amountIn));
    };

    beforeEach(async function () {
        [owner, addr1, addr2] = await ethers.getSigners();

        // Deploy tokens
        Token = await ethers.getContractFactory("Token");
        token0 = await Token.deploy("Token A", "TKNA", ethers.parseEther("1000000"));
        token1 = await Token.deploy("Token B", "TKNB", ethers.parseEther("1000000"));

        // Deploy Factory and Router
        Factory = await ethers.getContractFactory("Factory");
        factory = await Factory.deploy();
        Router = await ethers.getContractFactory("Router");
        router = await Router.deploy(factory.target);

        // Create pair
        await factory.createPair(token0.target, token1.target);
        const pairAddress = await factory.getPair(token0.target, token1.target);
        pair = await ethers.getContractAt("Pair", pairAddress);

        // Add initial liquidity
        const initialLiquidity = ethers.parseEther("100000");
        await token0.approve(router.target, initialLiquidity);
        await token1.approve(router.target, initialLiquidity);
        
        await router.addLiquidity(
            token0.target,
            token1.target,
            initialLiquidity,
            initialLiquidity,
            0,
            0,
            owner.address,
            Math.floor(Date.now() / 1000) + 60 * 20
        );
    });

    describe("Best Case Scenario (Small Trades)", function () {
        it("Should have minimal price impact for small trades (0.1% of pool)", async function () {
            const tradeAmount = ethers.parseEther("100"); // 0.1% of pool
            const spotPriceBefore = await calculateSpotPrice(pair);
            
            // Perform swap
            await token0.approve(router.target, tradeAmount);
            const amountOut = await router.getAmountsOut(tradeAmount, [token0.target, token1.target]);
            
            await router.swapExactTokensForTokens(
                tradeAmount,
                0,
                [token0.target, token1.target],
                owner.address,
                Math.floor(Date.now() / 1000) + 60 * 20
            );

            const executionPrice = calculateExecutionPrice(tradeAmount, amountOut[1]);
            const priceImpact = calculatePriceImpact(spotPriceBefore, executionPrice);
            
            console.log(`Best Case - Spot Price: ${spotPriceBefore.toFixed(4)}`);
            console.log(`Best Case - Execution Price: ${executionPrice.toFixed(4)}`);
            console.log(`Best Case - Price Impact: ${priceImpact.toFixed(4)}%`);
            
            expect(priceImpact).to.be.lt(0.5); // Price impact should be less than 0.5%
        });
    });

    describe("Average Case Scenario (Medium Trades)", function () {
        it("Should have moderate price impact for medium trades (5% of pool)", async function () {
            const tradeAmount = ethers.parseEther("5000"); // 5% of pool
            const spotPriceBefore = await calculateSpotPrice(pair);
            
            // Perform swap
            await token0.approve(router.target, tradeAmount);
            const amountOut = await router.getAmountsOut(tradeAmount, [token0.target, token1.target]);
            
            await router.swapExactTokensForTokens(
                tradeAmount,
                0,
                [token0.target, token1.target],
                owner.address,
                Math.floor(Date.now() / 1000) + 60 * 20
            );

            const executionPrice = calculateExecutionPrice(tradeAmount, amountOut[1]);
            const priceImpact = calculatePriceImpact(spotPriceBefore, executionPrice);
            
            console.log(`Average Case - Spot Price: ${spotPriceBefore.toFixed(4)}`);
            console.log(`Average Case - Execution Price: ${executionPrice.toFixed(4)}`);
            console.log(`Average Case - Price Impact: ${priceImpact.toFixed(4)}%`);
            
            expect(priceImpact).to.be.lt(5); // Price impact should be less than 5%
        });
    });

    describe("Worst Case Scenario (Large Trades)", function () {
        it("Should have significant price impact for large trades (20% of pool)", async function () {
            const tradeAmount = ethers.parseEther("20000"); // 20% of pool
            const spotPriceBefore = await calculateSpotPrice(pair);
            
            // Perform swap
            await token0.approve(router.target, tradeAmount);
            const amountOut = await router.getAmountsOut(tradeAmount, [token0.target, token1.target]);
            
            await router.swapExactTokensForTokens(
                tradeAmount,
                0,
                [token0.target, token1.target],
                owner.address,
                Math.floor(Date.now() / 1000) + 60 * 20
            );

            const executionPrice = calculateExecutionPrice(tradeAmount, amountOut[1]);
            const priceImpact = calculatePriceImpact(spotPriceBefore, executionPrice);
            
            console.log(`Worst Case - Spot Price: ${spotPriceBefore.toFixed(4)}`);
            console.log(`Worst Case - Execution Price: ${executionPrice.toFixed(4)}`);
            console.log(`Worst Case - Price Impact: ${priceImpact.toFixed(4)}%`);
            
            expect(priceImpact).to.be.lt(25); // Price impact should be less than 25%
        });
    });

    describe("Price Recovery Analysis", function () {
        it("Should demonstrate price recovery after large trades", async function () {
            // First large trade
            const tradeAmount = ethers.parseEther("20000");
            const spotPriceBefore = await calculateSpotPrice(pair);
            
            // Perform first swap (token0 -> token1)
            await token0.approve(router.target, tradeAmount);
            await router.swapExactTokensForTokens(
                tradeAmount,
                0,
                [token0.target, token1.target],
                owner.address,
                Math.floor(Date.now() / 1000) + 60 * 20
            );

            const spotPriceAfterFirst = await calculateSpotPrice(pair);
            
            // Perform reverse swap (token1 -> token0)
            const reverseAmount = ethers.parseEther("20000");
            await token1.approve(router.target, reverseAmount);
            await router.swapExactTokensForTokens(
                reverseAmount,
                0,
                [token1.target, token0.target],
                owner.address,
                Math.floor(Date.now() / 1000) + 60 * 20
            );

            const spotPriceAfterSecond = await calculateSpotPrice(pair);
            
            console.log(`Initial Price: ${spotPriceBefore.toFixed(4)}`);
            console.log(`Price After Large Trade: ${spotPriceAfterFirst.toFixed(4)}`);
            console.log(`Price After Recovery Trade: ${spotPriceAfterSecond.toFixed(4)}`);
            
            // Price should recover close to initial price
            const priceDifference = Math.abs(spotPriceBefore - spotPriceAfterSecond);
            expect(priceDifference).to.be.lt(0.01); // Less than 1% difference from initial price
        });
    });
}); 