# Hybrid AMM DEX

This project implements a Decentralized Exchange (DEX) with a hybrid Automated Market Maker (AMM) model that combines Constant Product and Constant Sum models. The system allows users to create their own tokens and list them on the DEX with initial liquidity.

## Architecture

The system consists of four main smart contracts:

1. **Token.sol**: An ERC20 token contract that users can use to create their own tokens.
   - Implements standard ERC20 functionality
   - Includes minting capability for token creators
   - Uses OpenZeppelin's ERC20 and Ownable contracts

2. **Pair.sol**: Implements the hybrid AMM model for trading pairs.
   - Combines Constant Product (x * y = k) and Constant Sum (x + y = k) models
   - Uses weighted average (50/50) of both models for price calculation
   - Handles liquidity provision and token swaps
   - Manages reserves and calculates swap amounts

3. **Factory.sol**: Creates and manages trading pairs.
   - Creates new trading pairs using CREATE2 for deterministic addresses
   - Maintains a registry of all trading pairs
   - Ensures unique pairs for each token combination

4. **Router.sol**: Handles user interactions with the DEX.
   - Manages liquidity provision and removal
   - Handles token swaps
   - Calculates optimal amounts for trades
   - Provides price quotes

## System Flow

1. **Token Creation**:
   - Users deploy their own tokens using the Token contract
   - Tokens are ERC20 compliant and can be minted by the owner

2. **Pair Creation**:
   - Users create trading pairs through the Factory contract
   - Each pair is unique for a given token combination
   - Pairs are created with deterministic addresses using CREATE2

3. **Liquidity Provision**:
   - Users provide liquidity to pairs through the Router
   - Initial liquidity sets the starting price
   - Liquidity providers receive LP tokens

4. **Trading**:
   - Users can swap tokens through the Router
   - Prices are calculated using the hybrid AMM model
   - Swaps can be executed with exact input or exact output amounts

## Hybrid AMM Model

The system uses a hybrid AMM model that combines:
- Constant Product Model (x * y = k): Provides price stability and infinite liquidity
- Constant Sum Model (x + y = k): Provides linear price movement

The final price is calculated as a weighted average of both models:
```
price = (constantProductPrice * ALPHA + constantSumPrice * BETA) / 1e18
```
where ALPHA and BETA are both 0.5e18 (50% weight each).

## Testing

The project includes comprehensive tests for all contracts:
- Token deployment and basic functionality
- Pair creation and management
- Liquidity provision and removal
- Token swaps and price calculations

To run the tests:
```bash
npx hardhat test
```

## Security Considerations

1. All contracts use OpenZeppelin's security-tested contracts
2. Implements reentrancy protection
3. Uses SafeERC20 for token transfers
4. Includes deadline checks for transactions
5. Implements proper access control

## Security Features and Testing

### Security Features

1. **Reentrancy Protection**
   - All external functions are protected against reentrancy attacks
   - Uses OpenZeppelin's ReentrancyGuard
   - Implements checks-effects-interactions pattern

2. **Access Control**
   - Role-based access control for critical functions
   - Only authorized addresses can perform administrative actions
   - Clear separation of concerns between contracts

3. **Input Validation**
   - Strict validation of all user inputs
   - Checks for zero addresses and amounts
   - Validates token addresses and pair existence

4. **Price Manipulation Protection**
   - Minimum liquidity requirements
   - Price impact limits
   - Slippage protection

### Security Testing

The project includes comprehensive security tests:

1. **Reentrancy Tests**
   - Tests for potential reentrancy vulnerabilities
   - Verifies protection against recursive calls
   - Ensures state consistency during complex operations

2. **Access Control Tests**
   - Verifies proper access restrictions
   - Tests unauthorized access attempts
   - Validates role management

3. **Price Manipulation Tests**
   - Tests for price manipulation attempts
   - Verifies slippage protection
   - Validates price impact calculations

4. **Edge Case Tests**
   - Tests with zero amounts
   - Tests with maximum values
   - Tests with invalid inputs

To run security tests:
```bash
npx hardhat test test/Security.test.js
```

### Additional Security Improvements

The following security enhancements are planned for future implementation:

1. **Enhanced Price Impact Controls**
   - Tiered price impact limits based on trade size
   - Dynamic adjustment of impact limits based on market conditions
   - Separate limits for different trading pairs

2. **Circuit Breakers**
   - Automatic trading pause on extreme price movements
   - Volume-based circuit breakers
   - Time-based cooling periods after circuit breaker activation

3. **Token Management**
   - Token whitelist/blacklist functionality
   - Risk scoring for listed tokens
   - Gradual token listing process with liquidity requirements

4. **Emergency Controls**
   - Emergency pause mechanism for critical situations
   - Multi-signature requirements for emergency actions
   - Gradual resumption of trading after emergency pauses

5. **Enhanced Monitoring**
   - Comprehensive event logging for all operations
   - Real-time monitoring of price movements
   - Automated alerts for suspicious activities

## Future Improvements

1. Add flash loan functionality
2. Implement fee collection mechanism
3. Add price oracle integration
4. Implement multi-hop routing optimization
5. Add governance mechanism for parameter updates
