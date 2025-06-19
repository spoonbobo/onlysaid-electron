import { useEffect, useRef } from 'react';
import { useTopicStore } from '@/renderer/stores/Topic/TopicStore';
import { handleWorkspaceContextChange } from '@/utils/notifications';
import type { TopicContext } from '@/renderer/stores/Topic/TopicStore';

export const useContextNotificationClearing = () => {
  const selectedContext = useTopicStore(state => state.selectedContext);
  const prevContextRef = useRef<TopicContext | null>(null);

  useEffect(() => {
    const prevContext = prevContextRef.current;
    
    if (prevContext !== selectedContext) {
      handleWorkspaceContextChange(selectedContext, prevContext);
      prevContextRef.current = selectedContext;
    }
  }, [selectedContext]);
}; 