/**
 * BalanceCell Component
 * 
 * Displays balance with progressive loading states.
 * Shows balance immediately while price loads asynchronously.
 */

import React from 'react';
import { Box, Text, Skeleton, Badge, Flex } from '@chakra-ui/react';
import { BalanceAggregate } from '../../domain/asset/BalanceAggregate';
import { LoadingStatus } from '../../domain/asset/AssetLoadingState';

export interface BalanceCellProps {
  balance: BalanceAggregate;
  showPrice?: boolean;
  showValue?: boolean;
  compact?: boolean;
  onRefresh?: () => void;
}

export const BalanceCell: React.FC<BalanceCellProps> = ({
  balance,
  showPrice = true,
  showValue = true,
  compact = false,
  onRefresh
}) => {
  const loadingState = balance.getLoadingState();
  const balanceStatus = loadingState.getBalanceStatus();
  const priceStatus = loadingState.getPriceStatus();
  const cacheStatus = loadingState.getCacheStatus();

  // Render balance amount
  const renderBalance = () => {
    if (balanceStatus === LoadingStatus.LOADING) {
      return <Skeleton height="20px" width="100px" />;
    }

    if (balanceStatus === LoadingStatus.ERROR) {
      return (
        <Text color="red.500" fontSize="sm">
          Balance unavailable
        </Text>
      );
    }

    const isStale = balanceStatus === LoadingStatus.STALE;
    
    return (
      <Flex align="center" gap={2}>
        <Text
          fontFamily="mono"
          fontWeight="semibold"
          color={isStale ? 'gray.500' : 'inherit'}
          fontSize={compact ? 'sm' : 'md'}
        >
          {balance.getBalance().format(4)}
        </Text>
        {isStale && (
          <Badge
            colorScheme="yellow"
            variant="subtle"
            fontSize="xs"
            cursor={onRefresh ? 'pointer' : 'default'}
            onClick={onRefresh}
          >
            Stale
          </Badge>
        )}
        {cacheStatus === 'cached' && !isStale && (
          <CacheIndicator status={cacheStatus} age={loadingState.getCacheAge()} />
        )}
      </Flex>
    );
  };

  // Render price
  const renderPrice = () => {
    if (!showPrice) return null;

    if (priceStatus === LoadingStatus.LOADING) {
      return (
        <Flex align="center" gap={2}>
          <Skeleton height="16px" width="60px" />
          <PriceLoadingIndicator />
        </Flex>
      );
    }

    if (priceStatus === LoadingStatus.ERROR) {
      return (
        <Text color="gray.400" fontSize="sm">
          Price unavailable
        </Text>
      );
    }

    const price = balance.getPrice();
    if (!price) {
      return (
        <Text color="gray.400" fontSize="sm">
          -
        </Text>
      );
    }

    const priceMetadata = price.getDisplayMetadata();
    
    return (
      <Flex align="center" gap={2}>
        <Text
          fontSize={compact ? 'xs' : 'sm'}
          color="gray.600"
        >
          {price.format(2)}
        </Text>
        <PriceQualityIndicator
          quality={price.getQualityIndicator()}
          source={priceMetadata.sourceText}
          age={priceMetadata.ageText}
        />
      </Flex>
    );
  };

  // Render value
  const renderValue = () => {
    if (!showValue) return null;

    if (balanceStatus === LoadingStatus.LOADING || priceStatus === LoadingStatus.LOADING) {
      return <Skeleton height="20px" width="80px" />;
    }

    const value = balance.calculateValue();
    if (value === null) {
      return (
        <Text color="gray.400" fontSize={compact ? 'sm' : 'md'}>
          -
        </Text>
      );
    }

    return (
      <Text
        fontWeight="bold"
        fontSize={compact ? 'sm' : 'md'}
        color={value > 0 ? 'green.600' : 'gray.600'}
      >
        {balance.getDisplayValue()}
      </Text>
    );
  };

  return (
    <Box>
      {compact ? (
        <Flex align="center" gap={4}>
          {renderBalance()}
          {showPrice && <Text color="gray.400">•</Text>}
          {renderPrice()}
          {showValue && <Text color="gray.400">•</Text>}
          {renderValue()}
        </Flex>
      ) : (
        <Box>
          <Box mb={1}>{renderBalance()}</Box>
          {showPrice && <Box mb={1}>{renderPrice()}</Box>}
          {showValue && <Box>{renderValue()}</Box>}
        </Box>
      )}
    </Box>
  );
};

/**
 * Cache indicator component
 */
const CacheIndicator: React.FC<{ status: string; age?: number }> = ({ status, age }) => {
  const getAgeText = () => {
    if (!age) return '';
    if (age < 1000) return 'just now';
    if (age < 60000) return `${Math.floor(age / 1000)}s`;
    return `${Math.floor(age / 60000)}m`;
  };

  return (
    <Badge
      colorScheme={status === 'fresh' ? 'green' : 'gray'}
      variant="subtle"
      fontSize="xs"
      title={`Cached ${getAgeText()} ago`}
    >
      <Box as="span" display="inline-block" w="6px" h="6px" borderRadius="full" 
           bg={status === 'fresh' ? 'green.400' : 'gray.400'} mr={1} />
      Cached
    </Badge>
  );
};

/**
 * Price loading indicator with animation
 */
const PriceLoadingIndicator: React.FC = () => {
  return (
    <Box
      display="inline-flex"
      alignItems="center"
      gap={1}
      color="blue.500"
      fontSize="xs"
    >
      <Box
        as="span"
        display="inline-block"
        w="4px"
        h="4px"
        borderRadius="full"
        bg="blue.500"
        animation="pulse 1.5s infinite"
      />
      <Box
        as="span"
        display="inline-block"
        w="4px"
        h="4px"
        borderRadius="full"
        bg="blue.500"
        animation="pulse 1.5s infinite 0.3s"
      />
      <Box
        as="span"
        display="inline-block"
        w="4px"
        h="4px"
        borderRadius="full"
        bg="blue.500"
        animation="pulse 1.5s infinite 0.6s"
      />
    </Box>
  );
};

/**
 * Price quality indicator
 */
const PriceQualityIndicator: React.FC<{
  quality: 'high' | 'medium' | 'low';
  source: string;
  age: string;
}> = ({ quality, source, age }) => {
  const colors = {
    high: 'green',
    medium: 'yellow',
    low: 'red'
  };

  return (
    <Badge
      colorScheme={colors[quality]}
      variant="subtle"
      fontSize="xs"
      title={`${source} • ${age}`}
    >
      <Box
        as="span"
        display="inline-block"
        w="6px"
        h="6px"
        borderRadius="full"
        bg={`${colors[quality]}.400`}
        mr={1}
      />
      {source}
    </Badge>
  );
};