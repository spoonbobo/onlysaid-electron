import { useEffect } from 'react';
import MainInterface from '../scenes/Interface/MainInterface';
import { useTopicStore } from '../stores/Topic/TopicStore';
import { useUserStore, setupDeeplinkAuthListener } from '../stores/User/UserStore';

function App() {
  const { selectedContext, contexts, setSelectedContext } = useTopicStore();
  useEffect(() => {
    if (!selectedContext && contexts.length > 0) {
      setSelectedContext(contexts[0]);
    }
  }, [selectedContext, contexts, setSelectedContext]);

  useEffect(() => {
    setupDeeplinkAuthListener();
  }, []);

  return (
    <>
      <MainInterface />
    </>
  );
}

export default App;
