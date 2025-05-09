# Hybrid AMM Mathematical Formulas

This document explains the mathematical formulas used in our hybrid Automated Market Maker (AMM) model, which combines Constant Product and Constant Sum models.

## Overview

Our hybrid AMM model uses a weighted combination of two traditional AMM models:
1. Constant Product Model (x * y = k)
2. Constant Sum Model (x + y = k)

The weights are currently set to 50% each, but they can be adjusted to favor one model over the other.

## Constant Product Model

The Constant Product Model follows the formula:

\[
\frac{\Delta y}{\Delta x} = \frac{y}{x + \Delta x}
\]

Where:
- \(\Delta x\) is the input amount
- \(\Delta y\) is the output amount
- \(x\) is the input reserve
- \(y\) is the output reserve

In Solidity code:
```solidity
uint256 constantProductAmount = (amountIn * reserveOut) / (reserveIn + amountIn);
```

This model provides better price stability for large trades and ensures that the product of reserves remains constant.

## Constant Sum Model

The Constant Sum Model follows the formula:

\[
\frac{\Delta y}{\Delta x} = \frac{y}{x}
\]

Where:
- \(\Delta x\) is the input amount
- \(\Delta y\) is the output amount
- \(x\) is the input reserve
- \(y\) is the output reserve

In Solidity code:
```solidity
uint256 constantSumAmount = (amountIn * reserveOut) / reserveIn;
```

This model provides better price stability for small trades and ensures that the sum of reserves remains constant.

## Hybrid Model

The final output is a weighted average of both models:

\[
\Delta y = \alpha \cdot \Delta y_{cp} + \beta \cdot \Delta y_{cs}
\]

Where:
- \(\alpha = 0.5\) (ALPHA = 0.5e18)
- \(\beta = 0.5\) (BETA = 0.5e18)
- \(\Delta y_{cp}\) is the output from constant product model
- \(\Delta y_{cs}\) is the output from constant sum model

In Solidity code:
```solidity
return ((constantProductAmount * ALPHA) + (constantSumAmount * BETA)) / 1e18;
```

## Example Calculation

Let's calculate the output amount for a swap with the following parameters:
- Input amount: 1 token
- Input reserve: 100 tokens
- Output reserve: 100 tokens

1. Constant Product calculation:
   \[
   \frac{1 \cdot 100}{100 + 1} \approx 0.99 \text{ tokens}
   \]

2. Constant Sum calculation:
   \[
   \frac{1 \cdot 100}{100} = 1 \text{ token}
   \]

3. Final output (hybrid):
   \[
   0.5 \cdot 0.99 + 0.5 \cdot 1 = 0.995 \text{ tokens}
   \]

## Benefits of the Hybrid Model

1. **Price Stability**: The hybrid model provides better price stability across different trade sizes:
   - Small trades benefit from the constant sum model's linear pricing
   - Large trades benefit from the constant product model's price impact protection

2. **Flexibility**: The weights (ALPHA and BETA) can be adjusted to favor one model over the other based on market conditions or specific requirements.

3. **Liquidity Efficiency**: The model maintains efficient use of liquidity while providing more predictable price movements compared to pure constant product or constant sum models.

## Implementation Details

The hybrid AMM model is implemented in the `Pair.sol` contract, specifically in the `getAmountOut` function. The weights are defined as constants:

```solidity
uint256 public constant ALPHA = 0.5e18; // Weight for constant product (50%)
uint256 public constant BETA = 0.5e18;  // Weight for constant sum (50%)
```

These weights can be modified to adjust the balance between the two models, but their sum must always equal 1e18 (100%). 