"use client";

import { useState, useEffect, useCallback } from "react";
import { getTokenBalance } from "../utils/web3";

export function useTokenBalance(tokenAddress, userAddress) {
  const [balance, setBalance] = useState("0");
  const [loading, setLoading] = useState(false);

  const fetchBalance = useCallback(async () => {
    if (!userAddress) {
      setBalance("0");
      return;
    }

    if (!tokenAddress) {
      setBalance("0");
      return;
    }

    setLoading(true);
    try {
      console.log(`Fetching balance for ${tokenAddress} of ${userAddress}`);
      const bal = await getTokenBalance(tokenAddress, userAddress);
      console.log(`Balance result: ${bal}`);
      setBalance(bal);
    } catch (error) {
      console.error("Error fetching balance:", error);
      setBalance("0");
    } finally {
      setLoading(false);
    }
  }, [tokenAddress, userAddress]);

  useEffect(() => {
    fetchBalance();
  }, [fetchBalance]);

  return { balance, loading, refetch: fetchBalance };
}
