import { useState, useEffect } from 'react';
import { useUserTokenStore } from '@/renderer/stores/User/UserToken';
import { IUserPlan, IUsageAnalytics } from '@/../../types/Usage/Usage';
import { toast } from '@/utils/toast';

interface UsageData {
  plan: IUserPlan | null;
  analytics: IUsageAnalytics | null;
  loading: boolean;
  error: string | null;
  remainingRequests: number;
  usagePercentage: number;
}

export const useUsageData = () => {
  const { token } = useUserTokenStore();
  const [data, setData] = useState<UsageData>({
    plan: null,
    analytics: null,
    loading: true,
    error: null,
    remainingRequests: 0,
    usagePercentage: 0,
  });

  const fetchUsageData = async () => {
    if (!token) {
      setData(prev => ({ ...prev, loading: false, error: 'No authentication token' }));
      return;
    }

    try {
      setData(prev => ({ ...prev, loading: true, error: null }));

      // Use the existing IPC handlers
      const [planResult, analyticsResult] = await Promise.all([
        window.electron.user.getPlan({ token }),
        window.electron.user.getUsageAnalytics({ token, days: 30 })
      ]);

      if (planResult.error) {
        throw new Error(planResult.error);
      }

      if (analyticsResult.error) {
        throw new Error(analyticsResult.error);
      }

      const plan = planResult.data?.data;
      const analytics = analyticsResult.data?.data;

      // Calculate remaining requests
      const currentUsage = analytics?.summary?.total_requests || 0;
      const monthlyLimit = plan?.monthly_limit || 0;
      const remainingRequests = Math.max(0, monthlyLimit - currentUsage);
      const usagePercentage = monthlyLimit > 0 ? (currentUsage / monthlyLimit) * 100 : 0;

      setData({
        plan,
        analytics,
        loading: false,
        error: null,
        remainingRequests,
        usagePercentage,
      });

    } catch (error: any) {
      console.error('Error fetching usage data:', error);
      setData(prev => ({
        ...prev,
        loading: false,
        error: error.message || 'Failed to fetch usage data'
      }));
    }
  };

  const refreshUsageData = () => {
    fetchUsageData();
  };

  useEffect(() => {
    if (token) {
      fetchUsageData();
    }
  }, [token]);

  return {
    ...data,
    refresh: refreshUsageData,
  };
};